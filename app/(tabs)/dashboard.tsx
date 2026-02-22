import { useMemo, useState } from "react";
import { useColorScheme } from "nativewind";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "@/components/feedback/useToast";
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
  const [activeTab, setActiveTab] = useState<"listings" | "bookings">("listings");
  const [listingStatus, setListingStatus] = useState<"active" | "archived">("active");
  const [pendingCarId, setPendingCarId] = useState<string | null>(null);
  const [pendingReviewBookingId, setPendingReviewBookingId] = useState<string | null>(null);
  const [pendingDepositCaseBookingId, setPendingDepositCaseBookingId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [optimisticStatusByCarId, setOptimisticStatusByCarId] = useState<Record<string, boolean>>({});
  const archiveHostCar = useMutation(api.cars.archiveHostCar);
  const unarchiveHostCar = useMutation(api.cars.unarchiveHostCar);
  const deleteHostCar = useMutation(api.cars.deleteHostCar);
  const createBookingReview = useMutation(api.bookingReviews.createBookingReview as any);
  const fileHostDepositCase = useMutation((api as any).depositCases.fileHostDepositCase);
  const myCars = useQuery(
    api.cars.listHostCars,
    signedIn ? { status: listingStatus } : "skip",
  );
  const hostPayouts = useQuery(api.bookings.listHostBookingsWithPayouts, signedIn ? {} : "skip");
  const isLoading = signedIn && myCars === undefined;

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

  const updateReviewDraft = (bookingId: string, next: Partial<{ rating: number; comment: string }>) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        rating: prev[bookingId]?.rating ?? 5,
        comment: prev[bookingId]?.comment ?? "",
        ...next,
      },
    }));
  };

  const handleSubmitHostReview = async (bookingId: string) => {
    const draft = reviewDrafts[bookingId] ?? { rating: 5, comment: "" };
    setPendingReviewBookingId(bookingId);
    try {
      await createBookingReview({
        bookingId: bookingId as any,
        rating: draft.rating,
        comment: draft.comment,
      });
      toast.success(t("profile.reviews.submitSuccess"));
      setReviewDrafts((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingReviewBookingId(null);
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-3 pb-8">
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

          {/* Stats Grid */}
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

          {/* Tabs */}
          <View className="flex-row bg-secondary rounded-xl p-1 mb-5">
            <Pressable
              onPress={() => setActiveTab("listings")}
              className={`flex-1 py-3 rounded-lg ${
                activeTab === "listings" ? "bg-card" : ""
              }`}
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
              className={`flex-1 py-3 rounded-lg ${
                activeTab === "bookings" ? "bg-card" : ""
              }`}
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

          {/* Tab Content */}
          {activeTab === "listings" ? (
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
          ) : (
            <View>
              {hostPayouts && hostPayouts.length > 0 ? (
                hostPayouts.map((entry: any) => (
                  <View key={entry.payment._id} className="bg-card rounded-xl p-4 border border-border mb-3">
                    <Text className="text-sm font-semibold text-foreground">
                      {entry.car?.title || `${entry.car?.make ?? t("trips.carFallback")} ${entry.car?.model ?? ""}`}
                    </Text>
                    {entry.renter?.name ? (
                      <Text className="text-xs text-muted-foreground mt-1">{entry.renter.name}</Text>
                    ) : null}
                    <Text className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.bookingStatus", { status: entry.booking?.status ?? t("common.unknown") })}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {t("dashboard.payment", { status: entry.payment.status })}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {t("dashboard.payout", { status: entry.payment.payoutStatus })}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {t("dashboard.depositStatus", { status: entry.payment.depositStatus ?? t("common.unknown") })}
                    </Text>
                    {entry.payment.depositClaimWindowEndsAt ? (
                      <Text className="text-xs text-muted-foreground">
                        {t("dashboard.depositClaimWindow", {
                          date: new Date(entry.payment.depositClaimWindowEndsAt).toLocaleString(),
                        })}
                      </Text>
                    ) : null}

                    {entry.canFileDepositCase ? (
                      <Pressable
                        onPress={() => handleFileDepositCase(String(entry.booking._id))}
                        disabled={pendingDepositCaseBookingId === String(entry.booking._id)}
                        className={`mt-3 rounded-lg py-2 items-center ${
                          pendingDepositCaseBookingId === String(entry.booking._id)
                            ? "bg-primary/60"
                            : "bg-primary"
                        }`}
                      >
                        <Text className="text-sm font-semibold text-primary-foreground">
                          {pendingDepositCaseBookingId === String(entry.booking._id)
                            ? t("common.loading")
                            : t("dashboard.fileDepositCase")}
                        </Text>
                      </Pressable>
                    ) : null}

                    {entry.myReview ? (
                      <View className="mt-3 rounded-lg border border-border bg-secondary p-3">
                        <Text className="text-xs text-muted-foreground">{t("profile.reviews.yourReview")}</Text>
                        <Text className="mt-1 text-sm text-foreground">
                          {"★".repeat(entry.myReview.rating)}{"☆".repeat(Math.max(0, 5 - entry.myReview.rating))}
                        </Text>
                        <Text className="mt-1 text-sm text-foreground">{entry.myReview.comment}</Text>
                      </View>
                    ) : null}

                    {entry.booking?.status === "completed" && !entry.myReview ? (
                      <View className="mt-3 rounded-lg border border-border p-3">
                        <Text className="text-sm font-semibold text-foreground mb-2">
                          {t("profile.reviews.rateRenter")}
                        </Text>
                        <View className="flex-row gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((rating) => {
                            const bookingId = String(entry.booking._id);
                            const draft = reviewDrafts[bookingId] ?? { rating: 5, comment: "" };
                            return (
                              <Pressable key={rating} onPress={() => updateReviewDraft(bookingId, { rating })}>
                                <Ionicons
                                  name={rating <= draft.rating ? "star" : "star-outline"}
                                  size={18}
                                  color={getTokenColor(mode, "ratingStar")}
                                />
                              </Pressable>
                            );
                          })}
                        </View>
                        <TextInput
                          value={reviewDrafts[String(entry.booking._id)]?.comment ?? ""}
                          onChangeText={(comment) => updateReviewDraft(String(entry.booking._id), { comment })}
                          placeholder={t("profile.reviews.commentPlaceholder")}
                          placeholderTextColor={getTokenColor(mode, "placeholder")}
                          className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                          multiline
                        />
                        <Pressable
                          onPress={() => handleSubmitHostReview(String(entry.booking._id))}
                          disabled={pendingReviewBookingId === String(entry.booking._id)}
                          className={`mt-2 rounded-lg py-2 items-center ${
                            pendingReviewBookingId === String(entry.booking._id)
                              ? "bg-primary/60"
                              : "bg-primary"
                          }`}
                        >
                          <Text className="text-sm font-semibold text-primary-foreground">
                            {t("profile.reviews.submit")}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <View className="bg-card rounded-xl p-4 border border-border">
                  <Text className="text-sm text-muted-foreground text-center">
                    {t("dashboard.noPayoutRecords")}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

