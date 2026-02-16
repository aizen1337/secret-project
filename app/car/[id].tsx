import { useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLinking from "expo-linking";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useAction, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BottomNav } from "@/components/navigation/BottomNav";

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const carId = typeof id === "string" ? (id as Id<"cars">) : undefined;
  const offer = useQuery(api.cars.getCarOfferById, carId ? { carId } : "skip");
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const car = offer?.car;
  const host = offer?.host;
  const hostUser = offer?.hostUser;

  const [selectedDays, setSelectedDays] = useState(3);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const galleryRef = useRef<FlatList<string>>(null);
  const isWeb = Platform.OS === "web";

  if (!carId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-lg text-muted-foreground text-center">Car not found</Text>
      </SafeAreaView>
    );
  }

  if (offer === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-base text-muted-foreground">Loading car details...</Text>
      </SafeAreaView>
    );
  }

  if (!car) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-lg text-muted-foreground text-center">Car not found</Text>
      </SafeAreaView>
    );
  }

  const totalPrice = car.pricePerDay * selectedDays;
  const serviceFee = Math.round(totalPrice * 0.1);
  const grandTotal = totalPrice + serviceFee;
  const galleryImages = car.images.length > 0 ? car.images : [""];
  const sideImages = galleryImages
    .map((image, index) => ({ image, index }))
    .filter((item) => item.index !== activeImageIndex)
    .slice(0, 4);
  const extraPhotosCount = Math.max(0, galleryImages.length - (sideImages.length + 1));
  const displayFeatures =
    [...(car.features ?? []), ...(car.customFeatures ?? [])].filter(Boolean);
  const hostInitial = (hostUser?.name?.trim()?.charAt(0) || "H").toUpperCase();
  const hostMemberSince = host
    ? new Date(host.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  const handleBook = async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const webOrigin = isWeb && typeof window !== "undefined" ? window.location.origin : null;
      const successUrl = webOrigin
        ? `${webOrigin}/trips?checkout=success`
        : ExpoLinking.createURL("/trips?checkout=success");
      const cancelUrl = webOrigin
        ? `${webOrigin}/car/${car._id}?checkout=cancelled`
        : ExpoLinking.createURL(`/car/${car._id}?checkout=cancelled`);

      const checkout = await createCheckoutSession({
        carId: car._id,
        carName: `${car.make} ${car.model}`,
        pricePerDay: car.pricePerDay,
        days: selectedDays,
        successUrl,
        cancelUrl,
      });

      if (isWeb && typeof window !== "undefined") {
        window.location.href = checkout.url;
        return;
      }

      await ExpoLinking.openURL(checkout.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open checkout.";
      Alert.alert("Checkout Error", message);
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="relative mt-4">
          {isWeb ? (
            <View className="px-4 pt-8">
              <View className="max-w-[1100px] w-full self-center rounded-2xl overflow-hidden">
                <View style={{ flexDirection: "row", height: 450, gap: 8 }}>
                  <Pressable
                    style={{ flex: 2, backgroundColor: "#e5e7eb" }}
                    onPress={() => setActiveImageIndex(activeImageIndex)}
                  >
                    <Image
                      source={{ uri: galleryImages[activeImageIndex] }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </Pressable>
                  {galleryImages.length > 1 ? (
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                        {sideImages.slice(0, 2).map((item) => (
                          <Pressable
                            key={`${item.image}-${item.index}`}
                            style={{ flex: 1, backgroundColor: "#e5e7eb" }}
                            onPress={() => setActiveImageIndex(item.index)}
                          >
                            <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                          </Pressable>
                        ))}
                        {sideImages.length < 2 ? <View style={{ flex: 1, backgroundColor: "#f3f4f6" }} /> : null}
                      </View>
                      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                        {sideImages.slice(2, 4).map((item, idx) => {
                          const isLastTile = idx === 1 || (sideImages.length === 3 && idx === 0);
                          const showMorePhotos = isLastTile && extraPhotosCount > 0;
                          return (
                            <Pressable
                              key={`${item.image}-${item.index}`}
                              style={{ flex: 1, backgroundColor: "#e5e7eb" }}
                              onPress={() => setActiveImageIndex(item.index)}
                            >
                              <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                              {showMorePhotos ? (
                                <View className="absolute inset-0 bg-black/45 items-center justify-center">
                                  <Text className="text-white font-semibold text-sm">
                                    +{extraPhotosCount} photos
                                  </Text>
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                        {sideImages.length < 4 ? <View style={{ flex: 1, backgroundColor: "#f3f4f6" }} /> : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <FlatList
              ref={galleryRef}
              data={car.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(image, index) => `${image}-${index}`}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(nextIndex);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={{ width, height: 340 }}
                  resizeMode="cover"
                />
              )}
            />
          )}
          <Pressable
            onPress={() => router.back()}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </Pressable>
          {!isWeb && car.images.length > 1 ? (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {car.images.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  className={`h-2 rounded-full ${
                    index === activeImageIndex ? "w-5 bg-white" : "w-2 bg-white/60"
                  }`}
                />
              ))}
            </View>
          ) : null}
        </View>

        {!isWeb && car.images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 pt-3"
            contentContainerStyle={{ gap: 10 }}
          >
            {car.images.map((image, index) => (
              <Pressable
                key={`${image}-${index}`}
                onPress={() => {
                  setActiveImageIndex(index);
                  galleryRef.current?.scrollToIndex({ index, animated: true });
                }}
                className={`rounded-lg overflow-hidden border ${
                  activeImageIndex === index ? "border-primary" : "border-border"
                }`}
              >
                <Image source={{ uri: image }} className="w-24 h-24" resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View className="px-4 py-6">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-2xl font-bold text-foreground">
                  {car.title || `${car.make} ${car.model}`}
                </Text>
                {car.isCarVerified ? (
                  <View className="ml-2 mt-1 px-2 py-1 bg-green-100 rounded-full">
                    <Text className="text-[10px] font-semibold text-green-700">CAR VERIFIED</Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-base text-muted-foreground">
                {car.make} {car.model} - {car.year}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color="#f59e0b" />
              <Text className="text-base font-semibold text-foreground ml-1">5.0</Text>
              <Text className="text-sm text-muted-foreground ml-1">(New)</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-6">
            <Ionicons name="location-outline" size={18} color="#6b7280" />
            <Text className="text-base text-muted-foreground ml-1">
              {car.location.city}, {car.location.country}
            </Text>
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">Features</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {(displayFeatures.length ? displayFeatures : ["Automatic", "Air Conditioning", "Bluetooth"]).map(
              (feature) => (
                <View key={feature} className="bg-secondary px-3 py-2 rounded-full">
                  <Text className="text-sm text-foreground">{feature}</Text>
                </View>
              ),
            )}
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">Pickup</Text>
          <View className="bg-card p-4 rounded-xl border border-border mb-6">
            {car.formattedAddress ? (
              <>
                <Text className="text-sm text-muted-foreground mb-1">Address</Text>
                <Text className="text-base font-medium text-foreground">{car.formattedAddress}</Text>
              </>
            ) : null}
            <Text className="text-sm text-muted-foreground mb-1">City</Text>
            <Text className="text-base font-medium text-foreground">{car.location.city}</Text>
            <Text className="text-sm text-muted-foreground mt-3 mb-1">Country</Text>
            <Text className="text-base font-medium text-foreground">{car.location.country}</Text>
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">Host</Text>
          <View className="bg-card p-4 rounded-xl border border-border mb-6">
            <View className="flex-row items-center">
              {hostUser?.imageUrl ? (
                <Image
                  source={{ uri: hostUser.imageUrl }}
                  className="w-12 h-12 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-secondary items-center justify-center">
                  <Text className="text-base font-semibold text-foreground">{hostInitial}</Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-semibold text-foreground">
                    Hosted by {hostUser?.name ?? "Host"}
                  </Text>
                  {host?.isVerified ? (
                    <View className="ml-2 px-2 py-1 bg-green-100 rounded-full">
                      <Text className="text-[10px] font-semibold text-green-700">VERIFIED</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs text-muted-foreground mt-1">
                  {hostMemberSince ? `Member since ${hostMemberSince}` : "Host account"}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-muted-foreground mt-3">
              {host?.bio || "Friendly host ready to help you enjoy a smooth trip."}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 py-4 border-t border-border bg-card">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-bold text-foreground">${car.pricePerDay}</Text>
              <Text className="text-base text-muted-foreground ml-1">/day</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              ${grandTotal} total ({selectedDays} days + fees)
            </Text>
          </View>

          <View className="flex-row items-center bg-secondary rounded-xl">
            <Pressable
              onPress={() => setSelectedDays(Math.max(1, selectedDays - 1))}
              className="px-4 py-3"
            >
              <Ionicons name="remove" size={20} color="#9ca3af" />
            </Pressable>
            <Text className="text-base font-semibold text-foreground px-2">{selectedDays} days</Text>
            <Pressable onPress={() => setSelectedDays(selectedDays + 1)} className="px-4 py-3">
              <Ionicons name="add" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handleBook}
          disabled={isCreatingCheckout}
          className={`py-4 rounded-xl items-center ${isCreatingCheckout ? "bg-primary/60" : "bg-primary"}`}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {isCreatingCheckout ? "Redirecting..." : "Book Now"}
          </Text>
        </Pressable>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}
