import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import { mapClerkUser } from "../../../userMapper";
import { assertRenterCanBook } from "../../../guards/renterVerificationGuard";
import { assertAllowedRedirectUrl } from "../../../guards/redirectUrlGuard";
import { assertAdminFromClerkRoleClaim } from "../../../guards/adminGuard";

type PaymentStrategy = "destination_manual_capture" | "platform_transfer_fallback";
const internalApi: any = internal;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEPOSIT_CLAIM_WINDOW_MS = 72 * 60 * 60 * 1000;

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

async function stripeGetRequest(path: string) {
  const stripeSecretKey = getStripeSecretKey();
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Stripe request failed.");
  }
  return payload;
}

function toTimestamp(value: string, field: string) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) {
    throw new Error(`INVALID_INPUT: Invalid ${field}.`);
  }
  return ts;
}

function calculateDaysInclusive(startTs: number, endTs: number) {
  const diff = endTs - startTs;
  if (diff < 0) {
    throw new Error("INVALID_INPUT: End date must not be before start date.");
  }
  return Math.max(1, Math.ceil((diff + 1) / DAY_MS));
}

function isReservationBlockingStatus(status: string) {
  return status === "payment_pending" || status === "confirmed";
}

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aStartTs = new Date(aStart).getTime();
  const aEndTs = new Date(aEnd).getTime();
  const bStartTs = new Date(bStart).getTime();
  const bEndTs = new Date(bEnd).getTime();
  if (!Number.isFinite(aStartTs) || !Number.isFinite(aEndTs) || !Number.isFinite(bStartTs) || !Number.isFinite(bEndTs)) {
    return false;
  }
  return aStartTs <= bEndTs && aEndTs >= bStartTs;
}

function appendCheckoutLineItem(body: URLSearchParams, index: number, amount: number, name: string) {
  body.set(`line_items[${index}][price_data][currency]`, "usd");
  body.set(`line_items[${index}][price_data][unit_amount]`, String(Math.round(amount * 100)));
  body.set(`line_items[${index}][price_data][product_data][name]`, name);
  body.set(`line_items[${index}][quantity]`, "1");
}

function buildPaymentSessionBody(args: {
  successUrl: string;
  cancelUrl: string;
  customerId: string;
  carName: string;
  days: number;
  rentalAmount: number;
  serviceFee: number;
  depositAmount: number;
  paymentId: string;
  bookingId: string;
  paymentPurpose: "initial_immediate_payment" | "manual_pay_now";
}) {
  const body = new URLSearchParams({
    mode: "payment",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    customer: args.customerId,
    "payment_method_types[0]": "card",
    "metadata[paymentId]": args.paymentId,
    "metadata[bookingId]": args.bookingId,
    "metadata[paymentPurpose]": args.paymentPurpose,
  });
  appendCheckoutLineItem(body, 0, args.rentalAmount, `${args.carName} rental (${args.days} days)`);
  appendCheckoutLineItem(body, 1, args.serviceFee, "Service fee (10%)");
  if (args.depositAmount > 0) {
    appendCheckoutLineItem(body, 2, args.depositAmount, "Security deposit");
  }
  body.set("payment_intent_data[metadata][paymentId]", args.paymentId);
  body.set("payment_intent_data[metadata][bookingId]", args.bookingId);
  body.set("payment_intent_data[metadata][paymentPurpose]", args.paymentPurpose);
  return body;
}

async function ensureStripeCustomerForRenter(ctx: any, args: {
  renterId: string;
  paymentId: string;
  existingStripeCustomerId?: string | null;
  clerkUserId: string;
}) {
  if (args.existingStripeCustomerId) {
    return args.existingStripeCustomerId;
  }
  const customer = await stripeFormRequest(
    "customers",
    new URLSearchParams({
      "metadata[renterId]": args.renterId,
      "metadata[clerkUserId]": args.clerkUserId,
    }),
    `customer-${args.renterId}`,
  );
  const stripeCustomerId = String(customer.id);
  await ctx.runMutation(internalApi.stripe.setStripeCustomerForRenterAndPaymentInternal, {
    renterId: args.renterId as any,
    paymentId: args.paymentId as any,
    stripeCustomerId,
  });
  return stripeCustomerId;
}

async function markPaymentAsPaidAndSchedule(ctx: any, payment: any, args: {
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  eventId: string;
}) {
  const now = Date.now();
  const depositAmount = Number(payment.depositAmount ?? 0);
  await ctx.db.patch(payment._id, {
    status: "paid",
    payoutStatus: "eligible",
    stripePaymentIntentId: args.stripePaymentIntentId ?? payment.stripePaymentIntentId,
    stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
    paidAt: now,
    depositStatus: depositAmount > 0 ? "held" : "not_applicable",
    lastWebhookEventId: args.eventId,
    updatedAt: now,
  });
  await ctx.db.patch(payment.bookingId, {
    status: "confirmed",
    updatedAt: now,
  });
  await ctx.scheduler.runAt(
    new Date(payment.releaseAt),
    internalApi.stripePayouts.releaseHostPayoutInternal,
    { paymentId: payment._id },
  );
  if (depositAmount > 0 && typeof payment.depositClaimWindowEndsAt === "number") {
    await ctx.scheduler.runAt(
      new Date(payment.depositClaimWindowEndsAt),
      (internal as any).depositCases.autoRefundDepositIfNoCaseInternal,
      { paymentId: payment._id },
    );
  }
}

function isCheckoutPayableStatus(status: string) {
  return (
    status === "method_collection_pending" ||
    status === "method_saved" ||
    status === "checkout_created"
  );
}

function readStripeMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveStripeChargeIdFromCheckoutSession(session: any) {
  if (typeof session?.charge === "string") return session.charge;
  if (typeof session?.payment_intent?.latest_charge === "string") {
    return session.payment_intent.latest_charge;
  }
  return undefined;
}

function shouldFallbackByPaymentId(
  result: { ok: boolean; reason?: string } | null | undefined,
) {
  if (!result) return true;
  if (!result.ok) return true;
  return result.reason === "payment_not_found" || result.reason === "payment_not_payable";
}

export const createCheckoutSession = action({
  args: {
    carId: v.id("cars"),
    successUrl: v.string(),
    cancelUrl: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  async handler(ctx, args) {
    if (process.env.ENABLE_CONNECT_PAYOUTS === "false") {
      throw new Error("Connect payouts are currently disabled.");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to continue checkout.");
    }

    await assertRenterCanBook(ctx);
    const successUrl = assertAllowedRedirectUrl(args.successUrl, "successUrl");
    const cancelUrl = assertAllowedRedirectUrl(args.cancelUrl, "cancelUrl");

    const pending = await ctx.runMutation(internalApi.stripe.createPendingBookingPaymentInternal, {
      carId: args.carId,
      startDate: args.startDate,
      endDate: args.endDate,
      currency: "usd",
    });

    const stripeCustomerId = await ensureStripeCustomerForRenter(ctx, {
      renterId: String(pending.renterId),
      paymentId: String(pending.paymentId),
      existingStripeCustomerId: pending.renterStripeCustomerId ?? null,
      clerkUserId: identity.subject,
    });

    let payload: any;
    if (pending.requiresImmediatePayment) {
      const body = buildPaymentSessionBody({
        successUrl,
        cancelUrl,
        customerId: stripeCustomerId,
        carName: pending.carName,
        days: pending.days,
        rentalAmount: pending.rentalAmount,
        serviceFee: pending.platformFeeAmount,
        depositAmount: pending.depositAmount,
        paymentId: String(pending.paymentId),
        bookingId: String(pending.bookingId),
        paymentPurpose: "initial_immediate_payment",
      });
      payload = await stripeFormRequest(
        "checkout/sessions",
        body,
        `reservation-initial-payment-${String(pending.paymentId)}`,
      );
    } else {
      const body = new URLSearchParams({
        mode: "setup",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: stripeCustomerId,
        "payment_method_types[0]": "card",
        "metadata[paymentId]": String(pending.paymentId),
        "metadata[bookingId]": String(pending.bookingId),
      });
      body.set("setup_intent_data[metadata][paymentId]", String(pending.paymentId));
      body.set("setup_intent_data[metadata][bookingId]", String(pending.bookingId));
      payload = await stripeFormRequest(
        "checkout/sessions",
        body,
        `reservation-setup-${String(pending.paymentId)}`,
      );
    }

    await ctx.runMutation(internalApi.stripe.attachCheckoutSessionInternal, {
      paymentId: pending.paymentId,
      bookingId: pending.bookingId,
      stripeCheckoutSessionId: payload.id as string,
    });

    return {
      url: payload.url as string,
      subtotal: pending.rentalAmount,
      serviceFee: pending.platformFeeAmount,
      hostAmount: pending.hostAmount,
      depositAmount: pending.depositAmount,
      total: pending.totalAmount,
      requiresImmediatePayment: pending.requiresImmediatePayment,
      paymentDueAt: pending.paymentDueAt,
      bookingId: pending.bookingId,
      paymentId: pending.paymentId,
    };
  },
});

export const createReservationPayNowSession = action({
  args: {
    bookingId: v.id("bookings"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHORIZED: You must be signed in.");
    }
    await assertRenterCanBook(ctx);
    const successUrl = assertAllowedRedirectUrl(args.successUrl, "successUrl");
    const cancelUrl = assertAllowedRedirectUrl(args.cancelUrl, "cancelUrl");

    const prepared = await ctx.runMutation(internalApi.stripe.prepareReservationPayNowInternal, {
      bookingId: args.bookingId,
    });

    const stripeCustomerId = await ensureStripeCustomerForRenter(ctx, {
      renterId: String(prepared.renterId),
      paymentId: String(prepared.paymentId),
      existingStripeCustomerId: prepared.stripeCustomerId ?? null,
      clerkUserId: identity.subject,
    });

    const body = buildPaymentSessionBody({
      successUrl,
      cancelUrl,
      customerId: stripeCustomerId,
      carName: prepared.carName,
      days: prepared.days,
      rentalAmount: prepared.rentalAmount,
      serviceFee: prepared.platformFeeAmount,
      depositAmount: prepared.depositAmount,
      paymentId: String(prepared.paymentId),
      bookingId: String(prepared.bookingId),
      paymentPurpose: "manual_pay_now",
    });
    const payload = await stripeFormRequest(
      "checkout/sessions",
      body,
      `reservation-pay-now-${String(prepared.paymentId)}-${String(prepared.idempotencySuffix)}`,
    );
    await ctx.runMutation(internalApi.stripe.attachCheckoutSessionInternal, {
      paymentId: prepared.paymentId,
      bookingId: prepared.bookingId,
      stripeCheckoutSessionId: payload.id as string,
    });

    return {
      url: payload.url as string,
      bookingId: prepared.bookingId,
      paymentId: prepared.paymentId,
      paymentDueAt: prepared.paymentDueAt,
      total: prepared.totalAmount,
    };
  },
});

export const reconcileCheckoutSessionFromRedirect = action({
  args: {
    stripeCheckoutSessionId: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHORIZED: You must be signed in.");
    }
    try {
      const session = await stripeGetRequest(
        `checkout/sessions/${encodeURIComponent(args.stripeCheckoutSessionId)}?expand[]=payment_intent`,
      );
      const sessionMode = typeof session?.mode === "string" ? session.mode : "";
      const sessionStatus = typeof session?.status === "string" ? session.status : "";
      const paymentStatus =
        typeof session?.payment_status === "string" ? session.payment_status : "";
      const stripePaymentIntentId =
        typeof session?.payment_intent === "string"
          ? session.payment_intent
          : typeof session?.payment_intent?.id === "string"
            ? session.payment_intent.id
            : undefined;
      const stripeChargeId = resolveStripeChargeIdFromCheckoutSession(session);
      const metadataPaymentId = readStripeMetadataString(session?.metadata, "paymentId");
      const eventIdBase = `redirect-reconcile-${args.stripeCheckoutSessionId}`;

      if (sessionMode === "setup") {
        if (sessionStatus !== "complete") {
          return {
            ok: false,
            mode: sessionMode,
            sessionStatus,
            reason: "setup_session_not_complete",
          } as const;
        }

        let setupIntentId =
          typeof session?.setup_intent === "string" ? session.setup_intent : undefined;
        let paymentMethodId: string | undefined;
        let customerId: string | undefined =
          typeof session?.customer === "string" ? session.customer : undefined;
        if (setupIntentId) {
          const details = await ctx.runAction(
            internalApi.stripe.fetchSetupIntentPaymentMethodInternal,
            {
              setupIntentId,
            },
          );
          setupIntentId = details.setupIntentId;
          paymentMethodId = details.paymentMethodId ?? undefined;
          customerId = customerId ?? details.customerId ?? undefined;
        }
        const setupResult = await ctx.runMutation(
          internalApi.stripe.markPaymentMethodCollectedByCheckoutSessionInternal,
          {
            stripeCheckoutSessionId: args.stripeCheckoutSessionId,
            stripeSetupIntentId: setupIntentId,
            stripePaymentMethodId: paymentMethodId,
            stripeCustomerId: customerId,
            eventId: `${eventIdBase}-setup`,
          },
        );
        return {
          ok: true,
          mode: sessionMode,
          sessionStatus,
          setupResult,
        } as const;
      }

      if (sessionMode !== "payment") {
        return {
          ok: false,
          mode: sessionMode,
          sessionStatus,
          paymentStatus,
          reason: "unsupported_checkout_mode",
        } as const;
      }

      if (sessionStatus !== "complete" || (paymentStatus !== "paid" && paymentStatus !== "no_payment_required")) {
        return {
          ok: false,
          mode: sessionMode,
          sessionStatus,
          paymentStatus,
          reason: "checkout_not_paid",
        } as const;
      }

      const primary = await ctx.runMutation(internalApi.stripe.markPaymentPaidByCheckoutSessionInternal, {
        stripeCheckoutSessionId: args.stripeCheckoutSessionId,
        stripePaymentIntentId,
        stripeChargeId,
        eventId: `${eventIdBase}-primary`,
      });

      let fallbackByPaymentId:
        | {
            ok: boolean;
            reason?: string;
          }
        | null = null;
      if (metadataPaymentId && shouldFallbackByPaymentId(primary)) {
        fallbackByPaymentId = await ctx.runMutation(internalApi.stripe.markPaymentPaidByPaymentIdInternal, {
          paymentId: metadataPaymentId,
          stripePaymentIntentId,
          stripeChargeId,
          eventId: `${eventIdBase}-payment-id`,
        });
      }

      let fallbackByPaymentIntent:
        | {
            ok: boolean;
            reason?: string;
          }
        | null = null;
      if (stripePaymentIntentId && shouldFallbackByPaymentId(fallbackByPaymentId ?? primary)) {
        fallbackByPaymentIntent = await ctx.runMutation(
          internalApi.stripe.markPaymentPaidByPaymentIntentInternal,
          {
            stripePaymentIntentId,
            stripeChargeId,
            eventId: `${eventIdBase}-payment-intent`,
          },
        );
      }

      return {
        ok: true,
        mode: sessionMode,
        sessionStatus,
        paymentStatus,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        stripeChargeId: stripeChargeId ?? null,
        metadataPaymentId,
        primary,
        fallbackByPaymentId,
        fallbackByPaymentIntent,
      } as const;
    } catch (error) {
      return {
        ok: false,
        reason: "stripe_fetch_failed",
        message: error instanceof Error ? error.message : "stripe_fetch_failed",
      } as const;
    }
  },
});

export const createPendingBookingPaymentInternal = internalMutation({
  args: {
    carId: v.id("cars"),
    startDate: v.string(),
    endDate: v.string(),
    currency: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const car = await ctx.db.get(args.carId);
    if (!car || !car.isActive) {
      throw new Error("NOT_FOUND: Car not available.");
    }

    const startTs = toTimestamp(args.startDate, "startDate");
    const endTs = toTimestamp(args.endDate, "endDate");
    const days = calculateDaysInclusive(startTs, endTs);

    if (car.availableFrom && startTs < new Date(car.availableFrom).getTime()) {
      throw new Error("INVALID_INPUT: Selected period is before car availability.");
    }
    if (car.availableUntil && endTs > new Date(car.availableUntil).getTime()) {
      throw new Error("INVALID_INPUT: Selected period is after car availability.");
    }

    const existingForCar = await ctx.db
      .query("bookings")
      .withIndex("by_car", (q) => q.eq("carId", car._id))
      .collect();
    const overlap = existingForCar.some((booking) => {
      if (!isReservationBlockingStatus(booking.status)) return false;
      return datesOverlap(booking.startDate, booking.endDate, args.startDate, args.endDate);
    });
    if (overlap) {
      throw new Error("INVALID_INPUT: Car already booked for selected dates.");
    }

    const host = await ctx.db.get(car.hostId);
    if (!host) {
      throw new Error("NOT_FOUND: Host not found.");
    }
    if (String(host.userId) === String(user._id)) {
      throw new Error("UNAUTHORIZED: You cannot book your own listing.");
    }
    if (!host.stripeConnectAccountId || !host.stripeOnboardingComplete || !host.stripePayoutsEnabled) {
      throw new Error("UNAVAILABLE: Host has not completed payout onboarding yet.");
    }

    const rentalAmount = car.pricePerDay * days;
    const platformFeeAmount = Math.round(rentalAmount * 0.1);
    const hostAmount = rentalAmount - platformFeeAmount;
    const depositAmount = Number(car.depositAmount ?? 0);
    const paymentDueAt = startTs - DAY_MS;
    const releaseAt = endTs;
    const depositClaimWindowEndsAt = releaseAt + DEPOSIT_CLAIM_WINDOW_MS;
    const now = Date.now();

    const bookingId = await ctx.db.insert("bookings", {
      carId: car._id,
      renterId: user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      totalPrice: rentalAmount,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const paymentId = await ctx.db.insert("payments", {
      bookingId,
      carId: car._id,
      renterId: user._id,
      hostId: host._id,
      stripeCheckoutSessionId: "",
      stripeCustomerId: user.stripeCustomerId,
      currency: args.currency ?? "usd",
      paymentStrategy: "platform_transfer_fallback",
      captureStatus: "not_required",
      rentalAmount,
      platformFeeAmount,
      hostAmount,
      depositAmount,
      depositStatus: "not_applicable",
      depositClaimWindowEndsAt,
      paymentDueAt,
      status: "method_collection_pending",
      payoutStatus: "blocked",
      releaseAt,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(bookingId, {
      paymentId,
      updatedAt: Date.now(),
    });

    return {
      bookingId,
      paymentId,
      hostId: host._id,
      renterId: user._id,
      renterStripeCustomerId: user.stripeCustomerId ?? null,
      days,
      carName: car.title || `${car.make} ${car.model}`,
      rentalAmount,
      platformFeeAmount,
      hostAmount,
      depositAmount,
      totalAmount: rentalAmount + platformFeeAmount + depositAmount,
      paymentDueAt,
      requiresImmediatePayment: paymentDueAt <= Date.now(),
    };
  },
});

export const setStripeCustomerForRenterAndPaymentInternal = internalMutation({
  args: {
    renterId: v.id("users"),
    paymentId: v.id("payments"),
    stripeCustomerId: v.string(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.renterId, {
      stripeCustomerId: args.stripeCustomerId,
    });
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return;
    await ctx.db.patch(args.paymentId, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    });
  },
});

export const prepareReservationPayNowInternal = internalMutation({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const user = await mapClerkUser(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("NOT_FOUND: Booking not found.");
    }
    if (String(booking.renterId) !== String(user._id)) {
      throw new Error("UNAUTHORIZED: This booking does not belong to you.");
    }
    if (!booking.paymentId) {
      throw new Error("NOT_FOUND: Booking payment not found.");
    }
    const payment = await ctx.db.get(booking.paymentId);
    if (!payment) {
      throw new Error("NOT_FOUND: Payment not found.");
    }
    if (payment.status === "paid") {
      throw new Error("INVALID_INPUT: Reservation is already paid.");
    }
    if (booking.status !== "payment_pending" || payment.status !== "method_saved") {
      throw new Error("INVALID_INPUT: Reservation is not ready for pay now.");
    }
    if (typeof payment.paymentDueAt === "number" && Date.now() >= payment.paymentDueAt) {
      throw new Error("INVALID_INPUT: Payment deadline has passed.");
    }
    const car = await ctx.db.get(payment.carId);
    const now = Date.now();
    await ctx.db.patch(payment._id, {
      updatedAt: now,
    });
    const days = calculateDaysInclusive(
      toTimestamp(booking.startDate, "startDate"),
      toTimestamp(booking.endDate, "endDate"),
    );
    const totalAmount =
      Number(payment.rentalAmount ?? 0) +
      Number(payment.platformFeeAmount ?? 0) +
      Number(payment.depositAmount ?? 0);
    return {
      bookingId: booking._id,
      paymentId: payment._id,
      renterId: payment.renterId,
      stripeCustomerId: payment.stripeCustomerId ?? user.stripeCustomerId ?? null,
      paymentDueAt: payment.paymentDueAt ?? null,
      rentalAmount: payment.rentalAmount,
      platformFeeAmount: payment.platformFeeAmount,
      depositAmount: Number(payment.depositAmount ?? 0),
      totalAmount,
      days,
      carName: car?.title || `${car?.make ?? "Car"} ${car?.model ?? ""}`.trim(),
      idempotencySuffix: now,
    };
  },
});

export const markPaymentMethodCollectedByCheckoutSessionInternal = internalMutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    stripeSetupIntentId: v.optional(v.string()),
    stripePaymentMethodId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_checkout_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .first();
    if (!payment) return { ok: false, reason: "payment_not_found" } as const;
    if (payment.lastWebhookEventId === args.eventId) return { ok: true, reason: "duplicate_event" } as const;
    if (payment.status === "paid") return { ok: true, reason: "already_paid" } as const;
    if (payment.status !== "method_collection_pending") {
      return { ok: true, reason: "payment_not_waiting_for_method" } as const;
    }

    const booking = await ctx.db.get(payment.bookingId);
    if (!booking) return { ok: false, reason: "booking_not_found" } as const;

    const existingForCar = await ctx.db
      .query("bookings")
      .withIndex("by_car", (q) => q.eq("carId", booking.carId))
      .collect();
    const overlap = existingForCar.some((candidate) => {
      if (String(candidate._id) === String(booking._id)) return false;
      if (!isReservationBlockingStatus(candidate.status)) return false;
      return datesOverlap(candidate.startDate, candidate.endDate, booking.startDate, booking.endDate);
    });
    if (overlap) {
      const now = Date.now();
      await ctx.db.patch(payment._id, {
        status: "cancelled",
        lastWebhookEventId: args.eventId,
        updatedAt: now,
      });
      await ctx.db.patch(booking._id, {
        status: "cancelled",
        updatedAt: now,
      });
      return { ok: false, reason: "booking_conflict_on_activation" } as const;
    }

    const now = Date.now();
    await ctx.db.patch(payment._id, {
      status: "method_saved",
      stripeSetupIntentId: args.stripeSetupIntentId ?? payment.stripeSetupIntentId,
      stripePaymentMethodId: args.stripePaymentMethodId ?? payment.stripePaymentMethodId,
      stripeCustomerId: args.stripeCustomerId ?? payment.stripeCustomerId,
      lastWebhookEventId: args.eventId,
      updatedAt: now,
    });
    await ctx.db.patch(booking._id, {
      status: "payment_pending",
      updatedAt: now,
    });

    if (typeof payment.paymentDueAt === "number" && payment.paymentDueAt > Date.now()) {
      await ctx.scheduler.runAt(
        new Date(payment.paymentDueAt),
        internalApi.stripe.autoChargeReservationPaymentInternal,
        { paymentId: payment._id },
      );
    } else {
      await ctx.scheduler.runAfter(0, internalApi.stripe.autoChargeReservationPaymentInternal, {
        paymentId: payment._id,
      });
    }

    return { ok: true } as const;
  },
});

export const markCheckoutSessionExpiredInternal = internalMutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    mode: v.optional(v.string()),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_checkout_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .first();
    if (!payment) return { ok: false, reason: "payment_not_found" } as const;
    if (payment.lastWebhookEventId === args.eventId) return { ok: true, reason: "duplicate_event" } as const;
    const booking = await ctx.db.get(payment.bookingId);
    if (!booking) return { ok: false, reason: "booking_not_found" } as const;

    const shouldCancel =
      payment.status === "method_collection_pending" &&
      (args.mode === "setup" || args.mode === "payment");
    const now = Date.now();
    if (shouldCancel) {
      await ctx.db.patch(payment._id, {
        status: "cancelled",
        lastWebhookEventId: args.eventId,
        updatedAt: now,
      });
      await ctx.db.patch(booking._id, {
        status: "cancelled",
        updatedAt: now,
      });
      return { ok: true, cancelled: true } as const;
    }

    await ctx.db.patch(payment._id, {
      lastWebhookEventId: args.eventId,
      updatedAt: now,
    });
    return { ok: true, cancelled: false } as const;
  },
});

export const markReservationPaymentChargedInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripePaymentIntentId: v.string(),
    stripeChargeId: v.optional(v.string()),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return { ok: false, reason: "payment_not_found" } as const;
    if (payment.lastWebhookEventId === args.eventId) return { ok: true, reason: "duplicate_event" } as const;
    if (payment.status === "paid") return { ok: true, reason: "already_paid" } as const;
    if (payment.status === "cancelled") return { ok: true, reason: "cancelled" } as const;
    await markPaymentAsPaidAndSchedule(ctx, payment, {
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId,
      eventId: args.eventId,
    });
    return { ok: true } as const;
  },
});

export const markReservationPaymentFailedInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    eventId: v.string(),
    reason: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return { ok: false, reason: "payment_not_found" } as const;
    if (payment.lastWebhookEventId === args.eventId) return { ok: true, reason: "duplicate_event" } as const;
    if (payment.status === "paid") return { ok: true, reason: "already_paid" } as const;
    if (payment.status === "cancelled") return { ok: true, reason: "cancelled" } as const;
    const now = Date.now();
    await ctx.db.patch(payment._id, {
      status: "failed",
      payoutStatus: "blocked",
      lastWebhookEventId: args.eventId,
      updatedAt: now,
    });
    await ctx.db.patch(payment.bookingId, {
      status: "cancelled",
      updatedAt: now,
    });
    return { ok: true, reason: args.reason ?? "failed" } as const;
  },
});

export const autoChargeReservationPaymentInternal = internalAction({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const payment = await ctx.runQuery(internalApi.stripe.getPaymentForCaptureInternal, {
      paymentId: args.paymentId,
    });
    if (!payment) return { charged: false, reason: "payment_not_found" } as const;
    if (payment.status !== "method_saved") return { charged: false, reason: "not_method_saved" } as const;
    if (typeof payment.paymentDueAt === "number" && Date.now() < payment.paymentDueAt) {
      return { charged: false, reason: "payment_due_not_reached" } as const;
    }
    if (!payment.stripeCustomerId || !payment.stripePaymentMethodId) {
      await ctx.runMutation(internalApi.stripe.markReservationPaymentFailedInternal, {
        paymentId: payment._id,
        eventId: `auto-charge-missing-method-${String(payment._id)}`,
        reason: "missing_saved_payment_method",
      });
      return { charged: false, reason: "missing_saved_payment_method" } as const;
    }

    const amount =
      Number(payment.rentalAmount ?? 0) +
      Number(payment.platformFeeAmount ?? 0) +
      Number(payment.depositAmount ?? 0);
    try {
      const payload = await stripeFormRequest(
        "payment_intents",
        new URLSearchParams({
          amount: String(Math.round(amount * 100)),
          currency: payment.currency,
          customer: payment.stripeCustomerId,
          payment_method: payment.stripePaymentMethodId,
          off_session: "true",
          confirm: "true",
          "metadata[paymentId]": String(payment._id),
          "metadata[bookingId]": String(payment.bookingId),
          "metadata[paymentPurpose]": "auto_charge_due",
        }),
        `auto-charge-${String(payment._id)}-${String(payment.paymentDueAt ?? payment.releaseAt)}`,
      );
      const intentId = String(payload?.id ?? "");
      const status = String(payload?.status ?? "");
      const chargeId = typeof payload?.latest_charge === "string" ? String(payload.latest_charge) : undefined;
      if (!intentId || (status !== "succeeded" && status !== "requires_capture")) {
        await ctx.runMutation(internalApi.stripe.markReservationPaymentFailedInternal, {
          paymentId: payment._id,
          eventId: `auto-charge-failed-${String(payment._id)}-${Date.now()}`,
          reason: `stripe_status_${status || "unknown"}`,
        });
        return { charged: false, reason: "stripe_not_succeeded" } as const;
      }

      await ctx.runMutation(internalApi.stripe.markReservationPaymentChargedInternal, {
        paymentId: payment._id,
        stripePaymentIntentId: intentId,
        stripeChargeId: chargeId,
        eventId: `auto-charge-success-${String(payment._id)}-${Date.now()}`,
      });
      return { charged: true } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : "charge_failed";
      await ctx.runMutation(internalApi.stripe.markReservationPaymentFailedInternal, {
        paymentId: payment._id,
        eventId: `auto-charge-error-${String(payment._id)}-${Date.now()}`,
        reason: message,
      });
      return { charged: false, reason: "auto_charge_exception" } as const;
    }
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
      isVerified: args.stripePayoutsEnabled,
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
    if (payment.status === "paid") {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "already_paid" } as const;
    }
    if (payment.status === "cancelled") {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "cancelled" } as const;
    }
    if (!isCheckoutPayableStatus(payment.status)) {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "payment_not_payable" } as const;
    }

    const strategy = (payment.paymentStrategy ?? "platform_transfer_fallback") as PaymentStrategy;
    if (strategy === "destination_manual_capture") {
      await ctx.db.patch(payment._id, {
        stripePaymentIntentId: args.stripePaymentIntentId ?? payment.stripePaymentIntentId,
        stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
        captureStatus: "pending_capture",
        lastWebhookEventId: args.eventId,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAt(
        new Date(payment.releaseAt),
        internalApi.stripe.capturePaymentIntentForCompletedBookingInternal,
        { paymentId: payment._id },
      );
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, strategy } as const;
    }

    await markPaymentAsPaidAndSchedule(ctx, payment, {
      stripePaymentIntentId: args.stripePaymentIntentId ?? payment.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
      eventId: args.eventId,
    });

    return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt } as const;
  },
});

export const markPaymentPaidByPaymentIntentInternal = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    stripeChargeId: v.optional(v.string()),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .first();
    if (!payment) {
      return { ok: false, reason: "payment_not_found" } as const;
    }
    if (payment.lastWebhookEventId === args.eventId) {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt } as const;
    }
    if (payment.status === "paid") {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "already_paid" } as const;
    }
    if (payment.status === "cancelled") {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "cancelled" } as const;
    }
    if (!isCheckoutPayableStatus(payment.status)) {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "payment_not_payable" } as const;
    }

    const strategy = (payment.paymentStrategy ?? "platform_transfer_fallback") as PaymentStrategy;
    if (strategy === "destination_manual_capture") {
      await ctx.db.patch(payment._id, {
        stripePaymentIntentId: args.stripePaymentIntentId,
        stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
        captureStatus: "pending_capture",
        lastWebhookEventId: args.eventId,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAt(
        new Date(payment.releaseAt),
        internalApi.stripe.capturePaymentIntentForCompletedBookingInternal,
        { paymentId: payment._id },
      );
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, strategy } as const;
    }

    await markPaymentAsPaidAndSchedule(ctx, payment, {
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
      eventId: args.eventId,
    });

    return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt } as const;
  },
});

export const markPaymentPaidByPaymentIdInternal = internalMutation({
  args: {
    paymentId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    let payment: any = null;
    try {
      payment = await ctx.db.get(args.paymentId as any);
    } catch {
      return { ok: false, reason: "invalid_payment_id" } as const;
    }

    if (!payment) {
      return { ok: false, reason: "payment_not_found" } as const;
    }
    if (payment.lastWebhookEventId === args.eventId) {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt } as const;
    }
    if (payment.status === "paid") {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "already_paid" } as const;
    }
    if (payment.status === "cancelled") {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "cancelled" } as const;
    }
    if (!isCheckoutPayableStatus(payment.status)) {
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, reason: "payment_not_payable" } as const;
    }

    const strategy = (payment.paymentStrategy ?? "platform_transfer_fallback") as PaymentStrategy;
    if (strategy === "destination_manual_capture") {
      await ctx.db.patch(payment._id, {
        stripePaymentIntentId: args.stripePaymentIntentId ?? payment.stripePaymentIntentId,
        stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
        captureStatus: "pending_capture",
        lastWebhookEventId: args.eventId,
        updatedAt: Date.now(),
      });
      await ctx.scheduler.runAt(
        new Date(payment.releaseAt),
        internalApi.stripe.capturePaymentIntentForCompletedBookingInternal,
        { paymentId: payment._id },
      );
      return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt, strategy } as const;
    }

    await markPaymentAsPaidAndSchedule(ctx, payment, {
      stripePaymentIntentId: args.stripePaymentIntentId ?? payment.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
      eventId: args.eventId,
    });

    return { ok: true, paymentId: payment._id, releaseAt: payment.releaseAt } as const;
  },
});

export const markPaymentCapturedByPaymentIntentInternal = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    stripeChargeId: v.optional(v.string()),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .first();
    if (!payment) return;
    if (payment.lastWebhookEventId === args.eventId) return;
    if (payment.status === "paid") return;
    if (payment.status === "cancelled") return;
    const strategy = (payment.paymentStrategy ?? "platform_transfer_fallback") as PaymentStrategy;
    if (strategy === "destination_manual_capture") {
      await ctx.db.patch(payment._id, {
        status: "paid",
        paidAt: Date.now(),
        payoutStatus: "transferred",
        captureStatus: "captured",
        stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
        lastWebhookEventId: args.eventId,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(payment.bookingId, {
        status: "completed",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }
    await markPaymentAsPaidAndSchedule(ctx, payment, {
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeChargeId: args.stripeChargeId ?? payment.stripeChargeId,
      eventId: args.eventId,
    });
  },
});

export const markPaymentCaptureStateByIntentInternal = internalMutation({
  args: {
    stripePaymentIntentId: v.string(),
    captureStatus: v.union(v.literal("pending_capture"), v.literal("capture_failed"), v.literal("expired")),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_payment_intent", (q) => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .first();
    if (!payment) return;
    if (payment.lastWebhookEventId === args.eventId) return;
    if (payment.status === "cancelled") return;
    const strategy = (payment.paymentStrategy ?? "platform_transfer_fallback") as PaymentStrategy;
    if (strategy !== "destination_manual_capture") return;
    const now = Date.now();
    await ctx.db.patch(payment._id, {
      captureStatus: args.captureStatus,
      status: args.captureStatus === "pending_capture" ? payment.status : "failed",
      payoutStatus: args.captureStatus === "pending_capture" ? payment.payoutStatus : "blocked",
      lastWebhookEventId: args.eventId,
      updatedAt: now,
    });
    if (args.captureStatus !== "pending_capture") {
      await ctx.db.patch(payment.bookingId, {
        status: "payment_failed",
        updatedAt: now,
      });
    }
  },
});

export const markPaymentCaptureStateByPaymentIdInternal = internalMutation({
  args: {
    paymentId: v.id("payments"),
    captureStatus: v.union(v.literal("pending_capture"), v.literal("capture_failed"), v.literal("expired")),
    eventId: v.string(),
  },
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return;
    if (payment.lastWebhookEventId === args.eventId) return;
    if (payment.status === "cancelled") return;
    const strategy = (payment.paymentStrategy ?? "platform_transfer_fallback") as PaymentStrategy;
    if (strategy !== "destination_manual_capture") return;
    const now = Date.now();
    await ctx.db.patch(payment._id, {
      captureStatus: args.captureStatus,
      status: args.captureStatus === "pending_capture" ? payment.status : "failed",
      payoutStatus: args.captureStatus === "pending_capture" ? payment.payoutStatus : "blocked",
      lastWebhookEventId: args.eventId,
      updatedAt: now,
    });
    if (args.captureStatus !== "pending_capture") {
      await ctx.db.patch(payment.bookingId, {
        status: "payment_failed",
        updatedAt: now,
      });
    }
  },
});

export const capturePaymentIntentForCompletedBookingInternal = internalAction({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    const payment = await ctx.runQuery(internalApi.stripe.getPaymentForCaptureInternal, {
      paymentId: args.paymentId,
    });
    if (!payment) {
      return { captured: false, reason: "payment_not_found" } as const;
    }
    if ((payment.paymentStrategy ?? "platform_transfer_fallback") !== "destination_manual_capture") {
      return { captured: false, reason: "strategy_not_destination_manual_capture" } as const;
    }
    if (!payment.stripePaymentIntentId) {
      await ctx.runMutation(internalApi.stripe.markPaymentCaptureStateByPaymentIdInternal, {
        paymentId: payment._id,
        captureStatus: "capture_failed",
        eventId: `capture-missing-intent-${String(payment._id)}`,
      });
      return { captured: false, reason: "missing_payment_intent" } as const;
    }
    try {
      const payload = await stripeFormRequest(
        `payment_intents/${payment.stripePaymentIntentId}/capture`,
        new URLSearchParams(),
        `capture-${String(payment._id)}-${String(payment.releaseAt)}`,
      );
      await ctx.runMutation(internalApi.stripe.markPaymentCapturedByPaymentIntentInternal, {
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeChargeId: typeof payload.latest_charge === "string" ? payload.latest_charge : payment.stripeChargeId,
        eventId: `manual-capture-${String(payment._id)}-${Date.now()}`,
      });
      return { captured: true, reason: "captured" } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      await ctx.runMutation(internalApi.stripe.markPaymentCaptureStateByPaymentIdInternal, {
        paymentId: payment._id,
        captureStatus: message.includes("expired") ? "expired" : "capture_failed",
        eventId: `manual-capture-failed-${String(payment._id)}-${Date.now()}`,
      });
      return { captured: false, reason: "capture_failed" } as const;
    }
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
    if (payment.status === "paid" || payment.status === "cancelled") return;

    const booking = await ctx.db.get(payment.bookingId);
    const shouldCancelReservation =
      typeof payment.paymentDueAt === "number" &&
      Date.now() >= payment.paymentDueAt &&
      (payment.status === "method_saved" || payment.status === "method_collection_pending");
    const nextBookingStatus = shouldCancelReservation ? "cancelled" : "payment_failed";

    if (!shouldCancelReservation && payment.status === "method_saved") {
      await ctx.db.patch(payment._id, {
        lastWebhookEventId: args.eventId,
        updatedAt: Date.now(),
      });
      return;
    }

    await ctx.db.patch(payment._id, {
      status: "failed",
      payoutStatus: "blocked",
      lastWebhookEventId: args.eventId,
      updatedAt: Date.now(),
    });
    if (booking && booking.status !== "completed" && booking.status !== "cancelled") {
      await ctx.db.patch(payment.bookingId, {
        status: nextBookingStatus,
        updatedAt: Date.now(),
      });
    }
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
    refundedAmountCents: v.optional(v.number()),
    capturedAmountCents: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("stripeChargeId"), args.stripeChargeId))
      .first();
    if (!payment) return;
    if (payment.lastWebhookEventId === args.eventId) return;

    const depositAmountCents = Math.round(Number(payment.depositAmount ?? 0) * 100);
    const refundedAmountCents =
      typeof args.refundedAmountCents === "number" ? Math.max(0, Math.round(args.refundedAmountCents)) : null;
    const expectedDepositRefund =
      args.status === "partially_refunded" &&
      depositAmountCents > 0 &&
      refundedAmountCents !== null &&
      refundedAmountCents <= depositAmountCents &&
      (payment.depositStatus === "refund_pending" || payment.depositStatus === "held" || payment.depositStatus === "refunded");

    if (expectedDepositRefund) {
      await ctx.db.patch(payment._id, {
        depositStatus: "refunded",
        depositRefundAmount: refundedAmountCents! / 100,
        lastWebhookEventId: args.eventId,
        updatedAt: Date.now(),
      });
      return;
    }

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

export const getPaymentByCheckoutSessionInternal = internalQuery({
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

export const getPaymentByChargeIdInternal = internalQuery({
  args: {
    stripeChargeId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("payments")
      .withIndex("by_charge_id", (q) => q.eq("stripeChargeId", args.stripeChargeId))
      .first();
  },
});

export const getHostByStripeConnectAccountIdInternal = internalQuery({
  args: {
    stripeConnectAccountId: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("hosts")
      .withIndex("by_stripe_connect_account_id", (q) =>
        q.eq("stripeConnectAccountId", args.stripeConnectAccountId),
      )
      .first();
  },
});

export const getPaymentByIdInternal = internalQuery({
  args: {
    paymentId: v.string(),
  },
  async handler(ctx, args) {
    try {
      return await ctx.db.get(args.paymentId as any);
    } catch {
      return null;
    }
  },
});

export const getPaymentForCaptureInternal = internalQuery({
  args: {
    paymentId: v.id("payments"),
  },
  async handler(ctx, args) {
    return await ctx.db.get(args.paymentId);
  },
});

export const getPaymentByBookingIdInternal = internalQuery({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("payments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();
  },
});

export const fetchSetupIntentPaymentMethodInternal = internalAction({
  args: {
    setupIntentId: v.string(),
  },
  async handler(_ctx, args) {
    const payload = await stripeGetRequest(
      `setup_intents/${encodeURIComponent(args.setupIntentId)}?expand[]=payment_method`,
    );
    return {
      setupIntentId: String(payload.id),
      customerId:
        typeof payload.customer === "string"
          ? String(payload.customer)
          : typeof payload.customer?.id === "string"
            ? String(payload.customer.id)
            : null,
      paymentMethodId:
        typeof payload.payment_method === "string"
          ? String(payload.payment_method)
          : typeof payload.payment_method?.id === "string"
            ? String(payload.payment_method.id)
            : null,
    };
  },
});

export const listStaleCheckoutCandidatesInternal = internalQuery({
  args: {
    olderThanMs: v.number(),
    limit: v.number(),
  },
  async handler(ctx, args) {
    const now = Date.now();
    const safeLimit = Math.max(1, Math.floor(args.limit));
    const olderThanMs = Math.max(0, Math.floor(args.olderThanMs));
    const staleBeforeTs = now - olderThanMs;

    const [methodCollectionPending, checkoutCreated] = await Promise.all([
      ctx.db
        .query("payments")
        .withIndex("by_status_updated_at", (q) =>
          q.eq("status", "method_collection_pending").lte("updatedAt", staleBeforeTs),
        )
        .take(safeLimit * 3),
      ctx.db
        .query("payments")
        .withIndex("by_status_updated_at", (q) =>
          q.eq("status", "checkout_created").lte("updatedAt", staleBeforeTs),
        )
        .take(safeLimit * 3),
    ]);

    const unique = new Map<string, any>();
    for (const payment of [...methodCollectionPending, ...checkoutCreated]) {
      unique.set(String(payment._id), payment);
    }

    return Array.from(unique.values())
      .filter((payment) => {
        return (
          typeof payment.stripeCheckoutSessionId === "string" &&
          payment.stripeCheckoutSessionId.trim().length > 0
        );
      })
      .sort((a, b) => (a.updatedAt ?? a.createdAt) - (b.updatedAt ?? b.createdAt))
      .slice(0, safeLimit)
      .map((payment) => ({
        paymentId: String(payment._id),
        stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
        status: payment.status,
        updatedAt: payment.updatedAt,
      }));
  },
});

export const reconcileStaleCheckoutPaymentsInternal = internalAction({
  args: {
    limit: v.optional(v.number()),
    olderThanMs: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const limit =
      typeof args.limit === "number" && Number.isFinite(args.limit) && args.limit > 0
        ? Math.floor(args.limit)
        : 50;
    const olderThanMs =
      typeof args.olderThanMs === "number" && Number.isFinite(args.olderThanMs) && args.olderThanMs >= 0
        ? Math.floor(args.olderThanMs)
        : 5 * 60 * 1000;

    const candidates = await ctx.runQuery(internalApi.stripe.listStaleCheckoutCandidatesInternal, {
      limit,
      olderThanMs,
    });

    const results: Array<Record<string, unknown>> = [];
    for (const candidate of candidates) {
      const eventIdBase = `stale-checkout-reconcile-${candidate.paymentId}`;
      try {
        const session = await stripeGetRequest(
          `checkout/sessions/${encodeURIComponent(candidate.stripeCheckoutSessionId)}?expand[]=payment_intent`,
        );
        const sessionMode = typeof session?.mode === "string" ? session.mode : "";
        const sessionStatus = typeof session?.status === "string" ? session.status : "";
        const paymentStatus = typeof session?.payment_status === "string" ? session.payment_status : "";
        const stripePaymentIntentId =
          typeof session?.payment_intent === "string"
            ? session.payment_intent
            : typeof session?.payment_intent?.id === "string"
              ? session.payment_intent.id
              : undefined;
        const stripeChargeId = resolveStripeChargeIdFromCheckoutSession(session);
        const metadataPaymentId =
          readStripeMetadataString(session?.metadata, "paymentId") ?? candidate.paymentId;

        if (sessionMode === "setup") {
          if (sessionStatus !== "complete") {
            results.push({
              paymentId: candidate.paymentId,
              stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
              outcome: "skipped",
              reason: "setup_session_not_complete",
              sessionStatus,
            });
            continue;
          }
          let setupIntentId =
            typeof session?.setup_intent === "string" ? session.setup_intent : undefined;
          let paymentMethodId: string | undefined;
          let customerId: string | undefined =
            typeof session?.customer === "string" ? session.customer : undefined;
          if (setupIntentId) {
            const details = await ctx.runAction(
              internalApi.stripe.fetchSetupIntentPaymentMethodInternal,
              { setupIntentId },
            );
            setupIntentId = details.setupIntentId;
            paymentMethodId = details.paymentMethodId ?? undefined;
            customerId = customerId ?? details.customerId ?? undefined;
          }
          const setupResult = await ctx.runMutation(
            internalApi.stripe.markPaymentMethodCollectedByCheckoutSessionInternal,
            {
              stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
              stripeSetupIntentId: setupIntentId,
              stripePaymentMethodId: paymentMethodId,
              stripeCustomerId: customerId,
              eventId: `${eventIdBase}-setup`,
            },
          );
          results.push({
            paymentId: candidate.paymentId,
            stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
            sessionMode,
            sessionStatus,
            outcome: setupResult?.ok ? "reconciled" : "skipped",
            reason: setupResult?.reason ?? null,
          });
          continue;
        }

        if (sessionMode !== "payment") {
          results.push({
            paymentId: candidate.paymentId,
            stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
            sessionMode,
            sessionStatus,
            paymentStatus,
            outcome: "skipped",
            reason: "unsupported_checkout_mode",
          });
          continue;
        }

        if (sessionStatus !== "complete" || (paymentStatus !== "paid" && paymentStatus !== "no_payment_required")) {
          results.push({
            paymentId: candidate.paymentId,
            stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
            sessionMode,
            sessionStatus,
            paymentStatus,
            outcome: "skipped",
            reason: "checkout_not_paid",
          });
          continue;
        }

        const primary = await ctx.runMutation(internalApi.stripe.markPaymentPaidByCheckoutSessionInternal, {
          stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
          stripePaymentIntentId,
          stripeChargeId,
          eventId: `${eventIdBase}-primary`,
        });

        let fallbackByPaymentId: any = null;
        if (metadataPaymentId && shouldFallbackByPaymentId(primary)) {
          fallbackByPaymentId = await ctx.runMutation(internalApi.stripe.markPaymentPaidByPaymentIdInternal, {
            paymentId: metadataPaymentId,
            stripePaymentIntentId,
            stripeChargeId,
            eventId: `${eventIdBase}-payment-id`,
          });
        }

        let fallbackByPaymentIntent: any = null;
        if (stripePaymentIntentId && shouldFallbackByPaymentId(fallbackByPaymentId ?? primary)) {
          fallbackByPaymentIntent = await ctx.runMutation(
            internalApi.stripe.markPaymentPaidByPaymentIntentInternal,
            {
              stripePaymentIntentId,
              stripeChargeId,
              eventId: `${eventIdBase}-payment-intent`,
            },
          );
        }

        const primaryReason = typeof primary?.reason === "string" ? primary.reason : null;
        const fallbackReason =
          fallbackByPaymentId && typeof fallbackByPaymentId.reason === "string"
            ? fallbackByPaymentId.reason
            : null;
        const paymentIntentFallbackReason =
          fallbackByPaymentIntent && typeof fallbackByPaymentIntent.reason === "string"
            ? fallbackByPaymentIntent.reason
            : null;
        const reconciled =
          (primary?.ok &&
            primaryReason !== "payment_not_found" &&
            primaryReason !== "payment_not_payable" &&
            primaryReason !== "cancelled") ||
          Boolean(
            fallbackByPaymentId &&
              fallbackByPaymentId.ok &&
              fallbackReason !== "payment_not_found" &&
              fallbackReason !== "payment_not_payable" &&
              fallbackReason !== "cancelled",
          ) ||
          Boolean(
            fallbackByPaymentIntent &&
              fallbackByPaymentIntent.ok &&
              paymentIntentFallbackReason !== "payment_not_found" &&
              paymentIntentFallbackReason !== "payment_not_payable" &&
              paymentIntentFallbackReason !== "cancelled",
          );

        results.push({
          paymentId: candidate.paymentId,
          stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
          sessionMode,
          sessionStatus,
          paymentStatus,
          stripePaymentIntentId: stripePaymentIntentId ?? null,
          stripeChargeId: stripeChargeId ?? null,
          metadataPaymentId,
          outcome: reconciled ? "reconciled" : "skipped",
          primaryReason,
          fallbackReason,
          paymentIntentFallbackReason,
        });
      } catch (error) {
        results.push({
          paymentId: candidate.paymentId,
          stripeCheckoutSessionId: candidate.stripeCheckoutSessionId,
          outcome: "error",
          reason: error instanceof Error ? error.message : "reconcile_failed",
        });
      }
    }

    const reconciled = results.filter((result) => result.outcome === "reconciled").length;
    const skipped = results.filter((result) => result.outcome === "skipped").length;
    const errored = results.filter((result) => result.outcome === "error").length;

    return {
      scanned: candidates.length,
      reconciled,
      skipped,
      errored,
      limit,
      olderThanMs,
      results,
    };
  },
});

export const reconcileStaleCheckoutPayments = action({
  args: {
    limit: v.optional(v.number()),
    olderThanMs: v.optional(v.number()),
  },
  async handler(ctx, args) {
    await assertAdminFromClerkRoleClaim(ctx);
    return await ctx.runAction(internalApi.stripe.reconcileStaleCheckoutPaymentsInternal, {
      limit: args.limit,
      olderThanMs: args.olderThanMs,
    });
  },
});

export const backfillPaymentStrategyInternal = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const payments = await ctx.db.query("payments").collect();
    const max = typeof args.limit === "number" && args.limit > 0 ? Math.floor(args.limit) : payments.length;
    let updated = 0;

    for (const payment of payments.slice(0, max)) {
      const booking = await ctx.db.get(payment.bookingId);
      const car = await ctx.db.get(payment.carId);
      const renter = await ctx.db.get(payment.renterId);
      if (!booking) continue;

      const patch: Record<string, unknown> = {};
      if (!payment.paymentStrategy) patch.paymentStrategy = "platform_transfer_fallback";
      if (!payment.captureStatus) patch.captureStatus = "not_required";

      const dueAt = new Date(booking.startDate).getTime() - DAY_MS;
      const claimWindow = new Date(booking.endDate).getTime() + DEPOSIT_CLAIM_WINDOW_MS;
      const depositAmount = Number(car?.depositAmount ?? 0);

      if (payment.paymentDueAt === undefined && Number.isFinite(dueAt)) {
        patch.paymentDueAt = dueAt;
      }
      if (payment.depositAmount === undefined) {
        patch.depositAmount = depositAmount;
      }
      if (payment.depositClaimWindowEndsAt === undefined && Number.isFinite(claimWindow)) {
        patch.depositClaimWindowEndsAt = claimWindow;
      }
      if (payment.depositStatus === undefined) {
        patch.depositStatus = depositAmount > 0 && payment.status === "paid" ? "held" : "not_applicable";
      }
      if (payment.paidAt === undefined && payment.status === "paid") {
        patch.paidAt = payment.updatedAt ?? payment.createdAt;
      }
      if (payment.stripeCustomerId === undefined && renter?.stripeCustomerId) {
        patch.stripeCustomerId = renter.stripeCustomerId;
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = Date.now();
        await ctx.db.patch(payment._id, patch as any);
        updated += 1;
      }
    }

    return {
      scanned: Math.min(max, payments.length),
      updated,
    };
  },
});

