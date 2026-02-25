import { mutation } from "../_generated/server";
import { seedBookingsInternal } from "./helpers";
import { assertAdminFromClerkRoleClaim } from "../guards/adminGuard";

export const seedBookings = mutation({
  args: {},
  async handler(ctx) {
    await assertAdminFromClerkRoleClaim(ctx);
    await seedBookingsInternal(ctx);
    return { ok: true };
  },
});
