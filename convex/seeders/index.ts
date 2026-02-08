import { mutation } from "../_generated/server";
import {
  seedCarsInternal,
  seedBookingsInternal,
  seedReviewsInternal,
} from "./helpers";

export const seedAll = mutation({
  args: {},
  async handler(ctx) {
    await seedCarsInternal(ctx);
    await seedBookingsInternal(ctx);
    await seedReviewsInternal(ctx);
    return { message: "All data seeded successfully" };
  },
});
