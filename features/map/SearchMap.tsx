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
};

export function SearchMap({ region, cars, onPress }: SearchMapProps) {
  return (
    <Pressable onPress={onPress}>
      <View className="h-40 w-full rounded-xl overflow-hidden">
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {cars.map((car) => (
            <Marker
              key={car.id}
              coordinate={{
                latitude: car.latitude,
                longitude: car.longitude,
              }}
            >
              {/* Airbnb-style price pill */}
              <View className="px-2 py-1 rounded-full bg-white shadow">
                <View>
                  <Text className="text-xs font-semibold">
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
