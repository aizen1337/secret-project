import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { Text } from "@/components/ui/text";
import { CarCard } from "@/features/cars/components/ui/CarCard";
import { SearchMap } from "@/features/map/SearchMap";
import type { CarLocation } from "@/features/map/SearchMap";

type CarItem = {
  id: string;
  title?: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  images: string[];
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
};

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

export default function BrowseCars() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const colorScheme = useColorScheme();
  const listRef = useRef<FlatList<CarItem>>(null);

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(defaultEnd));
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedRegion, setSearchedRegion] = useState<MapRegion | null>(null);

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
      cars?.map((car) => ({
        id: car._id,
        title: car.title,
        make: car.make,
        model: car.model,
        year: car.year,
        pricePerDay: car.pricePerDay,
        images: car.images,
        location: car.location,
      })) ?? [],
    [cars],
  );

  const query = searchQuery.trim().toLowerCase();
  const locationText = locationQuery.trim().toLowerCase();

  const filteredCars = useMemo(() => {
    return carData.filter((car) => {
      const carText = `${car.title ?? ""} ${car.make} ${car.model}`.toLowerCase();
      const matchesCarText = query.length === 0 || carText.includes(query);
      const locationCandidate =
        `${car.location.city} ${car.location.country}`.toLowerCase();
      const matchesLocation =
        locationText.length === 0 || locationCandidate.includes(locationText);
      return matchesCarText && matchesLocation;
    });
  }, [carData, query, locationText]);

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
    router.push(`/car/${carId}`);
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) throw new Error("Failed to search location");

      const data = (await response.json()) as { lat: string; lon: string }[];
      if (!data.length) {
        setSearchError("Location not found.");
        setSearchedRegion(null);
        return;
      }

      setSearchedRegion({
        latitude: Number(data[0].lat),
        longitude: Number(data[0].lon),
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      });
    } catch {
      setSearchError("Location search failed.");
      setSearchedRegion(null);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const header = (
    <View className="pt-2 pb-4">
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xs uppercase text-muted-foreground">Explore</Text>
          <Text className="text-2xl font-bold">Find your ride</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <Ionicons name="options-outline" size={20} color="#171717" />
          </Pressable>
          <Link href="/profile" asChild>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
              <Ionicons name="person-outline" size={20} color="#171717" />
            </Pressable>
          </Link>
        </View>
      </View>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        className={`mb-3 rounded-xl px-4 py-3 text-sm ${
          colorScheme === "dark" ? "bg-card" : "bg-gray-100"
        }`}
        placeholder="Search cars by make or model..."
      />

      <View
        className={`flex-row items-center rounded-xl px-3 ${
          colorScheme === "dark" ? "bg-card" : "bg-gray-100"
        }`}
      >
        <Ionicons
          name="search"
          size={18}
          color={colorScheme === "dark" ? "#9ca3af" : "#737373"}
        />
        <TextInput
          value={locationQuery}
          onChangeText={setLocationQuery}
          placeholder="Search location on map..."
          className="ml-2 flex-1 py-3 text-sm text-foreground"
          onSubmitEditing={searchLocation}
          returnKeyType="search"
        />
        <Pressable
          onPress={searchLocation}
          className="rounded-lg bg-primary px-3 py-2"
          disabled={isSearchingLocation}
        >
          {isSearchingLocation ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-xs font-semibold text-primary-foreground">Go</Text>
          )}
        </Pressable>
      </View>

      {searchError ? (
        <Text className="mt-2 text-xs text-red-500">{searchError}</Text>
      ) : null}

      <View className="mt-3">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onApply={(nextStartDate, nextEndDate) => {
            setStartDate(nextStartDate);
            setEndDate(nextEndDate);
          }}
        />
      </View>

      {isLoading ? (
        <Text className="mt-3 text-sm text-muted-foreground">Loading cars...</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {isMobile ? (
        <View className="flex-1 px-4">
          {header}
          <View className="mb-3 h-56">
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
          <FlatList
            ref={listRef}
            data={orderedCars}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CarCard
                car={item}
                onPress={() => handleCarCardPress(item.id)}
                highlighted={item.id === selectedCarId}
              />
            )}
            ListEmptyComponent={
              <View className="py-6">
                <Text className="text-center text-sm text-muted-foreground">
                  No cars match current filters.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        </View>
      ) : (
        <View className="flex-1 px-4 pb-4">
          {header}
          <View className="flex-1 flex-row gap-4">
            <View className="flex-1">
              <FlatList
                ref={listRef}
                data={orderedCars}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <CarCard
                    car={item}
                    onPress={() => handleCarCardPress(item.id)}
                    highlighted={item.id === selectedCarId}
                  />
                )}
                ListEmptyComponent={
                  <View className="py-6">
                    <Text className="text-center text-sm text-muted-foreground">
                      No cars match current filters.
                    </Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
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
