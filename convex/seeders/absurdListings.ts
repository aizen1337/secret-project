import { action, internalMutation } from "../_generated/server";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { assertAdminFromClerkRoleClaim } from "../guards/adminGuard";

const unsafeInternal = internal as any;

const DEFAULT_TOTAL_COUNT = 4000;
const DEFAULT_BATCH_SIZE = 250;
const MAX_TOTAL_COUNT = 50000;
const MIN_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 1000;

const SEEDER_CLERK_USER_ID = "seeder.absurd.listings.host";
const SEEDER_HOST_NAME = "Absurd Listings Seeder Host";

const CITY_POOL: Array<{ city: string; country: string; lat: number; lng: number; basePrice: number }> = [
  { city: "New York", country: "USA", lat: 40.7128, lng: -74.006, basePrice: 145 },
  { city: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437, basePrice: 132 },
  { city: "Chicago", country: "USA", lat: 41.8781, lng: -87.6298, basePrice: 118 },
  { city: "Houston", country: "USA", lat: 29.7604, lng: -95.3698, basePrice: 102 },
  { city: "Phoenix", country: "USA", lat: 33.4484, lng: -112.074, basePrice: 98 },
  { city: "Philadelphia", country: "USA", lat: 39.9526, lng: -75.1652, basePrice: 111 },
  { city: "San Antonio", country: "USA", lat: 29.4241, lng: -98.4936, basePrice: 95 },
  { city: "San Diego", country: "USA", lat: 32.7157, lng: -117.1611, basePrice: 124 },
  { city: "Dallas", country: "USA", lat: 32.7767, lng: -96.797, basePrice: 106 },
  { city: "San Francisco", country: "USA", lat: 37.7749, lng: -122.4194, basePrice: 152 },
  { city: "Seattle", country: "USA", lat: 47.6062, lng: -122.3321, basePrice: 128 },
  { city: "Miami", country: "USA", lat: 25.7617, lng: -80.1918, basePrice: 119 },
];

const MAKE_MODEL_POOL: Array<{ make: string; models: string[] }> = [
  { make: "Tesla", models: ["Model 3", "Model Y", "Model S"] },
  { make: "BMW", models: ["X5", "3 Series", "5 Series"] },
  { make: "Mercedes-Benz", models: ["C-Class", "E-Class", "GLC"] },
  { make: "Audi", models: ["A4", "Q5", "A6"] },
  { make: "Toyota", models: ["Camry", "Corolla", "RAV4"] },
  { make: "Honda", models: ["Civic", "Accord", "CR-V"] },
  { make: "Ford", models: ["Mustang", "Explorer", "Escape"] },
  { make: "Chevrolet", models: ["Tahoe", "Malibu", "Equinox"] },
  { make: "Nissan", models: ["Altima", "Rogue", "Sentra"] },
  { make: "Hyundai", models: ["Elantra", "Tucson", "Sonata"] },
];

const FEATURE_POOL = [
  "Bluetooth",
  "Backup Camera",
  "Heated Seats",
  "Leather Seats",
  "Apple CarPlay",
  "Android Auto",
  "Cruise Control",
  "Sunroof",
  "Navigation",
  "Blind Spot Monitor",
];

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(Math.floor(value), max));
}

function seededUnit(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function jitter(base: number, idx: number, salt: number, range: number) {
  return base + (seededUnit(idx * 97 + salt * 193) - 0.5) * range;
}

function pickFeatures(idx: number) {
  const first = FEATURE_POOL[idx % FEATURE_POOL.length];
  const second = FEATURE_POOL[(idx + 3) % FEATURE_POOL.length];
  const third = FEATURE_POOL[(idx + 6) % FEATURE_POOL.length];
  return Array.from(new Set([first, second, third]));
}

function toIsoDayOffset(offsetDays: number) {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();
}

export const ensureAbsurdSeederHostInternal = internalMutation({
  args: {},
  async handler(ctx) {
    const now = Date.now();
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", SEEDER_CLERK_USER_ID))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkUserId: SEEDER_CLERK_USER_ID,
        name: SEEDER_HOST_NAME,
        createdAt: now,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to create seeder user.");
    }

    let host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!host) {
      const hostId = await ctx.db.insert("hosts", {
        userId: user._id,
        isVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      host = await ctx.db.get(hostId);
    }

    if (!host) {
      throw new Error("Failed to create seeder host.");
    }

    return { hostId: host._id };
  },
});

export const seedAbsurdListingsBatchInternal = internalMutation({
  args: {
    hostId: v.id("hosts"),
    startIndex: v.number(),
    count: v.number(),
  },
  async handler(ctx, args) {
    const count = clampInt(args.count, 1, MAX_BATCH_SIZE);
    const availableFrom = toIsoDayOffset(-30);
    const availableUntil = toIsoDayOffset(365);
    let inserted = 0;

    for (let i = 0; i < count; i += 1) {
      const idx = args.startIndex + i;
      const city = CITY_POOL[idx % CITY_POOL.length];
      const makeEntry = MAKE_MODEL_POOL[idx % MAKE_MODEL_POOL.length];
      const model = makeEntry.models[idx % makeEntry.models.length];
      const year = 2012 + (idx % 14);
      const features = pickFeatures(idx);
      const price = city.basePrice + (idx % 37);
      const createdAt = Date.now() + i;

      await ctx.db.insert("cars", {
        hostId: args.hostId,
        title: `${makeEntry.make} ${model} ${year} #${idx + 1}`,
        make: makeEntry.make,
        model,
        year,
        pricePerDay: price,
        availableFrom,
        availableUntil,
        location: {
          city: city.city,
          country: city.country,
          lat: jitter(city.lat, idx, 1, 0.22),
          lng: jitter(city.lng, idx, 2, 0.22),
        },
        features,
        customFeatures: [],
        images: [`https://picsum.photos/seed/absurd-listing-${idx}/900/600`],
        isActive: true,
        isCarVerified: idx % 4 !== 0,
        createdAt,
        updatedAt: createdAt,
      });

      inserted += 1;
    }

    return { inserted };
  },
});

export const seedAbsurdListings = action({
  args: {
    totalCount: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  async handler(ctx: any, args: any): Promise<any> {
    await assertAdminFromClerkRoleClaim(ctx);
    const totalCount = clampInt(args.totalCount ?? DEFAULT_TOTAL_COUNT, 1, MAX_TOTAL_COUNT);
    const batchSize = clampInt(args.batchSize ?? DEFAULT_BATCH_SIZE, MIN_BATCH_SIZE, MAX_BATCH_SIZE);

    const { hostId } = await ctx.runMutation(
      unsafeInternal["seeders/absurdListings"].ensureAbsurdSeederHostInternal,
      {},
    );

    const baseIndex = Date.now();
    let inserted = 0;
    let batches = 0;

    while (inserted < totalCount) {
      const chunk = Math.min(batchSize, totalCount - inserted);
      await ctx.runMutation(unsafeInternal["seeders/absurdListings"].seedAbsurdListingsBatchInternal, {
        hostId,
        startIndex: baseIndex + inserted,
        count: chunk,
      });
      inserted += chunk;
      batches += 1;
    }

    return {
      ok: true,
      inserted,
      batches,
      hostId,
      totalCount,
      batchSize,
    };
  },
});
