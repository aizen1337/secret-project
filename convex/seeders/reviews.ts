import { mutation } from "../_generated/server";
import { seedReviewsInternal } from "./helpers";

export const seedReviews = mutation({
  args: {},
  async handler(ctx) {
    await seedReviewsInternal(ctx);
    return { ok: true };
  },
});
