import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import type {
  PublicProfileReview,
  PublicUserProfileScreenController,
  RatingDistribution,
} from "@/features/profile/hooks/usePublicUserProfileScreenState";
import { getTokenColor } from "@/lib/themeTokens";

function formatMemberSince(ts: number) {
  if (!Number.isFinite(ts)) return "-";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function formatReviewDate(ts: number) {
  if (!Number.isFinite(ts)) return "-";
  return new Date(ts).toLocaleDateString();
}

function DistributionRows({
  distribution,
  totalReviews,
}: {
  distribution: RatingDistribution;
  totalReviews: number;
}) {
  const rows = [5, 4, 3, 2, 1] as const;

  return (
    <View className="mt-3 gap-2">
      {rows.map((stars) => {
        const rowCount = distribution[stars];
        const widthPct = totalReviews > 0 ? Math.round((rowCount / totalReviews) * 100) : 0;

        return (
          <View key={`distribution-${stars}`} className="flex-row items-center gap-3">
            <Text className="w-9 text-sm text-muted-foreground">{stars}*</Text>
            <View className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
              <View className="h-full rounded-full bg-primary" style={{ width: `${widthPct}%` }} />
            </View>
            <Text className="w-8 text-right text-xs text-muted-foreground">{rowCount}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ReviewCard({
  review,
  fallbackAuthor,
  starColor,
}: {
  review: PublicProfileReview;
  fallbackAuthor: string;
  starColor: string;
}) {
  const authorName = review.author?.name?.trim() || fallbackAuthor;
  const initial = authorName.charAt(0).toUpperCase();

  return (
    <View className="rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-start">
        {review.author?.imageUrl ? (
          <Image source={{ uri: review.author.imageUrl }} className="w-10 h-10 rounded-full" />
        ) : (
          <View className="w-10 h-10 rounded-full bg-secondary items-center justify-center">
            <Text className="text-sm font-semibold text-foreground">{initial || "U"}</Text>
          </View>
        )}
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="text-sm font-semibold text-foreground">{authorName}</Text>
            <Text className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</Text>
          </View>
          <View className="mt-1 flex-row gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Ionicons
                key={`${review.id}-star-${value}`}
                name={value <= review.rating ? "star" : "star-outline"}
                size={13}
                color={starColor}
              />
            ))}
          </View>
          <Text className="mt-2 text-sm text-foreground">{review.comment}</Text>
        </View>
      </View>
    </View>
  );
}

type PublicUserProfileContentProps = {
  state: PublicUserProfileScreenController;
  mode: "light" | "dark";
};

export function PublicUserProfileContent({ state, mode }: PublicUserProfileContentProps) {
  const { t } = useTranslation();
  const profile = state.profile!;
  const tabData = state.activeTab === "renter" ? profile.renter : profile.host;
  const completedCount =
    state.activeTab === "renter" ? profile.renter.completedBookingsCount : profile.host.completedRentalsCount;
  const completedLabel =
    state.activeTab === "renter" ? t("userProfile.completedBookings") : t("userProfile.completedRentals");
  const starColor = getTokenColor(mode, "ratingStar");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-4 pt-3 pb-2 border-b border-border">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => state.router.back()}
            className="w-9 h-9 rounded-full border border-border items-center justify-center"
          >
            <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
          </Pressable>
          <Text className="ml-3 text-lg font-semibold text-foreground">{t("userProfile.title")}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl border border-border bg-card p-4">
          <View className="flex-row items-center">
            {profile.user.imageUrl ? (
              <Image source={{ uri: profile.user.imageUrl }} className="w-14 h-14 rounded-full" />
            ) : (
              <View className="w-14 h-14 rounded-full bg-secondary items-center justify-center">
                <Text className="text-lg font-semibold text-foreground">
                  {(profile.user.name?.trim().charAt(0) || "U").toUpperCase()}
                </Text>
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text className="text-lg font-semibold text-foreground">{profile.user.name}</Text>
              <Text className="text-xs text-muted-foreground mt-1">
                {t("userProfile.memberSince", { date: formatMemberSince(profile.user.createdAt) })}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row rounded-xl bg-secondary p-1">
          <Pressable
            onPress={() => state.setActiveTab("renter")}
            className={`flex-1 rounded-lg py-2.5 ${state.activeTab === "renter" ? "bg-card" : ""}`}
          >
            <Text className={`text-center font-medium ${state.activeTab === "renter" ? "text-foreground" : "text-muted-foreground"}`}>
              {t("userProfile.tabs.renter")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => state.setActiveTab("host")}
            className={`flex-1 rounded-lg py-2.5 ${state.activeTab === "host" ? "bg-card" : ""}`}
          >
            <Text className={`text-center font-medium ${state.activeTab === "host" ? "text-foreground" : "text-muted-foreground"}`}>
              {t("userProfile.tabs.host")}
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 rounded-2xl border border-border bg-card p-4">
          <View className="flex-row flex-wrap gap-y-3">
            <View className="w-1/2 pr-3">
              <Text className="text-xs uppercase text-muted-foreground tracking-wide">{completedLabel}</Text>
              <Text className="mt-1 text-xl font-semibold text-foreground">{completedCount}</Text>
            </View>
            <View className="w-1/2">
              <Text className="text-xs uppercase text-muted-foreground tracking-wide">
                {t("userProfile.averageRating")}
              </Text>
              <View className="mt-1 flex-row items-center gap-2">
                <Text className="text-xl font-semibold text-foreground">{tabData.rating.average.toFixed(2)}</Text>
                <Text className="text-xs text-muted-foreground">
                  {t("userProfile.totalReviews", { count: tabData.rating.count })}
                </Text>
              </View>
            </View>
          </View>

          <Text className="mt-4 text-sm font-semibold text-foreground">{t("userProfile.distributionTitle")}</Text>
          <DistributionRows distribution={tabData.rating.distribution} totalReviews={tabData.rating.count} />
        </View>

        {state.activeTab === "host" && !profile.host.isHost ? (
          <View className="mt-4 rounded-2xl border border-border bg-card p-4">
            <Text className="text-sm text-muted-foreground">{t("userProfile.noHostActivity")}</Text>
          </View>
        ) : null}

        <View className="mt-4 pb-8">
          {tabData.reviews.length > 0 ? (
            <View className="gap-3">
              {tabData.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} fallbackAuthor={t("common.unknown")} starColor={starColor} />
              ))}
            </View>
          ) : (
            <View className="rounded-2xl border border-border bg-card p-4">
              <Text className="text-sm text-muted-foreground">{t("userProfile.noReviews")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
