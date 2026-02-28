import { Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Redirect } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOnboardingScreenState } from "@/features/onboarding/hooks/useOnboardingScreenState";
import { OnboardingContent } from "@/features/onboarding/ui/OnboardingContent";
import { resolveThemeMode } from "@/lib/themeTokens";

function LoadingState({ label }: { label: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-muted-foreground">{label}</Text>
      </View>
    </SafeAreaView>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const state = useOnboardingScreenState();

  if (!state.isLoaded) return <LoadingState label={t("common.loading")} />;
  if (!state.isSignedIn) return <Redirect href="/sign-in" />;
  if (state.convexUser === undefined) return <LoadingState label={t("common.loading")} />;
  if (!state.isSignupSource && !state.hasAnyOnboardingState) return null;

  return <OnboardingContent state={state} mode={mode} />;
}
