import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { mapHost } from "./hostMapper";

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

export const fileHostDepositCase = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.string(),
    requestedAmount: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const host = await mapHost(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("NOT_FOUND: Booking not found.");
    }
    const payment = booking.paymentId
      ? await ctx.db.get(booking.paymentId)
      : await ctx.db
          .query("payments")
          .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
          .first();
    if (!payment) {
      throw new Error("NOT_FOUND: Payment not found.");
    }
    if (String(payment.hostId) !== String(host._id)) {
      throw new Error("UNAUTHORIZED: You do not own this booking.");
    }
    if (booking.status !== "completed") {
      throw new Error("INVALID_INPUT: Deposit case can be filed only after trip completion.");
    }
    const depositAmount = Number(payment.depositAmount ?? 0);
    if (depositAmount <= 0) {
      throw new Error("INVALID_INPUT: This booking has no deposit.");
    }
    if (payment.depositStatus !== "held") {
      throw new Error("INVALID_INPUT: Deposit is not eligible for new case.");
    }
    if (typeof payment.depositClaimWindowEndsAt === "number" && Date.now() > payment.depositClaimWindowEndsAt) {
      throw new Error("INVALID_INPUT: Deposit claim window has ended.");
    }

    const existingCase = await ctx.db
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
    if (existingCase) {
      throw new Error("INVALID_INPUT: A deposit case already exists for this booking.");
    }

    const requestedAmount = Math.max(
      0,
      Math.min(typeof args.requestedAmount === "number" ? args.requestedAmount : depositAmount, depositAmount),
    );
    const now = Date.now();
    const caseId = await ctx.db.insert("deposit_cases", {
      paymentId: payment._id,
      bookingId: booking._id,
      hostId: host._id,
      renterId: booking.renterId,
      requestedAmount,
      status: "open",
      reason: args.reason.trim() || "No reason provided",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(payment._id, {
      depositStatus: "case_submitted",
      updatedAt: now,
    });
    return {
      caseId,
      paymentId: payment._id,
      bookingId: booking._id,
      requestedAmount,
    };
  },
});

export const listOpenDepositCasesForPaymentInternal = query({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("deposit_cases")
      .withIndex("by_payment", (q) => q.eq("paymentId", args.paymentId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "under_review"),
          q.eq(q.field("status"), "approved"),
          q.eq(q.field("status"), "partially_approved"),
        ),
      )
      .collect();
  },
});

export const autoRefundDepositIfNoCaseInternal = internalAction({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const payment = await ctx.runQuery(internal.stripe.getPaymentForCaptureInternal, {
      paymentId: args.paymentId,
    });
    if (!payment) {
      return { refunded: false, reason: "payment_not_found" } as const;
    }
    const depositAmount = Number(payment.depositAmount ?? 0);
    if (depositAmount <= 0) {
      return { refunded: false, reason: "no_deposit" } as const;
    }
    if (payment.depositStatus !== "held") {
      return { refunded: false, reason: "deposit_not_held" } as const;
    }
    if (typeof payment.depositClaimWindowEndsAt === "number" && Date.now() < payment.depositClaimWindowEndsAt) {
      return { refunded: false, reason: "claim_window_not_reached" } as const;
    }

    const existingCases = await ctx.runQuery((internal as any).depositCases.listOpenDepositCasesForPaymentInternal, {
      paymentId: payment._id,
    });
    if (existingCases.length > 0) {
      await ctx.runMutation((internal as any).depositCases.markDepositStatusCaseSubmittedInternal, {
        paymentId: payment._id,
      });
      return { refunded: false, reason: "case_exists" } as const;
    }

    if (!payment.stripeChargeId && !payment.stripePaymentIntentId) {
      await ctx.runMutation((internal as any).depositCases.markDepositStatusCaseSubmittedInternal, {
        paymentId: payment._id,
      });
      return { refunded: false, reason: "missing_stripe_charge_reference" } as const;
    }

    await ctx.runMutation((internal as any).depositCases.markDepositStatusRefundPendingInternal, {
      paymentId: payment._id,
    });
    try {
      const body = new URLSearchParams({
        amount: String(Math.round(depositAmount * 100)),
        "metadata[paymentId]": String(payment._id),
        "metadata[refundKind]": "deposit_auto_refund",
      });
      if (payment.stripeChargeId) {
        body.set("charge", payment.stripeChargeId);
      } else if (payment.stripePaymentIntentId) {
        body.set("payment_intent", payment.stripePaymentIntentId);
      }

      await stripeFormRequest(
        "refunds",
        body,
        `deposit-refund-${String(payment._id)}-${String(payment.depositClaimWindowEndsAt ?? payment.releaseAt)}`,
      );

      await ctx.runMutation((internal as any).depositCases.markDepositRefundedInternal, {
        paymentId: payment._id,
        amount: depositAmount,
      });
      return { refunded: true } as const;
    } catch (error) {
      await ctx.runMutation((internal as any).depositCases.markDepositStatusCaseSubmittedInternal, {
        paymentId: payment._id,
      });
      return {
        refunded: false,
        reason: error instanceof Error ? error.message : "refund_failed",
      } as const;
    }
  },
});

export const markDepositStatusRefundPendingInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return;
    await ctx.db.patch(args.paymentId, {
      depositStatus: "refund_pending",
      updatedAt: Date.now(),
    });
  },
});

export const markDepositRefundedInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    amount: v.number(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return;
    await ctx.db.patch(args.paymentId, {
      depositStatus: "refunded",
      depositRefundAmount: args.amount,
      updatedAt: Date.now(),
    });
  },
});

export const markDepositStatusCaseSubmittedInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return;
    await ctx.db.patch(args.paymentId, {
      depositStatus: "case_submitted",
      updatedAt: Date.now(),
    });
  },
});

export const resolveDepositCaseInternal = internalMutation({
  args: {
    caseId: v.id("deposit_cases"),
    resolution: v.union(v.literal("approve"), v.literal("partial"), v.literal("reject")),
    resolutionAmount: v.optional(v.number()),
    reviewerNote: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const depositCase = await ctx.db.get(args.caseId);
    if (!depositCase) {
      throw new Error("NOT_FOUND: Deposit case not found.");
    }
    const payment = await ctx.db.get(depositCase.paymentId);
    if (!payment) {
      throw new Error("NOT_FOUND: Payment not found.");
    }

    const now = Date.now();
    const requested = Number(depositCase.requestedAmount ?? 0);
    const maxDeposit = Number(payment.depositAmount ?? requested);
    const resolvedAmount = Math.max(
      0,
      Math.min(
        typeof args.resolutionAmount === "number"
          ? args.resolutionAmount
          : args.resolution === "approve"
            ? requested
            : args.resolution === "partial"
              ? requested / 2
              : 0,
        maxDeposit,
      ),
    );

    const status =
      args.resolution === "approve"
        ? "approved"
        : args.resolution === "partial"
          ? "partially_approved"
          : "rejected";

    await ctx.db.patch(depositCase._id, {
      status,
      resolutionAmount: resolvedAmount,
      reason:
        args.reviewerNote && args.reviewerNote.trim()
          ? `${depositCase.reason}\n[Support note] ${args.reviewerNote.trim()}`
          : depositCase.reason,
      updatedAt: now,
    });

    // Placeholder only: support resolution does not execute transfers/refunds yet.
    await ctx.db.patch(payment._id, {
      depositStatus:
        args.resolution === "approve"
          ? "retained"
          : args.resolution === "partial"
            ? "partially_refunded"
            : "refunded",
      updatedAt: now,
    });

    return {
      caseId: depositCase._id,
      status,
      resolutionAmount: resolvedAmount,
    };
  },
});
