import type { RefObject } from "react";
import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/ui/text";
import { CarCard } from "@/features/cars/components/ui/CarCard";

import type { CarItem } from "./types";

type CarResultsListProps = {
  listRef: RefObject<FlatList<CarItem> | null>;
  cars: CarItem[];
  selectedCarId: string | null;
  onPressCar: (carId: string) => void;
  startDate?: string;
  endDate?: string;
  paddingBottom: number;
};

export function CarResultsList({
  listRef,
  cars,
  selectedCarId,
  onPressCar,
  startDate,
  endDate,
  paddingBottom,
}: CarResultsListProps) {
  const { t } = useTranslation();
  return (
    <FlatList
      ref={listRef}
      data={cars}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CarCard
          car={item}
          startDate={startDate}
          endDate={endDate}
          onPress={() => onPressCar(item.id)}
          highlighted={item.id === selectedCarId}
        />
      )}
      ListEmptyComponent={
        <View className="py-6">
          <Text className="text-center text-sm text-muted-foreground">
            {t("explore.noCarsFiltered")}
          </Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom }}
    />
  );
}
