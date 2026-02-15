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
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const startDate = args.startDate ?? new Date().toISOString();
    const endDate = args.endDate ?? startDate;

    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      throw new Error("Invalid date range");
    }

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
            q.lte(q.field("startDate"), endDate),
            q.gte(q.field("endDate"), startDate)
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) return [];

    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .first();

    if (!host) return [];

    return await ctx.db
      .query("cars")
      .withIndex("by_host", q => q.eq("hostId", host._id))
      .collect();
  },
});
