import { v } from "convex/values";
import { action } from "./_generated/server";

export const createCheckoutSession = action({
  args: {
    carId: v.string(),
    carName: v.string(),
    pricePerDay: v.number(),
    days: v.number(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  async handler(ctx, args) {
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

    const subtotal = args.pricePerDay * args.days;
    const serviceFee = Math.round(subtotal * 0.1);

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY in Convex environment.");
    }

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
      "metadata[carId]": args.carId,
      "metadata[days]": String(args.days),
      "metadata[subtotal]": String(subtotal),
      "metadata[serviceFee]": String(serviceFee),
      client_reference_id: identity.subject,
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const payload = await response.json();
    if (!response.ok || !payload.url) {
      const message =
        payload?.error?.message ?? "Unable to create Stripe checkout session.";
      throw new Error(message);
    }

    return {
      url: payload.url as string,
      subtotal,
      serviceFee,
      total: subtotal + serviceFee,
    };
  },
});
