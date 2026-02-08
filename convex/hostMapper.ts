import { mapClerkUser } from "./userMapper";

export async function mapHost(ctx: any) {
  const user = await mapClerkUser(ctx);

  let host = await ctx.db
    .query("hosts")
    .withIndex("by_user", q => q.eq("userId", user._id))
    .first();

  if (!host) {
    host = await ctx.db.insert("hosts", {
      userId: user._id,
      isVerified: false,
      createdAt: Date.now(),
    });
  }

  return host;
}
