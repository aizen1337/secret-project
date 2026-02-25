import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useColorScheme } from "nativewind";
import { useAction, useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLinking from "expo-linking";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { useToast } from "@/components/feedback/useToast";
import { toLocalizedErrorMessage } from "@/lib/errors";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import { SearchMap, type CarLocation } from "@/features/map/SearchMap";
import { buildRegionForRadius } from "@/features/cars/components/dashboard/searchUtils";

function normalizeParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toReadableFallback(status: string | undefined) {
  if (!status) return "-";
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusBadgeClasses(status: string | undefined) {
  const normalized = (status ?? "").toLowerCase();

  if (
    normalized === "paid" ||
    normalized === "confirmed" ||
    normalized === "completed" ||
    normalized === "transferred" ||
    normalized === "held" ||
    normalized === "refunded"
  ) {
    return {
      container: "bg-green-500/15",
      text: "text-green-300",
    };
  }

  if (
    normalized === "pending" ||
    normalized === "payment_pending" ||
    normalized === "method_collection_pending" ||
    normalized === "method_saved" ||
    normalized === "eligible" ||
    normalized === "refund_pending" ||
    normalized === "case_submitted" ||
    normalized === "under_review" ||
    normalized === "checkout_created"
  ) {
    return {
      container: "bg-amber-500/15",
      text: "text-amber-300",
    };
  }

  if (
    normalized === "failed" ||
    normalized === "payment_failed" ||
    normalized === "cancelled" ||
    normalized === "blocked" ||
    normalized === "error" ||
    normalized === "rejected" ||
    normalized === "retained" ||
    normalized === "reversed" ||
    normalized === "disputed"
  ) {
    return {
      container: "bg-red-500/15",
      text: "text-red-300",
    };
  }

  return {
    container: "bg-secondary",
    text: "text-muted-foreground",
  };
}

function formatCurrency(amount: number | undefined, currency: string | undefined) {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const code = typeof currency === "string" && currency.trim() ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export default function BookingDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const mode = resolveThemeMode(useColorScheme());
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ bookingId?: string | string[]; source?: string | string[] }>();
  const bookingIdParam = normalizeParam(params.bookingId);
  const sourceParam = normalizeParam(params.source);
  const source = sourceParam === "dashboard" ? "dashboard" : "trips";
  const fallbackPath = source === "dashboard" ? "/dashboard" : "/trips";
  const details = useQuery(
    (api as any).bookings.getBookingDetails,
    bookingIdParam ? { bookingId: bookingIdParam as any } : "skip",
  );
  const cancelReservation = useMutation((api as any).bookings.cancelReservation);
  const createReservationPayNowSession = useAction((api as any).stripe.createReservationPayNowSession);
  const [pendingPayNow, setPendingPayNow] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);
  const isDesktop = width >= 1100;
  const isTablet = width >= 760;

  const localizeStatus = (status: string | undefined) => {
    if (!status) {
      return t("common.unknown");
    }
    const normalized = status.toLowerCase();
    const key = `trips.statuses.${normalized}`;
    const translated = t(key);
    if (translated === key) {
      return toReadableFallback(normalized);
    }
    return translated;
  };

  const handleGoBack = () => {
    if ((router as any).canGoBack?.()) {
      router.back();
      return;
    }
    router.replace(fallbackPath as any);
  };

  const handleOpenCarOffer = (carId: string) => {
    if (!carId) return;
    router.push({
      pathname: `/car/${carId}`,
      params: {
        startDate: details?.booking?.startDate,
        endDate: details?.booking?.endDate,
      },
    } as any);
  };

  const openUserProfile = (userId: string, role: "host" | "renter") => {
    if (!userId) return;
    router.push({
      pathname: "/user/[userId]",
      params: { userId, role },
    } as any);
  };

  const handleOpenChat = () => {
    if (!details?.booking?.id) return;
    router.push({
      pathname: "/booking/[bookingId]/chat",
      params: { bookingId: details.booking.id },
    } as any);
  };

  const handlePayNow = async () => {
    if (!details?.booking?.id) return;
    setPendingPayNow(true);
    try {
      const isWeb = typeof window !== "undefined";
      const webOrigin = isWeb ? window.location.origin : null;
      const successUrl = webOrigin
        ? `${webOrigin}/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : ExpoLinking.createURL("/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}");
      const cancelUrl = webOrigin
        ? `${webOrigin}/trips?checkout=cancelled`
        : ExpoLinking.createURL("/trips?checkout=cancelled");
      const checkout = await createReservationPayNowSession({
        bookingId: details.booking.id as any,
        successUrl,
        cancelUrl,
      });
      if (isWeb) {
        window.location.href = checkout.url;
        return;
      }
      await ExpoLinking.openURL(checkout.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
    } finally {
      setPendingPayNow(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!details?.booking?.id) return;
    setPendingCancel(true);
    try {
      await cancelReservation({ bookingId: details.booking.id as any });
      toast.success(t("trips.cancelReservationSuccess"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingCancel(false);
    }
  };

  const payoutReleaseAt = useMemo(() => {
    if (details?.viewerRole !== "host") return null;
    if (!details.payment?.releaseAt) return null;
    if (details.payment.payoutStatus !== "eligible") return null;
    return new Date(details.payment.releaseAt);
  }, [details]);

  const mapCars = useMemo<CarLocation[]>(() => {
    if (
      !details?.car?.id ||
      typeof details.car.location?.lat !== "number" ||
      typeof details.car.location?.lng !== "number"
    ) {
      return [];
    }
    return [
      {
        id: String(details.car.id),
        latitude: details.car.location.lat,
        longitude: details.car.location.lng,
        pricePerDay: Number(details.car.pricePerDay ?? 0),
        title: details.car.title || `${details.car.make} ${details.car.model}`,
        make: details.car.make,
        model: details.car.model,
        locationCity: details.car.location.city,
        locationCountry: details.car.location.country,
        imageUrl: details.car.images?.[0] ?? null,
      },
    ];
  }, [details]);

  const mapRegion = useMemo(() => {
    const lat = mapCars[0]?.latitude;
    const lng = mapCars[0]?.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      return buildRegionForRadius(lat, lng, 8);
    }
    return buildRegionForRadius(37.7749, -122.4194, 8);
  }, [mapCars]);

  const detailGridLeftItemStyle = {
    width: isTablet ? "50%" : "100%",
    paddingRight: isTablet ? 24 : 0,
  } as const;
  const detailGridRightItemStyle = {
    width: isTablet ? "50%" : "100%",
    paddingLeft: isTablet ? 24 : 0,
  } as const;
  const detailGridFullItemStyle = {
    width: "100%",
  } as const;
  const mapContainerClassName = isDesktop
    ? "mt-3 h-[72vh] w-full overflow-hidden"
    : "mt-3 h-[55vh] w-full overflow-hidden";

  if (!bookingIdParam) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("bookingDetails.invalidBooking")}</Text>
          <Pressable onPress={handleGoBack} className="mt-3 rounded-lg bg-primary px-4 py-2">
            <Text className="text-primary-foreground font-semibold">{t("bookingDetails.back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (details === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("bookingDetails.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground text-center">{t("bookingDetails.notAvailable")}</Text>
          <Pressable onPress={handleGoBack} className="mt-3 rounded-lg bg-primary px-4 py-2">
            <Text className="text-primary-foreground font-semibold">{t("bookingDetails.back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const bookingStatusTone = statusBadgeClasses(details.booking?.status);
  const paymentStatusTone = statusBadgeClasses(details.payment?.status);
  const isHostViewer = details.viewerRole === "host";
  const payoutStatusTone = isHostViewer ? statusBadgeClasses(details.payment?.payoutStatus) : null;
  const depositStatusTone = statusBadgeClasses(details.payment?.depositStatus);
  const bookingStatusLabel = localizeStatus(details.booking?.status);
  const paymentStatusLabel = localizeStatus(details.payment?.status ?? "pending");
  const payoutStatusLabel = isHostViewer ? localizeStatus(details.payment?.payoutStatus ?? "pending") : null;
  const depositStatusLabel = localizeStatus(details.payment?.depositStatus);
  const tripDateLabel =
    details.booking?.startDate && details.booking?.endDate
      ? `${new Date(details.booking.startDate).toLocaleDateString()} - ${new Date(details.booking.endDate).toLocaleDateString()}`
      : t("common.unknown");

  const mapSection = (
    <View>
      <Text className="text-base font-semibold text-foreground">{t("bookingDetails.mapTitle")}</Text>
      <Text className="text-xs text-muted-foreground mt-1">
        {t("bookingDetails.mapSubtitle", {
          city: details.car?.location?.city ?? t("common.unknown"),
          country: details.car?.location?.country ?? t("common.unknown"),
        })}
      </Text>
      {mapCars.length > 0 ? (
        <SearchMap
          region={mapRegion}
          cars={mapCars}
          interactive={true}
          fitToCars={false}
          selectedCarId={mapCars[0].id}
          onOfferPress={handleOpenCarOffer}
          containerClassName={mapContainerClassName}
        />
      ) : (
        <Text className="mt-3 text-sm text-muted-foreground">{t("bookingDetails.mapUnavailable")}</Text>
      )}
    </View>
  );

  const detailsSection = (
    <View>
      <View className="pb-6 border-b border-border/50">
        <View className="flex-row items-start">
          {details.car?.images?.[0] ? (
            <Image source={{ uri: details.car.images[0] }} className="w-20 h-20 rounded-2xl" />
          ) : (
            <View className="w-20 h-20 rounded-2xl bg-secondary" />
          )}
          <View className="ml-3 flex-1">
            <Text className="text-lg font-semibold text-foreground">
              {details.car?.title || `${details.car?.make ?? t("trips.carFallback")} ${details.car?.model ?? ""}`}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">
              {details.car?.make} {details.car?.model} - {details.car?.year}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1.5">{tripDateLabel}</Text>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-y-2">
          <View className={`${isTablet ? "w-1/2 pr-4" : "w-full"}`}>
            <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("bookingDetails.booking")}</Text>
            <Text className={`mt-0.5 text-sm font-semibold ${bookingStatusTone.text}`}>{bookingStatusLabel}</Text>
          </View>
          <View className={`${isTablet ? "w-1/2 pr-4" : "w-full"}`}>
            <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("bookingDetails.payment")}</Text>
            <Text className={`mt-0.5 text-sm font-semibold ${paymentStatusTone.text}`}>{paymentStatusLabel}</Text>
          </View>
          {isHostViewer ? (
            <View className={`${isTablet ? "w-1/2 pr-4" : "w-full"}`}>
              <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("bookingDetails.payout")}
              </Text>
              <Text className={`mt-0.5 text-sm font-semibold ${payoutStatusTone?.text ?? "text-muted-foreground"}`}>
                {payoutStatusLabel}
              </Text>
            </View>
          ) : null}
          {details.payment?.depositStatus ? (
            <View className={`${isTablet ? "w-1/2 pr-4" : "w-full"}`}>
              <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("bookingDetails.deposit")}</Text>
              <Text className={`mt-0.5 text-sm font-semibold ${depositStatusTone.text}`}>{depositStatusLabel}</Text>
            </View>
          ) : null}
        </View>

        {details.payment?.paymentDueAt ? (
          <Text className="mt-1 text-xs text-muted-foreground">
            {t("bookingDetails.paymentDue", { date: new Date(details.payment.paymentDueAt).toLocaleString() })}
          </Text>
        ) : null}
        {payoutReleaseAt ? (
          <Text className="mt-1 text-xs text-muted-foreground">
            {t("bookingDetails.transferScheduled", { date: payoutReleaseAt.toLocaleString() })}
          </Text>
        ) : null}

        {details.canPayNow || details.canCancel ? (
          <View className="mt-4 flex-row gap-2">
            {details.canPayNow ? (
              <Pressable
                onPress={() => {
                  void handlePayNow();
                }}
                disabled={pendingPayNow}
                className={`flex-1 rounded-xl py-2.5 items-center ${pendingPayNow ? "bg-primary/60" : "bg-primary"}`}
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {pendingPayNow ? t("carDetail.redirecting") : t("trips.payNow")}
                </Text>
              </Pressable>
            ) : null}
            {details.canCancel ? (
              <Pressable
                onPress={() => {
                  void handleCancelReservation();
                }}
                disabled={pendingCancel}
                className={`flex-1 rounded-xl py-2.5 items-center ${
                  pendingCancel ? "bg-destructive/60" : "bg-destructive"
                }`}
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {pendingCancel ? t("trips.cancellingReservation") : t("trips.cancelReservation")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View className="mt-3">
          <Pressable
            onPress={handleOpenChat}
            className="rounded-xl border border-border bg-secondary px-3 py-2.5 flex-row items-center justify-between"
          >
            <Text className="text-sm font-semibold text-foreground">{t("bookingChat.openChat")}</Text>
            {Number(details.chat?.unreadCount ?? 0) > 0 ? (
              <View className="rounded-full bg-primary px-2 py-0.5">
                <Text className="text-[11px] font-semibold text-primary-foreground">
                  {t("bookingChat.unreadLabel", { count: details.chat.unreadCount })}
                </Text>
              </View>
            ) : null}
          </Pressable>
          {!details.chat?.canSend && details.chat?.sendDisabledReason ? (
            <Text className="mt-1.5 text-xs text-muted-foreground">
              {t(`bookingChat.disabledReasons.${details.chat.sendDisabledReason}`)}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-6 flex-row flex-wrap">
        <View className={`pb-5 ${isTablet ? "" : "border-b border-border/40"}`} style={detailGridLeftItemStyle}>
          <Text className="text-base font-semibold text-foreground">{t("bookingDetails.locationTitle")}</Text>
          {details.car?.formattedAddress ? (
            <View className="mt-3">
              <Text className="text-xs text-muted-foreground">{t("bookingDetails.address")}</Text>
              <Text className="text-sm text-foreground mt-1 leading-5">{details.car.formattedAddress}</Text>
            </View>
          ) : null}
          <View className="mt-3">
            <Text className="text-xs text-muted-foreground">{t("bookingDetails.city")}</Text>
            <Text className="text-sm text-foreground mt-1">{details.car?.location?.city ?? t("common.unknown")}</Text>
          </View>
          <View className="mt-3">
            <Text className="text-xs text-muted-foreground">{t("bookingDetails.country")}</Text>
            <Text className="text-sm text-foreground mt-1">
              {details.car?.location?.country ?? t("common.unknown")}
            </Text>
          </View>
        </View>

        <View
          className={`pb-5 border-b border-border/40 ${isTablet ? "" : "pt-5"}`}
          style={detailGridRightItemStyle}
        >
          <Text className="text-base font-semibold text-foreground">{t("bookingDetails.paymentTitle")}</Text>
          <View className="mt-3 gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">{t("bookingDetails.rentalAmount")}</Text>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(details.payment?.rentalAmount ?? details.booking.totalPrice, details.payment?.currency)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">{t("bookingDetails.platformFee")}</Text>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(details.payment?.platformFeeAmount ?? 0, details.payment?.currency)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">{t("bookingDetails.depositAmount")}</Text>
              <Text className="text-sm font-medium text-foreground">
                {formatCurrency(details.payment?.depositAmount ?? 0, details.payment?.currency)}
              </Text>
            </View>
            <View className="h-px bg-border my-1" />
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-foreground">{t("bookingDetails.totalAmount")}</Text>
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(
                  details.payment?.totalAmount ??
                    details.booking.totalPrice +
                      Number(details.payment?.platformFeeAmount ?? 0) +
                      Number(details.payment?.depositAmount ?? 0),
                  details.payment?.currency,
                )}
              </Text>
            </View>
          </View>
        </View>

        <View className="pt-5" style={detailGridFullItemStyle}>
          <Text className="text-base font-semibold text-foreground">{t("bookingDetails.peopleTitle")}</Text>
          <View className="mt-3 flex-row flex-wrap">
            <View style={detailGridLeftItemStyle}>
              <Text className="text-xs uppercase tracking-wide text-muted-foreground">{t("bookingDetails.host")}</Text>
              {details.hostUser?.id ? (
                <Pressable onPress={() => openUserProfile(String(details.hostUser.id), "host")}>
                  <Text className="text-sm font-medium text-foreground mt-1">
                    {details.hostUser?.name ?? t("common.unknown")}
                  </Text>
                </Pressable>
              ) : (
                <Text className="text-sm font-medium text-foreground mt-1">
                  {details.hostUser?.name ?? t("common.unknown")}
                </Text>
              )}
            </View>
            <View className={`${isTablet ? "" : "mt-4"}`} style={detailGridRightItemStyle}>
              <Text className="text-xs uppercase tracking-wide text-muted-foreground">{t("bookingDetails.renter")}</Text>
              {details.renterUser?.id ? (
                <Pressable onPress={() => openUserProfile(String(details.renterUser.id), "renter")}>
                  <Text className="text-sm font-medium text-foreground mt-1">
                    {details.renterUser?.name ?? t("common.unknown")}
                  </Text>
                </Pressable>
              ) : (
                <Text className="text-sm font-medium text-foreground mt-1">
                  {details.renterUser?.name ?? t("common.unknown")}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-4 pt-3 pb-2 border-b border-border">
        <View className="flex-row items-center">
          <Pressable
            onPress={handleGoBack}
            className="w-9 h-9 rounded-full border border-border items-center justify-center"
          >
            <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
          </Pressable>
          <Text className="ml-3 text-lg font-semibold text-foreground">{t("bookingDetails.title")}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <View className="w-full pb-8">
          {isDesktop ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 24 }}>
              <View style={{ flex: 1 }}>{detailsSection}</View>
              <View style={{ flex: 1, minWidth: 420 }}>{mapSection}</View>
            </View>
          ) : (
            <View>
              {mapSection}
              <View className="mt-5">{detailsSection}</View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
