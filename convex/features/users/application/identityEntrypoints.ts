import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "../../../_generated/server";
import { internal } from "../../../_generated/api";

// TODO(deprecation): remove this module after all callsites migrate to `convex/verification.ts`.
const unsafeInternal = internal as any;

export const getCurrentUserVerificationInternal = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  async handler(ctx: any, args: any): Promise<any> {
    return await ctx.runQuery(unsafeInternal.verification.getRenterEligibilityInternal, {
      clerkUserId: args.clerkUserId,
    });
  },
});

export const getRenterVerificationStatus = query({
  args: {},
  async handler(ctx: any): Promise<any> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.runQuery(unsafeInternal.verification.getRenterEligibilityInternal, {
      clerkUserId: identity.subject,
    });
  },
});

export const createIdentityVerificationSession = action({
  args: {},
  async handler(ctx: any): Promise<any> {
    return await ctx.runAction(unsafeInternal.verification.startRenterIdentityCheckInternal, {});
  },
});

export const createDriverLicenseVerificationSession = action({
  args: {},
  async handler(ctx: any): Promise<any> {
    return await ctx.runAction(unsafeInternal.verification.startRenterDriverLicenseCheckInternal, {});
  },
});

export const upsertRenterVerificationSessionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    verificationType: v.union(v.literal("identity"), v.literal("driver_license")),
    sessionId: v.string(),
  },
  async handler(ctx: any, args: any): Promise<void> {
    await ctx.runMutation(unsafeInternal.verification.upsertCheckSessionInternal, {
      userId: args.userId,
      subjectType: "renter",
      checkType: args.verificationType,
      provider: "stripe",
      providerSessionId: args.sessionId,
    });
  },
});

export const updateRenterVerificationFromStripeSessionInternal = internalMutation({
  args: {
    sessionId: v.string(),
    verificationType: v.union(v.literal("identity"), v.literal("driver_license")),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  async handler(ctx: any, args: any): Promise<void> {
    await ctx.runMutation(unsafeInternal.verification.updateCheckFromProviderSessionInternal, {
      providerSessionId: args.sessionId,
      subjectType: "renter",
      checkType: args.verificationType,
      status: args.status,
      rejectionReason: args.rejectionReason,
    });
  },
});

