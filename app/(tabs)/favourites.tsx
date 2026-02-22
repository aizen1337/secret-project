import { View, Text } from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="heart-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
        </View>
        <Text className="text-xl font-semibold text-foreground mb-2 text-center">
          {t("favorites.emptyTitle")}
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          {t("favorites.emptySubtitle")}
        </Text>
      </View>
    </SafeAreaView>
  );
}

