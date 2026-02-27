import { useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme } from "nativewind";
import { FlatList, Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useAction, usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "@/convex/_generated/api";
import { BrowseFiltersPanel } from "@/features/cars/components/dashboard/BrowseFiltersPanel";
import { BrowseHeader } from "@/features/cars/components/dashboard/BrowseHeader";
import { CarResultsList } from "@/features/cars/components/dashboard/CarResultsList";
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  DEFAULT_SEARCH_RADIUS_KM,
  buildRegionForRadius,
  isDateInput,
  isHourInput,
  normalizeParam,
  toDateInputValue,
  toEndOfHourIso,
  toStartOfHourIso,
  type LocationSuggestion,
} from "@/features/cars/components/dashboard/searchUtils";
import type { BrowseAdvancedFilters, CarItem } from "@/features/cars/components/dashboard/types";
import { SearchMap } from "@/features/map/SearchMap";
import type { CarLocation } from "@/features/map/SearchMap";
import { Text } from "@/components/ui/text";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import {
  buildSearchResultsCacheKey,
  loadSearchResultsCache,
  saveSearchResultsCache,
} from "@/lib/searchResultsCache";

function createEmptyAdvancedFilters(): BrowseAdvancedFilters {
  return {
    make: "",
    model: "",
    minYear: "",
    maxYear: "",
    minPrice: "",
    maxPrice: "",
    selectedFeatures: [],
    verifiedOnly: false,
  };
}

const SEARCH_PAGE_SIZE = 120;

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const mode = resolveThemeMode(useColorScheme());
  const strongIconColor = getTokenColor(mode, "icon");
  const listRef = useRef<FlatList<CarItem>>(null);

  const params = useLocalSearchParams<{
    location?: string | string[];
    lat?: string | string[];
    lng?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    startHour?: string | string[];
    endHour?: string | string[];
  }>();

  const initialLocation = normalizeParam(params.location)?.trim() ?? "";
  const latRaw = normalizeParam(params.lat);
  const lngRaw = normalizeParam(params.lng);
  const parsedLat = Number(latRaw);
  const parsedLng = Number(lngRaw);
  const hasValidCenter = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
  const initialCenterLat = hasValidCenter ? parsedLat : 0;
  const initialCenterLng = hasValidCenter ? parsedLng : 0;

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  }, []);

  const startDateFromParams = normalizeParam(params.startDate);
  const endDateFromParams = normalizeParam(params.endDate);
  const startHourFromParams = normalizeParam(params.startHour);
  const endHourFromParams = normalizeParam(params.endHour);

  const [locationQuery, setLocationQuery] = useState(initialLocation);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestion, setSelectedLocationSuggestion] = useState<LocationSuggestion | null>(null);
  const [isSearchingLocationSuggestions, setIsSearchingLocationSuggestions] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<BrowseAdvancedFilters>(
    createEmptyAdvancedFilters,
  );
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<BrowseAdvancedFilters>(
    createEmptyAdvancedFilters,
  );
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"grid" | "map">("grid");
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    isDateInput(startDateFromParams) ? startDateFromParams : toDateInputValue(today),
  );
  const [endDate, setEndDate] = useState(
    isDateInput(endDateFromParams) ? endDateFromParams : toDateInputValue(defaultEnd),
  );
  const [startHour, setStartHour] = useState(
    isHourInput(startHourFromParams) ? startHourFromParams : DEFAULT_START_HOUR,
  );
  const [endHour, setEndHour] = useState(
    isHourInput(endHourFromParams) ? endHourFromParams : DEFAULT_END_HOUR,
  );
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCenter, setSearchCenter] = useState(() => ({
    lat: initialCenterLat,
    lng: initialCenterLng,
  }));
  const [cachedCarData, setCachedCarData] = useState<CarItem[] | null>(null);
  const searchAddresses = useAction(api.cars.searchAddresses);
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails);
  const [placesSessionToken] = useState(
    () => `places-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
  );
  const searchLanguage = i18n.resolvedLanguage ?? i18n.language;

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
          language: searchLanguage,
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
  }, [locationQuery, placesSessionToken, searchAddresses, searchLanguage, selectedLocationSuggestion]);

  const startIso = toStartOfHourIso(startDate, startHour);
  const endIso = toEndOfHourIso(endDate, endHour);
  const isDateRangeValid =
    new Date(startIso).getTime() <= new Date(endIso).getTime();

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

  const {
    results: paginatedCars,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.cars.listCurrentlyAvailableCarsPaginated as never,
    paginatedArgs as never,
    { initialNumItems: SEARCH_PAGE_SIZE },
  );
  const hasCachedSnapshot = cachedCarData !== null;
  const isLoading =
    hasValidCenter &&
    isDateRangeValid &&
    paginationStatus === "LoadingFirstPage" &&
    !hasCachedSnapshot;
  const isLoadingMore = paginationStatus === "LoadingMore";
  const canLoadMore = paginationStatus === "CanLoadMore";

  const liveCarData = useMemo<CarItem[]>(
    () =>
      (paginatedCars as any[] | undefined)?.map((car: any) => ({
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
    [paginatedCars],
  );
  const carData = useMemo(() => {
    if (liveCarData.length > 0) return liveCarData;
    if (paginationStatus === "LoadingFirstPage" && cachedCarData) return cachedCarData;
    return liveCarData;
  }, [cachedCarData, liveCarData, paginationStatus]);

  useEffect(() => {
    let cancelled = false;

    if (!searchCacheKey) {
      setCachedCarData(null);
      return () => {
        cancelled = true;
      };
    }

    // Reset snapshot when query key changes so we don't show results from a different location/date.
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
    if (!searchCacheKey) return;
    if (paginationStatus === "LoadingFirstPage") return;
    void saveSearchResultsCache(searchCacheKey, liveCarData);
  }, [liveCarData, paginationStatus, searchCacheKey]);

  const makeText = advancedFilters.make.trim().toLowerCase();
  const modelText = advancedFilters.model.trim().toLowerCase();
  const minYear = Number(advancedFilters.minYear);
  const maxYear = Number(advancedFilters.maxYear);
  const minPrice = Number(advancedFilters.minPrice);
  const maxPrice = Number(advancedFilters.maxPrice);
  const hasMinYear = advancedFilters.minYear.trim().length > 0 && Number.isFinite(minYear);
  const hasMaxYear = advancedFilters.maxYear.trim().length > 0 && Number.isFinite(maxYear);
  const hasMinPrice = advancedFilters.minPrice.trim().length > 0 && Number.isFinite(minPrice);
  const hasMaxPrice = advancedFilters.maxPrice.trim().length > 0 && Number.isFinite(maxPrice);

  const filteredCars = useMemo(() => {
    return carData.filter((car) => {
      const matchesMake = makeText.length === 0 || car.make.toLowerCase().includes(makeText);
      const matchesModel = modelText.length === 0 || car.model.toLowerCase().includes(modelText);
      const matchesMinYear = !hasMinYear || car.year >= minYear;
      const matchesMaxYear = !hasMaxYear || car.year <= maxYear;
      const matchesMinPrice = !hasMinPrice || car.pricePerDay >= minPrice;
      const matchesMaxPrice = !hasMaxPrice || car.pricePerDay <= maxPrice;
      const carFeatures = [...(car.features ?? []), ...(car.customFeatures ?? [])].map((item) =>
        item.toLowerCase(),
      );
      const matchesFeatures = advancedFilters.selectedFeatures.every((feature) =>
        carFeatures.includes(feature.toLowerCase()),
      );
      const matchesVerified = !advancedFilters.verifiedOnly || Boolean(car.isCarVerified);

      return (
        matchesMake &&
        matchesModel &&
        matchesMinYear &&
        matchesMaxYear &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesFeatures &&
        matchesVerified
      );
    });
  }, [
    carData,
    makeText,
    modelText,
    hasMinYear,
    minYear,
    hasMaxYear,
    maxYear,
    hasMinPrice,
    minPrice,
    hasMaxPrice,
    maxPrice,
    advancedFilters.selectedFeatures,
    advancedFilters.verifiedOnly,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.make.trim().length > 0) count += 1;
    if (advancedFilters.model.trim().length > 0) count += 1;
    if (advancedFilters.minYear.trim().length > 0) count += 1;
    if (advancedFilters.maxYear.trim().length > 0) count += 1;
    if (advancedFilters.minPrice.trim().length > 0) count += 1;
    if (advancedFilters.maxPrice.trim().length > 0) count += 1;
    if (advancedFilters.selectedFeatures.length > 0) count += 1;
    if (advancedFilters.verifiedOnly) count += 1;
    return count;
  }, [advancedFilters]);

  useEffect(() => {
    if (!selectedCarId) return;
    if (!filteredCars.some((car) => car.id === selectedCarId)) {
      setSelectedCarId(null);
    }
  }, [filteredCars, selectedCarId]);

  const orderedCars = useMemo(() => {
    if (!selectedCarId) return filteredCars;
    const selected = filteredCars.find((car) => car.id === selectedCarId);
    if (!selected) return filteredCars;
    return [selected, ...filteredCars.filter((car) => car.id !== selectedCarId)];
  }, [filteredCars, selectedCarId]);

  const mapCars = useMemo<CarLocation[]>(
    () =>
      filteredCars
        .filter(
          (car) =>
            typeof car.location?.lat === "number" &&
            typeof car.location?.lng === "number",
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
    [filteredCars],
  );

  const region = useMemo(
    () => buildRegionForRadius(searchCenter.lat, searchCenter.lng, DEFAULT_SEARCH_RADIUS_KM),
    [searchCenter.lat, searchCenter.lng],
  );

  const handleMarkerPress = (carId: string) => {
    setSelectedCarId(carId);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleOfferPress = (carId: string) => {
    router.push({
      pathname: `/car/${carId}`,
      params: { startDate, endDate, startHour, endHour },
    } as any);
  };

  const handleCarCardPress = (carId: string) => {
    setSelectedCarId(carId);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleLoadMoreCars = () => {
    if (!canLoadMore || isLoadingMore) return;
    loadMore(SEARCH_PAGE_SIZE);
  };

  const searchLocation = async () => {
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
          language: searchLanguage,
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
        language: searchLanguage,
      });

      setSearchCenter({ lat: details.lat, lng: details.lng });
      setSelectedLocationSuggestion(suggestion);
      setLocationQuery(suggestion.description);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
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
  };

  const openFiltersDialog = () => {
    setDraftAdvancedFilters(advancedFilters);
    setIsFiltersDialogOpen(true);
  };

  const closeFiltersDialog = () => {
    setIsFiltersDialogOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftAdvancedFilters(createEmptyAdvancedFilters());
  };

  const applyDraftFilters = () => {
    setAdvancedFilters(draftAdvancedFilters);
    setIsFiltersDialogOpen(false);
  };

  const header = (
    <View className="pb-4 pt-2">
      <BrowseHeader iconColor={strongIconColor} />
      <BrowseFiltersPanel
        isMobile={isMobile}
        locationQuery={locationQuery}
        onChangeLocation={(value) => {
          setLocationQuery(value);
          setSelectedLocationSuggestion(null);
          if (searchError) setSearchError(null);
        }}
        onSearchLocation={searchLocation}
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
        startDate={startDate}
        endDate={endDate}
        startHour={startHour}
        endHour={endHour}
        onApplyDates={(nextStartDate, nextEndDate) => {
          setStartDate(nextStartDate);
          setEndDate(nextEndDate);
        }}
        onApplyHours={(nextStartHour, nextEndHour) => {
          setStartHour(nextStartHour);
          setEndHour(nextEndHour);
        }}
        draftFilters={draftAdvancedFilters}
        onChangeDraftFilters={setDraftAdvancedFilters}
        onApplyDraftFilters={applyDraftFilters}
        onResetDraftFilters={resetDraftFilters}
        isFiltersDialogOpen={isFiltersDialogOpen}
        onOpenFiltersDialog={openFiltersDialog}
        onCloseFiltersDialog={closeFiltersDialog}
        activeFiltersCount={activeFiltersCount}
        placeholderColor={getTokenColor(mode, "placeholder")}
        iconColor={strongIconColor}
        buttonForeground={getTokenColor(mode, "primaryForeground")}
        searchError={searchError}
        isLoading={isLoading}
      />
    </View>
  );

  if (!hasValidCenter) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {isMobile ? (
        <View className="flex-1 px-4">
          {header}
          <View className="mb-3 flex-row rounded-xl border border-border bg-card p-1">
            <Pressable
              onPress={() => setMobileView("grid")}
              className={`flex-1 items-center rounded-lg py-2 ${
                mobileView === "grid" ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  mobileView === "grid" ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {t("explore.grid")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMobileView("map")}
              className={`flex-1 items-center rounded-lg py-2 ${
                mobileView === "map" ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  mobileView === "map" ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {t("explore.map")}
              </Text>
            </Pressable>
          </View>

          {mobileView === "map" ? (
            <View className="mb-3 h-[65%] min-h-[300px]">
              <SearchMap
                region={region}
                cars={mapCars}
                interactive={true}
                selectedCarId={selectedCarId}
                onMarkerPress={handleMarkerPress}
                onOfferPress={handleOfferPress}
                fitToCars={false}
                containerClassName="h-full w-full overflow-hidden rounded-xl"
              />
            </View>
          ) : (
            <CarResultsList
              listRef={listRef}
              cars={orderedCars}
              selectedCarId={selectedCarId}
              onPressCar={handleCarCardPress}
              startDate={startDate}
              endDate={endDate}
              startHour={startHour}
              endHour={endHour}
              paddingBottom={96}
              onEndReached={handleLoadMoreCars}
              isLoadingMore={isLoadingMore}
            />
          )}
        </View>
      ) : (
        <View className="flex-1 px-4 pb-4">
          {header}
          <View className="flex-1 flex-row gap-4">
            <View className="flex-1">
              <CarResultsList
                listRef={listRef}
                cars={orderedCars}
                selectedCarId={selectedCarId}
                onPressCar={handleCarCardPress}
                startDate={startDate}
                endDate={endDate}
                startHour={startHour}
                endHour={endHour}
                paddingBottom={24}
                onEndReached={handleLoadMoreCars}
                isLoadingMore={isLoadingMore}
              />
            </View>
            <View className="w-[44%] min-w-[360px]">
              <SearchMap
                region={region}
                cars={mapCars}
                interactive={true}
                selectedCarId={selectedCarId}
                onMarkerPress={handleMarkerPress}
                onOfferPress={handleOfferPress}
                fitToCars={false}
                containerClassName="h-full w-full overflow-hidden rounded-xl"
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
