import { v } from "convex/values";
import { internalMutation } from "../../../_generated/server";
import { getDefaultOfferByCarId } from "./offerPersistence";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export const migrateCarsToOffersInternal = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    numItems: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const pageSize = clamp(Math.round(args.numItems ?? 100), 1, 500);
    const page = await ctx.db.query("cars").paginate({
      cursor: args.cursor ?? null,
      numItems: pageSize,
    } as any);

    let offersCreated = 0;
    let rangesCreated = 0;
    let bookingsUpdated = 0;

    for (const car of page.page) {
      const existingOffer = await getDefaultOfferByCarId(ctx, car._id);
      let offerId = existingOffer?._id;
      if (!offerId) {
        offerId = await ctx.db.insert("car_offers", {
          carId: car._id,
          title: car.title,
          pricePerDay: car.pricePerDay,
          availableFrom: car.availableFrom ?? new Date().toISOString(),
          availableUntil:
            car.availableUntil ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          formattedAddress: car.formattedAddress ?? undefined,
          location: car.location,
          isActive: Boolean(car.isActive),
          isOfferVerified: Boolean(car.isCarVerified),
          verificationSource: car.verificationSource ?? undefined,
          verifiedAt: car.verifiedAt ?? undefined,
          archivedAt: car.archivedAt ?? undefined,
          createdAt: car.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        });
        offersCreated += 1;
      }

      const ranges = await ctx.db
        .query("offer_availability_ranges")
        .withIndex("by_offer", (q: any) => q.eq("offerId", offerId))
        .collect();
      if (ranges.length === 0) {
        await ctx.db.insert("offer_availability_ranges", {
          offerId,
          startDate: car.availableFrom ?? new Date().toISOString(),
          endDate:
            car.availableUntil ??
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        rangesCreated += 1;
      }

      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_car", (q: any) => q.eq("carId", car._id))
        .collect();
      for (const booking of bookings) {
        if (!booking.offerId) {
          await ctx.db.patch(booking._id, { offerId });
          bookingsUpdated += 1;
        }
      }
    }

    return {
      ok: true,
      carsScanned: page.page.length,
      offersCreated,
      rangesCreated,
      bookingsUpdated,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
