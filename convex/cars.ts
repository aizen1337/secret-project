// convex/cars.ts
import { action, internalAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { ActionCache } from "@convex-dev/action-cache";
import { mapHost } from "./hostMapper";
import { mapClerkUser } from "./userMapper";
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
      isCarVerified: false,
      verificationSource: undefined,
      verifiedAt: undefined,
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
      isCarVerified: car.isCarVerified ?? false,
      verificationSource: car.verificationSource || undefined,
      verifiedAt: car.verifiedAt || undefined,
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
    await mapClerkUser(ctx);
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

async function lookupVinWithDbVin(args: {
  vin: string;
  registrationNumber: string;
  registrationDate: string;
}): Promise<VinLookupResult> {
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
}

export const verifyAndAutofillCarFromVinUncached = internalAction({
  args: {
    vin: v.string(),
    registrationNumber: v.string(),
    registrationDate: v.string(),
  },
  async handler(_, args): Promise<VinLookupResult> {
    return await lookupVinWithDbVin(args);
  },
});

const vinLookupCache = new ActionCache(components.actionCache, {
  action: internal.cars.verifyAndAutofillCarFromVinUncached,
  name: "vin-lookup-v1",
  ttl: 12 * 60 * 60 * 1000,
});

export const verifyAndAutofillCarFromVin = action({
  args: {
    vin: v.string(),
    registrationNumber: v.string(),
    registrationDate: v.string(),
  },
  async handler(ctx, args): Promise<VinLookupResult> {
    await mapClerkUser(ctx);
    return await vinLookupCache.fetch(ctx, {
      vin: args.vin.trim().toUpperCase(),
      registrationNumber: args.registrationNumber.trim().toUpperCase(),
      registrationDate: args.registrationDate.trim(),
    });
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
    await mapClerkUser(ctx);
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
    await mapClerkUser(ctx);
    void args.sessionToken;
    const placeId = args.placeId.trim().toUpperCase();
    if (!/^[NWR]\d+$/.test(placeId)) {
      throw new Error("INVALID_INPUT: Invalid address identifier.");
    }
    return await addressDetailsCache.fetch(ctx, { placeId });
  },
});

const PROMOTION_LIMIT_DEFAULT = 6;
const RECENT_LOCATION_RADIUS_KM = 70;
const NEARBY_CITY_RADIUS_KM = 250;
const NEARBY_CITY_FALLBACK_RADIUS_KM = 500;
const RECENT_LOCATIONS_MAX = 5;
const RECENT_LOCATIONS_FOR_SECTION = 3;
const RENTAL_LOOKBACK_DAYS = 180;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RENTAL_SIGNAL_STATUSES = new Set(["paid", "confirmed", "completed"]);
const ACTIVE_CARS_SCAN_LIMIT_DEFAULT = 1200;
const ACTIVE_CARS_RETURN_LIMIT_DEFAULT = 240;
const ACTIVE_CARS_SCAN_LIMIT_MAX = 4000;
const ACTIVE_CARS_RETURN_LIMIT_MAX = 1200;
const DEFAULT_PAGINATED_SEARCH_RADIUS_KM = 50;

type CarSearchCenter = {
  lat: number;
  lng: number;
};

type ListAvailableCarsForRangeOptions = {
  maxCarsScanned?: number;
  maxCarsReturned?: number;
  proximityCenters?: CarSearchCenter[];
  maxDistanceKm?: number;
};

type PromotionRecentLocation = {
  placeId: string;
  description: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  searchCount: number;
  lastSearchedAt: number;
};

type OfferScoreBreakdown = {
  priceScore: number;
  carReviewScore: number;
  hostReviewScore: number;
  rentalBehaviorScore: number;
  distanceScore: number;
  frequencyScore: number;
  durationScore: number;
  utilizationScore: number;
};

type EnrichedCar = {
  car: any;
  carReviewAvg: number;
  carReviewCount: number;
  hostReviewAvg: number;
  hostReviewCount: number;
  bookingCount180d: number;
  totalRentalDays180d: number;
  avgRentalDays: number;
};

type ScoredOffer = {
  id: string;
  title?: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  images: string[];
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
  carRating: number;
  carReviewCount: number;
  hostRating: number;
  hostReviewCount: number;
  bookingCount180d: number;
  totalRentalDays180d: number;
  avgRentalDays: number;
  offerScore: number;
  badge: "best_value" | "top_rated" | "popular" | null;
  scoreBreakdown: OfferScoreBreakdown;
  matchedRecentLocationPlaceId?: string;
};

const recentLocationInputValidator = v.object({
  placeId: v.string(),
  description: v.string(),
  city: v.string(),
  country: v.string(),
  lat: v.number(),
  lng: v.number(),
  searchCount: v.number(),
  lastSearchedAt: v.number(),
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision = 4) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function normalizeLimit(value: number | undefined, fallback = PROMOTION_LIMIT_DEFAULT) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), 1, 12);
}

function cityKey(city: string, country: string) {
  return `${city.trim().toLowerCase()}::${country.trim().toLowerCase()}`;
}

function normalizePlaceId(placeId: string) {
  return placeId.trim().toUpperCase();
}

function normalizeRecentLocations(locations: PromotionRecentLocation[]) {
  const deduped = new Map<string, PromotionRecentLocation>();
  for (const raw of locations) {
    if (!Number.isFinite(raw.lat) || !Number.isFinite(raw.lng)) continue;
    const placeId = normalizePlaceId(raw.placeId);
    if (!placeId) continue;
    const next: PromotionRecentLocation = {
      placeId,
      description: String(raw.description ?? "").trim(),
      city: String(raw.city ?? "").trim(),
      country: String(raw.country ?? "").trim(),
      lat: raw.lat,
      lng: raw.lng,
      searchCount: Math.max(1, Math.round(raw.searchCount ?? 1)),
      lastSearchedAt: Number.isFinite(raw.lastSearchedAt) ? raw.lastSearchedAt : 0,
    };
    const previous = deduped.get(placeId);
    if (!previous || next.lastSearchedAt > previous.lastSearchedAt) {
      deduped.set(placeId, next);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.lastSearchedAt - a.lastSearchedAt)
    .slice(0, RECENT_LOCATIONS_MAX);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function bayesianAverage(average: number, count: number, priorMean: number, priorCount: number) {
  const safeCount = Math.max(0, count);
  if (safeCount === 0) return priorMean;
  return (safeCount * average + priorCount * priorMean) / (safeCount + priorCount);
}

function rentalDays(startMs: number, endMs: number) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
}

function isCarInsideDistanceBound(
  car: any,
  centers: CarSearchCenter[],
  maxDistanceKm: number | undefined,
) {
  if (!centers.length || !Number.isFinite(maxDistanceKm)) return true;
  if (typeof car.location?.lat !== "number" || typeof car.location?.lng !== "number") {
    return false;
  }

  for (const center of centers) {
    const distance = haversineKm(center.lat, center.lng, car.location.lat, car.location.lng);
    if (distance <= Number(maxDistanceKm)) {
      return true;
    }
  }

  return false;
}

async function collectBlockingCarIdsForRange(
  ctx: any,
  startDate: string,
  endDate: string,
  candidateCarIds?: Set<string>,
) {
  const [pending, confirmed] = await Promise.all([
    ctx.db
      .query("bookings")
      .withIndex("by_status_startDate", (q: any) =>
        q.eq("status", "payment_pending").lte("startDate", endDate),
      )
      .collect(),
    ctx.db
      .query("bookings")
      .withIndex("by_status_startDate", (q: any) =>
        q.eq("status", "confirmed").lte("startDate", endDate),
      )
      .collect(),
  ]);

  const blocked = new Set<string>();
  for (const booking of [...pending, ...confirmed]) {
    if (booking.endDate < startDate) {
      continue;
    }
    const carId = String(booking.carId);
    if (candidateCarIds && !candidateCarIds.has(carId)) {
      continue;
    }
    blocked.add(carId);
  }
  return blocked;
}

async function listAvailableCarsForRange(
  ctx: any,
  startDate: string,
  endDate: string,
  options: ListAvailableCarsForRangeOptions = {},
) {
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || startTs > endTs) {
    throw new Error("Invalid date range");
  }

  const centers = (options.proximityCenters ?? []).filter(
    (center) =>
      Number.isFinite(center?.lat) &&
      Number.isFinite(center?.lng),
  );
  const maxDistanceKm =
    typeof options.maxDistanceKm === "number" && Number.isFinite(options.maxDistanceKm)
      ? Math.max(1, options.maxDistanceKm)
      : undefined;
  const maxCarsScanned = clamp(
    Math.round(options.maxCarsScanned ?? ACTIVE_CARS_SCAN_LIMIT_DEFAULT),
    1,
    ACTIVE_CARS_SCAN_LIMIT_MAX,
  );
  const maxCarsReturned = clamp(
    Math.round(options.maxCarsReturned ?? ACTIVE_CARS_RETURN_LIMIT_DEFAULT),
    1,
    ACTIVE_CARS_RETURN_LIMIT_MAX,
  );

  const scannedCars: any[] = await ctx.db
    .query("cars")
    .withIndex("by_active", (q: any) => q.eq("isActive", true))
    .take(maxCarsScanned);

  const prelim = scannedCars.filter((car: any) => {
    if (car.availableFrom && startTs < new Date(car.availableFrom).getTime()) {
      return false;
    }
    if (car.availableUntil && endTs > new Date(car.availableUntil).getTime()) {
      return false;
    }
    if (!isCarInsideDistanceBound(car, centers, maxDistanceKm)) {
      return false;
    }
    return true;
  });

  const candidateIds = new Set<string>(prelim.map((car: any) => String(car._id)));
  const blockedCarIds = await collectBlockingCarIdsForRange(ctx, startDate, endDate, candidateIds);

  return prelim
    .filter((car: any) => !blockedCarIds.has(String(car._id)))
    .slice(0, maxCarsReturned);
}

async function resolveRecentLocationsForPromotions(
  ctx: any,
  fallbackRecentLocations: PromotionRecentLocation[] | undefined,
) {
  const normalizedFallback = normalizeRecentLocations(fallbackRecentLocations ?? []);
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return normalizedFallback;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!user) {
    return normalizedFallback;
  }

  const serverRows = await ctx.db
    .query("recent_location_searches")
    .withIndex("by_user_lastSearched", (q: any) => q.eq("userId", user._id))
    .collect();

  const normalizedServer = normalizeRecentLocations(
    serverRows.map((row: any) => ({
      placeId: row.placeId,
      description: row.description,
      city: row.city,
      country: row.country,
      lat: row.lat,
      lng: row.lng,
      searchCount: row.searchCount,
      lastSearchedAt: row.lastSearchedAt,
    })),
  );

  return normalizedServer.length > 0 ? normalizedServer : normalizedFallback;
}

async function enrichCarsForPromotionSignals(ctx: any, cars: any[]) {
  if (cars.length === 0) {
    return [];
  }
  const nowTs = Date.now();
  const lookbackStartTs = nowTs - RENTAL_LOOKBACK_DAYS * MS_PER_DAY;
  const currentIso = new Date(nowTs).toISOString();
  const carIdSet = new Set(cars.map((car) => String(car._id)));
  const hostIds = Array.from(new Set(cars.map((car) => String(car.hostId))));

  const hosts = await Promise.all(hostIds.map((hostId) => ctx.db.get(hostId as any)));
  const hostUserByHostId = new Map<string, string>();
  hosts.forEach((host, index) => {
    if (host?.userId) {
      hostUserByHostId.set(hostIds[index], String(host.userId));
    }
  });
  const hostUserIdSet = new Set(Array.from(hostUserByHostId.values()));

  const [allCarReviews, allBookingReviews, paidBookings, confirmedBookings, completedBookings] =
    await Promise.all([
      ctx.db.query("reviews").collect(),
      ctx.db.query("booking_reviews").collect(),
      ctx.db
        .query("bookings")
        .withIndex("by_status_startDate", (q: any) => q.eq("status", "paid").lte("startDate", currentIso))
        .collect(),
      ctx.db
        .query("bookings")
        .withIndex("by_status_startDate", (q: any) => q.eq("status", "confirmed").lte("startDate", currentIso))
        .collect(),
      ctx.db
        .query("bookings")
        .withIndex("by_status_startDate", (q: any) => q.eq("status", "completed").lte("startDate", currentIso))
        .collect(),
    ]);

  const carReviewsByCarId = new Map<string, number[]>();
  for (const review of allCarReviews) {
    const carId = String(review.carId);
    if (!carIdSet.has(carId)) continue;
    const existing = carReviewsByCarId.get(carId) ?? [];
    existing.push(Number(review.rating ?? 0));
    carReviewsByCarId.set(carId, existing);
  }

  const hostReviewsByUserId = new Map<string, number[]>();
  for (const review of allBookingReviews) {
    if (String(review.direction) !== "renter_to_host") continue;
    const targetUserId = String(review.targetUserId);
    if (!hostUserIdSet.has(targetUserId)) continue;
    const existing = hostReviewsByUserId.get(targetUserId) ?? [];
    existing.push(Number(review.rating ?? 0));
    hostReviewsByUserId.set(targetUserId, existing);
  }

  const bookingStatsByCarId = new Map<string, { bookingCount180d: number; totalRentalDays180d: number }>();
  for (const booking of [...paidBookings, ...confirmedBookings, ...completedBookings]) {
    if (!RENTAL_SIGNAL_STATUSES.has(String(booking.status))) {
      continue;
    }
    const carId = String(booking.carId);
    if (!carIdSet.has(carId)) {
      continue;
    }
    const bookingStart = new Date(booking.startDate).getTime();
    const bookingEnd = new Date(booking.endDate).getTime();
    if (!Number.isFinite(bookingStart) || !Number.isFinite(bookingEnd)) {
      continue;
    }
    if (bookingEnd < lookbackStartTs || bookingStart > nowTs) {
      continue;
    }

    const overlapStart = Math.max(bookingStart, lookbackStartTs);
    const overlapEnd = Math.min(bookingEnd, nowTs);
    const overlapDays = rentalDays(overlapStart, overlapEnd);
    if (overlapDays <= 0) {
      continue;
    }

    const existing = bookingStatsByCarId.get(carId) ?? {
      bookingCount180d: 0,
      totalRentalDays180d: 0,
    };
    existing.bookingCount180d += 1;
    existing.totalRentalDays180d += overlapDays;
    bookingStatsByCarId.set(carId, existing);
  }

  return cars.map((car) => {
    const carRatings = carReviewsByCarId.get(String(car._id)) ?? [];
    const carReviewCount = carRatings.length;
    const carReviewAvg =
      carReviewCount > 0
        ? carRatings.reduce((sum, rating) => sum + Number(rating ?? 0), 0) / carReviewCount
        : 0;

    const hostUserId = hostUserByHostId.get(String(car.hostId));
    const hostRatings = hostUserId ? hostReviewsByUserId.get(hostUserId) ?? [] : [];
    const hostReviewCount = hostRatings.length;
    const hostReviewAvg =
      hostReviewCount > 0
        ? hostRatings.reduce((sum, rating) => sum + Number(rating ?? 0), 0) / hostReviewCount
        : 0;

    const bookingStats = bookingStatsByCarId.get(String(car._id)) ?? {
      bookingCount180d: 0,
      totalRentalDays180d: 0,
    };
    const avgRentalDays =
      bookingStats.bookingCount180d > 0
        ? bookingStats.totalRentalDays180d / bookingStats.bookingCount180d
        : 0;

    return {
      car,
      carReviewAvg,
      carReviewCount,
      hostReviewAvg,
      hostReviewCount,
      bookingCount180d: bookingStats.bookingCount180d,
      totalRentalDays180d: bookingStats.totalRentalDays180d,
      avgRentalDays,
    } as EnrichedCar;
  });
}

function buildCityMedianPrices(cars: any[]) {
  const pricesByCity = new Map<string, number[]>();
  for (const car of cars) {
    const key = cityKey(car.location?.city ?? "", car.location?.country ?? "");
    if (!pricesByCity.has(key)) {
      pricesByCity.set(key, []);
    }
    pricesByCity.get(key)!.push(Number(car.pricePerDay ?? 0));
  }

  const medians = new Map<string, number>();
  for (const [key, prices] of pricesByCity.entries()) {
    medians.set(key, median(prices.filter((price) => Number.isFinite(price) && price > 0)));
  }
  return medians;
}

function computeOfferScore(args: {
  pricePerDay: number;
  cityMedianPrice: number;
  carReviewAvg: number;
  carReviewCount: number;
  hostReviewAvg: number;
  hostReviewCount: number;
  bookingCount180d: number;
  totalRentalDays180d: number;
  avgRentalDays: number;
  distanceScore: number;
}) {
  const safeCityMedian = args.cityMedianPrice > 0 ? args.cityMedianPrice : args.pricePerDay;
  const priceScore = clamp(1.5 - args.pricePerDay / safeCityMedian, 0, 1);
  const carReviewScore = bayesianAverage(args.carReviewAvg, args.carReviewCount, 4.4, 5) / 5;
  const hostReviewScore = bayesianAverage(args.hostReviewAvg, args.hostReviewCount, 4.5, 10) / 5;

  const frequencyScore = clamp((args.bookingCount180d / 6) / 3, 0, 1);
  const durationScore = clamp(args.avgRentalDays / 7, 0, 1);
  const utilizationScore = clamp(args.totalRentalDays180d / 180, 0, 1);
  const rentalBehaviorScore =
    0.5 * frequencyScore + 0.3 * utilizationScore + 0.2 * durationScore;

  const offerScore =
    0.35 * priceScore +
    0.2 * carReviewScore +
    0.2 * hostReviewScore +
    0.2 * rentalBehaviorScore +
    0.05 * args.distanceScore;

  return {
    offerScore,
    scoreBreakdown: {
      priceScore,
      carReviewScore,
      hostReviewScore,
      rentalBehaviorScore,
      distanceScore: args.distanceScore,
      frequencyScore,
      durationScore,
      utilizationScore,
    } satisfies OfferScoreBreakdown,
  };
}

function attachBadges(sortedOffers: ScoredOffer[]) {
  if (!sortedOffers.length) return [];
  const topQuartileSize = Math.max(1, Math.ceil(sortedOffers.length * 0.25));
  const topQuartileIds = new Set(sortedOffers.slice(0, topQuartileSize).map((offer) => offer.id));

  return sortedOffers.map((offer) => {
    const combinedReviewScore =
      (offer.scoreBreakdown.carReviewScore + offer.scoreBreakdown.hostReviewScore) / 2;

    let badge: ScoredOffer["badge"] = null;
    if (offer.scoreBreakdown.priceScore >= 0.7 && topQuartileIds.has(offer.id)) {
      badge = "best_value";
    } else if (combinedReviewScore >= 0.9) {
      badge = "top_rated";
    } else if (offer.scoreBreakdown.rentalBehaviorScore >= 0.65) {
      badge = "popular";
    }

    return { ...offer, badge };
  });
}

export const listCurrentlyAvailableCars = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const startDate = args.startDate ?? new Date().toISOString();
    const endDate = args.endDate ?? startDate;
    return await listAvailableCarsForRange(ctx, startDate, endDate, {
      maxCarsScanned: 500,
      maxCarsReturned: 300,
    });
  },
});

export const listCurrentlyAvailableCarsPaginated = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    centerLat: v.optional(v.number()),
    centerLng: v.optional(v.number()),
    radiusKm: v.optional(v.number()),
    paginationOpts: paginationOptsValidator,
  },
  async handler(ctx, args) {
    const startDate = args.startDate ?? new Date().toISOString();
    const endDate = args.endDate ?? startDate;
    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || startTs > endTs) {
      throw new Error("Invalid date range");
    }

    const hasCenter =
      Number.isFinite(args.centerLat) &&
      Number.isFinite(args.centerLng);
    const radiusKm = hasCenter
      ? clamp(args.radiusKm ?? DEFAULT_PAGINATED_SEARCH_RADIUS_KM, 1, 300)
      : null;

    const requestedItems = Math.max(
      1,
      Math.min(
        Math.round(
          typeof (args.paginationOpts as any)?.numItems === "number"
            ? (args.paginationOpts as any).numItems
            : 30,
        ),
        120,
      ),
    );

    let cursor = (args.paginationOpts as any)?.cursor ?? null;
    let isDone = false;
    let scannedChunks = 0;
    const filteredPage: any[] = [];

    while (filteredPage.length < requestedItems && !isDone && scannedChunks < 8) {
      const chunk = await ctx.db
        .query("cars")
        .withIndex("by_active", (q: any) => q.eq("isActive", true))
        .paginate({
          ...(args.paginationOpts as any),
          cursor,
          numItems: Math.max(requestedItems * 2, 40),
        });
      cursor = chunk.continueCursor;
      isDone = chunk.isDone;
      scannedChunks += 1;

      const prelim = chunk.page.filter((car: any) => {
        if (car.availableFrom && startTs < new Date(car.availableFrom).getTime()) {
          return false;
        }
        if (car.availableUntil && endTs > new Date(car.availableUntil).getTime()) {
          return false;
        }

        if (hasCenter && radiusKm !== null) {
          if (typeof car.location?.lat !== "number" || typeof car.location?.lng !== "number") {
            return false;
          }
          const distance = haversineKm(
            Number(args.centerLat),
            Number(args.centerLng),
            car.location.lat,
            car.location.lng,
          );
          if (distance > radiusKm) {
            return false;
          }
        }
        return true;
      });

      if (prelim.length === 0) {
        continue;
      }
      const candidateIds = new Set(prelim.map((car: any) => String(car._id)));
      const blockedIds = await collectBlockingCarIdsForRange(ctx, startDate, endDate, candidateIds);
      for (const car of prelim) {
        if (blockedIds.has(String(car._id))) {
          continue;
        }
        filteredPage.push(car);
        if (filteredPage.length >= requestedItems) {
          break;
        }
      }
    }

    return {
      page: filteredPage,
      isDone,
      continueCursor: cursor,
    };
  },
});

export const listPromotionalOffersForRecentLocations = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    fallbackRecentLocations: v.optional(v.array(recentLocationInputValidator)),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    try {
      const startDate = args.startDate ?? new Date().toISOString();
      const endDate = args.endDate ?? startDate;
      const limit = normalizeLimit(args.limit, PROMOTION_LIMIT_DEFAULT);
      const recentLocations = (
        await resolveRecentLocationsForPromotions(ctx, args.fallbackRecentLocations)
      ).slice(0, RECENT_LOCATIONS_FOR_SECTION);

      if (!recentLocations.length) {
        return { recentLocations: [], offers: [], error: null as string | null };
      }

      const availableCars = await listAvailableCarsForRange(ctx, startDate, endDate, {
        proximityCenters: recentLocations.map((location) => ({
          lat: location.lat,
          lng: location.lng,
        })),
        maxDistanceKm: RECENT_LOCATION_RADIUS_KM,
        maxCarsScanned: 900,
        maxCarsReturned: 180,
      });
      if (!availableCars.length) {
        return { recentLocations, offers: [], error: null as string | null };
      }

      const cityMedianPrices = buildCityMedianPrices(availableCars);
      const enrichedCars = await enrichCarsForPromotionSignals(ctx, availableCars);
      const scoredCandidates: Array<ScoredOffer & { nearestPlaceId: string }> = [];

      for (const entry of enrichedCars) {
        if (
          typeof entry.car.location?.lat !== "number" ||
          typeof entry.car.location?.lng !== "number"
        ) {
          continue;
        }

        let nearestDistance = Number.POSITIVE_INFINITY;
        let nearestPlaceId = "";
        for (const location of recentLocations) {
          const distance = haversineKm(
            location.lat,
            location.lng,
            entry.car.location.lat,
            entry.car.location.lng,
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPlaceId = location.placeId;
          }
        }

        if (!Number.isFinite(nearestDistance) || nearestDistance > RECENT_LOCATION_RADIUS_KM) {
          continue;
        }

        const cityMedian =
          cityMedianPrices.get(cityKey(entry.car.location.city, entry.car.location.country)) ||
          entry.car.pricePerDay;
        const distanceScore = clamp(1 - nearestDistance / RECENT_LOCATION_RADIUS_KM, 0, 1);
        const { offerScore, scoreBreakdown } = computeOfferScore({
          pricePerDay: entry.car.pricePerDay,
          cityMedianPrice: cityMedian,
          carReviewAvg: entry.carReviewAvg,
          carReviewCount: entry.carReviewCount,
          hostReviewAvg: entry.hostReviewAvg,
          hostReviewCount: entry.hostReviewCount,
          bookingCount180d: entry.bookingCount180d,
          totalRentalDays180d: entry.totalRentalDays180d,
          avgRentalDays: entry.avgRentalDays,
          distanceScore,
        });

        scoredCandidates.push({
          id: String(entry.car._id),
          title: entry.car.title,
          make: entry.car.make,
          model: entry.car.model,
          year: entry.car.year,
          pricePerDay: entry.car.pricePerDay,
          images: entry.car.images ?? [],
          location: {
            city: entry.car.location.city,
            country: entry.car.location.country,
            lat: entry.car.location.lat,
            lng: entry.car.location.lng,
          },
          carRating: round(entry.carReviewAvg, 2),
          carReviewCount: entry.carReviewCount,
          hostRating: round(entry.hostReviewAvg, 2),
          hostReviewCount: entry.hostReviewCount,
          bookingCount180d: entry.bookingCount180d,
          totalRentalDays180d: entry.totalRentalDays180d,
          avgRentalDays: round(entry.avgRentalDays, 2),
          offerScore: round(offerScore, 6),
          badge: null,
          scoreBreakdown: {
            priceScore: round(scoreBreakdown.priceScore),
            carReviewScore: round(scoreBreakdown.carReviewScore),
            hostReviewScore: round(scoreBreakdown.hostReviewScore),
            rentalBehaviorScore: round(scoreBreakdown.rentalBehaviorScore),
            distanceScore: round(scoreBreakdown.distanceScore),
            frequencyScore: round(scoreBreakdown.frequencyScore),
            durationScore: round(scoreBreakdown.durationScore),
            utilizationScore: round(scoreBreakdown.utilizationScore),
          },
          matchedRecentLocationPlaceId: nearestPlaceId,
          nearestPlaceId,
        });
      }

      const ranked = attachBadges(
        scoredCandidates
          .sort((a, b) => {
            if (b.offerScore !== a.offerScore) return b.offerScore - a.offerScore;
            return a.pricePerDay - b.pricePerDay;
          })
          .map(({ nearestPlaceId: _nearestPlaceId, ...offer }) => offer),
      );

      const rankedByLocation = scoredCandidates.sort((a, b) => {
        if (b.offerScore !== a.offerScore) return b.offerScore - a.offerScore;
        return a.pricePerDay - b.pricePerDay;
      });
      const locationSelectionCounts = new Map<string, number>();
      const selectedIds = new Set<string>();
      const selected: ScoredOffer[] = [];

      for (const candidate of rankedByLocation) {
        if (selected.length >= limit) break;
        const count = locationSelectionCounts.get(candidate.nearestPlaceId) ?? 0;
        if (count >= 2) continue;

        const withBadge = ranked.find((item) => item.id === candidate.id);
        if (!withBadge) continue;
        selected.push(withBadge);
        selectedIds.add(withBadge.id);
        locationSelectionCounts.set(candidate.nearestPlaceId, count + 1);
      }

      if (selected.length < limit) {
        for (const candidate of ranked) {
          if (selected.length >= limit) break;
          if (selectedIds.has(candidate.id)) continue;
          selected.push(candidate);
          selectedIds.add(candidate.id);
        }
      }

      return {
        recentLocations,
        offers: selected.slice(0, limit),
        error: null as string | null,
      };
    } catch {
      return {
        recentLocations: [],
        offers: [],
        error: "PROMOTION_QUERY_FAILED",
      };
    }
  },
});

export const listPromotionalOffersForNearbyBigCity = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    fallbackRecentLocations: v.optional(v.array(recentLocationInputValidator)),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    try {
      const startDate = args.startDate ?? new Date().toISOString();
      const endDate = args.endDate ?? startDate;
      const limit = normalizeLimit(args.limit, PROMOTION_LIMIT_DEFAULT);
      const recentLocations = await resolveRecentLocationsForPromotions(
        ctx,
        args.fallbackRecentLocations,
      );
      const anchorLocation = recentLocations[0] ?? null;

      if (!anchorLocation) {
        return {
          anchorLocation: null,
          city: null,
          offers: [],
          error: null as string | null,
        };
      }

      const availableCars = await listAvailableCarsForRange(ctx, startDate, endDate, {
        proximityCenters: [
          {
            lat: anchorLocation.lat,
            lng: anchorLocation.lng,
          },
        ],
        maxDistanceKm: NEARBY_CITY_FALLBACK_RADIUS_KM,
        maxCarsScanned: 1200,
        maxCarsReturned: 220,
      });
      if (!availableCars.length) {
        return {
          anchorLocation,
          city: null,
          offers: [],
          error: null as string | null,
        };
      }

      const enrichedCars = await enrichCarsForPromotionSignals(ctx, availableCars);
      const findBestCityWithinRadius = (radiusKm: number) => {
        const grouped = new Map<
          string,
          {
            city: string;
            country: string;
            listingCount: number;
            medianPrice: number;
            minDistanceToAnchorKm: number;
          }
        >();
        const pricesByGroup = new Map<string, number[]>();

        for (const entry of enrichedCars) {
          if (
            typeof entry.car.location?.lat !== "number" ||
            typeof entry.car.location?.lng !== "number"
          ) {
            continue;
          }

          const distanceToAnchor = haversineKm(
            anchorLocation.lat,
            anchorLocation.lng,
            entry.car.location.lat,
            entry.car.location.lng,
          );
          if (distanceToAnchor > radiusKm) {
            continue;
          }

          const key = cityKey(entry.car.location.city, entry.car.location.country);
          const current = grouped.get(key);
          if (!current) {
            grouped.set(key, {
              city: entry.car.location.city,
              country: entry.car.location.country,
              listingCount: 1,
              medianPrice: 0,
              minDistanceToAnchorKm: distanceToAnchor,
            });
            pricesByGroup.set(key, [entry.car.pricePerDay]);
          } else {
            current.listingCount += 1;
            current.minDistanceToAnchorKm = Math.min(current.minDistanceToAnchorKm, distanceToAnchor);
            pricesByGroup.get(key)!.push(entry.car.pricePerDay);
          }
        }

        const cities = Array.from(grouped.entries()).map(([key, info]) => ({
          key,
          ...info,
          medianPrice: median(pricesByGroup.get(key) ?? []),
        }));

        if (!cities.length) return null;
        cities.sort((a, b) => {
          if (b.listingCount !== a.listingCount) return b.listingCount - a.listingCount;
          if (a.minDistanceToAnchorKm !== b.minDistanceToAnchorKm) {
            return a.minDistanceToAnchorKm - b.minDistanceToAnchorKm;
          }
          return a.medianPrice - b.medianPrice;
        });

        return cities[0];
      };

      let selectedRadius = NEARBY_CITY_RADIUS_KM;
      let selectedCity = findBestCityWithinRadius(NEARBY_CITY_RADIUS_KM);
      if (!selectedCity) {
        selectedRadius = NEARBY_CITY_FALLBACK_RADIUS_KM;
        selectedCity = findBestCityWithinRadius(NEARBY_CITY_FALLBACK_RADIUS_KM);
      }

      if (!selectedCity) {
        return {
          anchorLocation,
          city: null,
          offers: [],
          error: null as string | null,
        };
      }

      const cityOffers: ScoredOffer[] = [];
      for (const entry of enrichedCars) {
        const key = cityKey(entry.car.location.city, entry.car.location.country);
        if (key !== selectedCity.key) continue;
        if (
          typeof entry.car.location?.lat !== "number" ||
          typeof entry.car.location?.lng !== "number"
        ) {
          continue;
        }

        const distanceToAnchor = haversineKm(
          anchorLocation.lat,
          anchorLocation.lng,
          entry.car.location.lat,
          entry.car.location.lng,
        );
        if (distanceToAnchor > selectedRadius) continue;

        const distanceScore = clamp(1 - distanceToAnchor / selectedRadius, 0, 1);
        const { offerScore, scoreBreakdown } = computeOfferScore({
          pricePerDay: entry.car.pricePerDay,
          cityMedianPrice: selectedCity.medianPrice || entry.car.pricePerDay,
          carReviewAvg: entry.carReviewAvg,
          carReviewCount: entry.carReviewCount,
          hostReviewAvg: entry.hostReviewAvg,
          hostReviewCount: entry.hostReviewCount,
          bookingCount180d: entry.bookingCount180d,
          totalRentalDays180d: entry.totalRentalDays180d,
          avgRentalDays: entry.avgRentalDays,
          distanceScore,
        });

        cityOffers.push({
          id: String(entry.car._id),
          title: entry.car.title,
          make: entry.car.make,
          model: entry.car.model,
          year: entry.car.year,
          pricePerDay: entry.car.pricePerDay,
          images: entry.car.images ?? [],
          location: {
            city: entry.car.location.city,
            country: entry.car.location.country,
            lat: entry.car.location.lat,
            lng: entry.car.location.lng,
          },
          carRating: round(entry.carReviewAvg, 2),
          carReviewCount: entry.carReviewCount,
          hostRating: round(entry.hostReviewAvg, 2),
          hostReviewCount: entry.hostReviewCount,
          bookingCount180d: entry.bookingCount180d,
          totalRentalDays180d: entry.totalRentalDays180d,
          avgRentalDays: round(entry.avgRentalDays, 2),
          offerScore: round(offerScore, 6),
          badge: null,
          scoreBreakdown: {
            priceScore: round(scoreBreakdown.priceScore),
            carReviewScore: round(scoreBreakdown.carReviewScore),
            hostReviewScore: round(scoreBreakdown.hostReviewScore),
            rentalBehaviorScore: round(scoreBreakdown.rentalBehaviorScore),
            distanceScore: round(scoreBreakdown.distanceScore),
            frequencyScore: round(scoreBreakdown.frequencyScore),
            durationScore: round(scoreBreakdown.durationScore),
            utilizationScore: round(scoreBreakdown.utilizationScore),
          },
        });
      }

      const rankedOffers = attachBadges(
        cityOffers.sort((a, b) => {
          if (b.offerScore !== a.offerScore) return b.offerScore - a.offerScore;
          return a.pricePerDay - b.pricePerDay;
        }),
      ).slice(0, limit);

      return {
        anchorLocation,
        city: {
          city: selectedCity.city,
          country: selectedCity.country,
          listingCount: selectedCity.listingCount,
          medianPrice: round(selectedCity.medianPrice, 2),
          minDistanceToAnchorKm: round(selectedCity.minDistanceToAnchorKm, 2),
        },
        offers: rankedOffers,
        error: null as string | null,
      };
    } catch {
      return {
        anchorLocation: null,
        city: null,
        offers: [],
        error: "PROMOTION_QUERY_FAILED",
      };
    }
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
      car: {
        id: String(car._id),
        title: car.title,
        make: car.make,
        model: car.model,
        year: car.year,
        pricePerDay: car.pricePerDay,
        availableFrom: car.availableFrom,
        availableUntil: car.availableUntil,
        formattedAddress: car.formattedAddress,
        features: car.features ?? [],
        customFeatures: car.customFeatures ?? [],
        kilometersLimitPerDay: car.kilometersLimitPerDay ?? null,
        depositAmount: car.depositAmount ?? 0,
        fuelPolicy: car.fuelPolicy ?? null,
        fuelPolicyNote: car.fuelPolicyNote ?? null,
        isCarVerified: Boolean(car.isCarVerified),
        images: car.images ?? [],
        location: car.location,
      },
      hostPublic: host
        ? {
            id: String(host._id),
            isVerified: Boolean(host.isVerified),
            createdAt: host.createdAt,
            bio: host.bio ?? null,
          }
        : null,
      hostUserPublic: hostUser
        ? {
            id: String(hostUser._id),
            name: hostUser.name,
            imageUrl: hostUser.imageUrl ?? null,
            reviewCount: hostUser.reviewCount ?? 0,
            avgRating: hostUser.avgRating ?? 0,
          }
        : null,
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
