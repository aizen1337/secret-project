import { mutation } from "../_generated/server";
import { seedBookingsInternal } from "./helpers";

export const seedBookings = mutation({
  args: {},
  async handler(ctx) {
    await seedBookingsInternal(ctx);
    return { ok: true };
  },
});
