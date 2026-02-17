import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { mapClerkUser } from "./userMapper";
import { assertCarIsBookable } from "./guards/bookingGuard";
import { query } from "./_generated/server";
import { mapHost } from "./hostMapper";

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

export const listMyTripsWithPayments = query({
  args: {},
  async handler(ctx) {
    const user = await mapClerkUser(ctx);
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_renter", (q) => q.eq("renterId", user._id))
      .collect();

    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const car = await ctx.db.get(booking.carId);
        const payment = booking.paymentId ? await ctx.db.get(booking.paymentId) : null;
        return {
          booking,
          car: car
            ? {
                id: car._id,
                title: car.title,
                make: car.make,
                model: car.model,
                images: car.images,
              }
            : null,
          payment: payment
            ? {
                status: payment.status,
                payoutStatus: payment.payoutStatus,
                releaseAt: payment.releaseAt,
                hostAmount: payment.hostAmount,
              }
            : null,
        };
      }),
    );

    return enriched.sort((a, b) => b.booking.createdAt - a.booking.createdAt);
  },
});

export const listHostBookingsWithPayouts = query({
  args: {},
  async handler(ctx) {
    const host = await mapHost(ctx);
    const cars = await ctx.db
      .query("cars")
      .withIndex("by_host", (q) => q.eq("hostId", host._id))
      .collect();
    const carIds = new Set(cars.map((car) => String(car._id)));

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_host_payout_status", (q) => q.eq("hostId", host._id))
      .collect();

    const enriched = await Promise.all(
      payments
        .filter((payment) => carIds.has(String(payment.carId)))
        .map(async (payment) => {
          const booking = await ctx.db.get(payment.bookingId);
          const car = await ctx.db.get(payment.carId);
          return {
            payment,
            booking,
            car: car
              ? {
                  id: car._id,
                  title: car.title,
                  make: car.make,
                  model: car.model,
                }
              : null,
          };
        }),
    );

    return enriched.sort((a, b) => b.payment.createdAt - a.payment.createdAt);
  },
});
