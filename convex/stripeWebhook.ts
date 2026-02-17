"use node";

import crypto from "node:crypto";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: any;
  };
};

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const pairs = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = pairs.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = pairs.find((p) => p.startsWith("v1="))?.slice(3);
  if (!timestamp || !v1) return false;
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(v1);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

async function reverseTransferIfNeeded(ctx: any, stripeChargeId: string) {
  const payment = await ctx.runQuery(internal.stripe.getPaymentByChargeIdInternal, {
    stripeChargeId,
  });
  if (!payment?.stripeTransferId || payment.payoutStatus !== "transferred") {
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return;

  const response = await fetch(
    `https://api.stripe.com/v1/transfers/${payment.stripeTransferId}/reversals`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(Math.round(payment.hostAmount * 100)),
      }).toString(),
    },
  );
  const payload = await response.json();
  if (!response.ok || !payload?.id) return;

  await ctx.runMutation(internal.stripe.markPaymentReversedInternal, {
    paymentId: payment._id,
    stripeTransferReversalId: payload.id as string,
  });
}

export const handleStripeWebhookInternal = internalAction({
  args: {
    rawBody: v.string(),
    signatureHeader: v.string(),
  },
  async handler(ctx, args): Promise<{ ok: boolean; status: number; message: string }> {
    if (process.env.ENABLE_CONNECT_PAYOUTS === "false") {
      return { ok: true, status: 200, message: "Connect payouts disabled." };
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { ok: false, status: 500, message: "Missing STRIPE_WEBHOOK_SECRET." };
    }

    if (!verifyStripeSignature(args.rawBody as string, args.signatureHeader as string, webhookSecret)) {
      return { ok: false, status: 400, message: "Invalid Stripe signature." };
    }

    const event = JSON.parse(args.rawBody as string) as StripeEvent;
    const object = event.data?.object ?? {};

    switch (event.type) {
      case "checkout.session.completed": {
        await ctx.runMutation(internal.stripe.markPaymentPaidByCheckoutSessionInternal, {
          stripeCheckoutSessionId: object.id as string,
          stripePaymentIntentId:
            typeof object.payment_intent === "string" ? object.payment_intent : undefined,
          stripeChargeId:
            typeof object.charge === "string" ? object.charge : undefined,
          eventId: event.id,
        });
        break;
      }
      case "payment_intent.payment_failed": {
        if (typeof object.id === "string") {
          await ctx.runMutation(internal.stripe.markPaymentFailedByIntentInternal, {
            stripePaymentIntentId: object.id,
            eventId: event.id,
          });
        }
        break;
      }
      case "charge.succeeded": {
        if (typeof object.payment_intent === "string" && typeof object.id === "string") {
          await ctx.runMutation(internal.stripe.attachChargeToPaymentIntentInternal, {
            stripePaymentIntentId: object.payment_intent,
            stripeChargeId: object.id,
            eventId: event.id,
          });
        }
        break;
      }
      case "charge.refunded":
      case "charge.refund.updated": {
        if (typeof object.id === "string") {
          const refunded = Number(object.amount_refunded ?? 0);
          const captured = Number(object.amount_captured ?? object.amount ?? 0);
          const status = refunded >= captured ? "refunded" : "partially_refunded";
          await ctx.runMutation(internal.stripe.markPaymentRefundOrDisputeInternal, {
            stripeChargeId: object.id,
            status,
            eventId: event.id,
          });
          await reverseTransferIfNeeded(ctx, object.id);
        }
        break;
      }
      case "charge.dispute.created": {
        if (typeof object.charge === "string") {
          await ctx.runMutation(internal.stripe.markPaymentRefundOrDisputeInternal, {
            stripeChargeId: object.charge,
            status: "disputed",
            eventId: event.id,
          });
          await reverseTransferIfNeeded(ctx, object.charge);
        }
        break;
      }
      case "account.updated": {
        if (typeof object.id === "string") {
          const host = await ctx.runQuery(internal.stripe.getHostByStripeConnectAccountIdInternal, {
            stripeConnectAccountId: object.id,
          });
          if (host) {
            await ctx.runMutation(internal.stripe.updateHostStripeStatusInternal, {
              hostId: host._id,
              stripeConnectAccountId: object.id,
              stripeOnboardingComplete: Boolean(object.details_submitted),
              stripeChargesEnabled: Boolean(object.charges_enabled),
              stripePayoutsEnabled: Boolean(object.payouts_enabled),
            });
          }
        }
        break;
      }
      default:
        break;
    }

    return { ok: true, status: 200, message: "ok" };
  },
});
