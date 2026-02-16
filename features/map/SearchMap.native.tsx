import { useEffect, useRef } from "react";
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View, Pressable, Image } from "react-native";
import { Text } from "@/components/ui/text";
import type { SearchMapProps } from "./SearchMap";

export function SearchMap({
  region,
  cars,
  onPress,
  containerClassName,
  interactive = false,
  selectedCarId,
  onMarkerPress,
  onOfferPress,
}: SearchMapProps) {
  const containerClasses = `${
    containerClassName ?? "h-40 w-full rounded-xl overflow-hidden"
  } relative`;
  const markerRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([carId, marker]) => {
      if (!marker) return;
      if (selectedCarId && carId === selectedCarId) {
        marker.showCallout();
      } else {
        marker.hideCallout();
      }
    });
  }, [selectedCarId]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={containerClasses}
    >
      <View className="flex-1">
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={region}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          rotateEnabled={interactive}
          pitchEnabled={interactive}
        >
          {cars.map((car) => (
            <Marker
              key={car.id}
              ref={(value) => {
                markerRefs.current[car.id] = value;
              }}
              coordinate={{
                latitude: car.latitude,
                longitude: car.longitude,
              }}
              onPress={() => onMarkerPress?.(car.id)}
            >
              <View
                className={`px-2 py-1 rounded-full shadow ${
                  selectedCarId === car.id ? "bg-black" : "bg-white"
                }`}
              >
                <View>
                  <Text
                    className={`text-xs font-semibold ${
                      selectedCarId === car.id ? "text-white" : "text-foreground"
                    }`}
                  >
                    ${car.pricePerDay}
                  </Text>
                </View>
              </View>
              <Callout tooltip onPress={() => onOfferPress?.(car.id)}>
                <View className="w-56 rounded-2xl overflow-hidden border border-border bg-card shadow-md">
                  {car.imageUrl ? (
                    <Image
                      source={{ uri: car.imageUrl }}
                      className="h-28 w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-28 w-full bg-secondary" />
                  )}
                  <View className="p-3">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      {car.title}
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
                      {car.locationCity}, {car.locationCountry}
                    </Text>
                    <Text className="mt-2 text-sm font-bold text-foreground">
                      ${car.pricePerDay} / day
                    </Text>
                    <View className="mt-3 rounded-lg bg-primary px-3 py-2 items-center">
                      <Text className="text-xs font-semibold text-primary-foreground">
                        View offer
                      </Text>
                    </View>
                  </View>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>
    </Pressable>
  );
}
