// convex/cars.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mapHost } from "./hostMapper";

export const createCar = mutation({
  args: {
    title: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    pricePerDay: v.number(),
    location: v.object({
      city: v.string(),
      country: v.string(),
      lat: v.number(),
      lng: v.number(),
    }),
    images: v.array(v.string()),
  },
  async handler(ctx, args) {
    const host = await mapHost(ctx);

    return await ctx.db.insert("cars", {
      hostId: host._id,
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});
export const listCurrentlyAvailableCars = query({
  args: {},
  async handler(ctx) {
    const now = new Date().toISOString();

    const cars = await ctx.db
      .query("cars")
      .withIndex("by_active", q => q.eq("isActive", true))
      .collect();

    const results = [];

    for (const car of cars) {
      const blockingBooking = await ctx.db
        .query("bookings")
        .withIndex("by_car", q => q.eq("carId", car._id))
        .filter(q =>
          q.and(
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "confirmed")
            ),
            q.lte(q.field("startDate"), now),
            q.gte(q.field("endDate"), now)
          )
        )
        .first();

      if (!blockingBooking) {
        results.push(car);
      }
    }

    return results;
  },
});

export const listHostCars = query({
  args: {},
  async handler(ctx) {
    const host = await mapHost(ctx);
    return await ctx.db
      .query("cars")
      .withIndex("by_host", (q) => q.eq("hostId", host._id))
      .collect();
  },
});
