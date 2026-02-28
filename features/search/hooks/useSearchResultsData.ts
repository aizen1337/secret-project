import { useEffect, useMemo, useState } from "react";
import { usePaginatedQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  DEFAULT_SEARCH_RADIUS_KM,
  toEndOfHourIso,
  toStartOfHourIso,
} from "@/features/cars/components/dashboard/searchUtils";
import type { CarItem } from "@/features/cars/components/dashboard/types";
import {
  buildSearchResultsCacheKey,
  loadSearchResultsCache,
  saveSearchResultsCache,
} from "@/lib/searchResultsCache";

export const SEARCH_PAGE_SIZE = 120;

type UseSearchResultsDataParams = {
  hasValidCenter: boolean;
  searchCenter: { lat: number; lng: number };
  startDate: string;
  endDate: string;
  startHour: string;
  endHour: string;
};

export function useSearchResultsData({
  hasValidCenter,
  searchCenter,
  startDate,
  endDate,
  startHour,
  endHour,
}: UseSearchResultsDataParams) {
  const [cachedCarData, setCachedCarData] = useState<CarItem[] | null>(null);
  const startIso = toStartOfHourIso(startDate, startHour);
  const endIso = toEndOfHourIso(endDate, endHour);
  const isDateRangeValid = new Date(startIso).getTime() <= new Date(endIso).getTime();
  const paginatedArgs =
    hasValidCenter && isDateRangeValid
      ? ({
          startDate: startIso,
          endDate: endIso,
          centerLat: searchCenter.lat,
          centerLng: searchCenter.lng,
          radiusKm: DEFAULT_SEARCH_RADIUS_KM,
        } as const)
      : "skip";

  const searchCacheKey = useMemo(() => {
    if (!hasValidCenter || !isDateRangeValid) return null;
    return buildSearchResultsCacheKey({
      startDate: startIso,
      endDate: endIso,
      centerLat: searchCenter.lat,
      centerLng: searchCenter.lng,
      radiusKm: DEFAULT_SEARCH_RADIUS_KM,
    });
  }, [endIso, hasValidCenter, isDateRangeValid, searchCenter.lat, searchCenter.lng, startIso]);

  const { results, status, loadMore } = usePaginatedQuery(
    api.cars.listCurrentlyAvailableCarsPaginated as never,
    paginatedArgs as never,
    { initialNumItems: SEARCH_PAGE_SIZE },
  );

  const liveCarData = useMemo<CarItem[]>(
    () =>
      (results as any[] | undefined)?.map((car: any) => ({
        id: car._id,
        title: car.title,
        make: car.make,
        model: car.model,
        year: car.year,
        pricePerDay: car.pricePerDay,
        images: car.images,
        features: car.features ?? [],
        customFeatures: car.customFeatures ?? [],
        isCarVerified: car.isCarVerified,
        location: car.location,
      })) ?? [],
    [results],
  );

  const carData = useMemo(() => {
    if (liveCarData.length > 0) return liveCarData;
    if (status === "LoadingFirstPage" && cachedCarData) return cachedCarData;
    return liveCarData;
  }, [cachedCarData, liveCarData, status]);

  useEffect(() => {
    let cancelled = false;
    if (!searchCacheKey) {
      setCachedCarData(null);
      return () => {
        cancelled = true;
      };
    }
    setCachedCarData(null);
    void (async () => {
      const cached = await loadSearchResultsCache(searchCacheKey);
      if (cancelled) return;
      setCachedCarData(cached);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchCacheKey]);

  useEffect(() => {
    if (!searchCacheKey || status === "LoadingFirstPage") return;
    void saveSearchResultsCache(searchCacheKey, liveCarData);
  }, [liveCarData, searchCacheKey, status]);

  return {
    carData,
    isDateRangeValid,
    isLoading:
      hasValidCenter &&
      isDateRangeValid &&
      status === "LoadingFirstPage" &&
      cachedCarData === null,
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore,
  };
}
