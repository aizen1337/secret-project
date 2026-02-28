import type { RefObject } from "react";
import { FlatList, Pressable, View } from "react-native";
import type { Router } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { BrowseFiltersPanel } from "@/features/cars/components/dashboard/BrowseFiltersPanel";
import { BrowseHeader } from "@/features/cars/components/dashboard/BrowseHeader";
import { CarResultsList } from "@/features/cars/components/dashboard/CarResultsList";
import type { CarItem } from "@/features/cars/components/dashboard/types";
import type { SearchScreenController } from "@/features/search/hooks/useSearchScreenState";
import { SearchMap } from "@/features/map/SearchMap";
import { getTokenColor, type ThemeMode } from "@/lib/themeTokens";

type SearchScreenContentProps = {
  state: SearchScreenController;
  listRef: RefObject<FlatList<CarItem> | null>;
  router: Router;
  mode: ThemeMode;
  isMobile: boolean;
  strongIconColor: string;
};

export function SearchScreenContent({
  state,
  listRef,
  router,
  mode,
  isMobile,
  strongIconColor,
}: SearchScreenContentProps) {
  const { t } = useTranslation();
  const handleMarkerPress = (carId: string) => {
    state.setSelectedCarId(carId);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };
  const handleOfferPress = (carId: string) => {
    router.push({
      pathname: `/car/${carId}`,
      params: {
        startDate: state.startDate,
        endDate: state.endDate,
        startHour: state.startHour,
        endHour: state.endHour,
      },
    } as any);
  };
  const handleCarCardPress = (carId: string) => {
    state.setSelectedCarId(carId);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const header = (
    <View className="pb-4 pt-2">
      <BrowseHeader iconColor={strongIconColor} />
      <BrowseFiltersPanel
        isMobile={isMobile}
        locationQuery={state.locationQuery}
        onChangeLocation={state.onChangeLocation}
        onSearchLocation={state.searchLocation}
        locationSuggestions={state.locationSuggestions}
        showLocationSuggestions={state.showLocationSuggestions}
        onSelectLocationSuggestion={state.onSelectLocationSuggestion}
        isSearchingLocationSuggestions={state.isSearchingLocationSuggestions}
        isSearchingLocation={state.isSearchingLocation}
        startDate={state.startDate}
        endDate={state.endDate}
        startHour={state.startHour}
        endHour={state.endHour}
        onApplyDates={state.onApplyDates}
        onApplyHours={state.onApplyHours}
        draftFilters={state.draftAdvancedFilters}
        onChangeDraftFilters={state.setDraftAdvancedFilters}
        onApplyDraftFilters={state.applyDraftFilters}
        onResetDraftFilters={state.resetDraftFilters}
        isFiltersDialogOpen={state.isFiltersDialogOpen}
        onOpenFiltersDialog={state.openFiltersDialog}
        onCloseFiltersDialog={state.closeFiltersDialog}
        activeFiltersCount={state.activeFiltersCount}
        placeholderColor={getTokenColor(mode, "placeholder")}
        iconColor={strongIconColor}
        buttonForeground={getTokenColor(mode, "primaryForeground")}
        searchError={state.searchError}
        isLoading={state.isLoading}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {isMobile ? (
        <View className="flex-1 px-4">
          {header}
          <View className="mb-3 flex-row rounded-xl border border-border bg-card p-1">
            <Pressable
              onPress={state.setGridMobileView}
              className={`flex-1 items-center rounded-lg py-2 ${
                state.mobileView === "grid" ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  state.mobileView === "grid" ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {t("explore.grid")}
              </Text>
            </Pressable>
            <Pressable
              onPress={state.setMapMobileView}
              className={`flex-1 items-center rounded-lg py-2 ${
                state.mobileView === "map" ? "bg-primary" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  state.mobileView === "map" ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {t("explore.map")}
              </Text>
            </Pressable>
          </View>

          {state.mobileView === "map" ? (
            <View className="mb-3 h-[65%] min-h-[300px]">
              <SearchMap
                region={state.region}
                cars={state.mapCars}
                interactive={true}
                selectedCarId={state.selectedCarId}
                onMarkerPress={handleMarkerPress}
                onOfferPress={handleOfferPress}
                fitToCars={false}
                containerClassName="h-full w-full overflow-hidden rounded-xl"
              />
            </View>
          ) : (
            <CarResultsList
              listRef={listRef}
              cars={state.orderedCars}
              selectedCarId={state.selectedCarId}
              onPressCar={handleCarCardPress}
              startDate={state.startDate}
              endDate={state.endDate}
              startHour={state.startHour}
              endHour={state.endHour}
              paddingBottom={96}
              onEndReached={state.handleLoadMoreCars}
              isLoadingMore={state.isLoadingMore}
            />
          )}
        </View>
      ) : (
        <View className="flex-1 px-4 pb-4">
          {header}
          <View className="flex-1 flex-row gap-4">
            <View className="flex-1">
              <CarResultsList
                listRef={listRef}
                cars={state.orderedCars}
                selectedCarId={state.selectedCarId}
                onPressCar={handleCarCardPress}
                startDate={state.startDate}
                endDate={state.endDate}
                startHour={state.startHour}
                endHour={state.endHour}
                paddingBottom={24}
                onEndReached={state.handleLoadMoreCars}
                isLoadingMore={state.isLoadingMore}
              />
            </View>
            <View className="w-[44%] min-w-[360px]">
              <SearchMap
                region={state.region}
                cars={state.mapCars}
                interactive={true}
                selectedCarId={state.selectedCarId}
                onMarkerPress={handleMarkerPress}
                onOfferPress={handleOfferPress}
                fitToCars={false}
                containerClassName="h-full w-full overflow-hidden rounded-xl"
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
