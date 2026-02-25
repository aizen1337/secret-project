import { mutation } from "../_generated/server";
import {
  seedCarsInternal,
  seedBookingsInternal,
  seedReviewsInternal,
} from "./helpers";
import { assertAdminFromClerkRoleClaim } from "../guards/adminGuard";

export const seedAll = mutation({
  args: {},
  async handler(ctx) {
    await assertAdminFromClerkRoleClaim(ctx);
    await seedCarsInternal(ctx);
    await seedBookingsInternal(ctx);
    await seedReviewsInternal(ctx);
    return { message: "All data seeded successfully" };
  },
});
