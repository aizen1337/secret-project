// convex/cars.ts
import { action, internalAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ActionCache } from "@convex-dev/action-cache";
import { mapHost } from "./hostMapper";
import { components, internal } from "./_generated/api";

type CarLocation = {
  city: string;
  country: string;
  lat: number;
  lng: number;
};

type UpsertCarPayload = {
  title: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  availableFrom: string;
  availableUntil: string;
  formattedAddress?: string;
  features?: string[];
  customFeatures?: string[];
  vin?: string;
  registrationNumber?: string;
  registrationDate?: string;
  kilometersLimitPerDay?: number;
  depositAmount?: number;
  fuelPolicy?: string;
  fuelPolicyNote?: string;
  isCarVerified?: boolean;
  verificationSource?: string;
  verifiedAt?: number;
  location: CarLocation;
};

const FUEL_POLICIES = ["full_to_full", "same_to_same", "fuel_included"] as const;

function validateCarPayload(args: UpsertCarPayload) {
  const maxYear = new Date().getFullYear() + 1;

  if (!args.title.trim() || !args.make.trim() || !args.model.trim()) {
    throw new Error("Title, make and model are required.");
  }
  if (args.pricePerDay <= 0) {
    throw new Error("Price per day must be greater than 0.");
  }
  if (args.year < 1980 || args.year > maxYear) {
    throw new Error("Please provide a valid car year.");
  }
  if (new Date(args.availableFrom).getTime() > new Date(args.availableUntil).getTime()) {
    throw new Error("Availability range is invalid.");
  }
  if (args.kilometersLimitPerDay !== undefined) {
    if (!Number.isFinite(args.kilometersLimitPerDay) || args.kilometersLimitPerDay < 0) {
      throw new Error("Kilometers limit per day must be a non-negative number.");
    }
  }
  if (args.depositAmount !== undefined) {
    if (!Number.isFinite(args.depositAmount) || args.depositAmount < 0) {
      throw new Error("Deposit amount must be a non-negative number.");
    }
  }
  if (args.fuelPolicy !== undefined && !FUEL_POLICIES.includes(args.fuelPolicy as (typeof FUEL_POLICIES)[number])) {
    throw new Error("Fuel policy is invalid.");
  }
}

async function resolveImageUrls(
  ctx: any,
  imageStorageIds: Array<any>,
) {
  const images = (
    await Promise.all(imageStorageIds.map((storageId) => ctx.storage.getUrl(storageId)))
  ).filter((url): url is string => Boolean(url));

  if (!images.length) {
    throw new Error("Please upload at least one image.");
  }

  return images;
}

export const createCar = mutation({
  args: {
    title: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    pricePerDay: v.number(),
    availableFrom: v.string(),
    availableUntil: v.string(),
    formattedAddress: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    customFeatures: v.optional(v.array(v.string())),
    vin: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    registrationDate: v.optional(v.string()),
    kilometersLimitPerDay: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    fuelPolicy: v.optional(v.string()),
    fuelPolicyNote: v.optional(v.string()),
    isCarVerified: v.optional(v.boolean()),
    verificationSource: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    idempotencyKey: v.string(),
    location: v.object({
      city: v.string(),
      country: v.string(),
      lat: v.number(),
      lng: v.number(),
    }),
    imageStorageIds: v.array(v.id("_storage")),
  },
  async handler(ctx, args) {
    const host = await mapHost(ctx);
    const idempotencyKey = args.idempotencyKey.trim();

    if (!idempotencyKey) {
      throw new Error("Missing idempotency key.");
    }
    validateCarPayload(args);

    const images = await resolveImageUrls(ctx, args.imageStorageIds);

    const existingCar = await ctx.db
      .query("cars")
      .withIndex("by_host", q => q.eq("hostId", host._id))
      .filter(q => q.eq(q.field("idempotencyKey"), idempotencyKey))
      .first();
    if (existingCar) {
      return existingCar._id;
    }

    return await ctx.db.insert("cars", {
      hostId: host._id,
      title: args.title.trim(),
      make: args.make.trim(),
      model: args.model.trim(),
      year: args.year,
      pricePerDay: args.pricePerDay,
      availableFrom: args.availableFrom,
      availableUntil: args.availableUntil,
      formattedAddress: args.formattedAddress?.trim() || undefined,
      features: args.features ?? [],
      customFeatures: args.customFeatures ?? [],
      vin: args.vin?.trim().toUpperCase() || undefined,
      registrationNumber: args.registrationNumber?.trim().toUpperCase() || undefined,
      registrationDate: args.registrationDate || undefined,
      kilometersLimitPerDay: args.kilometersLimitPerDay,
      depositAmount: args.depositAmount,
      fuelPolicy: args.fuelPolicy || undefined,
      fuelPolicyNote: args.fuelPolicyNote?.trim() || undefined,
      isCarVerified: args.isCarVerified ?? false,
      verificationSource: args.verificationSource || undefined,
      verifiedAt: args.verifiedAt || undefined,
      idempotencyKey,
      location: args.location,
      images,
      isActive: true,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const getHostCarById = query({
  args: {
    carId: v.id("cars"),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) return null;
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!host) return null;
    const car = await ctx.db.get(args.carId);

    if (!car) return null;
    if (car.hostId !== host._id) return null;

    return car;
  },
});

export const updateHostCar = mutation({
  args: {
    carId: v.id("cars"),
    title: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    pricePerDay: v.number(),
    availableFrom: v.string(),
    availableUntil: v.string(),
    formattedAddress: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    customFeatures: v.optional(v.array(v.string())),
    vin: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    registrationDate: v.optional(v.string()),
    kilometersLimitPerDay: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    fuelPolicy: v.optional(v.string()),
    fuelPolicyNote: v.optional(v.string()),
    isCarVerified: v.optional(v.boolean()),
    verificationSource: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    location: v.object({
      city: v.string(),
      country: v.string(),
      lat: v.number(),
      lng: v.number(),
    }),
    existingImages: v.optional(v.array(v.string())),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  async handler(ctx, args) {
    const host = await mapHost(ctx);
    const car = await ctx.db.get(args.carId);

    if (!car) {
      throw new Error("Car not found.");
    }
    if (car.hostId !== host._id) {
      throw new Error("Unauthorized: You cannot edit this listing.");
    }

    validateCarPayload(args);

    let images = car.images;
    if (args.imageStorageIds !== undefined) {
      const uploadedImages =
        args.imageStorageIds.length > 0 ? await resolveImageUrls(ctx, args.imageStorageIds) : [];
      images = [...(args.existingImages ?? []), ...uploadedImages];
      if (!images.length) {
        throw new Error("Please upload at least one image.");
      }
    }

    await ctx.db.patch(args.carId, {
      title: args.title.trim(),
      make: args.make.trim(),
      model: args.model.trim(),
      year: args.year,
      pricePerDay: args.pricePerDay,
      availableFrom: args.availableFrom,
      availableUntil: args.availableUntil,
      formattedAddress: args.formattedAddress?.trim() || undefined,
      features: args.features ?? [],
      customFeatures: args.customFeatures ?? [],
      vin: args.vin?.trim().toUpperCase() || undefined,
      registrationNumber: args.registrationNumber?.trim().toUpperCase() || undefined,
      registrationDate: args.registrationDate || undefined,
      kilometersLimitPerDay: args.kilometersLimitPerDay,
      depositAmount: args.depositAmount,
      fuelPolicy: args.fuelPolicy || undefined,
      fuelPolicyNote: args.fuelPolicyNote?.trim() || undefined,
      isCarVerified: args.isCarVerified ?? false,
      verificationSource: args.verificationSource || undefined,
      verifiedAt: args.verifiedAt || undefined,
      location: args.location,
      images,
      updatedAt: Date.now(),
    });

    return args.carId;
  },
});

export const archiveHostCar = mutation({
  args: {
    carId: v.id("cars"),
  },
  async handler(ctx, args) {
    const host = await mapHost(ctx);
    const car = await ctx.db.get(args.carId);

    if (!car) {
      throw new Error("Car not found.");
    }
    if (car.hostId !== host._id) {
      throw new Error("Unauthorized: You cannot archive this listing.");
    }

    await ctx.db.patch(args.carId, {
      isActive: false,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.carId;
  },
});

export const unarchiveHostCar = mutation({
  args: {
    carId: v.id("cars"),
  },
  async handler(ctx, args) {
    const host = await mapHost(ctx);
    const car = await ctx.db.get(args.carId);

    if (!car) {
      throw new Error("Car not found.");
    }
    if (car.hostId !== host._id) {
      throw new Error("Unauthorized: You cannot unarchive this listing.");
    }

    await ctx.db.patch(args.carId, {
      isActive: true,
      archivedAt: undefined,
      updatedAt: Date.now(),
    });

    return args.carId;
  },
});

export const deleteHostCar = mutation({
  args: {
    carId: v.id("cars"),
  },
  async handler(ctx, args) {
    const host = await mapHost(ctx);
    const car = await ctx.db.get(args.carId);

    if (!car) {
      throw new Error("Car not found.");
    }
    if (car.hostId !== host._id) {
      throw new Error("Unauthorized: You cannot delete this listing.");
    }

    await ctx.db.delete(args.carId);
    return args.carId;
  },
});

export const generateCarImageUploadUrl = mutation({
  args: {},
  async handler(ctx) {
    return await ctx.storage.generateUploadUrl();
  },
});

type VinLookupResult = {
  make: string;
  model: string;
  year: number;
  title?: string;
  features: string[];
  customFeatures: string[];
  verified: boolean;
  source: "db.vin";
};

type DbVinVehicleResponse = {
  vin?: unknown;
  brand?: unknown;
  model?: unknown;
  year?: unknown;
  mileage?: unknown;
  price?: unknown;
  currency?: unknown;
  registrationCountry?: unknown;
  fuelType?: unknown;
  color?: unknown;
  bodyType?: unknown;
  version?: unknown;
};

function parseYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapDbVinCustomFeatures(payload: DbVinVehicleResponse): string[] {
  const entries: Array<[string, unknown]> = [
    ["Fuel Type", payload.fuelType],
    ["Body Type", payload.bodyType],
    ["Color", payload.color],
    ["Registration Country", payload.registrationCountry],
    ["Version", payload.version],
    ["Mileage", payload.mileage],
  ];
  return entries
    .map(([label, value]) => {
      const parsed = asNonEmptyString(value);
      return parsed ? `${label}: ${parsed}` : null;
    })
    .filter((item): item is string => Boolean(item));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export const verifyAndAutofillCarFromVin = action({
  args: {
    vin: v.string(),
    registrationNumber: v.string(),
    registrationDate: v.string(),
  },
  async handler(_, args): Promise<VinLookupResult> {
    const rawVin = args.vin.trim().toUpperCase();
    const rawRegistrationNumber = args.registrationNumber.trim().toUpperCase();
    const registrationDate = args.registrationDate.trim();

    if (!rawVin) {
      throw new Error("INVALID_INPUT: VIN is required.");
    }
    if (!rawRegistrationNumber) {
      throw new Error("INVALID_INPUT: Registration number is required.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(registrationDate)) {
      throw new Error("INVALID_INPUT: Registration date must be in YYYY-MM-DD format.");
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(`https://db.vin/api/v1/vin/${encodeURIComponent(rawVin)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new Error("UNAVAILABLE: VIN lookup request failed.");
    }

    let payload: DbVinVehicleResponse | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error("INVALID_INPUT: VIN lookup rejected the provided VIN.");
      }
      if (response.status === 404) {
        throw new Error("NOT_FOUND: Vehicle not found for the provided VIN.");
      }
      if (response.status >= 500) {
        throw new Error("UNAVAILABLE: VIN lookup service is unavailable.");
      }
      throw new Error("UNAVAILABLE: VIN lookup request failed.");
    }

    const make = asNonEmptyString(payload?.brand ?? null);
    const model = asNonEmptyString(payload?.model ?? null);
    const year = parseYear(payload?.year ?? null);
    if (!make || !model || !year) {
      throw new Error("UNAVAILABLE: VIN lookup returned incomplete vehicle data.");
    }

    const title = `${make} ${model} ${year}`.trim();
    return {
      make,
      model,
      year,
      title,
      features: [],
      customFeatures: mapDbVinCustomFeatures(payload ?? {}),
      verified: true,
      source: "db.vin",
    };
  },
});

type AddressSuggestion = {
  description: string;
  placeId: string;
};

type AddressDetails = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  formattedAddress: string;
};

const addressSearchCache = new ActionCache(components.actionCache, {
  action: internal.cars.searchAddressesUncached,
  name: "address-search-v2",
  ttl: 5 * 60 * 1000,
});

const addressDetailsCache = new ActionCache(components.actionCache, {
  action: internal.cars.resolveAddressDetailsUncached,
  name: "address-details-v2",
  ttl: 60 * 60 * 1000,
});

export const searchAddressesUncached = internalAction({
  args: {
    query: v.string(),
  },
  async handler(_, args): Promise<AddressSuggestion[]> {
    const rawQuery = args.query.trim();
    if (!rawQuery) return [];

    const query = new URLSearchParams({
      q: rawQuery,
      format: "jsonv2",
      addressdetails: "1",
      limit: "6",
    });

    const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "secret-project-address-lookup/1.0",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("UNAVAILABLE: Address search rate limit exceeded.");
      }
      throw new Error("UNAVAILABLE: Address search failed.");
    }

    const payload = await response.json();
    const results = Array.isArray(payload) ? payload : [];
    return results
      .map((item: any) => {
        const osmType = String(item?.osm_type ?? "").toLowerCase();
        const osmId = String(item?.osm_id ?? "").trim();
        const osmPrefix = osmType === "node" ? "N" : osmType === "way" ? "W" : osmType === "relation" ? "R" : "";
        return {
          description: String(item?.display_name ?? "").trim(),
          placeId: osmPrefix && osmId ? `${osmPrefix}${osmId}` : String(item?.place_id ?? "").trim(),
        };
      })
      .filter((item: AddressSuggestion) => item.description && item.placeId);
  },
});

export const resolveAddressDetailsUncached = internalAction({
  args: {
    placeId: v.string(),
  },
  async handler(_, args): Promise<AddressDetails> {
    const placeId = args.placeId.trim().toUpperCase();
    if (!/^[NWR]\d+$/.test(placeId)) {
      throw new Error("INVALID_INPUT: Invalid address identifier.");
    }

    const query = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      osm_ids: placeId,
    });

    const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/lookup?${query.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "secret-project-address-lookup/1.0",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("UNAVAILABLE: Address details rate limit exceeded.");
      }
      throw new Error("UNAVAILABLE: Could not resolve address details.");
    }

    const payload = await response.json();
    const result = Array.isArray(payload) ? payload[0] : null;
    if (!result) {
      throw new Error("NOT_FOUND: Address details not found.");
    }
    const address = result?.address ?? {};
    const city =
      String(
        address.city ??
          address.town ??
          address.village ??
          address.municipality ??
          address.county ??
          address.state_district ??
          "",
      ).trim();
    const country = String(address.country ?? "").trim();
    const lat = Number(result?.lat);
    const lng = Number(result?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("UNAVAILABLE: Address provider returned invalid coordinates.");
    }

    return {
      city,
      country,
      lat,
      lng,
      formattedAddress: String(result?.display_name ?? "").trim(),
    };
  },
});

export const searchAddresses = action({
  args: {
    query: v.string(),
    sessionToken: v.string(),
  },
  async handler(ctx, args): Promise<AddressSuggestion[]> {
    const rawQuery = args.query.trim();
    if (!rawQuery) return [];
    void args.sessionToken;
    return await addressSearchCache.fetch(ctx, { query: rawQuery.toLowerCase() });
  },
});

export const resolveAddressDetails = action({
  args: {
    placeId: v.string(),
    sessionToken: v.string(),
  },
  async handler(ctx, args): Promise<AddressDetails> {
    void args.sessionToken;
    const placeId = args.placeId.trim().toUpperCase();
    if (!/^[NWR]\d+$/.test(placeId)) {
      throw new Error("INVALID_INPUT: Invalid address identifier.");
    }
    return await addressDetailsCache.fetch(ctx, { placeId });
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
      if (car.availableFrom && new Date(startDate).getTime() < new Date(car.availableFrom).getTime()) {
        continue;
      }
      if (car.availableUntil && new Date(endDate).getTime() > new Date(car.availableUntil).getTime()) {
        continue;
      }

      const blockingBooking = await ctx.db
        .query("bookings")
        .withIndex("by_car", q => q.eq("carId", car._id))
        .filter(q =>
          q.and(
            q.or(
              q.eq(q.field("status"), "payment_pending"),
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

export const getCarOfferById = query({
  args: {
    carId: v.id("cars"),
  },
  async handler(ctx, args) {
    const car = await ctx.db.get(args.carId);
    if (!car) {
      return null;
    }

    const host = await ctx.db.get(car.hostId);
    const hostUser = host ? await ctx.db.get(host.userId) : null;

    return {
      car,
      host,
      hostUser,
    };
  },
});

export const listHostCars = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!user) return [];
    const host = await ctx.db
      .query("hosts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!host) return [];

    const cars = await ctx.db
      .query("cars")
      .withIndex("by_host", q => q.eq("hostId", host._id))
      .collect();

    const filtered = args.status
      ? cars.filter((car) => (args.status === "active" ? car.isActive : !car.isActive))
      : cars;

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});
