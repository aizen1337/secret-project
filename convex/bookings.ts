import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mapClerkUser } from "./userMapper";
import { assertCarIsBookable } from "./guards/bookingGuard";
import { assertRenterCanBook } from "./guards/renterVerificationGuard";
import { getBookingChatSendState } from "./bookingChat";

function canCancelReservation(booking: any, payment: any) {
  if (!booking) return false;
  if (booking.status === "cancelled" || booking.status === "completed") {
    return false;
  }
  if (
    booking.status !== "pending" &&
    booking.status !== "payment_pending" &&
    booking.status !== "payment_failed"
  ) {
    return false;
  }

  if (!payment) {
    return true;
  }

  return (
    payment.status === "method_collection_pending" ||
    payment.status === "method_saved" ||
    payment.status === "checkout_created" ||
    payment.status === "failed" ||
    payment.status === "cancelled"
  );
}

function canPayNowForBooking(booking: any, payment: any) {
  return Boolean(
    payment &&
      booking?.status === "payment_pending" &&
      payment.status === "method_saved" &&
      typeof payment.paymentDueAt === "number" &&
      Date.now() < payment.paymentDueAt,
  );
}

async function getChatMetaForBooking(
  ctx: any,
  booking: any,
  viewerRole: "host" | "renter",
) {
  const chat = await ctx.db
    .query("booking_chats")
    .withIndex("by_booking", (q: any) => q.eq("bookingId", booking._id))
    .first();
  const sendState = getBookingChatSendState(booking);

  const unreadCount =
    viewerRole === "host" ? Number(chat?.hostUnreadCount ?? 0) : Number(chat?.renterUnreadCount ?? 0);

  return {
    unreadCount,
    canSend: sendState.canSend,
    sendDisabledReason: sendState.sendDisabledReason,
    windowEndsAt: sendState.windowEndsAt,
  };
}

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) {
      return [];
    }
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_renter", (q) => q.eq("renterId", user._id))
      .collect();
    if (bookings.length === 0) {
      return [];
    }

    const carIds = Array.from(new Set(bookings.map((booking) => String(booking.carId))));
    const cars: any[] = await Promise.all(carIds.map((carId) => ctx.db.get(carId as any)));
    const carById = new Map<string, any>();
    for (let index = 0; index < carIds.length; index += 1) {
      carById.set(carIds[index], cars[index]);
    }

    const paymentIds = Array.from(
      new Set(
        bookings
          .map((booking) => booking.paymentId)
          .filter((paymentId): paymentId is any => Boolean(paymentId))
          .map((paymentId) => String(paymentId)),
      ),
    );
    const payments: any[] = await Promise.all(
      paymentIds.map((paymentId) => ctx.db.get(paymentId as any)),
    );
    const paymentById = new Map<string, any>();
    for (let index = 0; index < paymentIds.length; index += 1) {
      paymentById.set(paymentIds[index], payments[index]);
    }

    const hostIds = Array.from(
      new Set(
        cars
          .filter((car) => Boolean(car?.hostId))
          .map((car) => String(car.hostId)),
      ),
    );
    const hosts: any[] = await Promise.all(hostIds.map((hostId) => ctx.db.get(hostId as any)));
    const hostById = new Map<string, any>();
    for (let index = 0; index < hostIds.length; index += 1) {
      hostById.set(hostIds[index], hosts[index]);
    }

    const hostUserIds = Array.from(
      new Set(
        hosts
          .filter((host) => Boolean(host?.userId))
          .map((host) => String(host.userId)),
      ),
    );
    const hostUsers: any[] = await Promise.all(hostUserIds.map((userId) => ctx.db.get(userId as any)));
    const hostUserById = new Map<string, any>();
    for (let index = 0; index < hostUserIds.length; index += 1) {
      hostUserById.set(hostUserIds[index], hostUsers[index]);
    }

    const allMyReviews = await ctx.db
      .query("booking_reviews")
      .withIndex("by_author", (q) => q.eq("authorUserId", user._id))
      .collect();
    const reviewByBookingId = new Map<string, any>();
    for (const review of allMyReviews) {
      if (!reviewByBookingId.has(String(review.bookingId))) {
        reviewByBookingId.set(String(review.bookingId), review);
      }
    }

    const renterChats = await ctx.db
      .query("booking_chats")
      .withIndex("by_renter_updated", (q) => q.eq("renterUserId", user._id))
      .collect();
    const chatByBookingId = new Map<string, any>();
    for (const chat of renterChats) {
      chatByBookingId.set(String(chat.bookingId), chat);
    }

    const enriched = bookings.map((booking) => {
      const car = carById.get(String(booking.carId));
      const payment = booking.paymentId ? paymentById.get(String(booking.paymentId)) ?? null : null;
      const host = car ? hostById.get(String(car.hostId)) : null;
      const hostUser = host ? hostUserById.get(String(host.userId)) : null;
      const myReview = reviewByBookingId.get(String(booking._id)) ?? null;
      const chat = chatByBookingId.get(String(booking._id));
      const sendState = getBookingChatSendState(booking);
      const canPayNow = canPayNowForBooking(booking, payment);
      const canCancel = canCancelReservation(booking, payment);
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
        canCancel,
        chat: {
          unreadCount: Number(chat?.renterUnreadCount ?? 0),
          canSend: sendState.canSend,
        },
        myReview: myReview
          ? {
              id: myReview._id,
              rating: myReview.rating,
              comment: myReview.comment,
              direction: myReview.direction,
            }
          : null,
      };
    });

    return enriched.sort((a, b) => b.booking.createdAt - a.booking.createdAt);
  },
});

export const getBookingDetails = query({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) {
      return null;
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return null;
    }

    const car = await ctx.db.get(booking.carId);
    if (!car) {
      return null;
    }

    const host = await ctx.db.get(car.hostId);
    if (!host) {
      return null;
    }

    const isRenter = String(booking.renterId) === String(user._id);
    const isHost = String(host.userId) === String(user._id);
    if (!isRenter && !isHost) {
      return null;
    }

    const hostUser = await ctx.db.get(host.userId);
    const renterUser = await ctx.db.get(booking.renterId);
    const payment =
      (booking.paymentId ? await ctx.db.get(booking.paymentId) : null) ??
      (await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
        .first());
    const canCancel = canCancelReservation(booking, payment);
    const canPayNow = isRenter ? canPayNowForBooking(booking, payment) : false;
    const chat = await getChatMetaForBooking(ctx, booking, isHost ? "host" : "renter");

    return {
      viewerRole: isHost ? "host" : "renter",
      booking: {
        id: booking._id,
        status: booking.status,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt ?? null,
      },
      car: {
        id: car._id,
        title: car.title,
        make: car.make,
        model: car.model,
        year: car.year,
        pricePerDay: car.pricePerDay,
        images: car.images,
        formattedAddress: car.formattedAddress ?? null,
        location: car.location,
      },
      hostUser: hostUser
        ? {
            id: hostUser._id,
            name: hostUser.name,
            imageUrl: hostUser.imageUrl ?? null,
          }
        : null,
      renterUser: renterUser
        ? {
            id: renterUser._id,
            name: renterUser.name,
            imageUrl: renterUser.imageUrl ?? null,
          }
        : null,
      payment: payment
        ? {
            id: payment._id,
            status: payment.status,
            payoutStatus: payment.payoutStatus,
            depositStatus: payment.depositStatus ?? "not_applicable",
            currency: payment.currency,
            rentalAmount: payment.rentalAmount,
            platformFeeAmount: payment.platformFeeAmount,
            hostAmount: payment.hostAmount,
            depositAmount: payment.depositAmount ?? 0,
            totalAmount:
              payment.rentalAmount + payment.platformFeeAmount + Number(payment.depositAmount ?? 0),
            paymentDueAt: payment.paymentDueAt ?? null,
            releaseAt: payment.releaseAt,
            depositClaimWindowEndsAt: payment.depositClaimWindowEndsAt ?? null,
          }
        : null,
      canCancel,
      canPayNow,
      chat: {
        unreadCount: chat.unreadCount,
        canSend: chat.canSend,
        sendDisabledReason: chat.sendDisabledReason,
        windowEndsAt: chat.windowEndsAt,
      },
    };
  },
});

export const listHostBookingsWithPayouts = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) {
      return [];
    }
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!host) {
      return [];
    }
    const cars = await ctx.db
      .query("cars")
      .withIndex("by_host", (q) => q.eq("hostId", host._id))
      .collect();
    const carIds = new Set(cars.map((car) => String(car._id)));

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_host_payout_status", (q) => q.eq("hostId", host._id))
      .collect();
    const scopedPayments = payments.filter((payment) => carIds.has(String(payment.carId)));
    if (scopedPayments.length === 0) {
      return [];
    }

    const bookingIds = Array.from(new Set(scopedPayments.map((payment) => String(payment.bookingId))));
    const bookings: any[] = await Promise.all(bookingIds.map((bookingId) => ctx.db.get(bookingId as any)));
    const bookingById = new Map<string, any>();
    for (let index = 0; index < bookingIds.length; index += 1) {
      bookingById.set(bookingIds[index], bookings[index]);
    }

    const paymentCarIds = Array.from(new Set(scopedPayments.map((payment) => String(payment.carId))));
    const paymentCars: any[] = await Promise.all(
      paymentCarIds.map((carId) => ctx.db.get(carId as any)),
    );
    const carById = new Map<string, any>();
    for (let index = 0; index < paymentCarIds.length; index += 1) {
      carById.set(paymentCarIds[index], paymentCars[index]);
    }

    const renterIds = Array.from(
      new Set(
        bookings
          .filter((booking) => Boolean(booking?.renterId))
          .map((booking) => String(booking.renterId)),
      ),
    );
    const renters: any[] = await Promise.all(renterIds.map((renterId) => ctx.db.get(renterId as any)));
    const renterById = new Map<string, any>();
    for (let index = 0; index < renterIds.length; index += 1) {
      renterById.set(renterIds[index], renters[index]);
    }

    const openDepositCases = await ctx.db
      .query("deposit_cases")
      .withIndex("by_host", (q) => q.eq("hostId", host._id))
      .collect();
    const openCasePaymentIds = new Set<string>();
    for (const depositCase of openDepositCases) {
      if (
        depositCase.status === "open" ||
        depositCase.status === "under_review" ||
        depositCase.status === "approved" ||
        depositCase.status === "partially_approved"
      ) {
        openCasePaymentIds.add(String(depositCase.paymentId));
      }
    }

    const hostChats = await ctx.db
      .query("booking_chats")
      .withIndex("by_host_updated", (q) => q.eq("hostUserId", host.userId))
      .collect();
    const chatByBookingId = new Map<string, any>();
    for (const chat of hostChats) {
      chatByBookingId.set(String(chat.bookingId), chat);
    }

    const hostReviews = await ctx.db
      .query("booking_reviews")
      .withIndex("by_author", (q) => q.eq("authorUserId", host.userId))
      .collect();
    const reviewByBookingId = new Map<string, any>();
    for (const review of hostReviews) {
      if (!reviewByBookingId.has(String(review.bookingId))) {
        reviewByBookingId.set(String(review.bookingId), review);
      }
    }

    const enriched = scopedPayments.map((payment) => {
      const booking = bookingById.get(String(payment.bookingId)) ?? null;
      const car = carById.get(String(payment.carId)) ?? null;
      const renter = booking ? renterById.get(String(booking.renterId)) ?? null : null;
      const canFileDepositCase = Boolean(
        booking &&
          booking.status === "completed" &&
          Number(payment.depositAmount ?? 0) > 0 &&
          payment.depositStatus === "held" &&
          typeof payment.depositClaimWindowEndsAt === "number" &&
          Date.now() < payment.depositClaimWindowEndsAt &&
          !openCasePaymentIds.has(String(payment._id)),
      );
      const canCancel = canCancelReservation(booking, payment);
      const sendState = booking ? getBookingChatSendState(booking) : { canSend: false };
      const chat = booking ? chatByBookingId.get(String(booking._id)) : null;
      const myReview = booking ? reviewByBookingId.get(String(booking._id)) ?? null : null;
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
        canCancel,
        chat: {
          unreadCount: Number(chat?.hostUnreadCount ?? 0),
          canSend: Boolean(sendState.canSend),
        },
        car: car
          ? {
              id: car._id,
              title: car.title,
              make: car.make,
              model: car.model,
              images: car.images,
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
    });

    return enriched.sort((a, b) => b.payment.createdAt - a.payment.createdAt);
  },
});

export const cancelReservation = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("NOT_FOUND: Booking not found.");
    }

    const car = await ctx.db.get(booking.carId);
    if (!car) {
      throw new Error("NOT_FOUND: Car not found for booking.");
    }

    const host = await ctx.db.get(car.hostId);
    if (!host) {
      throw new Error("NOT_FOUND: Host not found for booking.");
    }

    const isRenter = String(booking.renterId) === String(user._id);
    const isHost = String(host.userId) === String(user._id);
    if (!isRenter && !isHost) {
      throw new Error("UNAUTHORIZED: You cannot cancel this reservation.");
    }

    if (booking.status === "cancelled") {
      return { ok: true, alreadyCancelled: true };
    }

    const payment = booking.paymentId ? await ctx.db.get(booking.paymentId) : null;
    if (!canCancelReservation(booking, payment)) {
      throw new Error("INVALID_INPUT: This reservation cannot be cancelled.");
    }

    const now = Date.now();
    await ctx.db.patch(booking._id, {
      status: "cancelled",
      updatedAt: now,
    });

    if (payment && payment.status !== "cancelled") {
      await ctx.db.patch(payment._id, {
        status: "cancelled",
        payoutStatus: "blocked",
        updatedAt: now,
      });
    }

    return { ok: true, alreadyCancelled: false };
  },
});
