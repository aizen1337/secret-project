import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { RecentLocation } from "@/features/cars/components/dashboard/types";

const STORAGE_KEY = "guest-recent-location-searches-v1";
const MAX_RECENT_SEARCHES = 5;

function normalizePlaceId(placeId: string) {
  return placeId.trim().toUpperCase();
}

function normalizeRecentLocations(rows: RecentLocation[]) {
  const deduped = new Map<string, RecentLocation>();
  for (const row of rows) {
    if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue;
    const placeId = normalizePlaceId(row.placeId);
    if (!placeId) continue;

    const normalized: RecentLocation = {
      placeId,
      description: String(row.description ?? "").trim(),
      city: String(row.city ?? "").trim(),
      country: String(row.country ?? "").trim(),
      lat: row.lat,
      lng: row.lng,
      searchCount: Math.max(1, Math.round(row.searchCount ?? 1)),
      lastSearchedAt: Number.isFinite(row.lastSearchedAt) ? row.lastSearchedAt : 0,
    };
    const previous = deduped.get(placeId);
    if (!previous || normalized.lastSearchedAt > previous.lastSearchedAt) {
      deduped.set(placeId, normalized);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.lastSearchedAt - a.lastSearchedAt)
    .slice(0, MAX_RECENT_SEARCHES);
}

function parseStoredRows(raw: string | null): RecentLocation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeRecentLocations(parsed as RecentLocation[]);
  } catch {
    return [];
  }
}

async function readStoredRows() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return parseStoredRows(localStorage.getItem(STORAGE_KEY));
  }

  try {
    return parseStoredRows(await SecureStore.getItemAsync(STORAGE_KEY));
  } catch {
    return [];
  }
}

async function writeStoredRows(rows: RecentLocation[]) {
  const normalized = normalizeRecentLocations(rows);
  const serialized = JSON.stringify(normalized);
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, serialized);
    return normalized;
  }

  try {
    await SecureStore.setItemAsync(STORAGE_KEY, serialized);
  } catch {
    // Ignore persistence errors to keep browse flow non-blocking.
  }
  return normalized;
}

export async function loadGuestRecentSearches() {
  return await readStoredRows();
}

export async function saveGuestRecentSearch(location: {
  placeId: string;
  description: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}) {
  const existing = await readStoredRows();
  const now = Date.now();
  const placeId = normalizePlaceId(location.placeId);
  const found = existing.find((row) => row.placeId === placeId);

  const nextRow: RecentLocation = {
    placeId,
    description: location.description.trim(),
    city: location.city.trim(),
    country: location.country.trim(),
    lat: location.lat,
    lng: location.lng,
    searchCount: (found?.searchCount ?? 0) + 1,
    lastSearchedAt: now,
  };

  const merged = [nextRow, ...existing.filter((row) => row.placeId !== placeId)];
  return await writeStoredRows(merged);
}

export async function clearGuestRecentSearches() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // Ignore persistence errors.
  }
}
