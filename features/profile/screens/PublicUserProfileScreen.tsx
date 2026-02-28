import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Link, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePublicUserProfileScreenState } from "@/features/profile/hooks/usePublicUserProfileScreenState";
import { PublicUserProfileContent } from "@/features/profile/ui/PublicUserProfileContent";
import { resolveThemeMode } from "@/lib/themeTokens";

function CenterMessage({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center px-6">{children}</View>
    </SafeAreaView>
  );
}

export default function PublicUserProfileScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const state = usePublicUserProfileScreenState();

  if (!state.isLoaded) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
      </CenterMessage>
    );
  }

  if (!state.isSignedIn) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center mb-4">{t("userProfile.signInRequired")}</Text>
        <Link href="/sign-in" asChild>
          <Pressable className="bg-primary rounded-xl px-6 py-3">
            <Text className="text-base font-semibold text-primary-foreground">{t("common.actions.signIn")}</Text>
          </Pressable>
        </Link>
      </CenterMessage>
    );
  }

  if (!state.userIdParam || state.profile === undefined) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center">
          {state.userIdParam ? t("common.loading") : t("userProfile.unavailable")}
        </Text>
      </CenterMessage>
    );
  }

  if (!state.profile) {
    return (
      <CenterMessage>
        <Text className="text-base text-muted-foreground text-center">{t("userProfile.unavailable")}</Text>
      </CenterMessage>
    );
  }

  return <PublicUserProfileContent state={state} mode={mode} />;
}
