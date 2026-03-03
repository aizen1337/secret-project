import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "../../../_generated/server";
import { ActionCache } from "@convex-dev/action-cache";
import { components, internal } from "../../../_generated/api";
import { mapClerkUser } from "../../../userMapper";
import {
  evaluateRenterBookingEligibility,
  type VerificationCheckType,
  type VerificationProvider,
  resolveDefaultVerificationProvider,
  type VerificationStatus,
  type VerificationSubjectType,
} from "../../../verificationPolicy";
import { getVerificationProvider } from "../../../verificationProvider";
import { isEnvTrue } from "../../../env";
import { assertAllowedRedirectUrl } from "../../../guards/redirectUrlGuard";

const unsafeInternal = internal as any;

function isRenterVerificationEnabled() {
  return isEnvTrue("ENABLE_RENTER_VERIFICATION", false);
}

function getVerificationReturnUrl(override?: string) {
  const raw =
    (override && override.trim()) ||
    process.env.POLAND_VERIFICATION_RETURN_URL ||
    process.env.STRIPE_IDENTITY_RETURN_URL ||
    "http://localhost:8081/profile?verification=return";
  return assertAllowedRedirectUrl(raw, "returnUrl");
}

function defaultChecks(): Record<VerificationCheckType, VerificationStatus> {
  return {
    driver_license: "unverified",
  };
}

function getDefaultVerificationProvider(): VerificationProvider {
  return resolveDefaultVerificationProvider(process.env.VERIFICATION_PROVIDER_DEFAULT);
}

function getVerificationRecertDays() {
  const raw = String(process.env.POLAND_VERIFICATION_RECERT_DAYS ?? "").trim();
  if (!raw) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

async function resolveChecksForUser(ctx: any, userId: any) {
  const checks = defaultChecks();
  let rejectionReason: string | undefined;

  const genericChecks = await ctx.db
    .query("verification_checks")
    .withIndex("by_user_subject", (q: any) => q.eq("userId", userId).eq("subjectType", "renter"))
    .collect();

  for (const row of genericChecks) {
    checks[row.checkType as VerificationCheckType] = row.status as VerificationStatus;
    if (!rejectionReason && row.status === "rejected" && row.rejectionReason) {
      rejectionReason = row.rejectionReason;
    }
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

async function getRenterVerificationSummaryForClerk(ctx: any, clerkUserId: string) {
  const enabled = isRenterVerificationEnabled();
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (!user) {
    const checks = defaultChecks();
    const eligibility = evaluateRenterBookingEligibility(checks);
    return {
      enabled,
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
    driverLicenseStatus: checks.driver_license,
    readyToBook: enabled ? eligibility.readyToBook : true,
    reasonCode: enabled ? eligibility.reasonCode : undefined,
    missingChecks: enabled ? eligibility.missingChecks : [],
    rejectionReason,
  };
}

async function startRenterDriverLicenseSession(
  ctx: any,
  provider: VerificationProvider,
  returnUrl?: string,
) {
  if (!isRenterVerificationEnabled()) {
    throw new Error("UNAVAILABLE: Renter verification is disabled.");
  }
  if (provider === "mobywatel") {
    throw new Error("UNAVAILABLE: mObywatel verification will be implemented soon.");
  }

  const user = await ctx.runMutation(unsafeInternal.verification.ensureUserForVerificationInternal, {});
  const recertDays = getVerificationRecertDays();
  if (recertDays > 0) {
    const existing = await ctx.db
      .query("verification_checks")
      .withIndex("by_user_subject_check", (q: any) =>
        q.eq("userId", user._id).eq("subjectType", "renter").eq("checkType", "driver_license"),
      )
      .first();
    if (existing?.status === "verified" && typeof existing.verifiedAt === "number") {
      const ageMs = Date.now() - existing.verifiedAt;
      const cooldownMs = recertDays * 24 * 60 * 60 * 1000;
      if (ageMs < cooldownMs) {
        return {
          sessionId: existing.providerSessionId ?? `${existing.provider}-${String(existing._id)}-verified`,
          status: "verified",
          url: getVerificationReturnUrl(returnUrl),
        };
      }
    }
  }

  const providerClient = getVerificationProvider(provider);
  const session = await providerClient.createSession({
    checkType: "driver_license",
    subjectType: "renter",
    userId: String(user._id),
    returnUrl: getVerificationReturnUrl(returnUrl),
    metadata: {
      verificationType: "driver_license",
      checkType: "driver_license",
    },
  });

  await ctx.runMutation(unsafeInternal.verification.upsertCheckSessionInternal, {
    userId: user._id,
    subjectType: "renter",
    checkType: "driver_license",
    provider,
    providerSessionId: session.sessionId,
  });

  return session;
}

const stripeVerificationSessionCache = new ActionCache(components.actionCache, {
  action: unsafeInternal.verification.fetchStripeVerificationSessionUncached,
  name: "stripe-verification-session-v2",
  ttl: 60 * 1000,
});

const mobywatelVerificationSessionCache = new ActionCache(components.actionCache, {
  action: unsafeInternal.verification.fetchMobywatelVerificationSessionUncached,
  name: "mobywatel-verification-session-v1",
  ttl: 60 * 1000,
});

function toInternalVerificationStatus(status: string): "pending" | "verified" | "rejected" {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "approved" || normalized === "verified") return "verified";
  if (normalized === "pending" || normalized === "processing") return "pending";
  if (
    normalized === "failed" ||
    normalized === "rejected" ||
    normalized === "needs_input" ||
    normalized === "requires_input" ||
    normalized === "canceled"
  ) {
    return "rejected";
  }
  return "pending";
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

export const fetchStripeVerificationSessionUncached = internalAction({
  args: {
    sessionId: v.string(),
  },
  async handler(_, args): Promise<any> {
    return await getVerificationProvider("stripe").fetchSession(args.sessionId);
  },
});

export const fetchMobywatelVerificationSessionUncached = internalAction({
  args: {
    sessionId: v.string(),
  },
  async handler(_, args): Promise<any> {
    return await getVerificationProvider("mobywatel").fetchSession(args.sessionId);
  },
});

export const findRenterCheckBySessionInternal = internalQuery({
  args: {
    sessionId: v.string(),
  },
  async handler(
    ctx,
    args,
  ): Promise<{ checkType: VerificationCheckType; provider: VerificationProvider } | null> {
    const checks = await ctx.db
      .query("verification_checks")
      .withIndex("by_provider_session", (q: any) => q.eq("providerSessionId", args.sessionId))
      .collect();
    const renterCheck = checks.find(
      (check: any) => check.subjectType === "renter" && check.checkType === "driver_license",
    );
    if (!renterCheck) {
      return null;
    }

    return {
      checkType: "driver_license",
      provider: renterCheck.provider as VerificationProvider,
    };
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

    const rows = await ctx.db
      .query("verification_checks")
      .withIndex("by_user_subject_check", (q: any) =>
        q.eq("userId", user._id).eq("subjectType", "renter").eq("checkType", "driver_license"),
      )
      .collect();

    const latest = rows
      .filter((row: any) => Boolean(row.providerSessionId))
      .sort((a: any, b: any) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime))[0];
    if (!latest?.providerSessionId) return null;
    return { sessionId: latest.providerSessionId as string, checkType: "driver_license" };
  },
});

export const syncRenterVerificationSession = action({
  args: {
    sessionId: v.optional(v.string()),
  },
  async handler(ctx: any, args: any): Promise<any> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const resolved =
      args.sessionId?.trim() ||
      (
        await ctx.runQuery(unsafeInternal.verification.getLatestRenterSessionIdForClerkInternal, {
          clerkUserId: identity.subject,
        })
      )?.sessionId;

    if (!resolved) {
      throw new Error("NOT_FOUND: No verification session found to sync.");
    }

    const fallback = await ctx.runQuery(unsafeInternal.verification.findRenterCheckBySessionInternal, {
      sessionId: resolved,
    });

    const provider = (fallback?.provider ?? "stripe") as VerificationProvider;
    const session =
      provider === "mobywatel"
        ? await mobywatelVerificationSessionCache.fetch(ctx, { sessionId: resolved })
        : await stripeVerificationSessionCache.fetch(ctx, { sessionId: resolved });

    await ctx.runMutation(unsafeInternal.verification.updateCheckFromProviderSessionInternal, {
      providerSessionId: resolved,
      subjectType: "renter",
      checkType: "driver_license",
      provider,
      status: toInternalVerificationStatus(String(session.status)),
      rejectionReason: typeof session?.rejectionReason === "string" ? session.rejectionReason : undefined,
    });

    return {
      sessionId: resolved,
      provider,
      providerStatus: session.status,
      checkType: "driver_license",
      updated: true,
    };
  },
});

export const startRenterDriverLicenseCheck = action({
  args: {
    returnUrl: v.optional(v.string()),
    provider: v.optional(v.union(v.literal("stripe"), v.literal("mobywatel"))),
  },
  async handler(ctx, args) {
    const provider = args.provider ?? getDefaultVerificationProvider();
    return await startRenterDriverLicenseSession(ctx, provider, args.returnUrl);
  },
});

export const startRenterDriverLicenseCheckInternal = internalAction({
  args: {
    provider: v.optional(v.union(v.literal("stripe"), v.literal("mobywatel"))),
  },
  async handler(ctx, args) {
    const provider = args.provider ?? getDefaultVerificationProvider();
    return await startRenterDriverLicenseSession(ctx, provider);
  },
});

export const upsertCheckSessionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    subjectType: v.union(v.literal("renter")),
    checkType: v.union(v.literal("driver_license")),
    provider: v.union(v.literal("stripe"), v.literal("mobywatel")),
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
  },
});

export const updateCheckFromProviderSessionInternal = internalMutation({
  args: {
    providerSessionId: v.string(),
    subjectType: v.union(v.literal("renter")),
    checkType: v.union(v.literal("driver_license")),
    provider: v.union(v.literal("stripe"), v.literal("mobywatel")),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const bySession = await ctx.db
      .query("verification_checks")
      .withIndex("by_provider_session", (q: any) => q.eq("providerSessionId", args.providerSessionId))
      .collect();

    const target =
      bySession.find(
        (row: any) => row.subjectType === args.subjectType && row.checkType === args.checkType,
      ) ?? null;

    if (!target) {
      return { updated: false };
    }

    const now = Date.now();
    await ctx.db.patch(target._id, {
      status: args.status,
      provider: args.provider,
      verifiedAt: args.status === "verified" ? now : undefined,
      rejectionReason: args.status === "rejected" ? args.rejectionReason : undefined,
      updatedAt: now,
    });

    return { updated: true };
  },
});

export const importLegacyDriverLicenseChecksInternal = internalMutation({
  args: {
    rows: v.array(
      v.object({
        clerkUserId: v.string(),
        status: v.union(v.literal("unverified"), v.literal("pending"), v.literal("verified"), v.literal("rejected")),
        providerSessionId: v.optional(v.string()),
        verifiedAt: v.optional(v.number()),
        rejectionReason: v.optional(v.string()),
      }),
    ),
  },
  async handler(ctx, args) {
    let imported = 0;
    let skipped = 0;

    for (const row of args.rows) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", row.clerkUserId))
        .first();
      if (!user) {
        skipped += 1;
        continue;
      }
      await upsertGenericCheck(ctx, {
        userId: user._id,
        subjectType: "renter",
        checkType: "driver_license",
        status: row.status,
        provider: "stripe",
        providerSessionId: row.providerSessionId,
        verifiedAt: row.verifiedAt,
        rejectionReason: row.status === "rejected" ? row.rejectionReason : undefined,
      });
      imported += 1;
    }

    return { imported, skipped };
  },
});
