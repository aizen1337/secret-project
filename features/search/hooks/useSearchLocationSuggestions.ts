import { useCallback, useEffect, useState } from "react";

import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";

export type SearchAddressesAction = (args: {
  query: string;
  sessionToken: string;
  language: string;
}) => Promise<LocationSuggestion[]>;

type UseSearchLocationSuggestionsParams = {
  initialLocation: string;
  searchAddresses: SearchAddressesAction;
  placesSessionToken: string;
  searchLanguage: string;
};

export function useSearchLocationSuggestions({
  initialLocation,
  searchAddresses,
  placesSessionToken,
  searchLanguage,
}: UseSearchLocationSuggestionsParams) {
  const [locationQuery, setLocationQuery] = useState(initialLocation);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestion, setSelectedLocationSuggestion] =
    useState<LocationSuggestion | null>(null);
  const [isSearchingLocationSuggestions, setIsSearchingLocationSuggestions] = useState(false);

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
        const suggestions = await searchAddresses({
          query: trimmed,
          sessionToken: placesSessionToken,
          language: searchLanguage,
        });
        if (cancelled) return;
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(suggestions.length > 0);
      } catch {
        if (cancelled) return;
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
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
    setLocationQuery,
    setLocationSuggestions,
    setShowLocationSuggestions,
    onChangeLocation,
    onSelectLocationSuggestion,
  };
}
