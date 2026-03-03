import { internalMutation, internalQuery } from "../../../_generated/server";
import { v } from "convex/values";

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export const backfillUserEmailFromClerkInternal = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const page = await ctx.db
      .query("users")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: Math.max(1, Math.min(args.numItems ?? 100, 500)),
      });

    let updated = 0;
    for (const user of page.page) {
      const email = normalizeEmail(user.email);
      const patch: Record<string, unknown> = {};
      if (email && user.emailNormalized !== email) {
        patch.emailNormalized = email;
      }
      if (!user.authProvider && user.authSubject) {
        patch.authProvider = "better-auth";
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(user._id, patch);
        updated += 1;
      }
    }

    return {
      updated,
      scanned: page.page.length,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const markBetterAuthReadyInternal = internalQuery({
  args: {
    sampleSize: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const all = await ctx.db.query("users").collect();
    const unresolved = all.filter((user) => {
      const hasSubject = Boolean(user.authSubject);
      const hasEmail = Boolean(user.emailNormalized ?? user.email);
      return !hasSubject && !hasEmail;
    });
    const sample = unresolved
      .slice(0, Math.max(1, Math.min(args.sampleSize ?? 20, 100)))
      .map((user) => ({
        userId: user._id,
        clerkUserId: user.clerkUserId ?? null,
        email: user.email ?? null,
        authSubject: user.authSubject ?? null,
      }));

    return {
      totalUsers: all.length,
      unresolvedCount: unresolved.length,
      ready: unresolved.length === 0,
      unresolvedSample: sample,
    };
  },
});
