import { useMemo, useState } from "react";
import { useColorScheme } from "nativewind";
import { FlatList, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@clerk/clerk-expo";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "@/components/feedback/useToast";
import { hostDashboardApi } from "@/features/host-dashboard/api";
import { statusBadgeClasses, toReadableFallback } from "@/features/bookings/helpers/statusPresentation";
import { toLocalizedErrorMessage } from "@/lib/errors";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import { HostListingsSection } from "@/features/cars/components/dashboard/HostListingsSection";

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = Boolean(isSignedIn);
  const hostPayoutStatus = useQuery(hostDashboardApi.getHostPayoutStatus, signedIn ? {} : "skip");
  const hostVerified = Boolean(hostPayoutStatus?.hostVerified);
  const [activeTab, setActiveTab] = useState<"listings" | "bookings">("listings");
  const [listingStatus, setListingStatus] = useState<"active" | "archived">("active");
  const [pendingCarId, setPendingCarId] = useState<string | null>(null);
  const [pendingDepositCaseBookingId, setPendingDepositCaseBookingId] = useState<string | null>(null);
  const [pendingCancelBookingId, setPendingCancelBookingId] = useState<string | null>(null);
  const [optimisticStatusByCarId, setOptimisticStatusByCarId] = useState<Record<string, boolean>>({});
  const archiveHostCar = useMutation(hostDashboardApi.archiveHostCar);
  const unarchiveHostCar = useMutation(hostDashboardApi.unarchiveHostCar);
  const deleteHostCar = useMutation(hostDashboardApi.deleteHostCar);
  const fileHostDepositCase = useMutation(hostDashboardApi.fileHostDepositCase);
  const cancelReservation = useMutation(hostDashboardApi.cancelReservation);
  const myCars = useQuery(
    hostDashboardApi.listHostCars,
    signedIn && hostVerified ? { status: listingStatus } : "skip",
  );
  const hostPayouts = useQuery(
    hostDashboardApi.listHostBookingsWithPayouts,
    signedIn && hostVerified ? {} : "skip",
  );
  const isLoading = signedIn && hostVerified && myCars === undefined;

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

  const displayedCars = useMemo(() => {
    const cars: Doc<"cars">[] = myCars ?? [];
    return cars.filter((car) => {
      const optimisticActive = optimisticStatusByCarId[car._id];
      const effectiveIsActive = optimisticActive ?? car.isActive;
      return listingStatus === "active" ? effectiveIsActive : !effectiveIsActive;
    });
  }, [myCars, optimisticStatusByCarId, listingStatus]);

  const listingStats = useMemo(() => {
    if (!displayedCars) {
      return { total: 0, averagePrice: 0 };
    }
    const total = displayedCars.length;
    const averagePrice =
      total > 0
        ? Math.round(
            displayedCars.reduce((sum, car) => sum + car.pricePerDay, 0) / total
          )
        : 0;
    return { total, averagePrice };
  }, [displayedCars]);

  const handleArchiveCar = async (carId: string) => {
    setPendingCarId(carId);
    setOptimisticStatusByCarId((prev) => ({ ...prev, [carId]: false }));
    try {
      await archiveHostCar({ carId: carId as Id<"cars"> });
    } catch (error) {
      setOptimisticStatusByCarId((prev) => {
        const next = { ...prev };
        delete next[carId];
        return next;
      });
      toast.error(toLocalizedErrorMessage(error, t, "dashboard.listingErrors.archive"));
    } finally {
      setPendingCarId(null);
    }
  };

  const handleUnarchiveCar = async (carId: string) => {
    setPendingCarId(carId);
    setOptimisticStatusByCarId((prev) => ({ ...prev, [carId]: true }));
    try {
      await unarchiveHostCar({ carId: carId as Id<"cars"> });
    } catch (error) {
      setOptimisticStatusByCarId((prev) => {
        const next = { ...prev };
        delete next[carId];
        return next;
      });
      toast.error(toLocalizedErrorMessage(error, t, "dashboard.listingErrors.unarchive"));
    } finally {
      setPendingCarId(null);
    }
  };

  const handleDeleteCar = async (carId: string) => {
    setPendingCarId(carId);
    try {
      await deleteHostCar({ carId: carId as Id<"cars"> });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "dashboard.listingErrors.delete"));
    } finally {
      setPendingCarId(null);
    }
  };

  const handleFileDepositCase = async (bookingId: string) => {
    setPendingDepositCaseBookingId(bookingId);
    try {
      await fileHostDepositCase({
        bookingId: bookingId as any,
        reason: "Host-reported issue with trip condition or policy compliance.",
      });
      toast.success(t("dashboard.depositCaseFiled"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingDepositCaseBookingId(null);
    }
  };

  const handleCancelReservation = async (bookingId: string) => {
    setPendingCancelBookingId(bookingId);
    try {
      await cancelReservation({ bookingId: bookingId as any });
      toast.success(t("dashboard.cancelReservationSuccess"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingCancelBookingId(null);
    }
  };

  const stopEventPropagation = (event: any) => {
    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }
  };

  const openBookingDetails = (bookingId: string) => {
    if (!bookingId) return;
    router.push({
      pathname: "/booking/[bookingId]",
      params: { bookingId, source: "dashboard" },
    } as any);
  };

  const openBookingChat = (bookingId: string) => {
    if (!bookingId) return;
    router.push({
      pathname: "/booking/[bookingId]/chat",
      params: { bookingId },
    } as any);
  };

  const openUserProfile = (userId: string, role: "host" | "renter") => {
    if (!userId) return;
    router.push({
      pathname: "/user/[userId]",
      params: { userId, role },
    } as any);
  };

  const renderDashboardTopSection = () => (
    <View className="px-4 pt-3 mb-5">
      <View className="flex-row items-center justify-between mb-5">
        <View>
          <Text className="text-xs uppercase text-muted-foreground">
            {t("dashboard.role")}
          </Text>
          <Text className="text-2xl font-bold text-foreground">
            {t("dashboard.title")}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push("/car/new")}
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
          <Text className="text-sm text-muted-foreground mb-1">
            {t("dashboard.activeListings")}
          </Text>
          <Text className="text-2xl font-bold text-foreground">
            {listingStats.total}
          </Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-card p-4 rounded-xl border border-border">
          <Text className="text-sm text-muted-foreground mb-1">
            {t("dashboard.avgPriceDay")}
          </Text>
          <Text className="text-2xl font-bold text-foreground">
            ${listingStats.averagePrice}
          </Text>
        </View>
      </View>

      <View className="flex-row bg-secondary rounded-xl p-1">
        <Pressable
          onPress={() => setActiveTab("listings")}
          className={`flex-1 py-3 rounded-lg ${activeTab === "listings" ? "bg-card" : ""}`}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === "listings"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t("dashboard.myListings")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("bookings")}
          className={`flex-1 py-3 rounded-lg ${activeTab === "bookings" ? "bg-card" : ""}`}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === "bookings"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
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
    const bookingStatusLabel = localizeStatus(entry.booking?.status);
    const paymentStatusLabel = localizeStatus(entry.payment?.status ?? "pending");
    const payoutStatusLabel = localizeStatus(entry.payment?.payoutStatus ?? "pending");
    const depositStatusLabel = localizeStatus(entry.payment?.depositStatus);
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
    const tripDateLabel =
      tripStart && tripEnd
        ? `${tripStart.toLocaleDateString()} - ${tripEnd.toLocaleDateString()}`
        : null;

    return (
      <View className="px-4">
        <Pressable
          onPress={() => openBookingDetails(bookingId)}
          disabled={!bookingId}
          className="bg-card border border-border rounded-2xl p-4 mb-4"
        >
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
                  {entry.renter?.name && entry.renter?.id ? (
                    <Pressable
                      onPress={(event) => {
                        stopEventPropagation(event);
                        openUserProfile(String(entry.renter.id), "renter");
                      }}
                    >
                      <Text className="text-xs text-muted-foreground mt-1">{entry.renter.name}</Text>
                    </Pressable>
                  ) : null}
                  {tripDateLabel ? (
                    <Text className="text-xs text-muted-foreground mt-1">{tripDateLabel}</Text>
                  ) : null}
                </View>
                <View className={`rounded-full px-2.5 py-1 ${bookingStatusTone.container}`}>
                  <Text className={`text-[11px] font-semibold ${bookingStatusTone.text}`}>
                    {bookingStatusLabel}
                  </Text>
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
                openBookingChat(bookingId);
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
                void handleCancelReservation(bookingId);
              }}
              disabled={pendingCancelBookingId === bookingId}
              className={`mt-3 rounded-lg py-2 items-center ${
                pendingCancelBookingId === bookingId ? "bg-destructive/60" : "bg-destructive"
              }`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {pendingCancelBookingId === bookingId
                  ? t("dashboard.cancellingReservation")
                  : t("dashboard.cancelReservation")}
              </Text>
            </Pressable>
          ) : null}

          {entry.canFileDepositCase ? (
            <Pressable
              onPress={(event) => {
                stopEventPropagation(event);
                void handleFileDepositCase(bookingId);
              }}
              disabled={!bookingId || pendingDepositCaseBookingId === bookingId}
              className={`mt-3 rounded-lg py-2 items-center ${
                pendingDepositCaseBookingId === bookingId
                  ? "bg-primary/60"
                  : "bg-primary"
              }`}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {pendingDepositCaseBookingId === bookingId
                  ? t("common.loading")
                  : t("dashboard.fileDepositCase")}
              </Text>
            </Pressable>
          ) : null}

        </Pressable>
      </View>
    );
  };

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
            <Ionicons name="grid-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
          </View>
          <Text className="text-xl font-semibold text-foreground mb-2 text-center">
            {t("dashboard.hostDashboard")}
          </Text>
          <Text className="text-base text-muted-foreground text-center mb-6">
            {t("dashboard.signInPrompt")}
          </Text>
          <Link href="/sign-in" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-xl">
              <Text className="text-primary-foreground font-semibold text-base">
                {t("common.actions.signIn")}
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  if (hostPayoutStatus === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hostVerified) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
            <Ionicons name="shield-checkmark-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
          </View>
          <Text className="text-xl font-semibold text-foreground mb-2 text-center">
            {t("dashboard.hostVerificationRequiredTitle")}
          </Text>
          <Text className="text-base text-muted-foreground text-center mb-6">
            {t("dashboard.hostVerificationRequiredSubtitle")}
          </Text>
          <Link href="/profile/payments" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-xl">
              <Text className="text-primary-foreground font-semibold text-base">
                {t("common.actions.setUpPayouts")}
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  if (activeTab === "bookings") {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <FlatList
          className="flex-1"
          data={hostPayouts ?? []}
          keyExtractor={(entry: any, index) =>
            String(entry.payment?._id ?? entry.booking?._id ?? `booking-row-${index}`)
          }
          renderItem={renderHostBookingItem}
          ListHeaderComponent={renderDashboardTopSection}
          ListEmptyComponent={
            <View className="px-4 pb-8">
              <View className="bg-card rounded-xl p-4 border border-border">
                <Text className="text-sm text-muted-foreground text-center">
                  {t("dashboard.noPayoutRecords")}
                </Text>
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
            cars={displayedCars as any}
            isLoading={isLoading}
            listingStatus={listingStatus}
            onChangeStatus={setListingStatus}
            pendingCarId={pendingCarId}
            onEditCar={(carId) => router.push(`/car/${carId}/edit`)}
            onArchiveCar={handleArchiveCar}
            onUnarchiveCar={handleUnarchiveCar}
            onDeleteCar={handleDeleteCar}
            onAddNewCar={() => router.push("/car/new")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


