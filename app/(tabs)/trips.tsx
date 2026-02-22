import { useState } from "react";
import { View, Text, Image, ScrollView, Pressable, TextInput } from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLinking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { useToast } from "@/components/feedback/useToast";
import { toLocalizedErrorMessage } from "@/lib/errors";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type DraftReview = {
  rating: number;
  comment: string;
};

export default function TripsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const mode = resolveThemeMode(useColorScheme());
  const { isSignedIn } = useAuth();
  const trips = useQuery(api.bookings.listMyTripsWithPayments, isSignedIn ? {} : "skip");
  const createBookingReview = useMutation(api.bookingReviews.createBookingReview as any);
  const createReservationPayNowSession = useAction((api as any).stripe.createReservationPayNowSession);
  const [drafts, setDrafts] = useState<Record<string, DraftReview>>({});
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [pendingPayNowBookingId, setPendingPayNowBookingId] = useState<string | null>(null);

  const updateDraft = (bookingId: string, next: Partial<DraftReview>) => {
    setDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        rating: prev[bookingId]?.rating ?? 5,
        comment: prev[bookingId]?.comment ?? "",
        ...next,
      },
    }));
  };

  const handlePayNow = async (bookingId: string) => {
    setPendingPayNowBookingId(bookingId);
    try {
      const isWeb = typeof window !== "undefined";
      const webOrigin = isWeb ? window.location.origin : null;
      const successUrl = webOrigin
        ? `${webOrigin}/trips?checkout=success`
        : ExpoLinking.createURL("/trips?checkout=success");
      const cancelUrl = webOrigin
        ? `${webOrigin}/trips?checkout=cancelled`
        : ExpoLinking.createURL("/trips?checkout=cancelled");
      const checkout = await createReservationPayNowSession({
        bookingId: bookingId as any,
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
      setPendingPayNowBookingId(null);
    }
  };

  const submitReview = async (bookingId: string) => {
    const draft = drafts[bookingId] ?? { rating: 5, comment: "" };
    setPendingBookingId(bookingId);
    try {
      await createBookingReview({
        bookingId,
        rating: draft.rating,
        comment: draft.comment,
      });
      toast.success(t("profile.reviews.submitSuccess"));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingBookingId(null);
    }
  };

  if (trips && trips.length > 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {trips.map((entry: any) => {
            const bookingId = String(entry.booking._id);
            const draft = drafts[bookingId] ?? { rating: 5, comment: "" };
            const canReview = entry.booking.status === "completed" && !entry.myReview;
            const canPayNow = Boolean(entry.canPayNow);
            const paymentDueAt = entry.payment?.paymentDueAt ? new Date(entry.payment.paymentDueAt) : null;

            return (
              <View key={entry.booking._id} className="bg-card border border-border rounded-xl p-3 mb-3">
                <View className="flex-row items-center">
                  {entry.car?.images?.[0] ? (
                    <Image source={{ uri: entry.car.images[0] }} className="w-14 h-14 rounded-lg" />
                  ) : (
                    <View className="w-14 h-14 rounded-lg bg-secondary" />
                  )}
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {entry.car?.title || `${entry.car?.make ?? t("trips.carFallback")} ${entry.car?.model ?? ""}`}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {t("trips.booking", { status: entry.booking.status })}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {t("trips.payment", { status: entry.payment?.status ?? t("trips.pending") })}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {t("trips.payout", { status: entry.payment?.payoutStatus ?? t("trips.pending") })}
                    </Text>
                    {paymentDueAt ? (
                      <Text className="text-xs text-muted-foreground">
                        {t("trips.paymentDue", { date: paymentDueAt.toLocaleString() })}
                      </Text>
                    ) : null}
                    {entry.payment?.depositStatus ? (
                      <Text className="text-xs text-muted-foreground">
                        {t("trips.depositStatus", { status: entry.payment.depositStatus })}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {canPayNow ? (
                  <Pressable
                    onPress={() => handlePayNow(bookingId)}
                    disabled={pendingPayNowBookingId === bookingId}
                    className={`mt-3 rounded-lg py-2 items-center ${
                      pendingPayNowBookingId === bookingId ? "bg-primary/60" : "bg-primary"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {pendingPayNowBookingId === bookingId ? t("carDetail.redirecting") : t("trips.payNow")}
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

                {canReview ? (
                  <View className="mt-3 rounded-lg border border-border p-3">
                    <Text className="text-sm font-semibold text-foreground mb-2">
                      {t("profile.reviews.rateHost")}
                    </Text>
                    <View className="flex-row gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Pressable key={rating} onPress={() => updateDraft(bookingId, { rating })}>
                          <Ionicons
                            name={rating <= draft.rating ? "star" : "star-outline"}
                            size={18}
                            color={getTokenColor(mode, "ratingStar")}
                          />
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      value={draft.comment}
                      onChangeText={(comment) => updateDraft(bookingId, { comment })}
                      placeholder={t("profile.reviews.commentPlaceholder")}
                      placeholderTextColor={getTokenColor(mode, "placeholder")}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      multiline
                    />
                    <Pressable
                      onPress={() => submitReview(bookingId)}
                      disabled={pendingBookingId === bookingId}
                      className={`mt-2 rounded-lg py-2 items-center ${
                        pendingBookingId === bookingId ? "bg-primary/60" : "bg-primary"
                      }`}
                    >
                      <Text className="text-sm font-semibold text-primary-foreground">
                        {t("profile.reviews.submit")}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="car-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
        </View>
        <Text className="text-xl font-semibold text-foreground mb-2 text-center">
          {t("trips.emptyTitle")}
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-6">
          {t("trips.emptySubtitle")}
        </Text>
        <Link href="/" asChild>
          <View className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-primary-foreground font-semibold text-base">
              {t("common.actions.browseCars")}
            </Text>
          </View>
        </Link>
      </View>
    </SafeAreaView>
  );
}
