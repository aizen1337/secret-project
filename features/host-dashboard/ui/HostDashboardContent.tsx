import { FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { statusBadgeClasses } from "@/features/bookings/helpers/statusPresentation";
import type { HostDashboardScreenController } from "@/features/host-dashboard/hooks/useHostDashboardScreenState";
import { HostListingsSection } from "@/features/cars/components/dashboard/HostListingsSection";
import { getTokenColor } from "@/lib/themeTokens";

type HostDashboardContentProps = {
  state: HostDashboardScreenController;
  mode: "light" | "dark";
};

export function HostDashboardContent({ state, mode }: HostDashboardContentProps) {
  const { t } = useTranslation();
  const stopEventPropagation = (event: any) => {
    if (event && typeof event.stopPropagation === "function") event.stopPropagation();
  };

  const renderDashboardTopSection = () => (
    <View className="px-4 pt-3 mb-5">
      <View className="flex-row items-center justify-between mb-5">
        <View>
          <Text className="text-xs uppercase text-muted-foreground">{t("dashboard.role")}</Text>
          <Text className="text-2xl font-bold text-foreground">{t("dashboard.title")}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => state.router.push("/car/new")}
            className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
          >
            <Ionicons name="add" size={20} color={getTokenColor(mode, "icon")} />
          </Pressable>
          <Link href="/profile" asChild>
            <Pressable className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center">
              <Ionicons name="settings-outline" size={20} color={getTokenColor(mode, "icon")} />
            </Pressable>
          </Link>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3 mb-5">
        <View className="flex-1 min-w-[45%] bg-card p-4 rounded-xl border border-border">
          <Text className="text-sm text-muted-foreground mb-1">{t("dashboard.activeListings")}</Text>
          <Text className="text-2xl font-bold text-foreground">{state.listingStats.total}</Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-card p-4 rounded-xl border border-border">
          <Text className="text-sm text-muted-foreground mb-1">{t("dashboard.avgPriceDay")}</Text>
          <Text className="text-2xl font-bold text-foreground">${state.listingStats.averagePrice}</Text>
        </View>
      </View>

      <View className="flex-row bg-secondary rounded-xl p-1">
        <Pressable
          onPress={() => state.setActiveTab("listings")}
          className={`flex-1 py-3 rounded-lg ${state.activeTab === "listings" ? "bg-card" : ""}`}
        >
          <Text className={`text-center font-medium ${state.activeTab === "listings" ? "text-foreground" : "text-muted-foreground"}`}>
            {t("dashboard.myListings")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => state.setActiveTab("bookings")}
          className={`flex-1 py-3 rounded-lg ${state.activeTab === "bookings" ? "bg-card" : ""}`}
        >
          <Text className={`text-center font-medium ${state.activeTab === "bookings" ? "text-foreground" : "text-muted-foreground"}`}>
            {t("dashboard.bookings")}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderHostBookingItem = ({ item: entry }: { item: any }) => {
    const bookingId = entry.booking ? String(entry.booking._id) : "";
    const canCancel = Boolean(bookingId && entry.canCancel);
    const bookingStatusTone = statusBadgeClasses(entry.booking?.status);
    const paymentStatusTone = statusBadgeClasses(entry.payment?.status);
    const payoutStatusTone = statusBadgeClasses(entry.payment?.payoutStatus);
    const depositStatusTone = statusBadgeClasses(entry.payment?.depositStatus);
    const bookingStatusLabel = state.localizeStatus(entry.booking?.status);
    const paymentStatusLabel = state.localizeStatus(entry.payment?.status ?? "pending");
    const payoutStatusLabel = state.localizeStatus(entry.payment?.payoutStatus ?? "pending");
    const depositStatusLabel = state.localizeStatus(entry.payment?.depositStatus);
    const paymentDueAt = entry.payment?.paymentDueAt ? new Date(entry.payment.paymentDueAt) : null;
    const transferScheduledAt =
      entry.payment?.payoutStatus === "eligible" && entry.payment?.releaseAt
        ? new Date(entry.payment.releaseAt)
        : null;
    const depositClaimWindowEndsAt = entry.payment?.depositClaimWindowEndsAt
      ? new Date(entry.payment.depositClaimWindowEndsAt)
      : null;
    const tripStart = entry.booking?.startDate ? new Date(entry.booking.startDate) : null;
    const tripEnd = entry.booking?.endDate ? new Date(entry.booking.endDate) : null;
    const tripDateLabel = tripStart && tripEnd ? `${tripStart.toLocaleDateString()} - ${tripEnd.toLocaleDateString()}` : null;

    return (
      <View className="px-4">
        <Pressable onPress={() => state.openBookingDetails(bookingId)} disabled={!bookingId} className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row items-center">
            {entry.car?.images?.[0] ? <Image source={{ uri: entry.car.images[0] }} className="w-16 h-16 rounded-xl" /> : <View className="w-16 h-16 rounded-xl bg-secondary" />}
            <View className="ml-3 flex-1">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {entry.car?.title || `${entry.car?.make ?? t("trips.carFallback")} ${entry.car?.model ?? ""}`}
                  </Text>
                  {entry.renter?.name && entry.renter?.id ? (
                    <Pressable
                      onPress={(event) => {
                        stopEventPropagation(event);
                        state.openUserProfile(String(entry.renter.id), "renter");
                      }}
                    >
                      <Text className="text-xs text-muted-foreground mt-1">{entry.renter.name}</Text>
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
            <View className={`rounded-full px-2.5 py-1 ${payoutStatusTone.container}`}>
              <Text className={`text-[11px] font-medium ${payoutStatusTone.text}`}>
                {t("trips.payout", { status: payoutStatusLabel })}
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
            {transferScheduledAt ? (
              <View className="rounded-full px-2.5 py-1 bg-secondary">
                <Text className="text-[11px] font-medium text-muted-foreground">
                  {t("dashboard.transferScheduled", { date: transferScheduledAt.toLocaleString() })}
                </Text>
              </View>
            ) : null}
            {depositClaimWindowEndsAt ? (
              <View className="rounded-full px-2.5 py-1 bg-secondary">
                <Text className="text-[11px] font-medium text-muted-foreground">
                  {t("dashboard.depositClaimWindow", { date: depositClaimWindowEndsAt.toLocaleString() })}
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

          {canCancel ? (
            <Pressable
              onPress={(event) => {
                stopEventPropagation(event);
                void state.handleCancelReservation(bookingId);
              }}
              disabled={state.pendingCancelBookingId === bookingId}
              className={`mt-3 rounded-lg py-2 items-center ${state.pendingCancelBookingId === bookingId ? "bg-destructive/60" : "bg-destructive"}`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {state.pendingCancelBookingId === bookingId
                  ? t("dashboard.cancellingReservation")
                  : t("dashboard.cancelReservation")}
              </Text>
            </Pressable>
          ) : null}

          {entry.canFileDepositCase ? (
            <Pressable
              onPress={(event) => {
                stopEventPropagation(event);
                void state.handleFileDepositCase(bookingId);
              }}
              disabled={!bookingId || state.pendingDepositCaseBookingId === bookingId}
              className={`mt-3 rounded-lg py-2 items-center ${state.pendingDepositCaseBookingId === bookingId ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {state.pendingDepositCaseBookingId === bookingId ? t("common.loading") : t("dashboard.fileDepositCase")}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </View>
    );
  };

  if (state.activeTab === "bookings") {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <FlatList
          className="flex-1"
          data={state.hostPayouts ?? []}
          keyExtractor={(entry: any, index) => String(entry.payment?._id ?? entry.booking?._id ?? `booking-row-${index}`)}
          renderItem={renderHostBookingItem}
          ListHeaderComponent={renderDashboardTopSection}
          ListEmptyComponent={
            <View className="px-4 pb-8">
              <View className="bg-card rounded-xl p-4 border border-border">
                <Text className="text-sm text-muted-foreground text-center">{t("dashboard.noPayoutRecords")}</Text>
              </View>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {renderDashboardTopSection()}
        <View className="px-4 pb-8">
          <HostListingsSection
            cars={state.displayedCars as any}
            isLoading={state.isLoading}
            listingStatus={state.listingStatus}
            onChangeStatus={state.setListingStatus}
            pendingCarId={state.pendingCarId}
            onEditCar={(carId) => state.router.push(`/car/${carId}/edit`)}
            onArchiveCar={state.handleArchiveCar}
            onUnarchiveCar={state.handleUnarchiveCar}
            onDeleteCar={state.handleDeleteCar}
            onAddNewCar={() => state.router.push("/car/new")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
