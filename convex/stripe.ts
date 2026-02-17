import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { mapClerkUser } from "./userMapper";

function getStripeSecretKey() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in Convex environment.");
  }
  return stripeSecretKey;
}

async function stripeFormRequest(path: string, body: URLSearchParams, idempotencyKey?: string) {
  const stripeSecretKey = getStripeSecretKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeSecretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers,
    body: body.toString(),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Stripe request failed.");
  }
  return payload;
}

export const createCheckoutSession = action({
  args: {
    carId: v.string(),
    carName: v.string(),
    pricePerDay: v.number(),
    days: v.number(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  async handler(ctx, args) {
    if (process.env.ENABLE_CONNECT_PAYOUTS === "false") {
      throw new Error("Connect payouts are currently disabled.");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to continue checkout.");
    }

    if (!Number.isInteger(args.days) || args.days < 1) {
      throw new Error("Booking days must be at least 1.");
    }
    if (!Number.isFinite(args.pricePerDay) || args.pricePerDay <= 0) {
      throw new Error("Invalid daily price.");
    }

    const now = new Date();
    const defaultStart = new Date(now);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + args.days - 1);
    const startDate = args.startDate ?? defaultStart.toISOString();
    const endDate = args.endDate ?? defaultEnd.toISOString();
    const releaseAt = new Date(endDate).getTime();
    if (!Number.isFinite(releaseAt)) {
      throw new Error("Invalid trip dates for payout release.");
    }

    const subtotal = args.pricePerDay * args.days;
    const serviceFee = Math.round(subtotal * 0.1);
    const hostAmount = subtotal - serviceFee;

    const pending = await ctx.runMutation(internal.stripe.createPendingBookingPaymentInternal, {
      carId: args.carId,
      startDate,
      endDate,
      rentalAmount: subtotal,
      platformFeeAmount: serviceFee,
      hostAmount,
      currency: "usd",
      releaseAt,
    });

    const body = new URLSearchParams({
      mode: "payment",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(subtotal * 100),
      "line_items[0][price_data][product_data][name]": `${args.carName} rental (${args.days} days)`,
      "line_items[0][quantity]": "1",
      "line_items[1][price_data][currency]": "usd",
      "line_items[1][price_data][unit_amount]": String(serviceFee * 100),
      "line_items[1][price_data][product_data][name]": "Service fee (10%)",
      "line_items[1][quantity]": "1",
      "metadata[paymentId]": String(pending.paymentId),
      "metadata[bookingId]": String(pending.bookingId),
      "metadata[carId]": args.carId,
      "metadata[hostId]": String(pending.hostId),
      "metadata[renterId]": String(pending.renterId),
      "metadata[days]": String(args.days),
      "metadata[subtotal]": String(subtotal),
      "metadata[serviceFee]": String(serviceFee),
      "metadata[hostAmount]": String(hostAmount),
      "metadata[releaseAt]": String(releaseAt),
      client_reference_id: identity.subject,
    });

    const payload = await stripeFormRequest(
      "checkout/sessions",
      body,
      `checkout-${String(pending.paymentId)}`,
    );

    await ctx.runMutation(internal.stripe.attachCheckoutSessionInternal, {
      paymentId: pending.paymentId,
      bookingId: pending.bookingId,
      stripeCheckoutSessionId: payload.id as string,
    });

    return {
      url: payload.url as string,
      subtotal,
      serviceFee,
      hostAmount,
      total: subtotal + serviceFee,
      bookingId: pending.bookingId,
      paymentId: pending.paymentId,
    };
  },
});

export const createPendingBookingPaymentInternal = internalMutation({
  args: {
    carId: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    rentalAmount: v.number(),
    platformFeeAmount: v.number(),
    hostAmount: v.number(),
    currency: v.string(),
    releaseAt: v.number(),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const car = await ctx.db.get(args.carId as any);
    if (!car || !car.isActive) {
      throw new Error("Car not available.");
    }
    const host = await ctx.db.get(car.hostId);
    if (!host) {
      throw new Error("Host not found.");
    }
    if (!host.stripeConnectAccountId || !host.stripeOnboardingComplete || !host.stripePayoutsEnabled) {
      throw new Error("Host has not completed payout onboarding yet.");
    }

    const bookingId = await ctx.db.insert("bookings", {
      carId: car._id,
      renterId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      totalPrice: args.rentalAmount,
      status: "payment_pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const paymentId = await ctx.db.insert("payments", {
      bookingId,
      carId: car._id,
      renterId: user._id,
      hostId: host._id,
      stripeCheckoutSessionId: "",
      currency: args.currency,
      rentalAmount: args.rentalAmount,
      platformFeeAmount: args.platformFeeAmount,
      hostAmount: args.hostAmount,
      status: "checkout_created",
      payoutStatus: "blocked",
      releaseAt: args.releaseAt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(bookingId, {
      paymentId,
      updatedAt: Date.now(),
    });

    return { bookingId, paymentId, hostId: host._id, renterId: user._id };
  },
});

export const attachCheckoutSessionInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    bookingId: v.id("bookings"),
    stripeCheckoutSessionId: v.string(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.paymentId, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(args.bookingId, {
      checkoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: Date.now(),
    });
  },
});

export const updateHostStripeStatusInternal = internalMutation({
  args: {
    hostId: v.id("hosts"),
    stripeConnectAccountId: v.string(),
    stripeOnboardingComplete: v.boolean(),
    stripeChargesEnabled: v.boolean(),
    stripePayoutsEnabled: v.boolean(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.hostId, {
      stripeConnectAccountId: args.stripeConnectAccountId,
      stripeOnboardingComplete: args.stripeOnboardingComplete,
      stripeChargesEnabled: args.stripeChargesEnabled,
      stripePayoutsEnabled: args.stripePayoutsEnabled,
      updatedAt: Date.now(),
    });
  },
});

export const markPaymentPaidByCheckoutSessionInternal = internalMutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_checkout_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .first();
    if (!payment) {
      return { ok: false, reason: "payment_not_found" } as const;
    }
    if (payment.lastWebhookEventId === args.eventId) {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt } as const;
    }

    await ctx.db.patch(payment._id, {
      status: "paid",
      payoutStatus: "eligible",
      stripePaymentIntentId: args.stripePaymentIntentId ?? payment.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
      lastWebhookEventId: args.eventId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(payment.bookingId, {
      status: "confirmed",
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAt(
      new Date(payment.releaseAt),
      internal.stripePayouts.releaseHostPayoutInternal,
      { paymentId: payment._id },
    );

    return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt } as const;
  },
});

export const markPaymentFailedByIntentInternal = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .first();
    if (!payment) return;
    if (payment.lastWebhookEventId === args.eventId) return;
    await ctx.db.patch(payment._id, {
      status: "failed",
      payoutStatus: "blocked",
      lastWebhookEventId: args.eventId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(payment.bookingId, {
      status: "payment_failed",
      updatedAt: Date.now(),
    });
  },
});

export const attachChargeToPaymentIntentInternal = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    stripeChargeId: v.string(),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .first();
    if (!payment) return;
    if (payment.lastWebhookEventId === args.eventId) return;
    await ctx.db.patch(payment._id, {
      stripeChargeId: args.stripeChargeId,
      lastWebhookEventId: args.eventId,
      updatedAt: Date.now(),
    });
  },
});

export const markPaymentRefundOrDisputeInternal = internalMutation({
  args: {
    stripeChargeId: v.string(),
    status: v.union(v.literal("refunded"), v.literal("partially_refunded"), v.literal("disputed")),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("stripeChargeId"), args.stripeChargeId))
      .first();
    if (!payment) return;
    if (payment.lastWebhookEventId === args.eventId) return;
    await ctx.db.patch(payment._id, {
      status: args.status,
      payoutStatus: "blocked",
      lastWebhookEventId: args.eventId,
      updatedAt: Date.now(),
    });
  },
});

export const markPaymentTransferredInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripeTransferId: v.string(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.paymentId, {
      payoutStatus: "transferred",
      stripeTransferId: args.stripeTransferId,
      updatedAt: Date.now(),
    });
  },
});

export const markPaymentReversedInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripeTransferReversalId: v.string(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.paymentId, {
      payoutStatus: "reversed",
      stripeTransferReversalId: args.stripeTransferReversalId,
      updatedAt: Date.now(),
    });
  },
});

export const updatePaymentPayoutErrorInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.paymentId, {
      payoutStatus: "error",
      updatedAt: Date.now(),
    });
  },
});

export const updatePaymentPayoutBlockedInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.paymentId, {
      payoutStatus: "blocked",
      updatedAt: Date.now(),
    });
  },
});

export const getPaymentByCheckoutSessionInternal = query({
  args: {
    stripeCheckoutSessionId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("payments")
      .withIndex("by_checkout_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .first();
  },
});

export const getPaymentByChargeIdInternal = query({
  args: {
    stripeChargeId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("stripeChargeId"), args.stripeChargeId))
      .first();
  },
});

export const getHostByStripeConnectAccountIdInternal = query({
  args: {
    stripeConnectAccountId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("hosts")
      .filter((q) => q.eq(q.field("stripeConnectAccountId"), args.stripeConnectAccountId))
      .first();
  },
});
