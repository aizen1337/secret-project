import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { mapHost } from "./hostMapper";

type StripeAccountResponse = {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
};

function getStripeSecretKey() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in Convex environment.");
  }
  return stripeSecretKey;
}

async function stripeFormRequest(path: string, body: URLSearchParams) {
  const stripeSecretKey = getStripeSecretKey();
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Stripe request failed.");
  }
  return payload;
}

async function stripeGet(path: string) {
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

async function ensureHostConnectAccount(ctx: any) {
  const host = await ctx.runMutation(internal.stripeConnect.ensureHostInternal, {});
  if (host.stripeConnectAccountId) {
    return { host, stripeConnectAccountId: host.stripeConnectAccountId };
  }

  const account = (await stripeFormRequest(
    "accounts",
    new URLSearchParams({
      type: "express",
      "capabilities[card_payments][requested]": "true",
      "capabilities[transfers][requested]": "true",
      "metadata[hostId]": String(host._id),
    }),
  )) as StripeAccountResponse;

  await ctx.runMutation(internal.stripe.updateHostStripeStatusInternal, {
    hostId: host._id,
    stripeConnectAccountId: account.id,
    stripeOnboardingComplete: Boolean(account.details_submitted),
    stripeChargesEnabled: Boolean(account.charges_enabled),
    stripePayoutsEnabled: Boolean(account.payouts_enabled),
  });

  return { host, stripeConnectAccountId: account.id };
}

export const createOrGetHostConnectAccount = action({
  args: {},
  async handler(ctx) {
    const { host, stripeConnectAccountId } = await ensureHostConnectAccount(ctx);
    await ctx.runAction(internal.stripeConnect.refreshHostConnectStatusInternal, {
      hostId: host._id,
      stripeConnectAccountId,
    });
    return { stripeConnectAccountId };
  },
});

export const createHostOnboardingLink = action({
  args: {},
  async handler(ctx) {
    const { stripeConnectAccountId } = await ensureHostConnectAccount(ctx);

    const refreshUrl =
      process.env.STRIPE_CONNECT_REFRESH_URL ??
      "http://localhost:8081/profile?connect=refresh";
    const returnUrl =
      process.env.STRIPE_CONNECT_RETURN_URL ??
      "http://localhost:8081/profile?connect=return";

    const accountLink = await stripeFormRequest(
      "account_links",
      new URLSearchParams({
        account: stripeConnectAccountId,
        type: "account_onboarding",
        refresh_url: refreshUrl,
        return_url: returnUrl,
      }),
    );

    return { url: accountLink.url as string };
  },
});

export const refreshHostConnectStatus = action({
  args: {},
  async handler(ctx) {
    const host = await ctx.runMutation(internal.stripeConnect.ensureHostInternal, {});
    if (!host.stripeConnectAccountId) {
      return {
        hasConnectAccount: false,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }

    return await ctx.runAction(internal.stripeConnect.refreshHostConnectStatusInternal, {
      hostId: host._id,
      stripeConnectAccountId: host.stripeConnectAccountId,
    });
  },
});

export const ensureHostInternal = internalMutation({
  args: {},
  async handler(ctx) {
    return await mapHost(ctx);
  },
});

export const refreshHostConnectStatusInternal = internalAction({
  args: {
    hostId: v.id("hosts"),
    stripeConnectAccountId: v.string(),
  },
  async handler(ctx, args) {
    const account = (await stripeGet(
      `accounts/${args.stripeConnectAccountId}`,
    )) as StripeAccountResponse;

    const onboardingComplete = Boolean(account.details_submitted);
    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);

    await ctx.runMutation(internal.stripe.updateHostStripeStatusInternal, {
      hostId: args.hostId,
      stripeConnectAccountId: args.stripeConnectAccountId,
      stripeOnboardingComplete: onboardingComplete,
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
    });

    return {
      hasConnectAccount: true,
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
      stripeConnectAccountId: args.stripeConnectAccountId,
    };
  },
});
