import { mapClerkUser } from "./userMapper";

export async function mapHost(ctx: any) {
  const user = await mapClerkUser(ctx);

  let host = await ctx.db
    .query("hosts")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();

  if (!host) {
    const hostId = await ctx.db.insert("hosts", {
      userId: user._id,
      isVerified: false,
      createdAt: Date.now(),
    });
    host = await ctx.db.get(hostId);
  }

  if (!host) {
    throw new Error("Failed to map host.");
  }

  return host;
}
