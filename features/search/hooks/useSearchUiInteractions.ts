import { useCallback, useState } from "react";
import type { TFunction } from "i18next";
import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";
import type { SearchAddressesAction } from "@/features/search/hooks/useSearchLocationSuggestions";
export type ResolveAddressDetailsAction = (args: {
  placeId: string;
  sessionToken: string;
  language: string;
}) => Promise<{ lat: number; lng: number }>;
type UseSearchUiInteractionsParams = {
  t: TFunction;
  router: { replace: (value: any) => void };
  defaults: {
    centerLat: number;
    centerLng: number;
    startDate: string;
    endDate: string;
    startHour: string;
    endHour: string;
  };
  location: {
    query: string;
    selected: LocationSuggestion | null;
    select: (suggestion: LocationSuggestion) => void;
    setSuggestions: (next: LocationSuggestion[]) => void;
    setShowSuggestions: (next: boolean) => void;
  };
  actions: {
    searchAddresses: SearchAddressesAction;
    resolveAddressDetails: ResolveAddressDetailsAction;
    placesSessionToken: string;
    searchLanguage: string;
  };
};
export function useSearchUiInteractions({
  t,
  router,
  defaults,
  location,
  actions,
}: UseSearchUiInteractionsParams) {
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [startHour, setStartHour] = useState(defaults.startHour);
  const [endHour, setEndHour] = useState(defaults.endHour);
  const [searchCenter, setSearchCenter] = useState({ lat: defaults.centerLat, lng: defaults.centerLng });
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"grid" | "map">("grid");
  const onApplyDates = useCallback((nextStartDate: string, nextEndDate: string) => {
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
  }, []);
  const onApplyHours = useCallback((nextStartHour: string, nextEndHour: string) => {
    setStartHour(nextStartHour);
    setEndHour(nextEndHour);
  }, []);
  const searchLocation = useCallback(async () => {
    const query = location.query.trim();
    if (!query) {
      setSearchError(t("explore.locationRequired"));
      return;
    }
    setIsSearchingLocation(true);
    setSearchError(null);
    try {
      let suggestion =
        location.selected && location.selected.description.trim().toLowerCase() === query.toLowerCase()
          ? location.selected
          : null;

      if (!suggestion) {
        const suggestions = await actions.searchAddresses({
          query,
          sessionToken: actions.placesSessionToken,
          language: actions.searchLanguage,
        });
        if (!suggestions.length) {
          setSearchError(t("explore.locationNotFound"));
          return;
        }
        const exactMatch = suggestions.find(
          (item) => item.description.trim().toLowerCase() === query.toLowerCase(),
        );
        if (exactMatch) suggestion = exactMatch;
        else if (suggestions.length === 1) suggestion = suggestions[0];
        else {
          location.setSuggestions(suggestions);
        location.setShowSuggestions(true);
        setSearchError(t("explore.locationSelectSuggestion"));
        return;
      }
    }
    const details = await actions.resolveAddressDetails({
        placeId: suggestion.placeId,
        sessionToken: actions.placesSessionToken,
        language: actions.searchLanguage,
      });
      setSearchCenter({ lat: details.lat, lng: details.lng });
      location.select(suggestion);
      router.replace({
        pathname: "/search",
        params: {
          location: suggestion.description,
          lat: String(details.lat),
          lng: String(details.lng),
          startDate,
          endDate,
          startHour,
          endHour,
        },
      } as any);
    } catch {
      setSearchError(t("explore.locationSearchFailed"));
    } finally {
      setIsSearchingLocation(false);
    }
  }, [actions, endDate, endHour, location, router, startDate, startHour, t]);

  return {
    startDate,
    endDate,
    startHour,
    endHour,
    searchCenter,
    isSearchingLocation,
    searchError,
    mobileView,
    setSearchError,
    onApplyDates,
    onApplyHours,
    searchLocation,
    setGridMobileView: () => setMobileView("grid"),
    setMapMobileView: () => setMobileView("map"),
  };
}
