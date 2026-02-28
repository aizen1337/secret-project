import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { DateRangePicker } from "@/features/shared-date-range/ui/DateRangePicker";
import { Text } from "@/components/ui/text";
import { BrowseHeader } from "@/features/cars/components/dashboard/BrowseHeader";
import { LocationSearchBar } from "@/features/cars/components/dashboard/LocationSearchBar";
import { OfferSection } from "@/features/cars/components/dashboard/OfferSection";
import { useExploreScreenState } from "@/features/explore/hooks/useExploreScreenState";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function ExploreEntryScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const {
    locationQuery,
    onChangeLocation,
    locationSuggestions,
    showLocationSuggestions,
    onSelectLocationSuggestion,
    isSearchingLocationSuggestions,
    startDate,
    endDate,
    startHour,
    endHour,
    onApplyDates,
    onApplyHours,
    isSearchingLocation,
    searchError,
    handleSearchSubmit,
    recentOffers,
    nearbyOffers,
    recentSectionLoading,
    nearbySectionLoading,
    nearbySubtitle,
    recentEmptyMessage,
    nearbyEmptyMessage,
    recentOffersError,
    nearbyOffersError,
  } = useExploreScreenState();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <BrowseHeader iconColor={getTokenColor(mode, "icon")} />

        <View className="gap-3">
          <LocationSearchBar
            locationQuery={locationQuery}
            onChangeLocation={onChangeLocation}
            onSearchLocation={handleSearchSubmit}
            locationSuggestions={locationSuggestions}
            showLocationSuggestions={showLocationSuggestions}
            onSelectLocationSuggestion={onSelectLocationSuggestion}
            isSearchingLocationSuggestions={isSearchingLocationSuggestions}
            isSearchingLocation={isSearchingLocation}
            iconColor={getTokenColor(mode, "icon")}
            placeholderColor={getTokenColor(mode, "placeholder")}
            buttonForeground={getTokenColor(mode, "primaryForeground")}
          />

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            startHour={startHour}
            endHour={endHour}
            showLabel={false}
            onApply={onApplyDates}
            onApplyHours={onApplyHours}
          />

          {searchError ? (
            <Text className="text-xs text-destructive">{searchError}</Text>
          ) : null}

          <Pressable
            onPress={handleSearchSubmit}
            disabled={isSearchingLocation}
            className={`items-center rounded-xl py-3 ${
              isSearchingLocation ? "bg-primary/70" : "bg-primary"
            }`}
          >
            <Text className="text-sm font-semibold text-primary-foreground">
              {isSearchingLocation ? t("common.loading") : t("explore.searchOffers")}
            </Text>
          </Pressable>

          <OfferSection
            title={t("explore.promotions.recentTitle")}
            subtitle={t("explore.promotions.recentSubtitle")}
            offers={recentOffers}
            startDate={startDate}
            endDate={endDate}
            startHour={startHour}
            endHour={endHour}
            isLoading={recentSectionLoading}
            error={recentOffersError}
            emptyMessage={recentEmptyMessage}
          />

          <OfferSection
            title={t("explore.promotions.nearbyCityTitle")}
            subtitle={nearbySubtitle}
            offers={nearbyOffers}
            startDate={startDate}
            endDate={endDate}
            startHour={startHour}
            endHour={endHour}
            isLoading={nearbySectionLoading}
            error={nearbyOffersError}
            emptyMessage={nearbyEmptyMessage}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
