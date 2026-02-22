import { useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme } from "nativewind";
import { FlatList, Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "@/convex/_generated/api";
import { BrowseFiltersPanel } from "@/features/cars/components/dashboard/BrowseFiltersPanel";
import { BrowseHeader } from "@/features/cars/components/dashboard/BrowseHeader";
import { CarResultsList } from "@/features/cars/components/dashboard/CarResultsList";
import type { BrowseAdvancedFilters, CarItem } from "@/features/cars/components/dashboard/types";
import { SearchMap } from "@/features/map/SearchMap";
import type { CarLocation } from "@/features/map/SearchMap";
import { Text } from "@/components/ui/text";
import { getThemePalette, getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toStartOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
}

function toEndOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
}

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

export default function BrowseCars() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const mode = resolveThemeMode(useColorScheme());
  const strongIconColor = getThemePalette(mode).foreground;
  const listRef = useRef<FlatList<CarItem>>(null);

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  }, []);

  const [locationQuery, setLocationQuery] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<BrowseAdvancedFilters>(
    createEmptyAdvancedFilters,
  );
  const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<BrowseAdvancedFilters>(
    createEmptyAdvancedFilters,
  );
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"grid" | "map">("grid");
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(defaultEnd));
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedRegion, setSearchedRegion] = useState<MapRegion | null>(null);
  const searchAddresses = useAction(api.cars.searchAddresses);
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails);
  const [placesSessionToken] = useState(
    () => `places-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
  );

  const startIso = toStartOfDayIso(startDate);
  const endIso = toEndOfDayIso(endDate);
  const isDateRangeValid =
    new Date(startIso).getTime() <= new Date(endIso).getTime();

  const cars = useQuery(
    api.cars.listCurrentlyAvailableCars as never,
    isDateRangeValid
      ? ({ startDate: startIso, endDate: endIso } as never)
      : "skip",
  );
  const isLoading = isDateRangeValid && cars === undefined;

  const carData = useMemo<CarItem[]>(
    () =>
      (cars as any[] | undefined)?.map((car: any) => ({
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
    [cars],
  );

  const locationText = locationQuery.trim().toLowerCase();
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
      const locationCandidate =
        `${car.location.city} ${car.location.country}`.toLowerCase();
      const matchesLocation =
        locationText.length === 0 || locationCandidate.includes(locationText);
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
        matchesLocation &&
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
    locationText,
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

  const region = useMemo<MapRegion>(() => {
    if (searchedRegion) return searchedRegion;

    if (!mapCars.length) {
      return {
        latitude: 52.2297,
        longitude: 21.0122,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      };
    }

    const latitudes = mapCars.map((car) => car.latitude);
    const longitudes = mapCars.map((car) => car.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.08),
      longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.08),
    };
  }, [mapCars, searchedRegion]);

  const handleMarkerPress = (carId: string) => {
    setSelectedCarId(carId);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleOfferPress = (carId: string) => {
    router.push({
      pathname: `/car/${carId}`,
      params: { startDate, endDate },
    } as any);
  };

  const handleCarCardPress = (carId: string) => {
    setSelectedCarId(carId);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const searchLocation = async () => {
    const location = locationQuery.trim();
    if (!location) {
      setSearchedRegion(null);
      setSearchError(null);
      return;
    }

    setIsSearchingLocation(true);
    setSearchError(null);

    try {
      const suggestions = await searchAddresses({
        query: location,
        sessionToken: placesSessionToken,
      });
      if (!suggestions.length) {
        setSearchError(t("explore.locationNotFound"));
        setSearchedRegion(null);
        return;
      }

      const details = await resolveAddressDetails({
        placeId: suggestions[0].placeId,
        sessionToken: placesSessionToken,
      });

      setSearchedRegion({
        latitude: details.lat,
        longitude: details.lng,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      });
    } catch {
      setSearchError(t("explore.locationSearchFailed"));
      setSearchedRegion(null);
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
    <View className="pt-2 pb-4">
      <BrowseHeader iconColor={strongIconColor} />
      <BrowseFiltersPanel
        isMobile={isMobile}
        locationQuery={locationQuery}
        onChangeLocation={setLocationQuery}
        onSearchLocation={searchLocation}
        isSearchingLocation={isSearchingLocation}
        startDate={startDate}
        endDate={endDate}
        onApplyDates={(nextStartDate, nextEndDate) => {
          setStartDate(nextStartDate);
          setEndDate(nextEndDate);
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
              paddingBottom={96}
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
                paddingBottom={24}
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
                containerClassName="h-full w-full overflow-hidden rounded-xl"
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

