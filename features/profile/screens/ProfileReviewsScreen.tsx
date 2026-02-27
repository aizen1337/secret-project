'use client';

import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { profileApi } from "@/features/profile/api";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type ReviewEntry = {
  review: {
    _id: string;
    rating: number;
    comment: string;
  };
  author: {
    name?: string;
  } | null;
};

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

export default function ProfileReviewsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<"renter" | "host">("renter");

  const convexUser = useQuery(profileApi.getCurrentUser);
  const renterVerification = useQuery(
    profileApi.getMyRenterVerificationStatus,
    isSignedIn ? {} : "skip",
  ) as { enabled?: boolean; readyToBook?: boolean } | undefined;
  const hostPayoutStatus = useQuery(
    profileApi.getHostPayoutStatus,
    isSignedIn ? {} : "skip",
  ) as { hostVerified?: boolean } | undefined;

  const renterVerified = Boolean(renterVerification?.enabled && renterVerification?.readyToBook);
  const hostVerified = Boolean(hostPayoutStatus?.hostVerified);

  const canViewRenterTab = renterVerified;
  const canViewHostTab = hostVerified;

  const isDataLoading =
    isSignedIn &&
    (convexUser === undefined || renterVerification === undefined || hostPayoutStatus === undefined);

  useEffect(() => {
    if (activeTab === "renter" && !canViewRenterTab && canViewHostTab) {
      setActiveTab("host");
      return;
    }
    if (activeTab === "host" && !canViewHostTab && canViewRenterTab) {
      setActiveTab("renter");
    }
  }, [activeTab, canViewHostTab, canViewRenterTab]);

  const renterReviews = useQuery(
    profileApi.listReviewsForUser,
    convexUser?._id && canViewRenterTab
      ? { userId: convexUser._id, direction: "host_to_renter", limit: 20 }
      : "skip",
  ) as ReviewEntry[] | undefined;
  const renterSummary = useQuery(
    profileApi.getUserReviewSummary,
    convexUser?._id && canViewRenterTab
      ? { userId: convexUser._id, direction: "host_to_renter" }
      : "skip",
  ) as { count: number; average: number } | undefined;

  const hostReviews = useQuery(
    profileApi.listReviewsForUser,
    convexUser?._id && canViewHostTab
      ? { userId: convexUser._id, direction: "renter_to_host", limit: 20 }
      : "skip",
  ) as ReviewEntry[] | undefined;
  const hostSummary = useQuery(
    profileApi.getUserReviewSummary,
    convexUser?._id && canViewHostTab
      ? { userId: convexUser._id, direction: "renter_to_host" }
      : "skip",
  ) as { count: number; average: number } | undefined;

  const noVerifiedRoles = useMemo(
    () => !canViewRenterTab && !canViewHostTab,
    [canViewHostTab, canViewRenterTab],
  );

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground text-center mb-4">{t("profile.logInSubtitle")}</Text>
          <Link href="/sign-in" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-xl">
              <Text className="text-primary-foreground font-semibold text-base">{t("common.actions.signIn")}</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  if (isDataLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-full bg-secondary items-center justify-center">
          <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
        </Pressable>
        <Text className="ml-3 text-lg font-semibold text-foreground">{t("profile.menu.reviews")}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="flex-row bg-secondary rounded-xl p-1 mb-4">
          <Pressable
            onPress={() => {
              if (canViewRenterTab) {
                setActiveTab("renter");
              }
            }}
            disabled={!canViewRenterTab}
            className={`flex-1 py-3 rounded-lg ${
              activeTab === "renter" ? "bg-card" : ""
            } ${!canViewRenterTab ? "opacity-50" : ""}`}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === "renter" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t("profile.reviews.tabs.renter")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (canViewHostTab) {
                setActiveTab("host");
              }
            }}
            disabled={!canViewHostTab}
            className={`flex-1 py-3 rounded-lg ${
              activeTab === "host" ? "bg-card" : ""
            } ${!canViewHostTab ? "opacity-50" : ""}`}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === "host" ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t("profile.reviews.tabs.host")}
            </Text>
          </Pressable>
        </View>

        {noVerifiedRoles ? (
          <View className="bg-card rounded-xl border border-border p-4">
            <Text className="text-sm text-muted-foreground">{t("profile.reviews.noVerifiedRoles")}</Text>
          </View>
        ) : null}

        {!noVerifiedRoles && activeTab === "renter" ? (
          canViewRenterTab ? (
            <ReviewSection
              title={t("profile.reviews.renterTitle")}
              summary={t("profile.reviews.renterSummary", {
                count: renterSummary?.count ?? 0,
                average: renterSummary?.average ?? 0,
              })}
              emptyLabel={t("profile.reviews.renterEmpty")}
              fallbackAuthor={t("carDetail.host")}
              rows={renterReviews}
            />
          ) : (
            renderLockedState("renter")
          )
        ) : null}

        {!noVerifiedRoles && activeTab === "host" ? (
          canViewHostTab ? (
            <ReviewSection
              title={t("profile.reviews.hostTitle")}
              summary={t("profile.reviews.hostSummary", {
                count: hostSummary?.count ?? 0,
                average: hostSummary?.average ?? 0,
              })}
              emptyLabel={t("profile.reviews.hostEmpty")}
              fallbackAuthor={t("profile.badges.renter")}
              rows={hostReviews}
            />
          ) : (
            renderLockedState("host")
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

