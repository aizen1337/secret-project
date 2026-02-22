import { v } from "convex/values";
import { internalAction, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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
    throw new Error(payload?.error?.message ?? "Stripe transfer request failed.");
  }
  return payload;
}

export const markBookingCompletedAndEligibleInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found.");

    const booking = await ctx.db.get(payment.bookingId);
    if (!booking) throw new Error("Booking not found.");

    if (payment.status === "disputed" || payment.status === "refunded" || payment.status === "partially_refunded") {
      await ctx.db.patch(payment._id, { payoutStatus: "blocked", updatedAt: Date.now() });
      return { eligible: false, reason: "blocked_by_payment_status" } as const;
    }
    if (payment.status !== "paid") {
      return { eligible: false, reason: "payment_not_paid" } as const;
    }
    if (Date.now() < payment.releaseAt) {
      return { eligible: false, reason: "release_time_not_reached" } as const;
    }

    if (booking.status !== "completed") {
      await ctx.db.patch(booking._id, {
        status: "completed",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    if (
      (payment.paymentStrategy ?? "platform_transfer_fallback") === "platform_transfer_fallback" &&
      payment.payoutStatus !== "transferred"
    ) {
      await ctx.db.patch(payment._id, {
        payoutStatus: "eligible",
        updatedAt: Date.now(),
      });
    }

    return { eligible: true } as const;
  },
});

export const releaseHostPayoutInternal = internalAction({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const gate = await ctx.runMutation(internal.stripePayouts.markBookingCompletedAndEligibleInternal, {
      paymentId: args.paymentId,
    });
    if (!gate.eligible) {
      return { released: false, reason: gate.reason };
    }

    const payment = await ctx.runQuery(internal.stripePayouts.getPaymentForPayoutInternal, {
      paymentId: args.paymentId,
    });
    if (!payment) {
      throw new Error("Payment not found for payout.");
    }
    if (payment.payoutStatus === "transferred") {
      return { released: true, transferId: payment.stripeTransferId };
    }
    if ((payment.paymentStrategy ?? "platform_transfer_fallback") !== "platform_transfer_fallback") {
      return { released: true, reason: "not_transfer_strategy" };
    }
    if (!payment.hostStripeConnectAccountId) {
      await ctx.runMutation(internal.stripe.updatePaymentPayoutErrorInternal, {
        paymentId: payment._id,
      });
      return { released: false, reason: "missing_host_connect_account" };
    }
    if (!payment.hostStripePayoutsEnabled) {
      await ctx.runMutation(internal.stripe.updatePaymentPayoutBlockedInternal, {
        paymentId: payment._id,
      });
      return { released: false, reason: "host_payouts_disabled" };
    }

    try {
      const transfer = await stripeFormRequest(
        "transfers",
        new URLSearchParams({
          amount: String(Math.round(payment.hostAmount * 100)),
          currency: payment.currency,
          destination: payment.hostStripeConnectAccountId,
          "metadata[paymentId]": String(payment._id),
          "metadata[bookingId]": String(payment.bookingId),
        }),
        `payment-${String(payment._id)}-release-${String(payment.releaseAt)}`,
      );

      await ctx.runMutation(internal.stripe.markPaymentTransferredInternal, {
        paymentId: payment._id,
        stripeTransferId: transfer.id as string,
      });
      return { released: true, transferId: transfer.id as string };
    } catch {
      await ctx.runMutation(internal.stripe.updatePaymentPayoutErrorInternal, {
        paymentId: payment._id,
      });
      return { released: false, reason: "transfer_failed" };
    }
  },
});

export const getPaymentForPayoutInternal = query({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return null;
    const host = await ctx.db.get(payment.hostId);
    return {
      ...payment,
      hostStripeConnectAccountId: host?.stripeConnectAccountId,
      hostStripePayoutsEnabled: host?.stripePayoutsEnabled ?? false,
    };
  },
});
