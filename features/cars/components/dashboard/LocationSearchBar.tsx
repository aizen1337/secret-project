import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import { getPolandCityQuickPicks } from "@/features/cars/components/dashboard/polandCities";
import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";

type LocationSearchBarProps = {
  locationQuery: string;
  onChangeLocation: (value: string) => void;
  onSearchLocation: () => void;
  locationSuggestions: LocationSuggestion[];
  showLocationSuggestions: boolean;
  onSelectLocationSuggestion: (suggestion: LocationSuggestion) => void;
  isSearchingLocationSuggestions: boolean;
  isSearchingLocation: boolean;
  iconColor: string;
  placeholderColor: string;
  buttonForeground: string;
};

export function LocationSearchBar({
  locationQuery,
  onChangeLocation,
  onSearchLocation,
  locationSuggestions,
  showLocationSuggestions,
  onSelectLocationSuggestion,
  isSearchingLocationSuggestions,
  isSearchingLocation,
  iconColor,
  placeholderColor,
  buttonForeground,
}: LocationSearchBarProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const topCity = useMemo(() => {
    const query = locationQuery.trim();
    const picks = getPolandCityQuickPicks(query || "");
    const city = picks[0];
    return city ? { description: city.description, placeId: city.placeId } : null;
  }, [locationQuery]);

  const autocompleteSuggestions = useMemo(() => {
    if (!topCity) return locationSuggestions;
    return locationSuggestions.filter((suggestion) => suggestion.placeId !== topCity.placeId);
  }, [locationSuggestions, topCity]);
  const flatSuggestions = useMemo(
    () => (topCity ? [topCity, ...autocompleteSuggestions] : autocompleteSuggestions),
    [autocompleteSuggestions, topCity],
  );

  const isWeb = Platform.OS === "web";
  const webDialogWidth = Math.min(820, Math.max(560, width - 64));
  const webDialogMaxHeight = Math.min(720, Math.max(420, height - 120));

  const handlePick = (suggestion: LocationSuggestion) => {
    onSelectLocationSuggestion(suggestion);
    setIsModalOpen(false);
  };

  const handleSearch = () => {
    onSearchLocation();
    setIsModalOpen(false);
  };

  return (
    <View className="gap-2">
      <Pressable
        onPress={() => setIsModalOpen(true)}
        className="h-16 flex-row items-center rounded-xl bg-secondary px-3"
      >
        <Ionicons name="search" size={18} color={iconColor} />
        <View className="ml-2 flex-1">
          {locationQuery.trim() ? (
            <Text className="text-sm font-medium text-foreground">{locationQuery}</Text>
          ) : (
            <Text className="text-sm" style={{ color: placeholderColor }}>
              {t("explore.searchLocationPlaceholder")}
            </Text>
          )}
        </View>
        <View className="rounded-lg bg-primary px-3 py-2">
          <Text className="text-xs font-semibold text-primary-foreground">{t("explore.searchGo")}</Text>
        </View>
      </Pressable>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View
          className={`flex-1 bg-black/55 px-4 ${isWeb ? "items-center justify-start pt-12" : "py-10"}`}
        >
          <Pressable className="absolute inset-0" onPress={() => setIsModalOpen(false)} />
          <View
            className="max-h-[85%] rounded-2xl border border-border bg-card p-4"
            style={isWeb ? { width: webDialogWidth, maxHeight: webDialogMaxHeight } : undefined}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">
                {t("explore.locationModalTitle")}
              </Text>
              <Pressable
                onPress={() => setIsModalOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-secondary"
              >
                <Ionicons name="close" size={18} color={iconColor} />
              </Pressable>
            </View>

            <View className="flex-row items-center rounded-xl border border-border bg-background px-3">
              <Ionicons name="search" size={18} color={iconColor} />
              <TextInput
                value={locationQuery}
                onChangeText={onChangeLocation}
                placeholder={t("explore.searchLocationPlaceholder")}
                placeholderTextColor={placeholderColor}
                className="ml-2 h-12 flex-1 text-sm text-foreground"
                autoFocus
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <Pressable
                onPress={handleSearch}
                className="rounded-lg bg-primary px-3 py-2"
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? (
                  <ActivityIndicator color={buttonForeground} size="small" />
                ) : (
                  <Text className="text-xs font-semibold text-primary-foreground">
                    {t("explore.searchGo")}
                  </Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              className="mt-4"
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {isSearchingLocationSuggestions ? (
                <View className="flex-row items-center gap-2 rounded-xl bg-secondary px-3 py-3">
                  <ActivityIndicator size="small" color={iconColor} />
                  <Text className="text-xs text-muted-foreground">{t("explore.searchingLocations")}</Text>
                </View>
              ) : null}

              {showLocationSuggestions && flatSuggestions.length > 0 ? (
                <View className="overflow-hidden rounded-lg border border-border bg-card">
                  {flatSuggestions.map((suggestion, index) => (
                    <Pressable
                      key={`${suggestion.placeId}-${index}`}
                      onPress={() => handlePick(suggestion)}
                      className={`flex-row items-center gap-3 px-3 py-3 ${
                        index !== flatSuggestions.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <View className="p-1">
                        <Ionicons name="location-outline" size={16} color={iconColor} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-foreground">{suggestion.description}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={14} color={iconColor} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
