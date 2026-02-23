import { Platform } from "react-native";
import type { ReactElement } from "react";

export type CarLocation = {
  id: string;
  latitude: number;
  longitude: number;
  pricePerDay: number;
  title: string;
  make: string;
  model: string;
  locationCity: string;
  locationCountry: string;
  imageUrl: string | null;
};

export type SearchMapProps = {
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
  fitToCars?: boolean;
  selectedCarId?: string | null;
  onMarkerPress?: (carId: string) => void;
  onOfferPress?: (carId: string) => void;
};

type SearchMapComponent = (props: SearchMapProps) => ReactElement;

// Avoid static imports so native builds don't load web-only map dependencies.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SearchMapImpl: SearchMapComponent = (Platform.OS === "web"
  ? require("./SearchMap.web").SearchMap
  : require("./SearchMap.native").SearchMap) as SearchMapComponent;

export const SearchMap = SearchMapImpl;
