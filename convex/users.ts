import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mapClerkUser } from "./userMapper";

const ONBOARDING_ROLE_VALUES = {
  renter: true,
  host: true,
  both: true,
} as const;

async function getCurrentSignedInUserOrNull(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

export const getCurrentUser = query({
  args: {},
  async handler(ctx) {
    return await getCurrentSignedInUserOrNull(ctx);
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
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.runQuery(internal.verification.getRenterEligibilityInternal, {
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
