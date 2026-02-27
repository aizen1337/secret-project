export const DEFAULT_SEARCH_RADIUS_KM = 50;
export const DEFAULT_START_HOUR = "00";
export const DEFAULT_END_HOUR = "23";

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type LocationSuggestion = {
  description: string;
  placeId: string;
};

const EARTH_RADIUS_KM = 6371;

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toStartOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
}

export function toEndOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
}

function normalizeHour(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(23, Math.trunc(parsed)));
}

export function toStartOfHourIso(dateValue: string, hourValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const hour = normalizeHour(hourValue);
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0)).toISOString();
}

export function toEndOfHourIso(dateValue: string, hourValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const hour = normalizeHour(hourValue);
  return new Date(Date.UTC(year, month - 1, day, hour, 59, 59)).toISOString();
}

export function isDateInput(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isHourInput(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3])$/.test(value);
}

export function formatHour(value: number) {
  const normalized = Math.max(0, Math.min(23, Math.trunc(value)));
  return String(normalized).padStart(2, "0");
}

export function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function buildRegionForRadius(
  centerLat: number,
  centerLng: number,
  radiusKm = DEFAULT_SEARCH_RADIUS_KM,
): MapRegion {
  const latDelta = (radiusKm / 111) * 2.2;
  const safeCos = Math.max(Math.abs(Math.cos(toRadians(centerLat))), 0.01);
  const lngDelta = (radiusKm / (111 * safeCos)) * 2.2;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, 0.08),
    longitudeDelta: Math.max(lngDelta, 0.08),
  };
}
