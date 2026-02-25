import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import type { CarItem } from "@/features/cars/components/dashboard/types";

const STORAGE_KEY = "search-results-cache-v1";
const MAX_CACHE_ENTRIES = 8;
const MAX_ROWS_PER_ENTRY = 320;
const DEFAULT_TTL_MS = 15 * 60 * 1000;

type SearchResultsCacheEntry = {
  key: string;
  updatedAt: number;
  rows: CarItem[];
};

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRows(rows: CarItem[]) {
  return rows
    .filter(
      (row) =>
        row &&
        typeof row.id === "string" &&
        Number.isFinite(row.location?.lat) &&
        Number.isFinite(row.location?.lng),
    )
    .slice(0, MAX_ROWS_PER_ENTRY)
    .map((row) => ({
      id: String(row.id),
      title: row.title ? String(row.title) : undefined,
      make: String(row.make),
      model: String(row.model),
      year: Math.round(normalizeNumber(row.year)),
      pricePerDay: normalizeNumber(row.pricePerDay),
      images: Array.isArray(row.images) ? row.images.map((image) => String(image)).slice(0, 10) : [],
      features: Array.isArray(row.features) ? row.features.map((feature) => String(feature)).slice(0, 40) : [],
      customFeatures: Array.isArray(row.customFeatures)
        ? row.customFeatures.map((feature) => String(feature)).slice(0, 40)
        : [],
      isCarVerified: Boolean(row.isCarVerified),
      location: {
        city: String(row.location.city ?? ""),
        country: String(row.location.country ?? ""),
        lat: normalizeNumber(row.location.lat),
        lng: normalizeNumber(row.location.lng),
      },
    }));
}

function parseStoredEntries(raw: string | null): SearchResultsCacheEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry && typeof entry.key === "string")
      .map((entry) => ({
        key: String(entry.key),
        updatedAt: normalizeNumber(entry.updatedAt),
        rows: normalizeRows(Array.isArray(entry.rows) ? (entry.rows as CarItem[]) : []),
      }))
      .slice(0, MAX_CACHE_ENTRIES);
  } catch {
    return [];
  }
}

async function readEntries() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return parseStoredEntries(localStorage.getItem(STORAGE_KEY));
  }

  try {
    return parseStoredEntries(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

async function writeEntries(entries: SearchResultsCacheEntry[]) {
  const trimmed = entries.slice(0, MAX_CACHE_ENTRIES);
  const serialized = JSON.stringify(trimmed);

  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, serialized);
    return;
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore persistence failures to keep search flow non-blocking.
  }
}

export function buildSearchResultsCacheKey(args: {
  startDate: string;
  endDate: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}) {
  const lat = Number.isFinite(args.centerLat) ? args.centerLat.toFixed(4) : "0.0000";
  const lng = Number.isFinite(args.centerLng) ? args.centerLng.toFixed(4) : "0.0000";
  const radius = Number.isFinite(args.radiusKm) ? args.radiusKm.toFixed(1) : "0.0";

  return `v1|${args.startDate}|${args.endDate}|${lat}|${lng}|${radius}`;
}

export async function loadSearchResultsCache(
  key: string,
  options?: { ttlMs?: number },
) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const entries = await readEntries();

  const freshEntries = entries.filter((entry) => now - entry.updatedAt <= ttlMs);
  if (freshEntries.length !== entries.length) {
    await writeEntries(freshEntries);
  }

  const match = freshEntries.find((entry) => entry.key === key);
  return match ? match.rows : null;
}

export async function saveSearchResultsCache(key: string, rows: CarItem[]) {
  const nextRows = normalizeRows(rows);
  const entries = await readEntries();
  const next: SearchResultsCacheEntry[] = [
    {
      key,
      updatedAt: Date.now(),
      rows: nextRows,
    },
    ...entries.filter((entry) => entry.key !== key),
  ].slice(0, MAX_CACHE_ENTRIES);

  await writeEntries(next);
}
