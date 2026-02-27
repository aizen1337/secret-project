import { useMemo, useRef, useState } from "react";
import { useColorScheme } from "nativewind";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLinking from "expo-linking";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useAction, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/feedback/useToast";
import { DateRangePicker } from "@/features/shared-date-range/ui/DateRangePicker";
import { BottomNav } from "@/features/app-shell/ui/BottomNav";
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  isDateInput,
  isHourInput,
  toDateInputValue,
  toEndOfHourIso,
  toStartOfHourIso,
} from "@/features/cars/components/dashboard/searchUtils";
import { toLocalizedErrorMessage } from "@/lib/errors";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function CarDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    id: string;
    startDate?: string;
    endDate?: string;
    startHour?: string;
    endHour?: string;
  }>();
  const {
    id,
    startDate: startDateParam,
    endDate: endDateParam,
    startHour: startHourParam,
    endHour: endHourParam,
  } = params;
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const mode = resolveThemeMode(useColorScheme());
  const { isSignedIn } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const carId = typeof id === "string" ? (id as Id<"cars">) : undefined;
  const offer = useQuery(api.cars.getCarOfferById, carId ? { carId } : "skip");
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
  const car = offer?.car;
  const host = offer?.hostPublic;
  const hostUser = offer?.hostUserPublic;

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() + 2);
    return value;
  }, [today]);
  const [selectedStartDate, setSelectedStartDate] = useState(
    isDateInput(startDateParam) ? startDateParam : toDateInputValue(today),
  );
  const [selectedEndDate, setSelectedEndDate] = useState(
    isDateInput(endDateParam) ? endDateParam : toDateInputValue(defaultEnd),
  );
  const [selectedStartHour, setSelectedStartHour] = useState(
    isHourInput(startHourParam) ? startHourParam : DEFAULT_START_HOUR,
  );
  const [selectedEndHour, setSelectedEndHour] = useState(
    isHourInput(endHourParam) ? endHourParam : DEFAULT_END_HOUR,
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const galleryRef = useRef<FlatList<string>>(null);
  const isWeb = Platform.OS === "web";

  if (!carId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-lg text-muted-foreground text-center">{t("carDetail.notFound")}</Text>
      </SafeAreaView>
    );
  }

  if (offer === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-base text-muted-foreground">{t("carDetail.loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!car) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-lg text-muted-foreground text-center">{t("carDetail.notFound")}</Text>
      </SafeAreaView>
    );
  }

  const startIso = toStartOfHourIso(selectedStartDate, selectedStartHour);
  const endIso = toEndOfHourIso(selectedEndDate, selectedEndHour);
  const startTs = new Date(startIso).getTime();
  const endTs = new Date(endIso).getTime();
  const dateRangeValid = Number.isFinite(startTs) && Number.isFinite(endTs) && startTs <= endTs;
  const selectedDays = dateRangeValid ? Math.max(1, Math.ceil((endTs - startTs + 1) / (24 * 60 * 60 * 1000))) : 1;
  const totalPrice = car.pricePerDay * selectedDays;
  const serviceFee = Math.round(totalPrice * 0.1);
  const depositAmount = Number(car.depositAmount ?? 0);
  const grandTotal = totalPrice + serviceFee + depositAmount;
  const paymentDueAt = new Date(startTs - 24 * 60 * 60 * 1000);
  const paymentDueLabel = dateRangeValid ? paymentDueAt.toLocaleString() : "-";
  const carImages = Array.isArray(car.images) ? (car.images as string[]) : [];
  const galleryImages: string[] = carImages.length > 0 ? carImages : [""];
  const sideImages = galleryImages
    .map((image, index) => ({ image, index }))
    .filter((item) => item.index !== activeImageIndex)
    .slice(0, 4);
  const extraPhotosCount = Math.max(0, galleryImages.length - (sideImages.length + 1));
  const displayFeatures =
    [...(car.features ?? []), ...(car.customFeatures ?? [])].filter(Boolean);
  const hostInitial = (hostUser?.name?.trim()?.charAt(0) || "H").toUpperCase();
  const hostMemberSince = host
    ? new Date(host.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;
  const isOwnListing = Boolean(
    currentUser?._id &&
      hostUser?.id &&
      String(currentUser._id) === String(hostUser.id),
  );
  const isBookDisabled = isCreatingCheckout || !dateRangeValid || isOwnListing;
  const hostUserId = hostUser?.id ? String(hostUser.id) : "";

  const handleOpenHostProfile = () => {
    if (!hostUserId) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    router.push({
      pathname: "/user/[userId]",
      params: { userId: hostUserId, role: "host" },
    } as any);
  };

  const handleBook = async () => {
    if (isOwnListing) {
      toast.error(t("carDetail.cannotBookOwnListing"));
      return;
    }
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (!dateRangeValid) {
      toast.error(t("carDetail.invalidDateRange"));
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const webOrigin = isWeb && typeof window !== "undefined" ? window.location.origin : null;
      const successUrl = webOrigin
        ? `${webOrigin}/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : ExpoLinking.createURL("/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}");
      const cancelUrl = webOrigin
        ? `${webOrigin}/car/${car.id}?checkout=cancelled`
        : ExpoLinking.createURL(`/car/${car.id}?checkout=cancelled`);

      const checkout = await createCheckoutSession({
        carId: car.id as Id<"cars">,
        successUrl,
        cancelUrl,
        startDate: startIso,
        endDate: endIso,
      });

      if (isWeb && typeof window !== "undefined") {
        window.location.href = checkout.url;
        return;
      }

      await ExpoLinking.openURL(checkout.url);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      if (
        raw.startsWith("UNVERIFIED_RENTER:") ||
        raw.startsWith("VERIFICATION_PENDING:") ||
        raw.startsWith("VERIFICATION_REJECTED:")
      ) {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
        router.push("/profile");
      } else {
        toast.error(toLocalizedErrorMessage(error, t, "carDetail.checkoutFailed"));
      }
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="relative mt-4">
          {isWeb ? (
            <View className="px-4 pt-8">
              <View className="max-w-[1100px] w-full self-center rounded-2xl overflow-hidden">
                <View style={{ flexDirection: "row", height: 450, gap: 8 }}>
                  <Pressable
                    style={{ flex: 2, backgroundColor: getTokenColor(mode, "surfaceSubtle") }}
                    onPress={() => setActiveImageIndex(activeImageIndex)}
                  >
                    <Image
                      source={{ uri: galleryImages[activeImageIndex] }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </Pressable>
                  {galleryImages.length > 1 ? (
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                        {sideImages.slice(0, 2).map((item) => (
                          <Pressable
                            key={`${item.image}-${item.index}`}
                            style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }}
                            onPress={() => setActiveImageIndex(item.index)}
                          >
                            <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                          </Pressable>
                        ))}
                        {sideImages.length < 2 ? (
                          <View style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }} />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                        {sideImages.slice(2, 4).map((item, idx) => {
                          const isLastTile = idx === 1 || (sideImages.length === 3 && idx === 0);
                          const showMorePhotos = isLastTile && extraPhotosCount > 0;
                          return (
                            <Pressable
                              key={`${item.image}-${item.index}`}
                              style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }}
                              onPress={() => setActiveImageIndex(item.index)}
                            >
                              <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                              {showMorePhotos ? (
                                <View
                                  className="absolute inset-0 items-center justify-center"
                                  style={{ backgroundColor: getTokenColor(mode, "overlay") }}
                                >
                                  <Text className="text-primary-foreground font-semibold text-sm">
                                    {t("carDetail.photosMore", { count: extraPhotosCount })}
                                  </Text>
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                        {sideImages.length < 4 ? (
                          <View style={{ flex: 1, backgroundColor: getTokenColor(mode, "surfaceSubtle") }} />
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <FlatList
              ref={galleryRef}
              data={galleryImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(image, index) => `${image}-${index}`}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(nextIndex);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={{ width, height: 340 }}
                  resizeMode="cover"
                />
              )}
            />
          )}
          <Pressable
            onPress={() => router.back()}
            className="absolute top-4 left-4 w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: getTokenColor(mode, "overlay") }}
          >
            <Ionicons name="chevron-back" size={20} color={getTokenColor(mode, "primaryForeground")} />
          </Pressable>
          {!isWeb && galleryImages.length > 1 ? (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {galleryImages.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  className={`h-2 rounded-full ${index === activeImageIndex ? "w-5" : "w-2"}`}
                  style={{
                    backgroundColor:
                      index === activeImageIndex
                        ? getTokenColor(mode, "primaryForeground")
                        : getTokenColor(mode, "iconMuted"),
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>

        {!isWeb && galleryImages.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 pt-3"
            contentContainerStyle={{ gap: 10 }}
          >
            {galleryImages.map((image, index) => (
              <Pressable
                key={`${image}-${index}`}
                onPress={() => {
                  setActiveImageIndex(index);
                  galleryRef.current?.scrollToIndex({ index, animated: true });
                }}
                className={`rounded-lg overflow-hidden border ${
                  activeImageIndex === index ? "border-primary" : "border-border"
                }`}
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
                <Text className="text-2xl font-bold text-foreground">
                  {car.title || `${car.make} ${car.model}`}
                </Text>
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
            {(displayFeatures.length ? displayFeatures : []).map(
              (feature) => (
                <View key={feature} className="bg-secondary px-3 py-2 rounded-full">
                  <Text className="text-sm text-foreground">{feature}</Text>
                </View>
              ),
            )}
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
          </View>

          <Text className="text-lg font-semibold text-foreground mb-3">{t("carDetail.host")}</Text>
            <View className="bg-card p-4 rounded-xl border border-border mb-6">
              <View className="flex-row items-center">
                {hostUser?.imageUrl ? (
                  <Image
                    source={{ uri: hostUser.imageUrl }}
                  className="w-12 h-12 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-secondary items-center justify-center">
                  <Text className="text-base font-semibold text-foreground">{hostInitial}</Text>
                </View>
                )}
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    {hostUserId ? (
                      <Pressable onPress={handleOpenHostProfile}>
                        <Text className="text-base font-semibold text-foreground">
                          {t("carDetail.hostedBy", { name: hostUser?.name ?? t("carDetail.host") })}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text className="text-base font-semibold text-foreground">
                        {t("carDetail.hostedBy", { name: hostUser?.name ?? t("carDetail.host") })}
                      </Text>
                    )}
                    {host?.isVerified ? (
                      <View className="ml-2 px-2 py-1 bg-verified-bg rounded-full">
                        <Text className="text-[10px] font-semibold text-verified-fg">{t("carDetail.verifiedHost")}</Text>
                      </View>
                    ) : null}
                </View>
                <Text className="text-xs text-muted-foreground mt-1">
                  {hostMemberSince ? t("carDetail.memberSince", { date: hostMemberSince }) : t("carDetail.hostAccount")}
                </Text>
              </View>
              </View>
              <Text className="text-sm text-muted-foreground mt-3">
                {host?.bio || t("carDetail.hostBioFallback")}
              </Text>
              {hostUserId ? (
                <Pressable onPress={handleOpenHostProfile} className="mt-3 self-start">
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
                {t("carDetail.rules.fuelPolicy", {
                  value: t(`carDetail.rules.fuelPolicies.${car.fuelPolicy}`),
                })}
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
            startDate={selectedStartDate}
            endDate={selectedEndDate}
            startHour={selectedStartHour}
            endHour={selectedEndHour}
            onApply={(nextStart, nextEnd) => {
              setSelectedStartDate(nextStart);
              setSelectedEndDate(nextEnd);
            }}
            onApplyHours={(nextStartHour, nextEndHour) => {
              setSelectedStartHour(nextStartHour);
              setSelectedEndHour(nextEndHour);
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
              {t("carDetail.totalWithFees", { total: grandTotal, days: selectedDays })}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {t("carDetail.paymentDueBy", { date: paymentDueLabel })}
            </Text>
            {depositAmount > 0 ? (
              <Text className="text-xs text-muted-foreground mt-1">
                {t("carDetail.depositIncluded", { value: depositAmount })}
              </Text>
            ) : null}
          </View>

          <View className="items-end">
            <Text className="text-sm font-semibold text-foreground">{t("carDetail.days", { count: selectedDays })}</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {t("carDetail.selectedDates", {
                start: `${selectedStartDate} ${selectedStartHour}:00`,
                end: `${selectedEndDate} ${selectedEndHour}:00`,
              })}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleBook}
          disabled={isBookDisabled}
          className={`py-4 rounded-xl items-center ${isBookDisabled ? "bg-primary/60" : "bg-primary"}`}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {isOwnListing
              ? t("carDetail.ownListing")
              : isCreatingCheckout
                ? t("carDetail.redirecting")
                : t("carDetail.reserveNow")}
          </Text>
        </Pressable>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

