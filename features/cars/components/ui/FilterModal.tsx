import { View, Text, Modal, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { carTypes, locations } from "../lib/data";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: {
    type: string;
    location: string;
    minPrice: number;
    maxPrice: number;
  };
  onFiltersChange: (filters: {
    type: string;
    location: string;
    minPrice: number;
    maxPrice: number;
  }) => void;
}

export function FilterModal({
  visible,
  onClose,
  filters,
  onFiltersChange,
}: FilterModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <Text className="text-xl font-semibold text-foreground">Filters</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color="#171717" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          <Text className="text-base font-semibold text-foreground mb-3">
            Car Type
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {carTypes.map((type) => (
              <Pressable
                key={type.value}
                onPress={() =>
                  onFiltersChange({ ...filters, type: type.value })
                }
                className={`px-4 py-2 rounded-full border ${
                  filters.type === type.value
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.type === type.value
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-base font-semibold text-foreground mb-3">
            Location
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            <Pressable
              onPress={() => onFiltersChange({ ...filters, location: "all" })}
              className={`px-4 py-2 rounded-full border ${
                filters.location === "all"
                  ? "bg-primary border-primary"
                  : "bg-background border-border"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filters.location === "all"
                    ? "text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                All Locations
              </Text>
            </Pressable>
            {locations.map((location) => (
              <Pressable
                key={location}
                onPress={() => onFiltersChange({ ...filters, location })}
                className={`px-4 py-2 rounded-full border ${
                  filters.location === location
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.location === location
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {location}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-base font-semibold text-foreground mb-3">
            Price Range
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: "Any", min: 0, max: 1000 },
              { label: "Under $75", min: 0, max: 75 },
              { label: "$75 - $150", min: 75, max: 150 },
              { label: "$150 - $250", min: 150, max: 250 },
              { label: "$250+", min: 250, max: 1000 },
            ].map((range) => (
              <Pressable
                key={range.label}
                onPress={() =>
                  onFiltersChange({
                    ...filters,
                    minPrice: range.min,
                    maxPrice: range.max,
                  })
                }
                className={`px-4 py-2 rounded-full border ${
                  filters.minPrice === range.min &&
                  filters.maxPrice === range.max
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.minPrice === range.min &&
                    filters.maxPrice === range.max
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {range.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View className="p-4 border-t border-border">
          <Pressable
            onPress={onClose}
            className="bg-primary py-4 rounded-xl items-center"
          >
            <Text className="text-primary-foreground font-semibold text-base">
              Apply Filters
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
