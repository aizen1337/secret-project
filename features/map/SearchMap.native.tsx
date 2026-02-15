import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";

export type CarLocation = {
  id: string;
  latitude: number;
  longitude: number;
  pricePerDay: number;
};

type SearchMapProps = {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  cars: CarLocation[];
  onPress?: () => void;
  containerClassName?: string;
  interactive?: boolean;
  selectedCarId?: string | null;
  onMarkerPress?: (carId: string) => void;
};

export function SearchMap({
  region,
  cars,
  onPress,
  containerClassName,
  interactive = false,
  selectedCarId,
  onMarkerPress,
}: SearchMapProps) {
  const containerClasses = `${
    containerClassName ?? "h-40 w-full rounded-xl overflow-hidden"
  } relative`;

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
            </Marker>
          ))}
        </MapView>
      </View>
    </Pressable>
  );
}
