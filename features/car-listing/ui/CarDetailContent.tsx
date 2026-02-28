import { FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/features/app-shell/ui/BottomNav";
import type { CarDetailScreenController } from "@/features/car-listing/hooks/useCarDetailScreenState";
import { DateRangePicker } from "@/features/shared-date-range/ui/DateRangePicker";
import { getTokenColor } from "@/lib/themeTokens";

type CarDetailContentProps = {
  state: CarDetailScreenController;
  mode: "light" | "dark";
};

export function CarDetailContent({ state, mode }: CarDetailContentProps) {
  const { t } = useTranslation();
  const car = state.car!;
  const selectedCollectionMethod = state.selectedCollectionMethod;
  const collectionInstructions =
    selectedCollectionMethod === "in_person"
      ? car.collectionInPersonInstructions
      : selectedCollectionMethod === "lockbox"
        ? car.collectionLockboxInstructions
        : car.collectionDeliveryInstructions;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="relative mt-4">
          {state.isWeb ? (
            <View className="px-4 pt-8">
              <View className="max-w-[1100px] w-full self-center rounded-2xl overflow-hidden">
                <View style={{ flexDirection: "row", height: 450, gap: 8 }}>
                  <Pressable
                    style={{ flex: 2, backgroundColor: getTokenColor(mode, "surfaceSubtle") }}
                    onPress={() => state.setActiveImageIndex(state.activeImageIndex)}
                  >
                    <Image source={{ uri: state.galleryImages[state.activeImageIndex] }} className="w-full h-full" resizeMode="cover" />
                  </Pressable>
                  {state.galleryImages.length > 1 ? (
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                        {state.sideImages.slice(0, 2).map((item) => (
                          <Pressable
                            key={`${item.image}-${item.index}`}
                            style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }}
                            onPress={() => state.setActiveImageIndex(item.index)}
                          >
                            <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                          </Pressable>
                        ))}
                        {state.sideImages.length < 2 ? <View style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }} /> : null}
                      </View>
                      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                        {state.sideImages.slice(2, 4).map((item, idx) => {
                          const isLastTile = idx === 1 || (state.sideImages.length === 3 && idx === 0);
                          const showMorePhotos = isLastTile && state.extraPhotosCount > 0;
                          return (
                            <Pressable
                              key={`${item.image}-${item.index}`}
                              style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }}
                              onPress={() => state.setActiveImageIndex(item.index)}
                            >
                              <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                              {showMorePhotos ? (
                                <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: getTokenColor(mode, "overlay") }}>
                                  <Text className="text-primary-foreground font-semibold text-sm">
                                    {t("carDetail.photosMore", { count: state.extraPhotosCount })}
                                  </Text>
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                        {state.sideImages.length < 4 ? <View style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }} /> : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <FlatList
              ref={state.galleryRef}
              data={state.galleryImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(image, index) => `${image}-${index}`}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / state.width);
                state.setActiveImageIndex(nextIndex);
              }}
              renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: state.width, height: 340 }} resizeMode="cover" />}
            />
          )}
          <Pressable
            onPress={() => state.router.back()}
            className="absolute top-4 left-4 w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: getTokenColor(mode, "overlay") }}
          >
            <Ionicons name="chevron-back" size={20} color={getTokenColor(mode, "primaryForeground")} />
          </Pressable>
          {!state.isWeb && state.galleryImages.length > 1 ? (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {state.galleryImages.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  className={`h-2 rounded-full ${index === state.activeImageIndex ? "w-5" : "w-2"}`}
                  style={{
                    backgroundColor:
                      index === state.activeImageIndex
                        ? getTokenColor(mode, "primaryForeground")
                        : getTokenColor(mode, "iconMuted"),
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>

        {!state.isWeb && state.galleryImages.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 pt-3"
            contentContainerStyle={{ gap: 10 }}
          >
            {state.galleryImages.map((image, index) => (
              <Pressable
                key={`${image}-${index}`}
                onPress={() => {
                  state.setActiveImageIndex(index);
                  state.galleryRef.current?.scrollToIndex({ index, animated: true });
                }}
                className={`rounded-lg overflow-hidden border ${state.activeImageIndex === index ? "border-primary" : "border-border"}`}
              >
                <Image source={{ uri: image }} className="w-24 h-24" resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View className="px-4 py-6">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-2xl font-bold text-foreground">{car.title || `${car.make} ${car.model}`}</Text>
                {car.isCarVerified ? (
                  <View className="ml-2 mt-1 px-2 py-1 bg-verified-bg rounded-full">
                    <Text className="text-[10px] font-semibold text-verified-fg">{t("carDetail.verifiedCar")}</Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-base text-muted-foreground">
                {car.make} {car.model} - {car.year}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color={getTokenColor(mode, "ratingStar")} />
              <Text className="text-base font-semibold text-foreground ml-1">5.0</Text>
              <Text className="text-sm text-muted-foreground ml-1">{t("carDetail.ratingNew")}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-6">
            <Ionicons name="location-outline" size={18} color={getTokenColor(mode, "iconMuted")} />
            <Text className="text-base text-muted-foreground ml-1">
              {car.location.city}, {car.location.country}
            </Text>
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">{t("carDetail.features")}</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {state.displayFeatures.map((feature) => (
              <View key={feature} className="bg-secondary px-3 py-2 rounded-full">
                <Text className="text-sm text-foreground">{feature}</Text>
              </View>
            ))}
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">{t("carDetail.pickup")}</Text>
          <View className="bg-card p-4 rounded-xl border border-border mb-6">
            {car.formattedAddress ? (
              <>
                <Text className="text-sm text-muted-foreground mb-1">{t("carDetail.address")}</Text>
                <Text className="text-base font-medium text-foreground">{car.formattedAddress}</Text>
              </>
            ) : null}
            <Text className="text-sm text-muted-foreground mb-1">{t("carDetail.city")}</Text>
            <Text className="text-base font-medium text-foreground">{car.location.city}</Text>
            <Text className="text-sm text-muted-foreground mt-3 mb-1">{t("carDetail.country")}</Text>
            <Text className="text-base font-medium text-foreground">{car.location.country}</Text>

            <Text className="text-sm text-muted-foreground mt-4 mb-2">{t("carDetail.collectionMethod")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {state.availableCollectionMethods.map((method) => {
                const selected = selectedCollectionMethod === method;
                return (
                  <Pressable
                    key={method}
                    onPress={() => state.setSelectedCollectionMethod(method)}
                    className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-secondary border-border"}`}
                  >
                    <Text className={`text-xs font-medium ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                      {t(`carDetail.collectionMethods.${method}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {collectionInstructions ? (
              <Text className="text-sm text-muted-foreground mt-3">{collectionInstructions}</Text>
            ) : null}
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">{t("carDetail.host")}</Text>
          <View className="bg-card p-4 rounded-xl border border-border mb-6">
            <View className="flex-row items-center">
              {state.hostUser?.imageUrl ? (
                <Image source={{ uri: state.hostUser.imageUrl }} className="w-12 h-12 rounded-full" resizeMode="cover" />
              ) : (
                <View className="w-12 h-12 rounded-full bg-secondary items-center justify-center">
                  <Text className="text-base font-semibold text-foreground">{state.hostInitial}</Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  {state.hostUserId ? (
                    <Pressable onPress={state.handleOpenHostProfile}>
                      <Text className="text-base font-semibold text-foreground">
                        {t("carDetail.hostedBy", { name: state.hostUser?.name ?? t("carDetail.host") })}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text className="text-base font-semibold text-foreground">
                      {t("carDetail.hostedBy", { name: state.hostUser?.name ?? t("carDetail.host") })}
                    </Text>
                  )}
                  {state.host?.isVerified ? (
                    <View className="ml-2 px-2 py-1 bg-verified-bg rounded-full">
                      <Text className="text-[10px] font-semibold text-verified-fg">{t("carDetail.verifiedHost")}</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-xs text-muted-foreground mt-1">
                  {state.hostMemberSince ? t("carDetail.memberSince", { date: state.hostMemberSince }) : t("carDetail.hostAccount")}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-muted-foreground mt-3">{state.host?.bio || t("carDetail.hostBioFallback")}</Text>
            {state.hostUserId ? (
              <Pressable onPress={state.handleOpenHostProfile} className="mt-3 self-start">
                <Text className="text-xs font-semibold text-primary">{t("userProfile.viewProfile")}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">{t("carDetail.rules.title")}</Text>
          <View className="bg-card p-4 rounded-xl border border-border mb-6 gap-2">
            {typeof car.kilometersLimitPerDay === "number" ? (
              <Text className="text-sm text-muted-foreground">
                {t("carDetail.rules.kmLimit", { value: car.kilometersLimitPerDay })}
              </Text>
            ) : null}
            {typeof car.depositAmount === "number" ? (
              <Text className="text-sm text-muted-foreground">
                {t("carDetail.rules.deposit", { value: car.depositAmount })}
              </Text>
            ) : null}
            {car.fuelPolicy ? (
              <Text className="text-sm text-muted-foreground">
                {t("carDetail.rules.fuelPolicy", { value: t(`carDetail.rules.fuelPolicies.${car.fuelPolicy}`) })}
              </Text>
            ) : null}
            {car.fuelPolicyNote ? (
              <Text className="text-sm text-muted-foreground">
                {t("carDetail.rules.fuelNote", { value: car.fuelPolicyNote })}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View className="px-4 py-4 border-t border-border bg-card">
        <View className="mb-3">
          <DateRangePicker
            startDate={state.selectedStartDate}
            endDate={state.selectedEndDate}
            startHour={state.selectedStartHour}
            endHour={state.selectedEndHour}
            onApply={(nextStart, nextEnd) => {
              state.setSelectedStartDate(nextStart);
              state.setSelectedEndDate(nextEnd);
            }}
            onApplyHours={(nextStartHour, nextEndHour) => {
              state.setSelectedStartHour(nextStartHour);
              state.setSelectedEndHour(nextEndHour);
            }}
          />
        </View>
        <View className="flex-row justify-between items-start mb-4">
          <View>
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-bold text-foreground">${car.pricePerDay}</Text>
              <Text className="text-base text-muted-foreground ml-1">{t("carDetail.perDay")}</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              {t("carDetail.totalWithFees", { total: state.grandTotal, days: state.selectedDays })}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {t("carDetail.paymentDueBy", { date: state.paymentDueLabel })}
            </Text>
            {state.depositAmount > 0 ? (
              <Text className="text-xs text-muted-foreground mt-1">
                {t("carDetail.depositIncluded", { value: state.depositAmount })}
              </Text>
            ) : null}
          </View>

          <View className="items-end">
            <Text className="text-sm font-semibold text-foreground">{t("carDetail.days", { count: state.selectedDays })}</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {t("carDetail.selectedDates", {
                start: `${state.selectedStartDate} ${state.selectedStartHour}:00`,
                end: `${state.selectedEndDate} ${state.selectedEndHour}:00`,
              })}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            void state.handleBook();
          }}
          disabled={state.isBookDisabled}
          className={`py-4 rounded-xl items-center ${state.isBookDisabled ? "bg-primary/60" : "bg-primary"}`}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {state.isOwnListing
              ? t("carDetail.ownListing")
              : state.isCreatingCheckout
                ? t("carDetail.redirecting")
                : t("carDetail.reserveNow")}
          </Text>
        </Pressable>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}
