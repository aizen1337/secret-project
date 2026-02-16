// convex/cars.ts
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mapHost } from "./hostMapper";

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
    registrationDate: v.optional(v.string()),
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
    const now = new Date().getFullYear() + 1;
    const idempotencyKey = args.idempotencyKey.trim();

    if (!args.title.trim() || !args.make.trim() || !args.model.trim()) {
      throw new Error("Title, make and model are required.");
    }
    if (!idempotencyKey) {
      throw new Error("Missing idempotency key.");
    }
    if (args.pricePerDay <= 0) {
      throw new Error("Price per day must be greater than 0.");
    }
    if (args.year < 1980 || args.year > now) {
      throw new Error("Please provide a valid car year.");
    }
    if (new Date(args.availableFrom).getTime() > new Date(args.availableUntil).getTime()) {
      throw new Error("Availability range is invalid.");
    }

    const images = (
      await Promise.all(args.imageStorageIds.map((storageId) => ctx.storage.getUrl(storageId)))
    ).filter((url): url is string => Boolean(url));
    if (!images.length) {
      throw new Error("Please upload at least one image.");
    }

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
      registrationDate: args.registrationDate || undefined,
      isCarVerified: args.isCarVerified ?? false,
      verificationSource: args.verificationSource || undefined,
      verifiedAt: args.verifiedAt || undefined,
      idempotencyKey,
      location: args.location,
      images,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const generateCarImageUploadUrl = mutation({
  args: {},
  async handler(ctx) {
    return await ctx.storage.generateUploadUrl();
  },
});

type CepikResult = {
  make: string;
  model: string;
  year: number;
  features: string[];
  verified: boolean;
  source: "cepik";
};

type CepikVehicleAttributes = Record<string, unknown>;

function parseCepikAttributes(payload: any): CepikVehicleAttributes | null {
  if (!payload) return null;
  if (payload.data?.attributes) return payload.data.attributes as CepikVehicleAttributes;
  if (Array.isArray(payload.data) && payload.data[0]?.attributes) {
    return payload.data[0].attributes as CepikVehicleAttributes;
  }
  if (payload.attributes) return payload.attributes as CepikVehicleAttributes;
  return null;
}

function parseYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function mapCepikToFeatures(attributes: CepikVehicleAttributes): string[] {
  const result: string[] = [];
  if (attributes["hak"] === true) result.push("Tow Hook");
  if (attributes["kierownica-po-prawej-stronie"] === true) result.push("Right-Hand Drive");
  if (attributes["katalizator-pochlaniacz"] === true) result.push("Catalytic Converter");
  if (attributes["redukcja-emisji-spalin"] === true) result.push("Low Emissions");
  return result;
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

function normalizeCepikError(status: number): never {
  if (status === 401 || status === 403) {
    throw new Error("UNAUTHORIZED: CEPiK authorization failed.");
  }
  if (status === 404) {
    throw new Error("NOT_FOUND: Vehicle not found in CEPiK.");
  }
  if (status === 429) {
    throw new Error("RATE_LIMITED: CEPiK request limit exceeded.");
  }
  if (status >= 500) {
    throw new Error("UNAVAILABLE: CEPiK service is unavailable.");
  }
  throw new Error("UNAVAILABLE: CEPiK request failed.");
}

export const verifyAndAutofillCarFromCepik = action({
  args: {
    vin: v.string(),
    registrationDate: v.string(),
  },
  async handler(_, args): Promise<CepikResult> {
    const vin = args.vin.trim().toUpperCase();
    if (vin.length < 10) {
      throw new Error("NOT_FOUND: VIN is invalid.");
    }

    const cepikBaseUrl = process.env.CEPIK_BASE_URL;
    const cepikApiKey = process.env.CEPIK_API_KEY;
    if (!cepikBaseUrl || !cepikApiKey) {
      throw new Error("UNAVAILABLE: CEPiK integration is not configured.");
    }

    const query = new URLSearchParams({
      vin,
      registrationDate: args.registrationDate,
    });
    const endpoint = `${cepikBaseUrl.replace(/\/$/, "")}/pojazdy?${query.toString()}`;

    let response: Response;
    try {
      response = await fetchWithTimeout(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${cepikApiKey}`,
          "X-API-Key": cepikApiKey,
        },
      });
    } catch {
      throw new Error("UNAVAILABLE: CEPiK request timed out.");
    }

    if (!response.ok) {
      normalizeCepikError(response.status);
    }

    const payload = await response.json();
    const attributes = parseCepikAttributes(payload);
    if (!attributes) {
      throw new Error("NOT_FOUND: Vehicle not found in CEPiK.");
    }

    const make = String(attributes["marka"] ?? attributes["make"] ?? "").trim();
    const model = String(attributes["model"] ?? "").trim();
    const year = parseYear(attributes["rok-produkcji"] ?? attributes["year"]);

    if (!make || !model || !year) {
      throw new Error("UNAVAILABLE: CEPiK returned incomplete vehicle data.");
    }

    return {
      make,
      model,
      year,
      features: mapCepikToFeatures(attributes),
      verified: true,
      source: "cepik",
    };
  },
});

type AddressSuggestion = {
  description: string;
  placeId: string;
};

export const searchAddresses = action({
  args: {
    query: v.string(),
    sessionToken: v.string(),
  },
  async handler(_, args): Promise<AddressSuggestion[]> {
    const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googlePlacesApiKey) {
      throw new Error("UNAVAILABLE: Google Places integration is not configured.");
    }

    if (!args.query.trim()) return [];

    const query = new URLSearchParams({
      input: args.query.trim(),
      language: "pl",
      components: "country:pl",
      types: "address",
      sessiontoken: args.sessionToken,
      key: googlePlacesApiKey,
    });

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${query.toString()}`,
      { method: "GET", headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      throw new Error("UNAVAILABLE: Address search failed.");
    }

    const payload = await response.json();
    const status = payload?.status;
    if (status !== "OK" && status !== "ZERO_RESULTS") {
      throw new Error(`UNAVAILABLE: Google Places error ${status ?? "UNKNOWN"}.`);
    }

    const predictions = Array.isArray(payload?.predictions) ? payload.predictions : [];
    return predictions.slice(0, 6).map((prediction: any) => ({
      description: String(prediction?.description ?? ""),
      placeId: String(prediction?.place_id ?? ""),
    })).filter((item: AddressSuggestion) => item.description && item.placeId);
  },
});

type AddressDetails = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  formattedAddress: string;
};

export const resolveAddressDetails = action({
  args: {
    placeId: v.string(),
    sessionToken: v.string(),
  },
  async handler(_, args): Promise<AddressDetails> {
    const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googlePlacesApiKey) {
      throw new Error("UNAVAILABLE: Google Places integration is not configured.");
    }

    const query = new URLSearchParams({
      place_id: args.placeId,
      fields: "formatted_address,address_components,geometry",
      language: "pl",
      sessiontoken: args.sessionToken,
      key: googlePlacesApiKey,
    });

    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/place/details/json?${query.toString()}`,
      { method: "GET", headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      throw new Error("UNAVAILABLE: Could not resolve address details.");
    }

    const payload = await response.json();
    const status = payload?.status;
    if (status !== "OK") {
      throw new Error(`UNAVAILABLE: Google Places detail error ${status ?? "UNKNOWN"}.`);
    }

    const result = payload?.result;
    const components = Array.isArray(result?.address_components) ? result.address_components : [];
    const getLongName = (type: string) =>
      String(components.find((component: any) => Array.isArray(component?.types) && component.types.includes(type))?.long_name ?? "");
    const city =
      getLongName("locality") ||
      getLongName("postal_town") ||
      getLongName("administrative_area_level_2");
    const country = getLongName("country");

    return {
      city,
      country,
      lat: Number(result?.geometry?.location?.lat),
      lng: Number(result?.geometry?.location?.lng),
      formattedAddress: String(result?.formatted_address ?? ""),
    };
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
