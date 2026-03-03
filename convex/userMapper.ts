import { linkBetterAuthUserId } from "./auth";

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function getIdentityEmail(identity: any): string | undefined {
  const fromTopLevel = normalizeEmail(identity?.email);
  if (fromTopLevel) return fromTopLevel;
  const fromClaims = normalizeEmail(identity?.claims?.email);
  if (fromClaims) return fromClaims;
  const fromProfile = normalizeEmail(identity?.profile?.email);
  if (fromProfile) return fromProfile;
  return undefined;
}

function getIdentityName(identity: any): string {
  const displayName =
    (typeof identity?.name === "string" ? identity.name.trim() : "") ||
    (typeof identity?.claims?.name === "string" ? identity.claims.name.trim() : "") ||
    (typeof identity?.profile?.name === "string" ? identity.profile.name.trim() : "");
  return displayName || "Anonymous";
}

async function findUserByIdentity(ctx: any, identity: any) {
  const authSubject = String(identity.subject);
  const emailNormalized = getIdentityEmail(identity);

  let user = await ctx.db
    .query("users")
    .withIndex("by_auth_subject", (q: any) => q.eq("authSubject", authSubject))
    .first();
  if (user) return user;

  user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", authSubject))
    .first();
  if (user) return user;

  if (!emailNormalized) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_email_normalized", (q: any) => q.eq("emailNormalized", emailNormalized))
    .first();
}

export async function mapAuthUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const authSubject = String(identity.subject);
  const now = Date.now();
  const emailNormalized = getIdentityEmail(identity);
  const existing = await findUserByIdentity(ctx, identity);

  if (!existing) {
    const userId = await ctx.db.insert("users", {
      clerkUserId: authSubject,
      authProvider: "better-auth",
      authSubject,
      email: emailNormalized,
      emailNormalized,
      lastAuthAt: now,
      name: getIdentityName(identity),
      imageUrl: identity.pictureUrl ?? identity?.claims?.picture ?? identity?.profile?.picture,
      createdAt: now,
    });
    try {
      await linkBetterAuthUserId(ctx, authSubject, String(userId));
    } catch (error) {
      console.warn("Failed to link Better Auth userId to app user row", error);
    }
    const created = await ctx.db.get(userId);
    if (!created) throw new Error("Failed to map user.");
    return created;
  }

  const patch: Record<string, unknown> = {
    clerkUserId: authSubject,
    authProvider: "better-auth",
    authSubject,
    lastAuthAt: now,
  };
  if (emailNormalized && existing.emailNormalized !== emailNormalized) {
    patch.emailNormalized = emailNormalized;
    patch.email = emailNormalized;
  }
  const nextName = getIdentityName(identity);
  if (nextName && existing.name !== nextName) {
    patch.name = nextName;
  }
  const nextImage = identity.pictureUrl ?? identity?.claims?.picture ?? identity?.profile?.picture;
  if (typeof nextImage === "string" && nextImage !== existing.imageUrl) {
    patch.imageUrl = nextImage;
  }
  await ctx.db.patch(existing._id, patch);
  if (!existing.authSubject || existing.authSubject !== authSubject) {
    try {
      await linkBetterAuthUserId(ctx, authSubject, String(existing._id));
    } catch (error) {
      console.warn("Failed to refresh Better Auth userId linkage", error);
    }
  }
  return { ...existing, ...patch };
}

// Backward-compatible export name to reduce churn in callsites.
export const mapClerkUser = mapAuthUser;

export async function getCurrentUserOrNull(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await findUserByIdentity(ctx, identity);
}
