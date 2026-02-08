'use client';

import { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCarById, getReviewsByCarId } from "../../lib/data";
import { useAuth } from "@clerk/clerk-expo";

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const car = getCarById(id);
  const reviews = getReviewsByCarId(id);

  const [selectedDays, setSelectedDays] = useState(3);

  if (!car) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-lg text-muted-foreground">Car not found</Text>
      </SafeAreaView>
    );
  }

  const totalPrice = car.pricePerDay * selectedDays;
  const serviceFee = Math.round(totalPrice * 0.1);
  const grandTotal = totalPrice + serviceFee;

  const handleBook = () => {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    Alert.alert(
      "Booking Confirmed!",
      `Your ${car.make} ${car.model} has been booked for ${selectedDays} days. Total: $${grandTotal}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Car Image */}
        <Image
          source={{ uri: car.image }}
          className="w-full h-64"
          resizeMode="cover"
        />

        <View className="px-4 py-6">
          {/* Car Info */}
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">
                {car.make} {car.model}
              </Text>
              <Text className="text-base text-muted-foreground">{car.year}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color="#171717" />
              <Text className="text-base font-semibold text-foreground ml-1">
                {car.rating}
              </Text>
              <Text className="text-sm text-muted-foreground ml-1">
                ({car.trips} trips)
              </Text>
            </View>
          </View>

          {/* Location */}
          <View className="flex-row items-center mb-6">
            <Ionicons name="location-outline" size={18} color="#737373" />
            <Text className="text-base text-muted-foreground ml-1">
              {car.location}
            </Text>
          </View>

          {/* Features */}
          <Text className="text-lg font-semibold text-foreground mb-3">
            Features
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {car.features.map((feature) => (
              <View
                key={feature}
                className="bg-secondary px-3 py-2 rounded-full"
              >
                <Text className="text-sm text-foreground">{feature}</Text>
              </View>
            ))}
          </View>

          {/* Owner */}
          <Text className="text-lg font-semibold text-foreground mb-3">
            Hosted by
          </Text>
          <View className="flex-row items-center bg-card p-4 rounded-xl border border-border mb-6">
            <Image
              source={{ uri: car.owner.avatar }}
              className="w-14 h-14 rounded-full"
            />
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-foreground">
                {car.owner.name}
              </Text>
              <Text className="text-sm text-muted-foreground">
                Member since {car.owner.memberSince}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {car.owner.responseRate}% response rate
              </Text>
            </View>
          </View>

          {/* Reviews */}
          <Text className="text-lg font-semibold text-foreground mb-3">
            Reviews ({reviews.length})
          </Text>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View
                key={review.id}
                className="bg-card p-4 rounded-xl border border-border mb-3"
              >
                <View className="flex-row items-center mb-2">
                  <Image
                    source={{ uri: review.userAvatar }}
                    className="w-10 h-10 rounded-full"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="font-medium text-foreground">
                      {review.userName}
                    </Text>
                    <View className="flex-row items-center">
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? "star" : "star-outline"}
                          size={12}
                          color="#171717"
                        />
                      ))}
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {review.date}
                  </Text>
                </View>
                <Text className="text-sm text-foreground">{review.comment}</Text>
              </View>
            ))
          ) : (
            <View className="bg-card p-4 rounded-xl border border-border mb-3">
              <Text className="text-sm text-muted-foreground text-center">
                No reviews yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking Footer */}
      <View className="px-4 py-4 border-t border-border bg-card">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-bold text-foreground">
                ${car.pricePerDay}
              </Text>
              <Text className="text-base text-muted-foreground ml-1">/day</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              ${grandTotal} total for {selectedDays} days
            </Text>
          </View>
          <View className="flex-row items-center bg-secondary rounded-xl">
            <Pressable
              onPress={() => setSelectedDays(Math.max(1, selectedDays - 1))}
              className="px-4 py-3"
            >
              <Ionicons name="remove" size={20} color="#171717" />
            </Pressable>
            <Text className="text-base font-semibold text-foreground px-2">
              {selectedDays} days
            </Text>
            <Pressable
              onPress={() => setSelectedDays(selectedDays + 1)}
              className="px-4 py-3"
            >
              <Ionicons name="add" size={20} color="#171717" />
            </Pressable>
          </View>
        </View>
        <Pressable
          onPress={handleBook}
          className="bg-primary py-4 rounded-xl items-center"
        >
          <Text className="text-primary-foreground font-semibold text-base">
            Book Now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
