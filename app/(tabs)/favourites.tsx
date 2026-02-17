import { View, Text, SafeAreaView } from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function FavoritesScreen() {
  const mode = resolveThemeMode(useColorScheme());

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="heart-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
        </View>
        <Text className="text-xl font-semibold text-foreground mb-2 text-center">
          No favorites yet
        </Text>
        <Text className="text-base text-muted-foreground text-center">
          Tap the heart on any car to save it here for easy access later.
        </Text>
      </View>
    </SafeAreaView>
  );
}

