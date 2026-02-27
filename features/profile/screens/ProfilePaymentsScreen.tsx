'use client';

import { ScrollView, View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { HostPayoutCard } from "@/features/profile/ui/HostPayoutCard";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function ProfilePaymentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();
  const { connect } = useLocalSearchParams<{ connect?: string }>();

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 border-b border-border flex-row items-center">
        <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-full bg-secondary items-center justify-center">
          <Ionicons name="chevron-back" size={18} color={getTokenColor(mode, "icon")} />
        </Pressable>
        <Text className="ml-3 text-lg font-semibold text-foreground">{t("profile.menu.payments")}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <HostPayoutCard connect={connect} />
      </ScrollView>
    </SafeAreaView>
  );
}

