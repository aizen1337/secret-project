import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { statusBadgeClasses } from "@/features/bookings/helpers/statusPresentation";
import type { TripsScreenController } from "@/features/bookings/hooks/useTripsScreenState";
import { getTokenColor } from "@/lib/themeTokens";

type TripsContentProps = {
  state: TripsScreenController;
  mode: "light" | "dark";
};

export function TripsContent({ state, mode }: TripsContentProps) {
  const { t } = useTranslation();
  const stopEventPropagation = (event: any) => {
    if (event && typeof event.stopPropagation === "function") event.stopPropagation();
  };

  const renderTripItem = ({ item: entry }: { item: any }) => {
    const bookingId = String(entry.booking._id);
    const canPayNow = Boolean(entry.canPayNow);
    const canCancel = Boolean(entry.canCancel);
    const paymentDueAt = entry.payment?.paymentDueAt ? new Date(entry.payment.paymentDueAt) : null;
    const bookingStatusTone = statusBadgeClasses(entry.booking?.status);
    const paymentStatusTone = statusBadgeClasses(entry.payment?.status);
    const depositStatusTone = statusBadgeClasses(entry.payment?.depositStatus);
    const bookingStatusLabel = state.localizeStatus(entry.booking?.status);
    const paymentStatusLabel = state.localizeStatus(entry.payment?.status ?? "pending");
    const depositStatusLabel = state.localizeStatus(entry.payment?.depositStatus);
    const tripStart = entry.booking?.startDate ? new Date(entry.booking.startDate) : null;
    const tripEnd = entry.booking?.endDate ? new Date(entry.booking.endDate) : null;
    const tripDateLabel = tripStart && tripEnd ? `${tripStart.toLocaleDateString()} - ${tripEnd.toLocaleDateString()}` : null;

    return (
      <Pressable onPress={() => state.openBookingDetails(bookingId)} className="w-full max-w-[960px] bg-card border border-border rounded-2xl p-4 mb-4">
        <View className="flex-row items-center">
          {entry.car?.images?.[0] ? (
            <Image source={{ uri: entry.car.images[0] }} className="w-16 h-16 rounded-xl" />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-secondary" />
          )}
          <View className="ml-3 flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {entry.car?.title || `${entry.car?.make ?? t("trips.carFallback")} ${entry.car?.model ?? ""}`}
                </Text>
                {entry.hostUser?.name && entry.hostUser?.id ? (
                  <Pressable
                    onPress={(event) => {
                      stopEventPropagation(event);
                      state.openUserProfile(String(entry.hostUser.id), "host");
                    }}
                  >
                    <Text className="text-xs text-muted-foreground mt-1">{t("carDetail.hostedBy", { name: entry.hostUser.name })}</Text>
                  </Pressable>
                ) : null}
                {tripDateLabel ? <Text className="text-xs text-muted-foreground mt-1">{tripDateLabel}</Text> : null}
              </View>
              <View className={`rounded-full px-2.5 py-1 ${bookingStatusTone.container}`}>
                <Text className={`text-[11px] font-semibold ${bookingStatusTone.text}`}>{bookingStatusLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className={`rounded-full px-2.5 py-1 ${paymentStatusTone.container}`}>
            <Text className={`text-[11px] font-medium ${paymentStatusTone.text}`}>
              {t("trips.payment", { status: paymentStatusLabel })}
            </Text>
          </View>
          {entry.payment?.depositStatus ? (
            <View className={`rounded-full px-2.5 py-1 ${depositStatusTone.container}`}>
              <Text className={`text-[11px] font-medium ${depositStatusTone.text}`}>
                {t("trips.depositStatus", { status: depositStatusLabel })}
              </Text>
            </View>
          ) : null}
          {paymentDueAt ? (
            <View className="rounded-full px-2.5 py-1 bg-secondary">
              <Text className="text-[11px] font-medium text-muted-foreground">
                {t("trips.paymentDue", { date: paymentDueAt.toLocaleString() })}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={(event) => {
              stopEventPropagation(event);
              state.openBookingChat(bookingId);
            }}
            className="rounded-full px-2.5 py-1 bg-secondary"
          >
            <Text className="text-[11px] font-medium text-muted-foreground">
              {Number(entry.chat?.unreadCount ?? 0) > 0
                ? t("bookingChat.openWithUnread", { count: entry.chat.unreadCount })
                : t("bookingChat.open")}
            </Text>
          </Pressable>
        </View>

        {canPayNow || canCancel ? (
          <View className="mt-3 flex-row gap-2">
            {canPayNow ? (
              <Pressable
                onPress={(event) => {
                  stopEventPropagation(event);
                  void state.handlePayNow(bookingId);
                }}
                disabled={state.pendingPayNowBookingId === bookingId}
                className={`flex-1 rounded-xl py-2.5 items-center ${state.pendingPayNowBookingId === bookingId ? "bg-primary/60" : "bg-primary"}`}
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {state.pendingPayNowBookingId === bookingId ? t("carDetail.redirecting") : t("trips.payNow")}
                </Text>
              </Pressable>
            ) : null}
            {canCancel ? (
              <Pressable
                onPress={(event) => {
                  stopEventPropagation(event);
                  void state.handleCancelReservation(bookingId);
                }}
                disabled={state.pendingCancelBookingId === bookingId}
                className={`flex-1 rounded-xl py-2.5 items-center ${state.pendingCancelBookingId === bookingId ? "bg-destructive/60" : "bg-destructive"}`}
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {state.pendingCancelBookingId === bookingId
                    ? t("trips.cancellingReservation")
                    : t("trips.cancelReservation")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    );
  };

  if (state.trips && state.trips.length > 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <FlatList
          data={state.trips}
          keyExtractor={(entry: any) => String(entry.booking._id)}
          renderItem={renderTripItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, alignItems: "center" }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="car-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
        </View>
        <Text className="text-xl font-semibold text-foreground mb-2 text-center">{t("trips.emptyTitle")}</Text>
        <Text className="text-base text-muted-foreground text-center mb-6">{t("trips.emptySubtitle")}</Text>
        <Link href="/" asChild>
          <View className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-primary-foreground font-semibold text-base">{t("common.actions.browseCars")}</Text>
          </View>
        </Link>
      </View>
    </SafeAreaView>
  );
}
