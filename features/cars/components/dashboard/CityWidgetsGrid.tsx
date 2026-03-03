import { ImageBackground, Pressable, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import {
  getSuggestionImage,
  getSuggestionSubtitle,
  getSuggestionTitle,
} from "@/features/cars/components/dashboard/cityVisuals";
import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";

type CityWidgetsGridProps = {
  cities: LocationSuggestion[];
  onSelectCity: (suggestion: LocationSuggestion) => void;
};

export function CityWidgetsGrid({ cities, onSelectCity }: CityWidgetsGridProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const columns = width >= 1280 ? 3 : width >= 900 ? 2 : 1;
  const gap = 12;
  const horizontalPadding = 32;
  const tileWidth = Math.max((width - horizontalPadding - gap * (columns - 1)) / columns, 220);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-foreground">{t("explore.cityWidgetsTitle")}</Text>
        <Text className="text-xs text-muted-foreground">{t("explore.cityWidgetsSubtitle")}</Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {cities.map((city) => (
          <Pressable
            key={city.placeId}
            onPress={() => onSelectCity(city)}
            className="overflow-hidden rounded-2xl border border-border/70"
            style={{ width: tileWidth }}
          >
            <ImageBackground source={{ uri: getSuggestionImage(city) }} className="h-40 justify-end">
              <View className="absolute inset-0 bg-black/35" />
              <View className="flex-row items-center gap-2 p-3">
                <View className="rounded-full bg-white/20 p-1.5">
                  <Ionicons name="location-outline" size={14} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">
                    {getSuggestionTitle(city.description)}
                  </Text>
                  <Text className="text-xs text-white/85">
                    {getSuggestionSubtitle(city.description)}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
