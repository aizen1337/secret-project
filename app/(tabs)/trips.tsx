import { View, Text, SafeAreaView } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TripsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="car-outline" size={40} color="#737373" />
        </View>
        <Text className="text-xl font-semibold text-foreground mb-2 text-center">
          No trips booked
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-6">
          When you book a car, your trips will appear here.
        </Text>
        <Link href="/" asChild>
          <View className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-primary-foreground font-semibold text-base">
              Browse cars
            </Text>
          </View>
        </Link>
      </View>
    </SafeAreaView>
  );
}
