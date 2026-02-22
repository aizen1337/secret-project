import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mapClerkUser } from "./userMapper";

const MAX_COMMENT_LENGTH = 500;

export const createBookingReview = mutation({
  args: {
    bookingId: v.id("bookings"),
    rating: v.number(),
    comment: v.string(),
  },
  async handler(ctx, args) {
    const author = await mapClerkUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("NOT_FOUND: Booking not found.");
    }
    if (booking.status !== "completed") {
      throw new Error("INVALID_INPUT: bookingNotCompleted");
    }

    const car = await ctx.db.get(booking.carId);
    if (!car) {
      throw new Error("NOT_FOUND: Car not found for booking.");
    }
    const host = await ctx.db.get(car.hostId);
    if (!host) {
      throw new Error("NOT_FOUND: Host not found for booking.");
    }

    const isRenterAuthor = String(booking.renterId) === String(author._id);
    const isHostAuthor = String(host.userId) === String(author._id);
    if (!isRenterAuthor && !isHostAuthor) {
      throw new Error("UNAUTHORIZED: You cannot review this booking.");
    }

    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new Error("INVALID_INPUT: invalidRating");
    }

    const comment = args.comment.trim();
    if (!comment || comment.length > MAX_COMMENT_LENGTH) {
      throw new Error("INVALID_INPUT: invalidComment");
    }

    const direction = isHostAuthor ? "host_to_renter" : "renter_to_host";
    const targetUserId = isHostAuthor ? booking.renterId : host.userId;

    const existing = await ctx.db
      .query("booking_reviews")
      .withIndex("by_booking_author", (q) =>
        q.eq("bookingId", booking._id).eq("authorUserId", author._id),
      )
      .first();
    if (existing) {
      throw new Error("INVALID_INPUT: alreadyReviewed");
    }

    const reviewId = await ctx.db.insert("booking_reviews", {
      bookingId: booking._id,
      authorUserId: author._id,
      targetUserId,
      direction,
      rating: args.rating,
      comment,
      createdAt: Date.now(),
    });

    const targetReviews = await ctx.db
      .query("booking_reviews")
      .withIndex("by_target", (q) => q.eq("targetUserId", targetUserId))
      .collect();

    const reviewCount = targetReviews.length;
    const avgRating =
      reviewCount > 0
        ? Number((targetReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(2))
        : undefined;

    await ctx.db.patch(targetUserId, {
      reviewCount,
      avgRating,
    } as any);

    return reviewId;
  },
});

export const listReviewsForUser = query({
  args: {
    userId: v.id("users"),
    direction: v.optional(v.union(v.literal("host_to_renter"), v.literal("renter_to_host"))),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
    const rows = args.direction
      ? await ctx.db
          .query("booking_reviews")
          .withIndex("by_target_direction", (q) =>
            q.eq("targetUserId", args.userId).eq("direction", args.direction!),
          )
          .collect()
      : await ctx.db
          .query("booking_reviews")
          .withIndex("by_target", (q) => q.eq("targetUserId", args.userId))
          .collect();

    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);

    return await Promise.all(
      sorted.map(async (review) => {
        const author = await ctx.db.get(review.authorUserId);
        return {
          review,
          author: author
            ? {
                id: author._id,
                name: author.name,
                imageUrl: author.imageUrl,
              }
            : null,
        };
      }),
    );
  },
});

export const getUserReviewSummary = query({
  args: {
    userId: v.id("users"),
    direction: v.optional(v.union(v.literal("host_to_renter"), v.literal("renter_to_host"))),
  },
  async handler(ctx, args) {
    const rows = args.direction
      ? await ctx.db
          .query("booking_reviews")
          .withIndex("by_target_direction", (q) =>
            q.eq("targetUserId", args.userId).eq("direction", args.direction!),
          )
          .collect()
      : await ctx.db
          .query("booking_reviews")
          .withIndex("by_target", (q) => q.eq("targetUserId", args.userId))
          .collect();

    const count = rows.length;
    const average = count
      ? Number((rows.reduce((sum, row) => sum + row.rating, 0) / count).toFixed(2))
      : 0;
    const distribution = {
      1: rows.filter((r) => r.rating === 1).length,
      2: rows.filter((r) => r.rating === 2).length,
      3: rows.filter((r) => r.rating === 3).length,
      4: rows.filter((r) => r.rating === 4).length,
      5: rows.filter((r) => r.rating === 5).length,
    };

    return {
      count,
      average,
      distribution,
    };
  },
});
