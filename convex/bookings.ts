import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { mapClerkUser } from "./userMapper";
import { assertCarIsBookable } from "./guards/bookingGuard";

export const createBooking = mutation({
  args: {
    carId: v.id("cars"),
    startDate: v.string(),
    endDate: v.string(),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);

    const car = await assertCarIsBookable(
      ctx,
      args.carId,
      args
    );

    const days =
      (new Date(args.endDate).getTime() -
        new Date(args.startDate).getTime()) /
        (1000 * 60 * 60 * 24) +
      1;

    return await ctx.db.insert("bookings", {
      carId: car._id,
      renterId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      totalPrice: days * car.pricePerDay,
      createdAt: Date.now(),
    });
  },
});
