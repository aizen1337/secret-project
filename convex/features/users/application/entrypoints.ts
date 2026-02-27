import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../../_generated/api";
import { mapClerkUser } from "../../../userMapper";

const ONBOARDING_ROLE_VALUES = {
  renter: true,
  host: true,
  both: true,
} as const;

const unsafeInternal = internal as any;

async function getCurrentSignedInUserOrNull(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .first();
}

function buildRatingSummary(rows: Array<{ rating: number }>) {
  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const row of rows) {
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }

  const count = rows.length;
  const average = count > 0 ? Number((rows.reduce((sum, row) => sum + Number(row.rating ?? 0), 0) / count).toFixed(2)) : 0;

  return {
    average,
    count,
    distribution,
  };
}

async function mapReviewsWithAuthor(ctx: any, rows: any[]) {
  return await Promise.all(
    rows.map(async (review) => {
      const author = await ctx.db.get(review.authorUserId);
      return {
        id: String(review._id),
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        author: author
          ? {
              id: String(author._id),
              name: author.name,
              imageUrl: author.imageUrl ?? null,
            }
          : null,
      };
    }),
  );
}

export const getCurrentUser = query({
  args: {},
  async handler(ctx) {
    return await getCurrentSignedInUserOrNull(ctx);
  },
});

export const getPublicUserProfile = query({
  args: {
    userId: v.id("users"),
    reviewsLimit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const viewer = await getCurrentSignedInUserOrNull(ctx);
    if (!viewer) return null;

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const reviewsLimit = Math.max(1, Math.min(args.reviewsLimit ?? 20, 50));

    const renterBookings = await ctx.db
      .query("bookings")
      .withIndex("by_renter", (q) => q.eq("renterId", args.userId))
      .collect();
    const completedBookingsCount = renterBookings.filter((booking) => booking.status === "completed").length;

    const renterReviewRows = await ctx.db
      .query("booking_reviews")
      .withIndex("by_target_direction", (q) =>
        q.eq("targetUserId", args.userId).eq("direction", "host_to_renter"),
      )
      .collect();
    const renterRating = buildRatingSummary(renterReviewRows);
    const renterReviews = await mapReviewsWithAuthor(
      ctx,
      renterReviewRows.sort((a, b) => b.createdAt - a.createdAt).slice(0, reviewsLimit),
    );

    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    let completedRentalsCount = 0;
    if (host) {
      const hostCars = await ctx.db
        .query("cars")
        .withIndex("by_host", (q) => q.eq("hostId", host._id))
        .collect();

      const hostBookingsByCar = await Promise.all(
        hostCars.map((car) =>
          ctx.db
            .query("bookings")
            .withIndex("by_car", (q) => q.eq("carId", car._id))
            .collect(),
        ),
      );

      completedRentalsCount = hostBookingsByCar.flat().filter((booking) => booking.status === "completed").length;
    }

    const hostReviewRows = await ctx.db
      .query("booking_reviews")
      .withIndex("by_target_direction", (q) =>
        q.eq("targetUserId", args.userId).eq("direction", "renter_to_host"),
      )
      .collect();
    const hostRating = buildRatingSummary(hostReviewRows);
    const hostReviews = await mapReviewsWithAuthor(
      ctx,
      hostReviewRows.sort((a, b) => b.createdAt - a.createdAt).slice(0, reviewsLimit),
    );

    return {
      user: {
        id: String(user._id),
        name: user.name,
        imageUrl: user.imageUrl ?? null,
        createdAt: user.createdAt,
      },
      renter: {
        completedBookingsCount,
        rating: renterRating,
        reviews: renterReviews,
      },
      host: {
        isHost: Boolean(host),
        completedRentalsCount,
        rating: hostRating,
        reviews: hostReviews,
      },
    };
  },
});

export const getHostPayoutStatus = query({
  args: {},
  async handler(ctx) {
    const user = await getCurrentSignedInUserOrNull(ctx);
    if (!user) return null;

    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!host) {
      return {
        hostVerified: false,
        hasConnectAccount: false,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        stripeConnectAccountId: null,
      };
    }
    return {
      hostVerified: Boolean(host.isVerified),
      hasConnectAccount: Boolean(host.stripeConnectAccountId),
      onboardingComplete: Boolean(host.stripeOnboardingComplete),
      chargesEnabled: Boolean(host.stripeChargesEnabled),
      payoutsEnabled: Boolean(host.stripePayoutsEnabled),
      stripeConnectAccountId: host.stripeConnectAccountId ?? null,
    };
  },
});

export const getRenterVerificationStatus = query({
  args: {},
  async handler(ctx: any): Promise<any> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.runQuery(unsafeInternal.verification.getRenterEligibilityInternal, {
      clerkUserId: identity.subject,
    });
  },
});

export const beginSignupOnboarding = mutation({
  args: {},
  async handler(ctx) {
    const user = await mapClerkUser(ctx);
    const patch: Record<string, unknown> = {};

    if (!user.onboardingStatus) {
      patch.onboardingStatus = "in_progress";
    }
    if (!user.onboardingStartedAt) {
      patch.onboardingStartedAt = Date.now();
    }
    if (!user.onboardingSource) {
      patch.onboardingSource = "signup";
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch);
      return { ...user, ...patch };
    }

    return user;
  },
});

export const setOnboardingRole = mutation({
  args: {
    role: v.union(v.literal("renter"), v.literal("host"), v.literal("both")),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const role = args.role?.trim() as keyof typeof ONBOARDING_ROLE_VALUES;
    if (!ONBOARDING_ROLE_VALUES[role]) {
      throw new Error("INVALID_INPUT: Invalid onboarding role.");
    }

    const patch: Record<string, unknown> = {
      onboardingRole: role,
    };

    if (user.onboardingStatus !== "completed") {
      patch.onboardingStatus = "in_progress";
    }
    if (!user.onboardingStartedAt) {
      patch.onboardingStartedAt = Date.now();
    }
    if (!user.onboardingSource) {
      patch.onboardingSource = "signup";
    }

    await ctx.db.patch(user._id, patch);
    return { ...user, ...patch };
  },
});

export const finalizeOnboarding = mutation({
  args: {
    status: v.union(v.literal("completed"), v.literal("skipped")),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    if (!user.onboardingRole) {
      throw new Error("INVALID_INPUT: Select a role before finishing onboarding.");
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      onboardingStatus: args.status,
      onboardingSource: "signup",
    };

    if (args.status === "completed") {
      patch.onboardingCompletedAt = now;
    } else {
      patch.onboardingSkippedAt = now;
    }
    if (!user.onboardingStartedAt) {
      patch.onboardingStartedAt = now;
    }

    await ctx.db.patch(user._id, patch);
    return { ...user, ...patch };
  },
});

