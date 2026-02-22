import { query } from "./_generated/server";
import { mapHost } from "./hostMapper";
import { internal } from "./_generated/api";

export const getCurrentUser = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
  },
});

export const getHostPayoutStatus = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) return null;

    const host = await mapHost(ctx);
    return {
      hostVerified: Boolean(host.isVerified),
      hasConnectAccount: Boolean(host.stripeConnectAccountId),
      onboardingComplete: Boolean(host.stripeOnboardingComplete),
      chargesEnabled: Boolean(host.stripeChargesEnabled),
      payoutsEnabled: Boolean(host.stripePayoutsEnabled),
      stripeConnectAccountId: host.stripeConnectAccountId ?? null,
    };
  },
});

export const getRenterVerificationStatus = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.runQuery(internal.verification.getRenterEligibilityInternal, {
      clerkUserId: identity.subject,
    });
  },
});
