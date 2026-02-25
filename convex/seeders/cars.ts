import { mutation } from "../_generated/server";
import { seedCarsInternal } from "./helpers";
import { assertAdminFromClerkRoleClaim } from "../guards/adminGuard";

export const seedCars = mutation({
  args: {},
  async handler(ctx) {
    await assertAdminFromClerkRoleClaim(ctx);
    await seedCarsInternal(ctx);
    return { ok: true };
  },
});
