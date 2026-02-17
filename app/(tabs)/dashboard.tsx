
import { useMemo, useState } from "react";
import { useColorScheme } from "nativewind";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function DashboardScreen() {
  const router = useRouter();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<"listings" | "bookings">("listings");
  const myCars = useQuery(api.cars.listHostCars, isSignedIn ? {} : "skip");
  const hostPayouts = useQuery(api.bookings.listHostBookingsWithPayouts, isSignedIn ? {} : "skip");
  const isLoading = isSignedIn && myCars === undefined;

  const listingStats = useMemo(() => {
    if (!myCars) {
      return { total: 0, averagePrice: 0 };
    }
    const total = myCars.length;
    const averagePrice =
      total > 0
        ? Math.round(
            myCars.reduce((sum, car) => sum + car.pricePerDay, 0) / total
          )
        : 0;
    return { total, averagePrice };
  }, [myCars]);

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
            <Ionicons name="grid-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
          </View>
          <Text className="text-xl font-semibold text-foreground mb-2 text-center">
            Host Dashboard
          </Text>
          <Text className="text-base text-muted-foreground text-center mb-6">
            Log in to manage your listings and earnings.
          </Text>
          <Link href="/sign-in" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-xl">
              <Text className="text-primary-foreground font-semibold text-base">
                Sign in
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-3 pb-8">
          <View className="flex-row items-center justify-between mb-5">
            <View>
              <Text className="text-xs uppercase text-muted-foreground">
                Host
              </Text>
              <Text className="text-2xl font-bold text-foreground">
                Dashboard
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/car/new")}
                className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
              >
                <Ionicons name="add" size={20} color={getTokenColor(mode, "icon")} />
              </Pressable>
              <Link href="/profile" asChild>
                <Pressable className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center">
                  <Ionicons name="settings-outline" size={20} color={getTokenColor(mode, "icon")} />
                </Pressable>
              </Link>
            </View>
          </View>

          {/* Stats Grid */}
          <View className="flex-row flex-wrap gap-3 mb-5">
            <View className="flex-1 min-w-[45%] bg-card p-4 rounded-xl border border-border">
              <Text className="text-sm text-muted-foreground mb-1">
                Active Listings
              </Text>
              <Text className="text-2xl font-bold text-foreground">
                {listingStats.total}
              </Text>
            </View>
            <View className="flex-1 min-w-[45%] bg-card p-4 rounded-xl border border-border">
              <Text className="text-sm text-muted-foreground mb-1">
                Avg Price/Day
              </Text>
              <Text className="text-2xl font-bold text-foreground">
                ${listingStats.averagePrice}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-secondary rounded-xl p-1 mb-5">
            <Pressable
              onPress={() => setActiveTab("listings")}
              className={`flex-1 py-3 rounded-lg ${
                activeTab === "listings" ? "bg-card" : ""
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "listings"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                My Listings
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("bookings")}
              className={`flex-1 py-3 rounded-lg ${
                activeTab === "bookings" ? "bg-card" : ""
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "bookings"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Bookings
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          {activeTab === "listings" ? (
            <View>
              {isLoading ? (
                <Text className="text-sm text-muted-foreground">
                  Loading listings...
                </Text>
              ) : myCars && myCars.length > 0 ? (
                myCars.map((car) => (
                  <View
                    key={car._id}
                    className="bg-card rounded-xl overflow-hidden mb-3 border border-border"
                  >
                    <View className="flex-row">
                      <Image
                        source={{ uri: car.images[0] }}
                        className="w-24 h-24"
                        resizeMode="cover"
                      />
                      <View className="flex-1 p-3">
                        <Text className="font-semibold text-foreground">
                          {car.title || `${car.make} ${car.model}`}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {car.make} {car.model} - {car.year}
                        </Text>
                        <Text className="text-sm text-muted-foreground mt-1">
                          {car.location.city}, {car.location.country}
                        </Text>
                        <Text className="text-sm text-muted-foreground mt-1">
                          ${car.pricePerDay}/day
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View className="bg-card rounded-xl p-4 border border-border">
                  <Text className="text-sm text-muted-foreground text-center">
                    No listings yet.
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => router.push("/car/new")}
                className="bg-primary py-4 rounded-xl items-center mt-2"
              >
                <Text className="text-primary-foreground font-semibold text-base">
                  Add New Car
                </Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {hostPayouts && hostPayouts.length > 0 ? (
                hostPayouts.map((entry) => (
                  <View key={entry.payment._id} className="bg-card rounded-xl p-4 border border-border mb-3">
                    <Text className="text-sm font-semibold text-foreground">
                      {entry.car?.title || `${entry.car?.make ?? "Car"} ${entry.car?.model ?? ""}`}
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                      Booking status: {entry.booking?.status ?? "unknown"}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Payment: {entry.payment.status}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Payout: {entry.payment.payoutStatus}
                    </Text>
                  </View>
                ))
              ) : (
                <View className="bg-card rounded-xl p-4 border border-border">
                  <Text className="text-sm text-muted-foreground text-center">
                    No payout records yet.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

