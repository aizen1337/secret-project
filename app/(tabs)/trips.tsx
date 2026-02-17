import { View, Text, SafeAreaView, Image, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";

export default function TripsScreen() {
  const mode = resolveThemeMode(useColorScheme());
  const { isSignedIn } = useAuth();
  const trips = useQuery(api.bookings.listMyTripsWithPayments, isSignedIn ? {} : "skip");

  if (trips && trips.length > 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {trips.map((entry) => (
            <View key={entry.booking._id} className="bg-card border border-border rounded-xl p-3 mb-3">
              <View className="flex-row items-center">
                {entry.car?.images?.[0] ? (
                  <Image source={{ uri: entry.car.images[0] }} className="w-14 h-14 rounded-lg" />
                ) : (
                  <View className="w-14 h-14 rounded-lg bg-secondary" />
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {entry.car?.title || `${entry.car?.make ?? "Car"} ${entry.car?.model ?? ""}`}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Booking: {entry.booking.status}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Payment: {entry.payment?.status ?? "pending"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Payout: {entry.payment?.payoutStatus ?? "pending"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="car-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
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

