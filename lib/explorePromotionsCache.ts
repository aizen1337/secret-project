import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import type { PromotionalOffer } from "@/features/cars/components/dashboard/types";

const STORAGE_KEY = "explore-promotions-fallback-cache-v1";
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const MAX_ROWS = 20;

type ExploreFallbackCacheRecord = {
  key: string;
  updatedAt: number;
  offers: PromotionalOffer[];
};

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOffers(offers: PromotionalOffer[]) {
  return offers
    .filter((offer) => offer && typeof offer.id === "string")
    .slice(0, MAX_ROWS)
    .map((offer) => ({
      ...offer,
      id: String(offer.id),
      title: offer.title ? String(offer.title) : undefined,
      make: String(offer.make),
      model: String(offer.model),
      year: Math.round(normalizeNumber(offer.year)),
      pricePerDay: normalizeNumber(offer.pricePerDay),
      images: Array.isArray(offer.images) ? offer.images.map((image) => String(image)).slice(0, 10) : [],
      location: {
        city: String(offer.location.city ?? ""),
        country: String(offer.location.country ?? ""),
        lat: normalizeNumber(offer.location.lat),
        lng: normalizeNumber(offer.location.lng),
      },
      carRating: normalizeNumber(offer.carRating),
      carReviewCount: Math.round(normalizeNumber(offer.carReviewCount)),
      hostRating: normalizeNumber(offer.hostRating),
      hostReviewCount: Math.round(normalizeNumber(offer.hostReviewCount)),
      bookingCount180d: Math.round(normalizeNumber(offer.bookingCount180d)),
      totalRentalDays180d: Math.round(normalizeNumber(offer.totalRentalDays180d)),
      avgRentalDays: normalizeNumber(offer.avgRentalDays),
      offerScore: normalizeNumber(offer.offerScore),
      badge: offer.badge ?? null,
      scoreBreakdown: {
        priceScore: normalizeNumber(offer.scoreBreakdown.priceScore),
        carReviewScore: normalizeNumber(offer.scoreBreakdown.carReviewScore),
        hostReviewScore: normalizeNumber(offer.scoreBreakdown.hostReviewScore),
        rentalBehaviorScore: normalizeNumber(offer.scoreBreakdown.rentalBehaviorScore),
        distanceScore: normalizeNumber(offer.scoreBreakdown.distanceScore),
        frequencyScore: normalizeNumber(offer.scoreBreakdown.frequencyScore),
        durationScore: normalizeNumber(offer.scoreBreakdown.durationScore),
        utilizationScore: normalizeNumber(offer.scoreBreakdown.utilizationScore),
      },
      matchedRecentLocationPlaceId: offer.matchedRecentLocationPlaceId
        ? String(offer.matchedRecentLocationPlaceId)
        : undefined,
    }));
}

function parseStoredRecord(raw: string | null): ExploreFallbackCacheRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.key !== "string") return null;
    return {
      key: String(parsed.key),
      updatedAt: normalizeNumber(parsed.updatedAt),
      offers: normalizeOffers(Array.isArray(parsed.offers) ? (parsed.offers as PromotionalOffer[]) : []),
    };
  } catch {
    return null;
  }
}

async function readStoredRecord() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return parseStoredRecord(localStorage.getItem(STORAGE_KEY));
  }
  try {
    return parseStoredRecord(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

async function writeStoredRecord(record: ExploreFallbackCacheRecord) {
  const serialized = JSON.stringify(record);
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, serialized);
    return;
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage failures to keep UX non-blocking.
  }
}

export function buildExploreFallbackCacheKey(args: {
  startDate: string;
  endDate: string;
  isSignedIn: boolean;
}) {
  return `v1|${args.startDate}|${args.endDate}|${args.isSignedIn ? "auth" : "guest"}`;
}

export async function loadExploreFallbackOffersCache(
  key: string,
  options?: { ttlMs?: number },
) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const record = await readStoredRecord();
  if (!record || record.key !== key) return null;
  if (Date.now() - record.updatedAt > ttlMs) return null;
  return record.offers;
}

export async function saveExploreFallbackOffersCache(key: string, offers: PromotionalOffer[]) {
  await writeStoredRecord({
    key,
    updatedAt: Date.now(),
    offers: normalizeOffers(offers),
  });
}
