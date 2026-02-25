import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@clerk/clerk-expo";

import { api } from "@/convex/_generated/api";
import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { Text } from "@/components/ui/text";
import { BrowseHeader } from "@/features/cars/components/dashboard/BrowseHeader";
import { LocationSearchBar } from "@/features/cars/components/dashboard/LocationSearchBar";
import { OfferSection } from "@/features/cars/components/dashboard/OfferSection";
import {
  toEndOfDayIso,
  toDateInputValue,
  toStartOfDayIso,
  type LocationSuggestion,
} from "@/features/cars/components/dashboard/searchUtils";
import type {
  NearbyBigCityOffersResult,
  PromotionalOffer,
  RecentLocation,
} from "@/features/cars/components/dashboard/types";
import {
  clearGuestRecentSearches,
  loadGuestRecentSearches,
  saveGuestRecentSearch,
} from "@/lib/recentSearches";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type RecentOffersResult = {
  recentLocations: RecentLocation[];
  offers: PromotionalOffer[];
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

export default function ExploreEntryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const mode = resolveThemeMode(useColorScheme());

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  }, []);

  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestion, setSelectedLocationSuggestion] = useState<LocationSuggestion | null>(null);
  const [isSearchingLocationSuggestions, setIsSearchingLocationSuggestions] = useState(false);
  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(defaultEnd));
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [guestRecentLocations, setGuestRecentLocations] = useState<RecentLocation[]>([]);
  const [isGuestHistoryLoaded, setIsGuestHistoryLoaded] = useState(false);
  const [isMergingGuestHistory, setIsMergingGuestHistory] = useState(false);
  const searchAddresses = useAction(api.cars.searchAddresses);
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails);
  const upsertRecentLocationSearch = useMutation(api.recentSearches.upsertRecentLocationSearch);
  const [placesSessionToken] = useState(
    () => `places-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
  );

  const recentServerLocations = useQuery(
    api.recentSearches.listMyRecentLocationSearches,
    isSignedIn ? { limit: 5 } : "skip",
  ) as RecentLocation[] | undefined;

  const startIso = useMemo(() => toStartOfDayIso(startDate), [startDate]);
  const endIso = useMemo(() => toEndOfDayIso(endDate), [endDate]);
  const isDateRangeValid = useMemo(
    () => new Date(startIso).getTime() <= new Date(endIso).getTime(),
    [endIso, startIso],
  );

  const promoArgs = useMemo<PromotionsQueryArgs>(() => {
    if (!isGuestHistoryLoaded || !isDateRangeValid) return "skip";
    return {
      startDate: startIso,
      endDate: endIso,
      fallbackRecentLocations: guestRecentLocations,
      limit: 6,
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

  useEffect(() => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setIsSearchingLocationSuggestions(false);
      return;
    }

    if (
      selectedLocationSuggestion &&
      selectedLocationSuggestion.description.trim().toLowerCase() === trimmed.toLowerCase()
    ) {
      setIsSearchingLocationSuggestions(false);
      setShowLocationSuggestions(false);
      return;
    }

    let cancelled = false;
    setIsSearchingLocationSuggestions(true);

    const timeout = setTimeout(async () => {
      try {
        const suggestions = (await searchAddresses({
          query: trimmed,
          sessionToken: placesSessionToken,
        })) as LocationSuggestion[];

        if (cancelled) return;
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(suggestions.length > 0);
      } catch {
        if (cancelled) return;
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      } finally {
        if (!cancelled) {
          setIsSearchingLocationSuggestions(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [locationQuery, placesSessionToken, searchAddresses, selectedLocationSuggestion]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await loadGuestRecentSearches();
      if (cancelled) return;
      setGuestRecentLocations(rows);
      setIsGuestHistoryLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    if (!isGuestHistoryLoaded || guestRecentLocations.length === 0) return;
    if (isMergingGuestHistory) return;

    let cancelled = false;
    setIsMergingGuestHistory(true);

    void (async () => {
      try {
        for (const row of guestRecentLocations) {
          await upsertRecentLocationSearch({
            placeId: row.placeId,
            description: row.description,
            city: row.city,
            country: row.country,
            lat: row.lat,
            lng: row.lng,
          });
          if (cancelled) return;
        }
        await clearGuestRecentSearches();
        if (!cancelled) {
          setGuestRecentLocations([]);
        }
      } catch {
        // Keep local history when merge fails and retry on next eligible render.
      } finally {
        if (!cancelled) {
          setIsMergingGuestHistory(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    guestRecentLocations,
    isGuestHistoryLoaded,
    isMergingGuestHistory,
    isSignedIn,
    upsertRecentLocationSearch,
  ]);

  const handleSearchSubmit = async () => {
    const location = locationQuery.trim();
    if (!location) {
      setSearchError(t("explore.locationRequired"));
      return;
    }

    setIsSearchingLocation(true);
    setSearchError(null);

    try {
      let suggestion: LocationSuggestion | null =
        selectedLocationSuggestion &&
        selectedLocationSuggestion.description.trim().toLowerCase() === location.toLowerCase()
          ? selectedLocationSuggestion
          : null;

      if (!suggestion) {
        const suggestions = (await searchAddresses({
          query: location,
          sessionToken: placesSessionToken,
        })) as LocationSuggestion[];

        if (!suggestions.length) {
          setSearchError(t("explore.locationNotFound"));
          return;
        }

        const exactMatch = suggestions.find(
          (item) => item.description.trim().toLowerCase() === location.toLowerCase(),
        );

        if (exactMatch) {
          suggestion = exactMatch;
        } else if (suggestions.length === 1) {
          suggestion = suggestions[0];
        } else {
          setLocationSuggestions(suggestions);
          setShowLocationSuggestions(true);
          setSearchError(t("explore.locationSelectSuggestion"));
          return;
        }
      }

      const details = await resolveAddressDetails({
        placeId: suggestion.placeId,
        sessionToken: placesSessionToken,
      });

      setSelectedLocationSuggestion(suggestion);
      setLocationQuery(suggestion.description);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setIsSearchingLocationSuggestions(false);

      try {
        if (isSignedIn) {
          await upsertRecentLocationSearch({
            placeId: suggestion.placeId,
            description: suggestion.description,
            city: details.city,
            country: details.country,
            lat: details.lat,
            lng: details.lng,
          });
        } else {
          const nextGuestRows = await saveGuestRecentSearch({
            placeId: suggestion.placeId,
            description: suggestion.description,
            city: details.city,
            country: details.country,
            lat: details.lat,
            lng: details.lng,
          });
          setGuestRecentLocations(nextGuestRows);
        }
      } catch {
        // Keep search flow resilient if persistence fails.
      }

      router.push({
        pathname: "/search",
        params: {
          location: suggestion.description,
          lat: String(details.lat),
          lng: String(details.lng),
          startDate,
          endDate,
        },
      } as any);
    } catch {
      setSearchError(t("explore.locationSearchFailed"));
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const recentOffers = recentOffersData?.offers ?? [];
  const nearbyOffers = nearbyBigCityOffersData?.offers ?? [];
  const hasRecentHistory =
    (recentOffersData?.recentLocations?.length ?? 0) > 0 ||
    (isSignedIn ? (recentServerLocations?.length ?? 0) : guestRecentLocations.length) > 0;
  const recentSectionLoading = promoArgs !== "skip" && recentOffersData === undefined;
  const nearbySectionLoading = promoArgs !== "skip" && nearbyBigCityOffersData === undefined;

  const nearbySubtitle = nearbyBigCityOffersData?.city
    ? t("explore.promotions.nearbyCitySubtitle", {
        city: nearbyBigCityOffersData.city.city,
        country: nearbyBigCityOffersData.city.country,
        count: nearbyBigCityOffersData.city.listingCount,
      })
    : t("explore.promotions.nearbyCitySubtitleFallback");

  const recentEmptyMessage = hasRecentHistory
    ? t("explore.promotions.noRecentOffers")
    : t("explore.promotions.emptyRecent");
  const nearbyEmptyMessage = nearbyBigCityOffersData?.anchorLocation
    ? t("explore.promotions.emptyNearbyCity")
    : t("explore.promotions.nearbyNoAnchor");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <BrowseHeader iconColor={getTokenColor(mode, "icon")} />

        <View className="gap-3">
            <LocationSearchBar
              locationQuery={locationQuery}
              onChangeLocation={(value) => {
                setLocationQuery(value);
                setSelectedLocationSuggestion(null);
                if (searchError) setSearchError(null);
              }}
              onSearchLocation={handleSearchSubmit}
              locationSuggestions={locationSuggestions}
              showLocationSuggestions={showLocationSuggestions}
              onSelectLocationSuggestion={(suggestion) => {
                setSelectedLocationSuggestion(suggestion);
                setLocationQuery(suggestion.description);
                setLocationSuggestions([]);
                setShowLocationSuggestions(false);
                setIsSearchingLocationSuggestions(false);
                if (searchError) setSearchError(null);
              }}
              isSearchingLocationSuggestions={isSearchingLocationSuggestions}
              isSearchingLocation={isSearchingLocation}
              iconColor={getTokenColor(mode, "icon")}
              placeholderColor={getTokenColor(mode, "placeholder")}
              buttonForeground={getTokenColor(mode, "primaryForeground")}
            />

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              showLabel={false}
              onApply={(nextStartDate, nextEndDate) => {
                setStartDate(nextStartDate);
                setEndDate(nextEndDate);
              }}
            />

            {searchError ? (
              <Text className="text-xs text-destructive">{searchError}</Text>
            ) : null}

            <Pressable
              onPress={handleSearchSubmit}
              disabled={isSearchingLocation}
              className={`items-center rounded-xl py-3 ${
                isSearchingLocation ? "bg-primary/70" : "bg-primary"
              }`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {isSearchingLocation ? t("common.loading") : t("explore.searchOffers")}
              </Text>
            </Pressable>

            <OfferSection
              title={t("explore.promotions.recentTitle")}
              subtitle={t("explore.promotions.recentSubtitle")}
              offers={recentOffers}
              startDate={startDate}
              endDate={endDate}
              isLoading={recentSectionLoading}
              error={recentOffersData?.error ?? null}
              emptyMessage={recentEmptyMessage}
            />

            <OfferSection
              title={t("explore.promotions.nearbyCityTitle")}
              subtitle={nearbySubtitle}
              offers={nearbyOffers}
              startDate={startDate}
              endDate={endDate}
              isLoading={nearbySectionLoading}
              error={nearbyBigCityOffersData?.error ?? null}
              emptyMessage={nearbyEmptyMessage}
            />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
