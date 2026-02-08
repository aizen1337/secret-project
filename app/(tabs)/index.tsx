import { FlatList, Pressable, SafeAreaView, TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import { CarCard } from "@/features/cars/components/ui/CarCard";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

export default function BrowseCars() {
  const cars = useQuery(api.cars.listCurrentlyAvailableCars);
  const isLoading = cars === undefined;
  const carData =
    cars?.map((car) => ({
      id: car._id,
      make: car.make,
      model: car.model,
      year: car.year,
      pricePerDay: car.pricePerDay,
      images: car.images,
      location: car.location,
    })) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={carData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CarCard car={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96, paddingHorizontal: 16 }}
        ListHeaderComponent={
          <View className="pt-2 pb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xs uppercase text-muted-foreground">
                  Explore
                </Text>
                <Text className="text-2xl font-bold">Find your ride</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center">
                  <Ionicons name="options-outline" size={20} color="#171717" />
                </Pressable>
                <Link href="/profile" asChild>
                  <Pressable className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center">
                    <Ionicons name="person-outline" size={20} color="#171717" />
                  </Pressable>
                </Link>
              </View>
            </View>

            <TextInput
              className="bg-gray-100 px-4 py-3 rounded-xl text-sm"
              placeholder="Search cars by make or model..."
            />

            {isLoading ? (
              <Text className="text-sm text-muted-foreground mt-3">
                Loading cars...
              </Text>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}
