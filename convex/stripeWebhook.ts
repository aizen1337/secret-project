"use node";

import crypto from "node:crypto";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { stripeWebhookEvents } from "./stripeWebhookEvents";

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: any;
  };
};

type StripeWebhookEndpoint = {
  id: string;
  url: string;
  enabled_events?: string[];
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

async function reverseTransferIfNeeded(
  ctx: any,
  stripeChargeId: string,
  refundedAmountCents?: number,
  capturedAmountCents?: number,
) {
  const payment = await ctx.runQuery(internal.stripe.getPaymentByChargeIdInternal, {
    stripeChargeId,
  });
  if (!payment?.stripeTransferId || payment.payoutStatus !== "transferred") {
    return;
  }
  const depositAmountCents = Math.round(Number(payment.depositAmount ?? 0) * 100);
  const isExpectedDepositRefund =
    typeof refundedAmountCents === "number" &&
    refundedAmountCents > 0 &&
    depositAmountCents > 0 &&
    refundedAmountCents <= depositAmountCents &&
    (payment.depositStatus === "refund_pending" || payment.depositStatus === "held" || payment.depositStatus === "refunded");
  if (isExpectedDepositRefund) {
    return;
  }
  if (
    typeof refundedAmountCents === "number" &&
    typeof capturedAmountCents === "number" &&
    capturedAmountCents > 0 &&
    refundedAmountCents < capturedAmountCents
  ) {
    // Partial refund (such as expected deposit-only refund) should not reverse the full host transfer.
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

function getStripeSecretKey() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in Convex environment.");
  }
  return stripeSecretKey;
}

async function stripeRequest(method: "GET" | "POST", path: string, body?: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body?.toString() : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Stripe request failed.");
  }
  return payload;
}

function buildWebhookEventDiff(existing: string[], target: readonly string[]) {
  const existingSet = new Set(existing);
  const targetSet = new Set(target);
  const added = [...targetSet].filter((event) => !existingSet.has(event));
  const removed = [...existingSet].filter((event) => !targetSet.has(event));
  const unchanged = [...targetSet].filter((event) => existingSet.has(event));
  return { added, removed, unchanged };
}

export const setupWebhookEndpointInternal = internalAction({
  args: {},
  async handler() {
    const webhookUrl = process.env.STRIPE_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("Missing STRIPE_WEBHOOK_URL in Convex environment.");
    }

    const list = await stripeRequest("GET", "webhook_endpoints?limit=100");
    const endpoints = (list?.data ?? []) as StripeWebhookEndpoint[];
    const existing = endpoints.find((endpoint) => endpoint.url === webhookUrl);

    if (!existing) {
      const body = new URLSearchParams({ url: webhookUrl });
      stripeWebhookEvents.forEach((eventType, index) => {
        body.append(`enabled_events[${index}]`, eventType);
      });
      const created = (await stripeRequest("POST", "webhook_endpoints", body)) as StripeWebhookEndpoint & {
        secret?: string;
      };
      return {
        mode: "created" as const,
        endpointId: created.id,
        endpointUrl: webhookUrl,
        enabledEvents: stripeWebhookEvents,
        eventDiff: {
          added: [...stripeWebhookEvents],
          removed: [] as string[],
          unchanged: [] as string[],
        },
      };
    }

    const existingEvents = existing.enabled_events ?? [];
    const diff = buildWebhookEventDiff(existingEvents, stripeWebhookEvents);
    const updateBody = new URLSearchParams();
    stripeWebhookEvents.forEach((eventType, index) => {
      updateBody.append(`enabled_events[${index}]`, eventType);
    });
    await stripeRequest("POST", `webhook_endpoints/${existing.id}`, updateBody);

    return {
      mode: "updated" as const,
      endpointId: existing.id,
      endpointUrl: webhookUrl,
      enabledEvents: stripeWebhookEvents,
      eventDiff: diff,
    };
  },
});

export const setupWebhookEndpoint = action({
  args: {},
  async handler(ctx) {
    return await ctx.runAction(internal.stripeWebhook.setupWebhookEndpointInternal, {});
  },
});

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
        const sessionMode = typeof object.mode === "string" ? object.mode : "";
        if (sessionMode === "setup") {
          let setupIntentId =
            typeof object.setup_intent === "string" ? object.setup_intent : undefined;
          let paymentMethodId: string | undefined;
          let customerId: string | undefined =
            typeof object.customer === "string" ? object.customer : undefined;
          if (setupIntentId) {
            const details = await ctx.runAction((internal as any).stripe.fetchSetupIntentPaymentMethodInternal, {
              setupIntentId,
            });
            setupIntentId = details.setupIntentId;
            paymentMethodId = details.paymentMethodId ?? undefined;
            customerId = customerId ?? details.customerId ?? undefined;
          }
          await ctx.runMutation((internal as any).stripe.markPaymentMethodCollectedByCheckoutSessionInternal, {
            stripeCheckoutSessionId: object.id as string,
            stripeSetupIntentId: setupIntentId,
            stripePaymentMethodId: paymentMethodId,
            stripeCustomerId: customerId,
            eventId: event.id,
          });
          break;
        }

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
      case "checkout.session.expired": {
        if (typeof object.id === "string") {
          await ctx.runMutation((internal as any).stripe.markCheckoutSessionExpiredInternal, {
            stripeCheckoutSessionId: object.id,
            mode: typeof object.mode === "string" ? object.mode : undefined,
            eventId: event.id,
          });
        }
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
      case "payment_intent.amount_capturable_updated": {
        if (typeof object.id === "string") {
          await ctx.runMutation(internal.stripe.markPaymentCaptureStateByIntentInternal, {
            stripePaymentIntentId: object.id,
            captureStatus: "pending_capture",
            eventId: event.id,
          });
        }
        break;
      }
      case "payment_intent.canceled": {
        if (typeof object.id === "string") {
          const cancellationReason = String(object.cancellation_reason ?? "").toLowerCase();
          await ctx.runMutation(internal.stripe.markPaymentCaptureStateByIntentInternal, {
            stripePaymentIntentId: object.id,
            captureStatus: cancellationReason.includes("expired") ? "expired" : "capture_failed",
            eventId: event.id,
          });
        }
        break;
      }
      case "payment_intent.succeeded": {
        if (typeof object.id === "string") {
          await ctx.runMutation(internal.stripe.markPaymentCapturedByPaymentIntentInternal, {
            stripePaymentIntentId: object.id,
            stripeChargeId:
              typeof object.latest_charge === "string" ? object.latest_charge : undefined,
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
            refundedAmountCents: refunded,
            capturedAmountCents: captured,
          });
          await reverseTransferIfNeeded(ctx, object.id, refunded, captured);
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
      case "identity.verification_session.processing": {
        if (typeof object.id === "string") {
          const checkType =
            object?.metadata?.checkType === "driver_license" ||
            object?.metadata?.verificationType === "driver_license"
              ? "driver_license"
              : "identity";
          await ctx.runMutation(internal.verification.updateCheckFromProviderSessionInternal, {
            providerSessionId: object.id,
            subjectType: "renter",
            checkType,
            status: "pending",
          });
        }
        break;
      }
      case "identity.verification_session.verified": {
        if (typeof object.id === "string") {
          const checkType =
            object?.metadata?.checkType === "driver_license" ||
            object?.metadata?.verificationType === "driver_license"
              ? "driver_license"
              : "identity";
          await ctx.runMutation(internal.verification.updateCheckFromProviderSessionInternal, {
            providerSessionId: object.id,
            subjectType: "renter",
            checkType,
            status: "verified",
          });
        }
        break;
      }
      case "identity.verification_session.requires_input":
      case "identity.verification_session.canceled": {
        if (typeof object.id === "string") {
          const checkType =
            object?.metadata?.checkType === "driver_license" ||
            object?.metadata?.verificationType === "driver_license"
              ? "driver_license"
              : "identity";
          const rejectionReason =
            typeof object?.last_error?.reason === "string"
              ? object.last_error.reason
              : event.type === "identity.verification_session.canceled"
                ? "canceled"
                : "requires_input";
          await ctx.runMutation(internal.verification.updateCheckFromProviderSessionInternal, {
            providerSessionId: object.id,
            subjectType: "renter",
            checkType,
            status: "rejected",
            rejectionReason,
          });
        }
        break;
      }
      default:
        break;
    }

    return { ok: true, status: 200, message: "ok" };
  },
});
