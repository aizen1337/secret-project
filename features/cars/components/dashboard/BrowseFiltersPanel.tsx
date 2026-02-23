import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { DateRangePicker } from "@/components/filters/DateRangePicker";
import { Text } from "@/components/ui/text";
import type { LocationSuggestion } from "@/features/cars/components/dashboard/searchUtils";
import type { BrowseAdvancedFilters } from "@/features/cars/components/dashboard/types";

import { ExploreFiltersDialog } from "./ExploreFiltersDialog";
import { LocationSearchBar } from "./LocationSearchBar";

type BrowseFiltersPanelProps = {
  isMobile: boolean;
  locationQuery: string;
  onChangeLocation: (value: string) => void;
  onSearchLocation: () => void;
  locationSuggestions: LocationSuggestion[];
  showLocationSuggestions: boolean;
  onSelectLocationSuggestion: (suggestion: LocationSuggestion) => void;
  isSearchingLocationSuggestions: boolean;
  isSearchingLocation: boolean;
  startDate: string;
  endDate: string;
  onApplyDates: (startDate: string, endDate: string) => void;
  draftFilters: BrowseAdvancedFilters;
  onChangeDraftFilters: (next: BrowseAdvancedFilters) => void;
  onApplyDraftFilters: () => void;
  onResetDraftFilters: () => void;
  isFiltersDialogOpen: boolean;
  onOpenFiltersDialog: () => void;
  onCloseFiltersDialog: () => void;
  activeFiltersCount: number;
  placeholderColor: string;
  iconColor: string;
  buttonForeground: string;
  searchError: string | null;
  isLoading: boolean;
};

export function BrowseFiltersPanel({
  isMobile,
  locationQuery,
  onChangeLocation,
  onSearchLocation,
  locationSuggestions,
  showLocationSuggestions,
  onSelectLocationSuggestion,
  isSearchingLocationSuggestions,
  isSearchingLocation,
  startDate,
  endDate,
  onApplyDates,
  draftFilters,
  onChangeDraftFilters,
  onApplyDraftFilters,
  onResetDraftFilters,
  isFiltersDialogOpen,
  onOpenFiltersDialog,
  onCloseFiltersDialog,
  activeFiltersCount,
  placeholderColor,
  iconColor,
  buttonForeground,
  searchError,
  isLoading,
}: BrowseFiltersPanelProps) {
  const { t } = useTranslation();
  const rowClassName = "flex-row flex-nowrap items-stretch gap-2";
  const filterButtonClassName = isMobile
    ? `h-12 w-12 self-center items-center justify-center rounded-lg border ${
        activeFiltersCount > 0 ? "border-primary bg-primary/15" : "border-border bg-card"
      }`
    : `h-16 w-14 shrink-0 items-center justify-center rounded-xl border ${
        activeFiltersCount > 0 ? "border-primary bg-primary/15" : "border-border bg-card"
      }`;

  return (
    <View className="gap-3">
      {isMobile ? (
        <>
          <LocationSearchBar
            locationQuery={locationQuery}
            onChangeLocation={onChangeLocation}
            onSearchLocation={onSearchLocation}
            locationSuggestions={locationSuggestions}
            showLocationSuggestions={showLocationSuggestions}
            onSelectLocationSuggestion={onSelectLocationSuggestion}
            isSearchingLocationSuggestions={isSearchingLocationSuggestions}
            isSearchingLocation={isSearchingLocation}
            iconColor={iconColor}
            placeholderColor={placeholderColor}
            buttonForeground={buttonForeground}
          />
          <View className={rowClassName}>
            <View className="min-w-0 flex-1">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onApply={onApplyDates}
              />
            </View>
            <Pressable onPress={onOpenFiltersDialog} className={filterButtonClassName}>
              <Ionicons name="options-outline" size={18} color={iconColor} />
              {activeFiltersCount > 0 ? (
                <View className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 py-0.5">
                  <Text className="text-center text-[10px] font-semibold text-primary-foreground">{activeFiltersCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </>
      ) : (
        <View className={rowClassName}>
          <View className="min-w-0 flex-[1.7]">
            <LocationSearchBar
              locationQuery={locationQuery}
              onChangeLocation={onChangeLocation}
              onSearchLocation={onSearchLocation}
              locationSuggestions={locationSuggestions}
              showLocationSuggestions={showLocationSuggestions}
              onSelectLocationSuggestion={onSelectLocationSuggestion}
              isSearchingLocationSuggestions={isSearchingLocationSuggestions}
              isSearchingLocation={isSearchingLocation}
              iconColor={iconColor}
              placeholderColor={placeholderColor}
              buttonForeground={buttonForeground}
            />
          </View>
          <View className="min-w-0 flex-[1.5]">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onApply={onApplyDates}
            />
          </View>
          <Pressable onPress={onOpenFiltersDialog} className={filterButtonClassName}>
            <Ionicons name="options-outline" size={20} color={iconColor} />
            {activeFiltersCount > 0 ? (
              <View className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 py-0.5">
                <Text className="text-center text-[10px] font-semibold text-primary-foreground">{activeFiltersCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      )}

      {searchError ? (
        <Text className="text-xs text-destructive">{searchError}</Text>
      ) : null}
      {isLoading ? (
        <Text className="text-sm text-muted-foreground">{t("explore.loadingCars")}</Text>
      ) : null}

      <ExploreFiltersDialog
        visible={isFiltersDialogOpen}
        value={draftFilters}
        onChange={onChangeDraftFilters}
        onReset={onResetDraftFilters}
        onApply={onApplyDraftFilters}
        onClose={onCloseFiltersDialog}
      />
    </View>
  );
}
