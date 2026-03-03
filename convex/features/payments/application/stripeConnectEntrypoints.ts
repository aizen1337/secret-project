import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../../../_generated/server";
import { ActionCache } from "@convex-dev/action-cache";
import { components, internal } from "../../../_generated/api";
import { mapHost } from "../../../hostMapper";
import { assertAllowedRedirectUrl } from "../../../guards/redirectUrlGuard";

type StripeAccountResponse = {
  id: string;
  type?: string;
  controller?: {
    stripe_dashboard?: {
      type?: string;
    };
  };
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  requirements?: {
    currently_due?: string[];
    past_due?: string[];
    eventually_due?: string[];
    pending_verification?: string[];
    disabled_reason?: string | null;
  };
  future_requirements?: {
    currently_due?: string[];
    past_due?: string[];
    eventually_due?: string[];
    pending_verification?: string[];
    disabled_reason?: string | null;
  };
};

function normalizeRequirements(requirements: StripeAccountResponse["requirements"]) {
  return {
    currentlyDue: Array.isArray(requirements?.currently_due) ? requirements.currently_due : [],
    pastDue: Array.isArray(requirements?.past_due) ? requirements.past_due : [],
    eventuallyDue: Array.isArray(requirements?.eventually_due) ? requirements.eventually_due : [],
    pendingVerification: Array.isArray(requirements?.pending_verification)
      ? requirements.pending_verification
      : [],
    disabledReason:
      typeof requirements?.disabled_reason === "string" && requirements.disabled_reason.trim().length > 0
        ? requirements.disabled_reason
        : null,
  };
}

function collectRequiredActions(account: StripeAccountResponse) {
  const req = normalizeRequirements(account.requirements);
  const futureReq = normalizeRequirements(account.future_requirements);
  return [
    ...new Set([
      ...req.currentlyDue,
      ...req.pastDue,
      ...req.pendingVerification,
      ...futureReq.currentlyDue,
      ...futureReq.pastDue,
      ...futureReq.pendingVerification,
      ...req.eventuallyDue,
      ...futureReq.eventuallyDue,
    ]),
  ];
}

function resolvePreferredConnectLinkType(account: StripeAccountResponse) {
  const dashboardType = account.controller?.stripe_dashboard?.type;
  const accountType = account.type;
  const hasStripeHostedDashboard = dashboardType === "express" || dashboardType === "full" || accountType === "express" || accountType === "standard";
  if (hasStripeHostedDashboard) {
    return "account_onboarding";
  }
  return account.details_submitted ? "account_update" : "account_onboarding";
}

function resolveConnectRedirectUrls(args?: { returnUrl?: string; refreshUrl?: string }) {
  const refreshUrl = assertAllowedRedirectUrl(
    args?.refreshUrl?.trim() ||
      process.env.STRIPE_CONNECT_REFRESH_URL ||
      "http://localhost:8081/profile/payments?connect=refresh",
    "refreshUrl",
  );
  const returnUrl = assertAllowedRedirectUrl(
    args?.returnUrl?.trim() ||
      process.env.STRIPE_CONNECT_RETURN_URL ||
      "http://localhost:8081/profile/payments?connect=return",
    "returnUrl",
  );
  return { refreshUrl, returnUrl };
}

async function createConnectAccountLink(args: {
  stripeConnectAccountId: string;
  account: StripeAccountResponse;
  returnUrl: string;
  refreshUrl: string;
}) {
  const linkType = resolvePreferredConnectLinkType(args.account);
  const body = new URLSearchParams({
    account: args.stripeConnectAccountId,
    type: linkType,
    refresh_url: args.refreshUrl,
    return_url: args.returnUrl,
  });
  if (linkType === "account_onboarding") {
    body.set("collection_options[fields]", "eventually_due");
    body.set("collection_options[future_requirements]", "include");
  }
  const accountLink = await stripeFormRequest("account_links", body);
  return { url: accountLink.url as string, linkType };
}

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

const stripeAccountCache = new ActionCache(components.actionCache, {
  action: (internal as any).stripeConnect.getStripeAccountUncached,
  name: "stripe-account-v1",
  ttl: 60 * 1000,
});

const unsafeInternal = internal as any;
const CONNECT_STATUS_RECHECK_DELAYS_MS = [2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000] as const;

async function scheduleHostConnectStatusRechecks(
  ctx: any,
  args: { hostId: any; stripeConnectAccountId: string },
) {
  await Promise.all(
    CONNECT_STATUS_RECHECK_DELAYS_MS.map((delayMs) =>
      ctx.scheduler.runAfter(delayMs, unsafeInternal.stripeConnect.refreshHostConnectStatusScheduledInternal, {
        hostId: args.hostId,
        stripeConnectAccountId: args.stripeConnectAccountId,
      }),
    ),
  );
}

async function ensureHostConnectAccount(
  ctx: any,
): Promise<{ host: any; stripeConnectAccountId: string }> {
  const host = await ctx.runMutation(unsafeInternal.stripeConnect.ensureHostInternal, {});
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

  await ctx.runMutation(unsafeInternal.stripe.updateHostStripeStatusInternal, {
    hostId: host._id,
    stripeConnectAccountId: account.id,
    stripeOnboardingComplete: Boolean(account.details_submitted),
    stripeChargesEnabled: Boolean(account.charges_enabled),
    stripePayoutsEnabled: Boolean(account.payouts_enabled),
    stripeRequirementsCurrentlyDue: normalizeRequirements(account.requirements).currentlyDue,
    stripeRequirementsPastDue: normalizeRequirements(account.requirements).pastDue,
    stripeRequirementsEventuallyDue: normalizeRequirements(account.requirements).eventuallyDue,
    stripeRequirementsPendingVerification: normalizeRequirements(account.requirements).pendingVerification,
    stripeRequirementsDisabledReason: normalizeRequirements(account.requirements).disabledReason,
  });

  return { host, stripeConnectAccountId: account.id };
}

export const createOrGetHostConnectAccount = action({
  args: {},
  async handler(ctx): Promise<{ stripeConnectAccountId: string }> {
    const { host, stripeConnectAccountId } = await ensureHostConnectAccount(ctx);
    await ctx.runAction(unsafeInternal.stripeConnect.refreshHostConnectStatusInternal, {
      hostId: host._id,
      stripeConnectAccountId,
    });
    await scheduleHostConnectStatusRechecks(ctx, {
      hostId: host._id,
      stripeConnectAccountId,
    });
    return { stripeConnectAccountId };
  },
});

export const createHostOnboardingLink = action({
  args: {
    returnUrl: v.optional(v.string()),
    refreshUrl: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const { host, stripeConnectAccountId } = await ensureHostConnectAccount(ctx);
    const { refreshUrl, returnUrl } = resolveConnectRedirectUrls(args);

    const latestAccount = (await ctx.runAction(unsafeInternal.stripeConnect.getStripeAccountUncached, {
      stripeConnectAccountId,
    })) as StripeAccountResponse;
    const accountLink = await createConnectAccountLink({
      stripeConnectAccountId,
      account: latestAccount,
      refreshUrl,
      returnUrl,
    });

    await scheduleHostConnectStatusRechecks(ctx, {
      hostId: host._id,
      stripeConnectAccountId,
    });

    return accountLink;
  },
});

export const refreshHostConnectStatus = action({
  args: {
    returnUrl: v.optional(v.string()),
    refreshUrl: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<{
    hasConnectAccount: boolean;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requiredActions: string[];
    disabledReason: string | null;
    preferredLinkType: "account_onboarding" | "account_update";
    verificationUrl: string | null;
    stripeConnectAccountId?: string;
  }> {
    const host = await ctx.runMutation(unsafeInternal.stripeConnect.ensureHostInternal, {});
    if (!host.stripeConnectAccountId) {
      return {
        hasConnectAccount: false,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requiredActions: [],
        disabledReason: null,
        preferredLinkType: "account_onboarding",
        verificationUrl: null,
      };
    }
    return await ctx.runAction(unsafeInternal.stripeConnect.refreshHostConnectStatusInternal, {
      hostId: host._id,
      stripeConnectAccountId: host.stripeConnectAccountId,
      returnUrl: args.returnUrl,
      refreshUrl: args.refreshUrl,
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
    returnUrl: v.optional(v.string()),
    refreshUrl: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const account = (await ctx.runAction(unsafeInternal.stripeConnect.getStripeAccountUncached, {
      stripeConnectAccountId: args.stripeConnectAccountId,
    })) as StripeAccountResponse;

    const onboardingComplete = Boolean(account.details_submitted);
    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const requirements = normalizeRequirements(account.requirements);
    const requiredActions = collectRequiredActions(account);
    const preferredLinkType = resolvePreferredConnectLinkType(account);
    const { refreshUrl, returnUrl } = resolveConnectRedirectUrls({
      returnUrl: args.returnUrl,
      refreshUrl: args.refreshUrl,
    });
    const verificationLink = await createConnectAccountLink({
      stripeConnectAccountId: args.stripeConnectAccountId,
      account,
      refreshUrl,
      returnUrl,
    });

    await ctx.runMutation(unsafeInternal.stripe.updateHostStripeStatusInternal, {
      hostId: args.hostId,
      stripeConnectAccountId: args.stripeConnectAccountId,
      stripeOnboardingComplete: onboardingComplete,
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
      stripeRequirementsCurrentlyDue: requirements.currentlyDue,
      stripeRequirementsPastDue: requirements.pastDue,
      stripeRequirementsEventuallyDue: requirements.eventuallyDue,
      stripeRequirementsPendingVerification: requirements.pendingVerification,
      stripeRequirementsDisabledReason: requirements.disabledReason,
    });

    if (payoutsEnabled) {
      await ctx.runAction(unsafeInternal.stripePayouts.retryHostPayoutsForHostInternal, {
        hostId: args.hostId,
        limit: 10,
      });
    }

    return {
      hasConnectAccount: true,
      onboardingComplete,
      chargesEnabled,
      payoutsEnabled,
      requiredActions,
      disabledReason: requirements.disabledReason,
      preferredLinkType,
      verificationUrl: verificationLink.url,
      stripeConnectAccountId: args.stripeConnectAccountId,
    };
  },
});

export const refreshHostConnectStatusScheduledInternal = internalAction({
  args: {
    hostId: v.id("hosts"),
    stripeConnectAccountId: v.string(),
  },
  async handler(ctx, args) {
    try {
      return await ctx.runAction(unsafeInternal.stripeConnect.refreshHostConnectStatusInternal, args);
    } catch (error) {
      console.error(
        JSON.stringify({
          source: "stripe.connect.refresh.scheduled",
          hostId: String(args.hostId),
          stripeConnectAccountId: args.stripeConnectAccountId,
          error: error instanceof Error ? error.message : "unknown_error",
        }),
      );
      return {
        hasConnectAccount: true,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requiredActions: [],
        disabledReason: "scheduled_refresh_failed",
        preferredLinkType: "account_onboarding",
        verificationUrl: null,
        stripeConnectAccountId: args.stripeConnectAccountId,
      };
    }
  },
});

export const listHostsForStripeResyncInternal = internalQuery({
  args: {},
  async handler(ctx) {
    return await ctx.db.query("hosts").collect();
  },
});

export const getStripeAccountUncached = internalAction({
  args: {
    stripeConnectAccountId: v.string(),
  },
  async handler(_, args): Promise<StripeAccountResponse> {
    return (await stripeGet(`accounts/${args.stripeConnectAccountId}`)) as StripeAccountResponse;
  },
});

export const resyncAllHostsFromStripeInternal = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const hosts = await ctx.runQuery(unsafeInternal.stripeConnect.listHostsForStripeResyncInternal, {});
    const max = typeof args.limit === "number" && args.limit > 0 ? Math.floor(args.limit) : hosts.length;
    let processed = 0;
    let updated = 0;

    for (const host of hosts) {
      if (processed >= max) break;
      if (!host.stripeConnectAccountId) continue;

      const account = (await stripeAccountCache.fetch(ctx, {
        stripeConnectAccountId: host.stripeConnectAccountId,
      })) as StripeAccountResponse;

      await ctx.runMutation(unsafeInternal.stripe.updateHostStripeStatusInternal, {
        hostId: host._id,
        stripeConnectAccountId: host.stripeConnectAccountId,
        stripeOnboardingComplete: Boolean(account.details_submitted),
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripePayoutsEnabled: Boolean(account.payouts_enabled),
        stripeRequirementsCurrentlyDue: normalizeRequirements(account.requirements).currentlyDue,
        stripeRequirementsPastDue: normalizeRequirements(account.requirements).pastDue,
        stripeRequirementsEventuallyDue: normalizeRequirements(account.requirements).eventuallyDue,
        stripeRequirementsPendingVerification: normalizeRequirements(account.requirements).pendingVerification,
        stripeRequirementsDisabledReason: normalizeRequirements(account.requirements).disabledReason,
      });

      if (Boolean(account.payouts_enabled)) {
        await ctx.runAction(unsafeInternal.stripePayouts.retryHostPayoutsForHostInternal, {
          hostId: host._id,
          limit: 10,
        });
      }

      processed += 1;
      updated += 1;
    }

    return { processed, updated, scanned: hosts.length };
  },
});

