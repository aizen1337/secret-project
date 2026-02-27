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
  startHour?: string;
  endHour?: string;
  paddingBottom: number;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
};

export function CarResultsList({
  listRef,
  cars,
  selectedCarId,
  onPressCar,
  startDate,
  endDate,
  startHour,
  endHour,
  paddingBottom,
  onEndReached,
  isLoadingMore = false,
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
          startHour={startHour}
          endHour={endHour}
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
      ListFooterComponent={
        isLoadingMore ? (
          <View className="py-4">
            <Text className="text-center text-xs text-muted-foreground">{t("common.loading")}</Text>
          </View>
        ) : null
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.55}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom }}
    />
  );
}
