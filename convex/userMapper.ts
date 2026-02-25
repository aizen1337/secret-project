
export async function mapClerkUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const clerkUserId = identity.subject;

  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (!user) {
    const userId = await ctx.db.insert("users", {
      clerkUserId,
      name: identity.name ?? "Anonymous",
      imageUrl: identity.pictureUrl,
      createdAt: Date.now(),
    });
    user = await ctx.db.get(userId);
  }

  if (!user) {
    throw new Error("Failed to map user.");
  }

  return user;
}
