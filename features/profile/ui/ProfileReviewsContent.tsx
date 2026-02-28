'use client';

import { ScrollView, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import type {
  ProfileReviewsScreenController,
  ReviewEntry,
} from "@/features/profile/hooks/useProfileReviewsScreenState";
import { getTokenColor } from "@/lib/themeTokens";

function ReviewSection(props: {
  title: string;
  summary: string;
  emptyLabel: string;
  fallbackAuthor: string;
  rows: ReviewEntry[] | undefined;
}) {
  return (
    <View className="bg-card rounded-xl border border-border p-4 mb-4">
      <Text className="text-base font-semibold text-foreground mb-2">{props.title}</Text>
      <Text className="text-sm text-muted-foreground mb-3">{props.summary}</Text>
      {props.rows && props.rows.length > 0 ? (
        props.rows.map((entry) => (
          <View key={entry.review._id} className="mb-2 rounded-lg border border-border p-3">
            <Text className="text-sm font-semibold text-foreground">
              {entry.author?.name ?? props.fallbackAuthor}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">{entry.review.rating}/5</Text>
            <Text className="text-sm text-foreground mt-1">{entry.review.comment}</Text>
          </View>
        ))
      ) : (
        <Text className="text-sm text-muted-foreground">{props.emptyLabel}</Text>
      )}
    </View>
  );
}

type ProfileReviewsContentProps = {
  state: ProfileReviewsScreenController;
  mode: "light" | "dark";
};

export function ProfileReviewsContent({ state, mode }: ProfileReviewsContentProps) {
  const { t } = useTranslation();
  const renderLockedState = (role: "renter" | "host") => (
    <View className="bg-card rounded-xl border border-border p-4 mt-4">
      <Text className="text-sm text-muted-foreground">
        {role === "renter"
          ? t("profile.reviews.renterVerificationRequired")
          : t("profile.reviews.hostVerificationRequired")}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 border-b border-border flex-row items-center">
        <Pressable onPress={() => state.router.back()} className="w-9 h-9 rounded-full bg-secondary items-center justify-center">
          <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
        </Pressable>
        <Text className="ml-3 text-lg font-semibold text-foreground">{t("profile.menu.reviews")}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="flex-row bg-secondary rounded-xl p-1 mb-4">
          <Pressable
            onPress={() => {
              if (state.canViewRenterTab) state.setActiveTab("renter");
            }}
            disabled={!state.canViewRenterTab}
            className={`flex-1 py-3 rounded-lg ${state.activeTab === "renter" ? "bg-card" : ""} ${!state.canViewRenterTab ? "opacity-50" : ""}`}
          >
            <Text className={`text-center font-medium ${state.activeTab === "renter" ? "text-foreground" : "text-muted-foreground"}`}>
              {t("profile.reviews.tabs.renter")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (state.canViewHostTab) state.setActiveTab("host");
            }}
            disabled={!state.canViewHostTab}
            className={`flex-1 py-3 rounded-lg ${state.activeTab === "host" ? "bg-card" : ""} ${!state.canViewHostTab ? "opacity-50" : ""}`}
          >
            <Text className={`text-center font-medium ${state.activeTab === "host" ? "text-foreground" : "text-muted-foreground"}`}>
              {t("profile.reviews.tabs.host")}
            </Text>
          </Pressable>
        </View>

        {state.noVerifiedRoles ? (
          <View className="bg-card rounded-xl border border-border p-4">
            <Text className="text-sm text-muted-foreground">{t("profile.reviews.noVerifiedRoles")}</Text>
          </View>
        ) : null}

        {!state.noVerifiedRoles && state.activeTab === "renter" ? (
          state.canViewRenterTab ? (
            <ReviewSection
              title={t("profile.reviews.renterTitle")}
              summary={t("profile.reviews.renterSummary", {
                count: state.renterSummary?.count ?? 0,
                average: state.renterSummary?.average ?? 0,
              })}
              emptyLabel={t("profile.reviews.renterEmpty")}
              fallbackAuthor={t("carDetail.host")}
              rows={state.renterReviews}
            />
          ) : (
            renderLockedState("renter")
          )
        ) : null}

        {!state.noVerifiedRoles && state.activeTab === "host" ? (
          state.canViewHostTab ? (
            <ReviewSection
              title={t("profile.reviews.hostTitle")}
              summary={t("profile.reviews.hostSummary", {
                count: state.hostSummary?.count ?? 0,
                average: state.hostSummary?.average ?? 0,
              })}
              emptyLabel={t("profile.reviews.hostEmpty")}
              fallbackAuthor={t("profile.badges.renter")}
              rows={state.hostReviews}
            />
          ) : (
            renderLockedState("host")
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
