const DEFAULT_ADMIN_ROLE = "admin";

type UnknownRecord = Record<string, unknown>;

function normalizeRole(value: string) {
  return value.trim().toLowerCase();
}

function collectRoles(target: Set<string>, value: unknown) {
  if (!value) return;
  if (typeof value === "string") {
    const normalized = normalizeRole(value);
    if (!normalized) return;
    normalized
      .split(/[\s,;|]+/g)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => target.add(part));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRoles(target, item);
    }
    return;
  }
  if (typeof value === "object") {
    const record = value as UnknownRecord;
    for (const [key, nested] of Object.entries(record)) {
      if (key.toLowerCase().includes("role")) {
        collectRoles(target, nested);
      }
    }
  }
}

function extractRoles(identity: UnknownRecord) {
  const roles = new Set<string>();
  const clerkClaims = identity["https://clerk.dev/claims"];
  const claims = (identity.claims ?? clerkClaims) as UnknownRecord | undefined;
  const publicMetadata =
    (claims?.public_metadata as UnknownRecord | undefined) ??
    (identity.publicMetadata as UnknownRecord | undefined);
  const unsafeMetadata =
    (claims?.unsafe_metadata as UnknownRecord | undefined) ??
    (identity.unsafeMetadata as UnknownRecord | undefined);

  collectRoles(roles, identity.role);
  collectRoles(roles, identity.roles);
  collectRoles(roles, identity.orgRole);
  collectRoles(roles, identity.org_role);

  collectRoles(roles, claims?.role);
  collectRoles(roles, claims?.roles);
  collectRoles(roles, claims?.org_role);
  collectRoles(roles, claims?.orgRole);
  collectRoles(roles, claims?.org_roles);

  collectRoles(roles, publicMetadata?.role);
  collectRoles(roles, publicMetadata?.roles);
  collectRoles(roles, unsafeMetadata?.role);
  collectRoles(roles, unsafeMetadata?.roles);

  return roles;
}

export async function assertAdminFromClerkRoleClaim(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHORIZED: Authentication required.");
  }

  const expectedRole = normalizeRole(process.env.CLERK_ADMIN_ROLE ?? DEFAULT_ADMIN_ROLE);
  const roles = extractRoles(identity as UnknownRecord);
  if (!roles.has(expectedRole)) {
    throw new Error("FORBIDDEN: Admin role required.");
  }

  return identity;
}
