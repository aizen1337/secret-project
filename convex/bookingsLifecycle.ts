import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const completeBookingIfEndedInternal = internalMutation({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return { completed: false, reason: "not_found" as const };

    const tripEnd = new Date(booking.endDate).getTime();
    if (!Number.isFinite(tripEnd) || Date.now() < tripEnd) {
      return { completed: false, reason: "trip_not_ended" as const };
    }

    if (booking.status === "completed") {
      return { completed: true, reason: "already_completed" as const };
    }

    await ctx.db.patch(booking._id, {
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { completed: true, reason: "completed" as const };
  },
});
