import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useAction, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@clerk/clerk-expo";

import { api } from "@/convex/_generated/api";
import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";
import { useExploreDateState } from "@/features/explore/hooks/useExploreDateState";
import {
  type ExploreSearchAddressesAction,
  useExploreLocationSuggestions,
} from "@/features/explore/hooks/useExploreLocationSuggestions";
import {
  type UpsertRecentLocationSearchMutation,
  useExploreRecentHistory,
} from "@/features/explore/hooks/useExploreRecentHistory";
import { useExplorePromotions } from "@/features/explore/hooks/useExplorePromotions";
import { saveGuestRecentSearch } from "@/lib/recentSearches";

export function useExploreScreenState() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const searchAddresses = useAction(api.cars.searchAddresses) as ExploreSearchAddressesAction;
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails) as any;
  const upsertRecentLocationSearch = useMutation(
    api.recentSearches.upsertRecentLocationSearch,
  ) as UpsertRecentLocationSearchMutation;
  const [placesSessionToken] = useState(
    () => `places-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
  );
  const searchLanguage = i18n.resolvedLanguage ?? i18n.language;
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const dateState = useExploreDateState();
  const locationState = useExploreLocationSuggestions({
    searchAddresses,
    placesSessionToken,
    searchLanguage,
  });
  const recentHistory = useExploreRecentHistory({
    isSignedIn: Boolean(isSignedIn),
    upsertRecentLocationSearch,
  });
  const promotions = useExplorePromotions({
    t,
    isSignedIn: Boolean(isSignedIn),
    isGuestHistoryLoaded: recentHistory.isGuestHistoryLoaded,
    isDateRangeValid: dateState.isDateRangeValid,
    startIso: dateState.startIso,
    endIso: dateState.endIso,
    guestRecentLocations: recentHistory.guestRecentLocations,
  });

  const onChangeLocation = useCallback(
    (value: string) => {
      locationState.onChangeLocation(value);
      if (searchError) setSearchError(null);
    },
    [locationState, searchError],
  );

  const onSelectLocationSuggestion = useCallback(
    (suggestion: LocationSuggestion) => {
      locationState.onSelectLocationSuggestion(suggestion);
      if (searchError) setSearchError(null);
    },
    [locationState, searchError],
  );

  const handleSearchSubmit = useCallback(async () => {
    const location = locationState.locationQuery.trim();
    if (!location) {
      setSearchError(t("explore.locationRequired"));
      return;
    }
    setIsSearchingLocation(true);
    setSearchError(null);

    try {
      let suggestion =
        locationState.selectedLocationSuggestion &&
        locationState.selectedLocationSuggestion.description.trim().toLowerCase() ===
          location.toLowerCase()
          ? locationState.selectedLocationSuggestion
          : null;

      if (!suggestion) {
        const suggestions = await searchAddresses({
          query: location,
          sessionToken: placesSessionToken,
          language: searchLanguage,
        });
        if (!suggestions.length) {
          setSearchError(t("explore.locationNotFound"));
          return;
        }
        const exactMatch = suggestions.find(
          (item) => item.description.trim().toLowerCase() === location.toLowerCase(),
        );
        if (exactMatch) suggestion = exactMatch;
        else if (suggestions.length === 1) suggestion = suggestions[0];
        else {
          locationState.setLocationSuggestions(suggestions);
          locationState.setShowLocationSuggestions(true);
          setSearchError(t("explore.locationSelectSuggestion"));
          return;
        }
      }

      const details = await resolveAddressDetails({
        placeId: suggestion.placeId,
        sessionToken: placesSessionToken,
        language: searchLanguage,
      });
      locationState.onSelectLocationSuggestion(suggestion);

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
          recentHistory.setGuestRecentLocations(nextGuestRows);
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
          startDate: dateState.startDate,
          endDate: dateState.endDate,
          startHour: dateState.startHour,
          endHour: dateState.endHour,
        },
      } as any);
    } catch {
      setSearchError(t("explore.locationSearchFailed"));
    } finally {
      setIsSearchingLocation(false);
    }
  }, [
    dateState.endDate,
    dateState.endHour,
    dateState.startDate,
    dateState.startHour,
    isSignedIn,
    locationState,
    placesSessionToken,
    recentHistory,
    resolveAddressDetails,
    router,
    searchAddresses,
    searchLanguage,
    t,
    upsertRecentLocationSearch,
  ]);

  return {
    locationQuery: locationState.locationQuery,
    onChangeLocation,
    locationSuggestions: locationState.locationSuggestions,
    showLocationSuggestions: locationState.showLocationSuggestions,
    onSelectLocationSuggestion,
    isSearchingLocationSuggestions: locationState.isSearchingLocationSuggestions,
    startDate: dateState.startDate,
    endDate: dateState.endDate,
    startHour: dateState.startHour,
    endHour: dateState.endHour,
    onApplyDates: dateState.onApplyDates,
    onApplyHours: dateState.onApplyHours,
    isSearchingLocation,
    searchError,
    handleSearchSubmit,
    ...promotions,
  };
}

export type ExploreScreenController = ReturnType<typeof useExploreScreenState>;
