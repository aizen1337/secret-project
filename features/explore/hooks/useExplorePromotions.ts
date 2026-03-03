import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { TFunction } from "i18next";

import { api } from "@/convex/_generated/api";
import type {
  NearbyBigCityOffersResult,
  PromotionalOffer,
  RecentLocation,
} from "@/features/cars/components/dashboard/types";
import {
  buildExploreFallbackCacheKey,
  loadExploreFallbackOffersCache,
  saveExploreFallbackOffersCache,
} from "@/lib/explorePromotionsCache";

type RecentOffersResult = {
  recentLocations: RecentLocation[];
  offers: PromotionalOffer[];
  usedDefaultCities?: boolean;
  error: string | null;
};

type PromotionsQueryArgs =
  | {
      startDate: string;
      endDate: string;
      fallbackRecentLocations: RecentLocation[];
      limit: number;
    }
  | "skip";

type UseExplorePromotionsParams = {
  t: TFunction;
  isSignedIn: boolean;
  isGuestHistoryLoaded: boolean;
  isDateRangeValid: boolean;
  startIso: string;
  endIso: string;
  guestRecentLocations: RecentLocation[];
};

export function useExplorePromotions({
  t,
  isSignedIn,
  isGuestHistoryLoaded,
  isDateRangeValid,
  startIso,
  endIso,
  guestRecentLocations,
}: UseExplorePromotionsParams) {
  const [cachedFallbackOffers, setCachedFallbackOffers] = useState<PromotionalOffer[] | null>(null);

  const recentServerLocations = useQuery(
    api.recentSearches.listMyRecentLocationSearches,
    isSignedIn ? { limit: 5 } : "skip",
  ) as RecentLocation[] | undefined;

  const promoArgs = useMemo<PromotionsQueryArgs>(() => {
    if (!isGuestHistoryLoaded || !isDateRangeValid) return "skip";
    return {
      startDate: startIso,
      endDate: endIso,
      fallbackRecentLocations: guestRecentLocations,
      limit: 10,
    };
  }, [endIso, guestRecentLocations, isDateRangeValid, isGuestHistoryLoaded, startIso]);

  const recentOffersData = useQuery(
    api.cars.listPromotionalOffersForRecentLocations,
    promoArgs === "skip" ? "skip" : promoArgs,
  ) as RecentOffersResult | undefined;
  const nearbyBigCityOffersData = useQuery(
    api.cars.listPromotionalOffersForNearbyBigCity,
    promoArgs === "skip" ? "skip" : promoArgs,
  ) as NearbyBigCityOffersResult | undefined;

  const hasRecentHistory =
    (recentOffersData?.recentLocations?.length ?? 0) > 0 ||
    (isSignedIn ? (recentServerLocations?.length ?? 0) : guestRecentLocations.length) > 0;
  const cacheKey = buildExploreFallbackCacheKey({
    startDate: startIso,
    endDate: endIso,
    isSignedIn,
  });

  useEffect(() => {
    if (promoArgs === "skip") {
      setCachedFallbackOffers(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const cached = await loadExploreFallbackOffersCache(cacheKey);
      if (!cancelled) setCachedFallbackOffers(cached);
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, promoArgs]);

  useEffect(() => {
    if (!recentOffersData?.offers?.length) return;
    if (!recentOffersData.usedDefaultCities) return;
    void saveExploreFallbackOffersCache(cacheKey, recentOffersData.offers);
  }, [cacheKey, recentOffersData]);

  const recentOffers =
    recentOffersData?.offers ?? (!hasRecentHistory ? cachedFallbackOffers ?? [] : []);
  const recentSectionLoading =
    promoArgs !== "skip" &&
    recentOffersData === undefined &&
    (hasRecentHistory || !cachedFallbackOffers);

  return {
    recentOffers,
    nearbyOffers: nearbyBigCityOffersData?.offers ?? [],
    recentSectionLoading,
    nearbySectionLoading: promoArgs !== "skip" && nearbyBigCityOffersData === undefined,
    nearbySubtitle: nearbyBigCityOffersData?.city
      ? t("explore.promotions.nearbyCitySubtitle", {
          city: nearbyBigCityOffersData.city.city,
          country: nearbyBigCityOffersData.city.country,
          count: nearbyBigCityOffersData.city.listingCount,
        })
      : t("explore.promotions.nearbyCitySubtitleFallback"),
    recentEmptyMessage: hasRecentHistory
      ? t("explore.promotions.noRecentOffers")
      : t("explore.promotions.emptyRecent"),
    nearbyEmptyMessage: nearbyBigCityOffersData?.anchorLocation
      ? t("explore.promotions.emptyNearbyCity")
      : t("explore.promotions.nearbyNoAnchor"),
    recentOffersError: recentOffersData?.error ?? null,
    nearbyOffersError: nearbyBigCityOffersData?.error ?? null,
  };
}
