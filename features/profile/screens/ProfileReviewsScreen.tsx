'use client';

import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useProfileReviewsScreenState } from "@/features/profile/hooks/useProfileReviewsScreenState";
import { ProfileReviewsContent } from "@/features/profile/ui/ProfileReviewsContent";
import { resolveThemeMode } from "@/lib/themeTokens";

function CenterMessage({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">{children}</View>
    </SafeAreaView>
  );
}

export default function ProfileReviewsScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const state = useProfileReviewsScreenState();

  if (!state.isLoaded || state.isDataLoading) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
      </CenterMessage>
    );
  }

  if (!state.isSignedIn) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center mb-4">{t("profile.logInSubtitle")}</Text>
        <Link href="/sign-in" asChild>
          <Pressable className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-primary-foreground font-semibold text-base">{t("common.actions.signIn")}</Text>
          </Pressable>
        </Link>
      </CenterMessage>
    );
  }

  return <ProfileReviewsContent state={state} mode={mode} />;
}
