import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { ActionCache } from "@convex-dev/action-cache";
import { components, internal } from "./_generated/api";
import { mapClerkUser } from "./userMapper";
import {
  evaluateRenterBookingEligibility,
  type VerificationCheckType,
  type VerificationProvider,
  type VerificationStatus,
  type VerificationSubjectType,
} from "./verificationPolicy";
import { getVerificationProvider } from "./verificationProvider";
import { isEnvTrue } from "./env";

function isRenterVerificationEnabled() {
  return isEnvTrue("ENABLE_RENTER_VERIFICATION", false);
}

function getIdentityReturnUrl(override?: string) {
  if (override && override.trim()) {
    return override.trim();
  }
  return process.env.STRIPE_IDENTITY_RETURN_URL ?? "http://localhost:8081/profile?verification=return";
}

function defaultChecks(): Record<VerificationCheckType, VerificationStatus> {
  return {
    identity: "unverified",
    driver_license: "unverified",
  };
}

function getStripeSecretKey() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in Convex environment.");
  }
  return stripeSecretKey;
}

async function resolveChecksForUser(ctx: any, userId: any) {
  const checks = defaultChecks();
  let rejectionReason: string | undefined;

  const genericChecks = await ctx.db
    .query("verification_checks")
    .withIndex("by_user_subject", (q: any) => q.eq("userId", userId).eq("subjectType", "renter"))
    .collect();

  if (genericChecks.length > 0) {
    for (const row of genericChecks) {
      checks[row.checkType] = row.status;
      if (!rejectionReason && row.status === "rejected" && row.rejectionReason) {
        rejectionReason = row.rejectionReason;
      }
    }
    return { checks, rejectionReason };
  }

  const legacy = await ctx.db
    .query("renter_verifications")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (legacy) {
    checks.identity = legacy.identityStatus;
    checks.driver_license = legacy.driverLicenseStatus;
    rejectionReason = legacy.rejectionReason;
  }

  return { checks, rejectionReason };
}

async function upsertGenericCheck(
  ctx: any,
  args: {
    userId: any;
    subjectType: VerificationSubjectType;
    checkType: VerificationCheckType;
    status: VerificationStatus;
    provider: VerificationProvider;
    providerSessionId?: string;
    rejectionReason?: string;
    verifiedAt?: number;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("verification_checks")
    .withIndex("by_user_subject_check", (q: any) =>
      q.eq("userId", args.userId).eq("subjectType", args.subjectType).eq("checkType", args.checkType),
    )
    .first();

  if (!existing) {
    return await ctx.db.insert("verification_checks", {
      userId: args.userId,
      subjectType: args.subjectType,
      checkType: args.checkType,
      status: args.status,
      provider: args.provider,
      providerSessionId: args.providerSessionId,
      rejectionReason: args.rejectionReason,
      verifiedAt: args.verifiedAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  await ctx.db.patch(existing._id, {
    status: args.status,
    provider: args.provider,
    providerSessionId: args.providerSessionId ?? existing.providerSessionId,
    rejectionReason: args.rejectionReason,
    verifiedAt: args.verifiedAt,
    updatedAt: now,
  });
  return existing._id;
}

async function syncLegacyRow(
  ctx: any,
  args: {
    userId: any;
    checkType: VerificationCheckType;
    status: VerificationStatus;
    sessionId?: string;
    rejectionReason?: string;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("renter_verifications")
    .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
    .first();

  const identityStatus = args.checkType === "identity" ? args.status : existing?.identityStatus ?? "unverified";
  const driverLicenseStatus =
    args.checkType === "driver_license" ? args.status : existing?.driverLicenseStatus ?? "unverified";
  const identitySessionId =
    args.checkType === "identity" ? args.sessionId : existing?.identitySessionId;
  const driverLicenseSessionId =
    args.checkType === "driver_license" ? args.sessionId : existing?.driverLicenseSessionId;

  if (!existing) {
    await ctx.db.insert("renter_verifications", {
      userId: args.userId,
      identityStatus,
      driverLicenseStatus,
      identitySessionId,
      driverLicenseSessionId,
      identityVerifiedAt: args.checkType === "identity" && args.status === "verified" ? now : undefined,
      driverLicenseVerifiedAt:
        args.checkType === "driver_license" && args.status === "verified" ? now : undefined,
      rejectionReason: args.status === "rejected" ? args.rejectionReason : undefined,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.patch(existing._id, {
    identityStatus,
    driverLicenseStatus,
    identitySessionId,
    driverLicenseSessionId,
    identityVerifiedAt:
      args.checkType === "identity"
        ? args.status === "verified"
          ? now
          : undefined
        : existing.identityVerifiedAt,
    driverLicenseVerifiedAt:
      args.checkType === "driver_license"
        ? args.status === "verified"
          ? now
          : undefined
        : existing.driverLicenseVerifiedAt,
    rejectionReason: args.status === "rejected" ? args.rejectionReason : undefined,
    updatedAt: now,
  });
}

async function getRenterVerificationSummaryForClerk(ctx: any, clerkUserId: string) {
  const enabled = isRenterVerificationEnabled();
  console.debug("[verification] renter flag evaluated", {
    clerkUserId,
    enabled,
    rawValue: process.env.ENABLE_RENTER_VERIFICATION,
  });

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (!user) {
    const checks = defaultChecks();
    const eligibility = evaluateRenterBookingEligibility(checks);
    return {
      enabled,
      identityStatus: checks.identity,
      driverLicenseStatus: checks.driver_license,
      readyToBook: enabled ? eligibility.readyToBook : true,
      reasonCode: enabled ? eligibility.reasonCode : undefined,
      missingChecks: enabled ? eligibility.missingChecks : [],
      rejectionReason: undefined as string | undefined,
    };
  }

  const { checks, rejectionReason } = await resolveChecksForUser(ctx, user._id);
  const eligibility = evaluateRenterBookingEligibility(checks);

  return {
    enabled,
    identityStatus: checks.identity,
    driverLicenseStatus: checks.driver_license,
    readyToBook: enabled ? eligibility.readyToBook : true,
    reasonCode: enabled ? eligibility.reasonCode : undefined,
    missingChecks: enabled ? eligibility.missingChecks : [],
    rejectionReason,
  };
}

async function startRenterCheck(ctx: any, checkType: VerificationCheckType, returnUrl?: string) {
  if (!isRenterVerificationEnabled()) {
    throw new Error("UNAVAILABLE: Renter verification is disabled.");
  }

  const user = await ctx.runMutation(internal.verification.ensureUserForVerificationInternal, {});
  const provider = getVerificationProvider("stripe");
  const session = await provider.createSession({
    checkType,
    subjectType: "renter",
    userId: String(user._id),
    returnUrl: getIdentityReturnUrl(returnUrl),
    metadata: {
      verificationType: checkType,
    },
  });

  await ctx.runMutation(internal.verification.upsertCheckSessionInternal, {
    userId: user._id,
    subjectType: "renter",
    checkType,
    provider: "stripe",
    providerSessionId: session.sessionId,
  });

  return session;
}

type StripeVerificationSessionResponse = {
  id: string;
  status: string;
  metadata?: Record<string, string>;
  last_error?: {
    reason?: string;
  };
};

const stripeVerificationSessionCache = new ActionCache(components.actionCache, {
  action: internal.verification.fetchStripeVerificationSessionUncached,
  name: "stripe-verification-session-v1",
  ttl: 60 * 1000,
});

function toInternalVerificationStatus(status: string): "pending" | "verified" | "rejected" {
  if (status === "verified") return "verified";
  if (status === "processing") return "pending";
  if (status === "requires_input" || status === "canceled") return "rejected";
  return "pending";
}

function toInternalRejectionReason(session: StripeVerificationSessionResponse): string | undefined {
  if (session.status !== "requires_input" && session.status !== "canceled") return undefined;
  return typeof session.last_error?.reason === "string"
    ? session.last_error.reason
    : session.status === "canceled"
      ? "canceled"
      : "requires_input";
}

export const ensureUserForVerificationInternal = internalMutation({
  args: {},
  async handler(ctx) {
    return await mapClerkUser(ctx);
  },
});

export const getRenterEligibilityInternal = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  async handler(ctx, args) {
    return await getRenterVerificationSummaryForClerk(ctx, args.clerkUserId);
  },
});

export const getMyRenterVerificationStatus = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.runQuery(internal.verification.getRenterEligibilityInternal, {
      clerkUserId: identity.subject,
    });
  },
});

export const fetchStripeVerificationSessionUncached = internalAction({
  args: {
    sessionId: v.string(),
  },
  async handler(_, args): Promise<StripeVerificationSessionResponse> {
    const response = await fetch(
      `https://api.stripe.com/v1/identity/verification_sessions/${encodeURIComponent(args.sessionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStripeSecretKey()}`,
        },
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? "Stripe request failed.");
    }
    return payload as StripeVerificationSessionResponse;
  },
});

export const findRenterCheckBySessionInternal = internalQuery({
  args: {
    sessionId: v.string(),
  },
  async handler(ctx, args): Promise<{ checkType: VerificationCheckType } | null> {
    const checks = await ctx.db
      .query("verification_checks")
      .withIndex("by_provider_session", (q: any) => q.eq("providerSessionId", args.sessionId))
      .collect();
    const renterCheck = checks.find((check: any) => check.subjectType === "renter");
    if (renterCheck) {
      return { checkType: renterCheck.checkType as VerificationCheckType };
    }

    const legacyIdentity = await ctx.db
      .query("renter_verifications")
      .withIndex("by_identity_session", (q: any) => q.eq("identitySessionId", args.sessionId))
      .first();
    if (legacyIdentity) {
      return { checkType: "identity" };
    }
    const legacyLicense = await ctx.db
      .query("renter_verifications")
      .withIndex("by_driver_session", (q: any) => q.eq("driverLicenseSessionId", args.sessionId))
      .first();
    if (legacyLicense) {
      return { checkType: "driver_license" };
    }

    return null;
  },
});

export const getLatestRenterSessionIdForClerkInternal = internalQuery({
  args: {
    clerkUserId: v.string(),
  },
  async handler(ctx, args): Promise<{ sessionId: string; checkType: VerificationCheckType } | null> {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", args.clerkUserId))
      .first();
    if (!user) return null;

    const checks = await ctx.db
      .query("verification_checks")
      .withIndex("by_user_subject", (q: any) => q.eq("userId", user._id).eq("subjectType", "renter"))
      .collect();
    const sorted = checks
      .filter((check: any) => Boolean(check.providerSessionId))
      .sort((a: any, b: any) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime));
    if (sorted.length > 0) {
      return { sessionId: sorted[0].providerSessionId as string, checkType: sorted[0].checkType };
    }

    const legacy = await ctx.db
      .query("renter_verifications")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();
    if (legacy?.driverLicenseSessionId) {
      return { sessionId: legacy.driverLicenseSessionId, checkType: "driver_license" };
    }
    if (legacy?.identitySessionId) {
      return { sessionId: legacy.identitySessionId, checkType: "identity" };
    }
    return null;
  },
});

export const syncRenterVerificationSession = action({
  args: {
    sessionId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const resolved =
      args.sessionId?.trim() ||
      (
        await ctx.runQuery(internal.verification.getLatestRenterSessionIdForClerkInternal, {
          clerkUserId: identity.subject,
        })
      )?.sessionId;

    if (!resolved) {
      throw new Error("NOT_FOUND: No verification session found to sync.");
    }

    const session = (await stripeVerificationSessionCache.fetch(ctx, {
      sessionId: resolved,
    })) as StripeVerificationSessionResponse;

    const metadataType =
      session.metadata?.checkType === "driver_license" || session.metadata?.verificationType === "driver_license"
        ? "driver_license"
        : session.metadata?.checkType === "identity" || session.metadata?.verificationType === "identity"
          ? "identity"
          : undefined;

    const fallback = await ctx.runQuery(internal.verification.findRenterCheckBySessionInternal, {
      sessionId: resolved,
    });
    const checkType = (metadataType ?? fallback?.checkType ?? "driver_license") as VerificationCheckType;

    await ctx.runMutation(internal.verification.updateCheckFromProviderSessionInternal, {
      providerSessionId: resolved,
      subjectType: "renter",
      checkType,
      status: toInternalVerificationStatus(session.status),
      rejectionReason: toInternalRejectionReason(session),
    });

    return {
      sessionId: resolved,
      stripeStatus: session.status,
      checkType,
      updated: true,
    };
  },
});

export const startRenterIdentityCheck = action({
  args: {
    returnUrl: v.optional(v.string()),
  },
  async handler(ctx, args) {
    return await startRenterCheck(ctx, "identity", args.returnUrl);
  },
});

export const startRenterDriverLicenseCheck = action({
  args: {
    returnUrl: v.optional(v.string()),
  },
  async handler(ctx, args) {
    return await startRenterCheck(ctx, "driver_license", args.returnUrl);
  },
});

export const startRenterIdentityCheckInternal = internalAction({
  args: {},
  async handler(ctx) {
    return await startRenterCheck(ctx, "identity");
  },
});

export const startRenterDriverLicenseCheckInternal = internalAction({
  args: {},
  async handler(ctx) {
    return await startRenterCheck(ctx, "driver_license");
  },
});

export const upsertCheckSessionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    subjectType: v.union(v.literal("renter")),
    checkType: v.union(v.literal("identity"), v.literal("driver_license")),
    provider: v.union(v.literal("stripe")),
    providerSessionId: v.string(),
  },
  async handler(ctx, args) {
    await upsertGenericCheck(ctx, {
      userId: args.userId,
      subjectType: args.subjectType,
      checkType: args.checkType,
      status: "pending",
      provider: args.provider,
      providerSessionId: args.providerSessionId,
      rejectionReason: undefined,
      verifiedAt: undefined,
    });

    if (args.subjectType === "renter") {
      await syncLegacyRow(ctx, {
        userId: args.userId,
        checkType: args.checkType,
        status: "pending",
        sessionId: args.providerSessionId,
        rejectionReason: undefined,
      });
    }
  },
});

export const updateCheckFromProviderSessionInternal = internalMutation({
  args: {
    providerSessionId: v.string(),
    subjectType: v.union(v.literal("renter")),
    checkType: v.union(v.literal("identity"), v.literal("driver_license")),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const bySession = await ctx.db
      .query("verification_checks")
      .withIndex("by_provider_session", (q: any) => q.eq("providerSessionId", args.providerSessionId))
      .collect();

    let target =
      bySession.find(
        (row: any) => row.subjectType === args.subjectType && row.checkType === args.checkType,
      ) ?? null;

    if (!target && args.subjectType === "renter") {
      const legacy = await ctx.db
        .query("renter_verifications")
        .withIndex(args.checkType === "identity" ? "by_identity_session" : "by_driver_session", (q: any) =>
          q.eq(args.checkType === "identity" ? "identitySessionId" : "driverLicenseSessionId", args.providerSessionId),
        )
        .first();

      if (!legacy) {
        return { updated: false };
      }

      await upsertGenericCheck(ctx, {
        userId: legacy.userId,
        subjectType: args.subjectType,
        checkType: args.checkType,
        status: args.status,
        provider: "stripe",
        providerSessionId: args.providerSessionId,
        rejectionReason: args.status === "rejected" ? args.rejectionReason : undefined,
        verifiedAt: args.status === "verified" ? Date.now() : undefined,
      });

      target = await ctx.db
        .query("verification_checks")
        .withIndex("by_user_subject_check", (q: any) =>
          q.eq("userId", legacy.userId).eq("subjectType", args.subjectType).eq("checkType", args.checkType),
        )
        .first();
    }

    if (!target) {
      return { updated: false };
    }

    const now = Date.now();
    await ctx.db.patch(target._id, {
      status: args.status,
      verifiedAt: args.status === "verified" ? now : undefined,
      rejectionReason: args.status === "rejected" ? args.rejectionReason : undefined,
      updatedAt: now,
    });

    if (args.subjectType === "renter") {
      await syncLegacyRow(ctx, {
        userId: target.userId,
        checkType: args.checkType,
        status: args.status,
        sessionId: args.providerSessionId,
        rejectionReason: args.rejectionReason,
      });
    }

    return { updated: true };
  },
});

export const backfillRenterVerificationsToChecksInternal = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const rows = await ctx.db.query("renter_verifications").collect();
    const max = typeof args.limit === "number" && args.limit > 0 ? Math.floor(args.limit) : rows.length;
    let migrated = 0;

    for (const row of rows.slice(0, max)) {
      await upsertGenericCheck(ctx, {
        userId: row.userId,
        subjectType: "renter",
        checkType: "identity",
        status: row.identityStatus,
        provider: "stripe",
        providerSessionId: row.identitySessionId,
        rejectionReason: row.identityStatus === "rejected" ? row.rejectionReason : undefined,
        verifiedAt: row.identityVerifiedAt,
      });
      await upsertGenericCheck(ctx, {
        userId: row.userId,
        subjectType: "renter",
        checkType: "driver_license",
        status: row.driverLicenseStatus,
        provider: "stripe",
        providerSessionId: row.driverLicenseSessionId,
        rejectionReason: row.driverLicenseStatus === "rejected" ? row.rejectionReason : undefined,
        verifiedAt: row.driverLicenseVerifiedAt,
      });
      migrated += 1;
    }

    return {
      migrated,
      scanned: rows.length,
      remaining: Math.max(0, rows.length - migrated),
    };
  },
});
