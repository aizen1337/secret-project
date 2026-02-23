import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "nativewind";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAction } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "@/convex/_generated/api";
import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { Text } from "@/components/ui/text";
import { BrowseHeader } from "@/features/cars/components/dashboard/BrowseHeader";
import { LocationSearchBar } from "@/features/cars/components/dashboard/LocationSearchBar";
import {
  toDateInputValue,
  type LocationSuggestion,
} from "@/features/cars/components/dashboard/searchUtils";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function ExploreEntryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
  const searchAddresses = useAction(api.cars.searchAddresses);
  const resolveAddressDetails = useAction(api.cars.resolveAddressDetails);
  const [placesSessionToken] = useState(
    () => `places-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`,
  );

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pb-4 pt-2">
        <BrowseHeader iconColor={getTokenColor(mode, "icon")} />

        <View className="rounded-2xl border border-border bg-card p-4">
          <Text className="text-sm text-muted-foreground">{t("common.actions.browseCars")}</Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">{t("explore.findYourRide")}</Text>

          <View className="mt-4 gap-3">
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
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
