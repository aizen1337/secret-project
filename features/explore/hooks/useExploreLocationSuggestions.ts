import { useCallback, useEffect, useState } from "react";

import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";
import { getPolandCityQuickPicks } from "@/features/cars/components/dashboard/polandCities";

export type ExploreSearchAddressesAction = (args: {
  query: string;
  sessionToken: string;
  language: string;
}) => Promise<LocationSuggestion[]>;

type UseExploreLocationSuggestionsParams = {
  searchAddresses: ExploreSearchAddressesAction;
  placesSessionToken: string;
  searchLanguage: string;
};

export function useExploreLocationSuggestions({
  searchAddresses,
  placesSessionToken,
  searchLanguage,
}: UseExploreLocationSuggestionsParams) {
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestion, setSelectedLocationSuggestion] =
    useState<LocationSuggestion | null>(null);
  const [isSearchingLocationSuggestions, setIsSearchingLocationSuggestions] = useState(false);

  useEffect(() => {
    const trimmed = locationQuery.trim();
    const normalizeKey = (value: string) => value.trim().toLowerCase();
    const topCityMatches = getPolandCityQuickPicks(trimmed)
      .slice(0, 1)
      .map((city) => ({
        description: city.description,
        placeId: city.placeId,
      }));
    const mergeSuggestions = (preferred: LocationSuggestion[], fallback: LocationSuggestion[]) => {
      const unique = new Map<string, LocationSuggestion>();
      for (const item of [...preferred, ...fallback]) {
        const key = `${item.placeId}::${normalizeKey(item.description)}`;
        if (!unique.has(key)) unique.set(key, item);
      }
      return Array.from(unique.values());
    };

    if (trimmed.length < 3) {
      const quickPicks = topCityMatches;
      setLocationSuggestions(quickPicks);
      setShowLocationSuggestions(quickPicks.length > 0);
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
        const suggestions = await searchAddresses({
          query: trimmed,
          sessionToken: placesSessionToken,
          language: searchLanguage,
        });
        if (cancelled) return;
        const orderedSuggestions = mergeSuggestions(topCityMatches, suggestions);
        setLocationSuggestions(orderedSuggestions);
        setShowLocationSuggestions(orderedSuggestions.length > 0);
      } catch {
        if (cancelled) return;
        setLocationSuggestions(topCityMatches);
        setShowLocationSuggestions(topCityMatches.length > 0);
      } finally {
        if (!cancelled) setIsSearchingLocationSuggestions(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [locationQuery, placesSessionToken, searchAddresses, searchLanguage, selectedLocationSuggestion]);

  const onChangeLocation = useCallback((value: string) => {
    setLocationQuery(value);
    setSelectedLocationSuggestion(null);
  }, []);

  const onSelectLocationSuggestion = useCallback((suggestion: LocationSuggestion) => {
    setSelectedLocationSuggestion(suggestion);
    setLocationQuery(suggestion.description);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setIsSearchingLocationSuggestions(false);
  }, []);

  return {
    locationQuery,
    locationSuggestions,
    showLocationSuggestions,
    selectedLocationSuggestion,
    isSearchingLocationSuggestions,
    setLocationSuggestions,
    setShowLocationSuggestions,
    onChangeLocation,
    onSelectLocationSuggestion,
  };
}
