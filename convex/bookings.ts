import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mapClerkUser } from "./userMapper";
import { assertCarIsBookable } from "./guards/bookingGuard";
import { mapHost } from "./hostMapper";
import { assertRenterCanBook } from "./guards/renterVerificationGuard";

export const createBooking = mutation({
  args: {
    carId: v.id("cars"),
    startDate: v.string(),
    endDate: v.string(),
  },
  async handler(ctx, args) {
    await assertRenterCanBook(ctx);
    const user = await mapClerkUser(ctx);

    const car = await assertCarIsBookable(
      ctx,
      args.carId,
      args
    );
    const host = (await ctx.db.get(car.hostId as any)) as any;
    if (!host) {
      throw new Error("NOT_FOUND: Host not found.");
    }
    if (String(host.userId) === String(user._id)) {
      throw new Error("UNAUTHORIZED: You cannot book your own listing.");
    }

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
      status: "payment_pending",
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
        const host = car ? await ctx.db.get(car.hostId) : null;
        const hostUser = host ? await ctx.db.get(host.userId) : null;
        const myReview = await ctx.db
          .query("booking_reviews")
          .withIndex("by_booking_author", (q) =>
            q.eq("bookingId", booking._id).eq("authorUserId", user._id),
          )
          .first();
        const canPayNow = Boolean(
          payment &&
            booking.status === "payment_pending" &&
            payment.status === "method_saved" &&
            typeof payment.paymentDueAt === "number" &&
            Date.now() < payment.paymentDueAt,
        );
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
          hostUser: hostUser
            ? {
                id: hostUser._id,
                name: hostUser.name,
                imageUrl: hostUser.imageUrl,
              }
            : null,
          payment: payment
            ? {
                status: payment.status,
                payoutStatus: payment.payoutStatus,
                releaseAt: payment.releaseAt,
                hostAmount: payment.hostAmount,
                paymentDueAt: payment.paymentDueAt ?? null,
                depositStatus: payment.depositStatus ?? "not_applicable",
                depositClaimWindowEndsAt: payment.depositClaimWindowEndsAt ?? null,
                depositAmount: payment.depositAmount ?? 0,
              }
            : null,
          canPayNow,
          myReview: myReview
            ? {
                id: myReview._id,
                rating: myReview.rating,
                comment: myReview.comment,
                direction: myReview.direction,
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
          const renter = booking ? await ctx.db.get(booking.renterId) : null;
          const openDepositCase = await ctx.db
            .query("deposit_cases")
            .withIndex("by_payment", (q) => q.eq("paymentId", payment._id))
            .filter((q) =>
              q.or(
                q.eq(q.field("status"), "open"),
                q.eq(q.field("status"), "under_review"),
                q.eq(q.field("status"), "approved"),
                q.eq(q.field("status"), "partially_approved"),
              ),
            )
            .first();
          const canFileDepositCase = Boolean(
            booking &&
              booking.status === "completed" &&
              Number(payment.depositAmount ?? 0) > 0 &&
              payment.depositStatus === "held" &&
              typeof payment.depositClaimWindowEndsAt === "number" &&
              Date.now() < payment.depositClaimWindowEndsAt &&
              !openDepositCase,
          );
          const myReview = booking
            ? await ctx.db
                .query("booking_reviews")
                .withIndex("by_booking_author", (q) =>
                  q.eq("bookingId", booking._id).eq("authorUserId", host.userId),
                )
                .first()
            : null;
          return {
            payment: {
              ...payment,
              paymentDueAt: payment.paymentDueAt ?? null,
              depositStatus: payment.depositStatus ?? "not_applicable",
              depositClaimWindowEndsAt: payment.depositClaimWindowEndsAt ?? null,
              depositAmount: payment.depositAmount ?? 0,
            },
            booking,
            canFileDepositCase,
            car: car
              ? {
                  id: car._id,
                  title: car.title,
                  make: car.make,
                  model: car.model,
                }
              : null,
            renter: renter
              ? {
                  id: renter._id,
                  name: renter.name,
                  imageUrl: renter.imageUrl,
                }
              : null,
            myReview: myReview
              ? {
                  id: myReview._id,
                  rating: myReview.rating,
                  comment: myReview.comment,
                  direction: myReview.direction,
                }
              : null,
          };
        }),
    );

    return enriched.sort((a, b) => b.payment.createdAt - a.payment.createdAt);
  },
});
