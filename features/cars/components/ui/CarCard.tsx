import { View, Image, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ui/text";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type CarCardProps = {
  car: {
    id: string;
    make: string;
    model: string;
    year: number;
    pricePerDay: number;
    images: string[];
    location?: {
      city?: string;
    };
  };
  onPress?: () => void;
  highlighted?: boolean;
};

export function CarCard({ car, onPress, highlighted = false }: CarCardProps) {
  const mode = resolveThemeMode(useColorScheme());

  return (
    <Link href={`/car/${car.id}`} asChild>
      <Pressable
        onPress={onPress}
        className={`bg-card rounded-xl overflow-hidden mb-4 shadow-sm border ${
          highlighted ? "border-primary border-2 shadow-md" : "border-border"
        }`}
      >
        <Image
          source={{ uri: car.images[0] }}
          className="w-full h-48"
          resizeMode="cover"
        />
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground">
                {car.make} {car.model}
              </Text>
              <Text className="text-sm text-muted-foreground">{car.year}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={14} color={getTokenColor(mode, "ratingStar")} />
              <Text className="text-sm font-medium text-foreground ml-1">
                {5}
              </Text>
              <Text className="text-sm text-muted-foreground ml-1">
                {12412}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center mb-3">
            <Ionicons name="location-outline" size={14} color={getTokenColor(mode, "iconMuted")} />
            <Text className="text-sm text-muted-foreground ml-1">
              {car.location?.city}
            </Text>
          </View>
          <View className="flex-row items-baseline">
            <Text className="text-xl font-bold text-foreground">
              ${car.pricePerDay}
            </Text>
            <Text className="text-sm text-muted-foreground ml-1">/day</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}



