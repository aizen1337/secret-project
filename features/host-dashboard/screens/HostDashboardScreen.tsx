import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHostDashboardScreenState } from "@/features/host-dashboard/hooks/useHostDashboardScreenState";
import { HostDashboardContent } from "@/features/host-dashboard/ui/HostDashboardContent";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

function CenterLayout({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-1 items-center justify-center px-6">{children}</View>
    </SafeAreaView>
  );
}

export default function HostDashboardScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const state = useHostDashboardScreenState();

  if (!state.isLoaded || state.hostPayoutStatus === undefined) {
    return (
      <CenterLayout>
        <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
      </CenterLayout>
    );
  }

  if (!state.isSignedIn) {
    return (
      <CenterLayout>
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="grid-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
        </View>
        <Text className="text-xl font-semibold text-foreground mb-2 text-center">{t("dashboard.hostDashboard")}</Text>
        <Text className="text-base text-muted-foreground text-center mb-6">{t("dashboard.signInPrompt")}</Text>
        <Link href="/sign-in" asChild>
          <Pressable className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-primary-foreground font-semibold text-base">{t("common.actions.signIn")}</Text>
          </Pressable>
        </Link>
      </CenterLayout>
    );
  }

  if (!state.hostVerified) {
    return (
      <CenterLayout>
        <View className="w-20 h-20 bg-secondary rounded-full items-center justify-center mb-4">
          <Ionicons name="shield-checkmark-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
        </View>
        <Text className="text-xl font-semibold text-foreground mb-2 text-center">
          {t("dashboard.hostVerificationRequiredTitle")}
        </Text>
        <Text className="text-base text-muted-foreground text-center mb-6">
          {t("dashboard.hostVerificationRequiredSubtitle")}
        </Text>
        <Link href="/profile/payments" asChild>
          <Pressable className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-primary-foreground font-semibold text-base">{t("common.actions.setUpPayouts")}</Text>
          </Pressable>
        </Link>
      </CenterLayout>
    );
  }

  return <HostDashboardContent state={state} mode={mode} />;
}
