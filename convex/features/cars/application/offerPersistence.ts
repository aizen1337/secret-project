export async function getDefaultOfferByCarId(ctx: any, carId: any) {
  return await ctx.db
    .query("car_offers")
    .withIndex("by_car", (q: any) => q.eq("carId", carId))
    .first();
}

export async function replaceOfferAvailabilityRanges(
  ctx: any,
  offerId: any,
  ranges: Array<{ startDate: string; endDate: string }>,
) {
  const existing = await ctx.db
    .query("offer_availability_ranges")
    .withIndex("by_offer", (q: any) => q.eq("offerId", offerId))
    .collect();
  for (const row of existing) {
    await ctx.db.delete(row._id);
  }
  const now = Date.now();
  for (const range of ranges) {
    await ctx.db.insert("offer_availability_ranges", {
      offerId,
      startDate: range.startDate,
      endDate: range.endDate,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function upsertDefaultOfferForCar(
  ctx: any,
  args: {
    carId: any;
    title: string;
    pricePerDay: number;
    availableFrom: string;
    availableUntil: string;
    formattedAddress?: string;
    location: {
      city: string;
      country: string;
      lat: number;
      lng: number;
    };
    isActive: boolean;
    isOfferVerified: boolean;
    verificationSource?: string;
    verifiedAt?: number;
  },
) {
  const existing = await getDefaultOfferByCarId(ctx, args.carId);
  const now = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      title: args.title,
      pricePerDay: args.pricePerDay,
      availableFrom: args.availableFrom,
      availableUntil: args.availableUntil,
      formattedAddress: args.formattedAddress,
      location: args.location,
      isActive: args.isActive,
      isOfferVerified: args.isOfferVerified,
      verificationSource: args.verificationSource,
      verifiedAt: args.verifiedAt,
      archivedAt: args.isActive ? undefined : now,
      updatedAt: now,
    });
    await replaceOfferAvailabilityRanges(ctx, existing._id, [
      { startDate: args.availableFrom, endDate: args.availableUntil },
    ]);
    return existing._id;
  }

  const offerId = await ctx.db.insert("car_offers", {
    carId: args.carId,
    title: args.title,
    pricePerDay: args.pricePerDay,
    availableFrom: args.availableFrom,
    availableUntil: args.availableUntil,
    formattedAddress: args.formattedAddress,
    location: args.location,
    isActive: args.isActive,
    isOfferVerified: args.isOfferVerified,
    verificationSource: args.verificationSource,
    verifiedAt: args.verifiedAt,
    createdAt: now,
    updatedAt: now,
  });
  await replaceOfferAvailabilityRanges(ctx, offerId, [
    { startDate: args.availableFrom, endDate: args.availableUntil },
  ]);
  return offerId;
}
