'use client';

import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";
import { useAppLanguage } from "@/hooks/useAppLanguage";

type MenuItem = {
  icon: string;
  label: string;
  href: string;
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colorSchemeState = useColorScheme();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);
  const renterVerification = useQuery(api.verification.getMyRenterVerificationStatus as any);
  const hostPayoutStatus = useQuery(api.users.getHostPayoutStatus);
  const router = useRouter();
  const mode = resolveThemeMode(colorSchemeState);
  const { language } = useAppLanguage();

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
          <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
            <Ionicons name="person-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
          </View>
          <Text className="text-xl font-semibold text-foreground mb-2 text-center">
            {t("profile.logInTitle")}
          </Text>
          <Text className="text-base text-muted-foreground text-center mb-6">
            {t("profile.logInSubtitle")}
          </Text>
          <Link href="/sign-in" asChild>
            <Pressable className="bg-primary px-6 py-3 rounded-xl mb-3 w-full max-w-xs">
              <Text className="text-primary-foreground font-semibold text-base text-center">
                {t("common.actions.signIn")}
              </Text>
            </Pressable>
          </Link>
          <Link href="/sign-up" asChild>
            <Pressable className="border border-border px-6 py-3 rounded-xl w-full max-w-xs">
              <Text className="text-foreground font-semibold text-base text-center">
                {t("common.actions.signUp")}
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const displayName =
    convexUser?.name ||
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    t("profile.titleGuest");
  const avatarUrl = convexUser?.imageUrl || user?.imageUrl;
  const memberSince = convexUser?.createdAt
    ? new Date(convexUser.createdAt).toLocaleDateString(language === "pl" ? "pl-PL" : "en-US", {
        year: "numeric",
        month: "short",
      })
    : null;

  const renterReady = Boolean(renterVerification?.enabled && renterVerification?.readyToBook);
  const hostReady = Boolean(hostPayoutStatus?.payoutsEnabled);

  const menuItems: MenuItem[] = [
    { icon: "settings-outline", label: t("profile.menu.settings"), href: "/profile/settings" },
    { icon: "shield-outline", label: t("profile.menu.privacy"), href: "/profile/privacy" },
    { icon: "star-outline", label: t("profile.menu.reviews"), href: "/profile/reviews" },
    { icon: "card-outline", label: t("profile.menu.payments"), href: "/profile/payments" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-4">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} className="w-16 h-16 rounded-full" />
          ) : (
            <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
              <Ionicons name="person-outline" size={28} color={getTokenColor(mode, "iconMuted")} />
            </View>
          )}
          <View className="ml-4 flex-1">
            <Text className="text-xl font-semibold text-foreground">{displayName}</Text>
            <Text className="text-sm text-muted-foreground capitalize">{t("profile.member")}</Text>
            {memberSince ? (
              <Text className="text-xs text-muted-foreground">{t("profile.memberSince", { date: memberSince })}</Text>
            ) : null}
            {user?.primaryEmailAddress?.emailAddress ? (
              <Text className="text-xs text-muted-foreground">{user.primaryEmailAddress.emailAddress}</Text>
            ) : null}
          </View>
        </View>

        <View className="mb-6 flex-row gap-2">
          <View className={`rounded-full px-3 py-1 flex-row items-center ${renterReady ? "bg-green-100" : "bg-secondary"}`}>
            <Ionicons
              name="person-circle-outline"
              size={14}
              color={renterReady ? "#15803d" : getTokenColor(mode, "iconMuted")}
            />
            <Text className={`text-xs font-semibold ${renterReady ? "text-green-700" : "text-muted-foreground"}`}>
              {" "}{t("profile.badges.renter")} · {renterReady ? t("profile.badges.verified") : t("profile.badges.pending")}
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1 flex-row items-center ${hostReady ? "bg-green-100" : "bg-secondary"}`}>
            <Ionicons
              name="car-sport-outline"
              size={14}
              color={hostReady ? "#15803d" : getTokenColor(mode, "iconMuted")}
            />
            <Text className={`text-xs font-semibold ${hostReady ? "text-green-700" : "text-muted-foreground"}`}>
              {" "}{t("profile.badges.host")} · {hostReady ? t("profile.badges.verified") : t("profile.badges.pending")}
            </Text>
          </View>
        </View>

        <View className="bg-card rounded-xl border border-border overflow-hidden">
          {menuItems.map((item, index) => (
            <Link key={item.href} href={item.href as any} asChild>
              <Pressable
                className={`flex-row items-center px-4 py-4 ${index < menuItems.length - 1 ? "border-b border-border" : ""}`}
              >
                <Ionicons name={item.icon as any} size={20} color={getTokenColor(mode, "icon")} />
                <Text className="flex-1 ml-3 text-base text-foreground">{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={getTokenColor(mode, "iconMuted")} />
              </Pressable>
            </Link>
          ))}
        </View>

        <Pressable
          onPress={() => {
            signOut();
            router.replace("/");
          }}
          className="mt-6 border border-destructive py-4 rounded-xl items-center"
        >
          <Text className="text-destructive font-semibold text-base">{t("common.actions.logOut")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

