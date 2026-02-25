import { mutation } from "../_generated/server";
import { seedReviewsInternal } from "./helpers";
import { assertAdminFromClerkRoleClaim } from "../guards/adminGuard";

export const seedReviews = mutation({
  args: {},
  async handler(ctx) {
    await assertAdminFromClerkRoleClaim(ctx);
    await seedReviewsInternal(ctx);
    return { ok: true };
  },
});
