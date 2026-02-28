import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useAction } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "@/convex/_generated/api";
import {
  buildRegionForRadius,
  DEFAULT_SEARCH_RADIUS_KM,
  type LocationSuggestion,
} from "@/features/cars/components/dashboard/searchUtils";
import type { CarLocation } from "@/features/map/SearchMap";
import { SEARCH_PAGE_SIZE, useSearchResultsData } from "@/features/search/hooks/useSearchResultsData";
import { useSearchRouteState } from "@/features/search/hooks/useSearchRouteState";
import {
  type SearchAddressesAction,
  useSearchLocationSuggestions,
} from "@/features/search/hooks/useSearchLocationSuggestions";
import { useSearchFiltersState } from "@/features/search/hooks/useSearchFiltersState";
import { useSearchUiInteractions } from "@/features/search/hooks/useSearchUiInteractions";

export function useSearchScreenState() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const routeState = useSearchRouteState();
  const searchAddresses = useAction(api.cars.searchAddresses) as SearchAddressesAction;
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails) as any;
  const [placesSessionToken] = useState(
    () => `places-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
  );
  const searchLanguage = i18n.resolvedLanguage ?? i18n.language;

  const locationState = useSearchLocationSuggestions({
    initialLocation: routeState.initialLocation,
    searchAddresses,
    placesSessionToken,
    searchLanguage,
  });

  const uiState = useSearchUiInteractions({
    t,
    router,
    defaults: {
      centerLat: routeState.initialCenterLat,
      centerLng: routeState.initialCenterLng,
      startDate: routeState.initialStartDate,
      endDate: routeState.initialEndDate,
      startHour: routeState.initialStartHour,
      endHour: routeState.initialEndHour,
    },
    location: {
      query: locationState.locationQuery,
      selected: locationState.selectedLocationSuggestion,
      select: locationState.onSelectLocationSuggestion,
      setSuggestions: locationState.setLocationSuggestions,
      setShowSuggestions: locationState.setShowLocationSuggestions,
    },
    actions: {
      searchAddresses,
      resolveAddressDetails,
      placesSessionToken,
      searchLanguage,
    },
  });

  const resultsState = useSearchResultsData({
    hasValidCenter: routeState.hasValidCenter,
    searchCenter: uiState.searchCenter,
    startDate: uiState.startDate,
    endDate: uiState.endDate,
    startHour: uiState.startHour,
    endHour: uiState.endHour,
  });
  const filtersState = useSearchFiltersState(resultsState.carData);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCarId) return;
    if (!filtersState.filteredCars.some((car) => car.id === selectedCarId)) {
      setSelectedCarId(null);
    }
  }, [filtersState.filteredCars, selectedCarId]);

  const orderedCars = useMemo(() => {
    if (!selectedCarId) return filtersState.filteredCars;
    const selected = filtersState.filteredCars.find((car) => car.id === selectedCarId);
    if (!selected) return filtersState.filteredCars;
    return [selected, ...filtersState.filteredCars.filter((car) => car.id !== selectedCarId)];
  }, [filtersState.filteredCars, selectedCarId]);

  const mapCars = useMemo<CarLocation[]>(
    () =>
      filtersState.filteredCars
        .filter(
          (car) => typeof car.location?.lat === "number" && typeof car.location?.lng === "number",
        )
        .map((car) => ({
          id: car.id,
          latitude: car.location.lat,
          longitude: car.location.lng,
          pricePerDay: car.pricePerDay,
          title: car.title || `${car.make} ${car.model}`,
          make: car.make,
          model: car.model,
          locationCity: car.location.city,
          locationCountry: car.location.country,
          imageUrl: car.images[0] || null,
        })),
    [filtersState.filteredCars],
  );

  const region = useMemo(
    () =>
      buildRegionForRadius(
        uiState.searchCenter.lat,
        uiState.searchCenter.lng,
        DEFAULT_SEARCH_RADIUS_KM,
      ),
    [uiState.searchCenter.lat, uiState.searchCenter.lng],
  );

  const onChangeLocation = useCallback(
    (value: string) => {
      locationState.onChangeLocation(value);
      if (uiState.searchError) uiState.setSearchError(null);
    },
    [locationState, uiState],
  );

  const onSelectLocationSuggestion = useCallback(
    (suggestion: LocationSuggestion) => {
      locationState.onSelectLocationSuggestion(suggestion);
      if (uiState.searchError) uiState.setSearchError(null);
    },
    [locationState, uiState],
  );

  const handleLoadMoreCars = useCallback(() => {
    if (!resultsState.canLoadMore || resultsState.isLoadingMore) return;
    resultsState.loadMore(SEARCH_PAGE_SIZE);
  }, [resultsState]);

  return {
    hasValidCenter: routeState.hasValidCenter,
    locationQuery: locationState.locationQuery,
    onChangeLocation,
    locationSuggestions: locationState.locationSuggestions,
    showLocationSuggestions: locationState.showLocationSuggestions,
    onSelectLocationSuggestion,
    isSearchingLocationSuggestions: locationState.isSearchingLocationSuggestions,
    isSearchingLocation: uiState.isSearchingLocation,
    startDate: uiState.startDate,
    endDate: uiState.endDate,
    startHour: uiState.startHour,
    endHour: uiState.endHour,
    onApplyDates: uiState.onApplyDates,
    onApplyHours: uiState.onApplyHours,
    searchLocation: uiState.searchLocation,
    searchError: uiState.searchError,
    isLoading: resultsState.isLoading,
    draftAdvancedFilters: filtersState.draftAdvancedFilters,
    setDraftAdvancedFilters: filtersState.setDraftAdvancedFilters,
    applyDraftFilters: filtersState.applyDraftFilters,
    resetDraftFilters: filtersState.resetDraftFilters,
    isFiltersDialogOpen: filtersState.isFiltersDialogOpen,
    openFiltersDialog: filtersState.openFiltersDialog,
    closeFiltersDialog: filtersState.closeFiltersDialog,
    activeFiltersCount: filtersState.activeFiltersCount,
    mobileView: uiState.mobileView,
    setGridMobileView: uiState.setGridMobileView,
    setMapMobileView: uiState.setMapMobileView,
    orderedCars,
    selectedCarId,
    setSelectedCarId,
    mapCars,
    region,
    handleLoadMoreCars,
    isLoadingMore: resultsState.isLoadingMore,
  };
}

export type SearchScreenController = ReturnType<typeof useSearchScreenState>;
