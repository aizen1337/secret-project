import { mutation } from "../_generated/server";
import { seedCarsInternal } from "./helpers";

export const seedCars = mutation({
  args: {},
  async handler(ctx) {
    await seedCarsInternal(ctx);
    return { ok: true };
  },
});
