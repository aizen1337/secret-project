import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";

type LocationSearchBarProps = {
  locationQuery: string;
  onChangeLocation: (value: string) => void;
  onSearchLocation: () => void;
  isSearchingLocation: boolean;
  iconColor: string;
  placeholderColor: string;
  buttonForeground: string;
};

export function LocationSearchBar({
  locationQuery,
  onChangeLocation,
  onSearchLocation,
  isSearchingLocation,
  iconColor,
  placeholderColor,
  buttonForeground,
}: LocationSearchBarProps) {
  const { t } = useTranslation();
  return (
    <View className="h-16 flex-row items-center rounded-xl bg-secondary px-3">
      <Ionicons name="search" size={18} color={iconColor} />
      <TextInput
        value={locationQuery}
        onChangeText={onChangeLocation}
        placeholder={t("explore.searchLocationPlaceholder")}
        placeholderTextColor={placeholderColor}
        className="ml-2 flex-1 py-3 text-sm text-foreground"
        onSubmitEditing={onSearchLocation}
        returnKeyType="search"
      />
      <Pressable
        onPress={onSearchLocation}
        className="rounded-lg bg-primary px-3 py-2"
        disabled={isSearchingLocation}
      >
        {isSearchingLocation ? (
          <ActivityIndicator color={buttonForeground} size="small" />
        ) : (
          <Text className="text-xs font-semibold text-primary-foreground">{t("explore.searchGo")}</Text>
        )}
      </Pressable>
    </View>
  );
}
