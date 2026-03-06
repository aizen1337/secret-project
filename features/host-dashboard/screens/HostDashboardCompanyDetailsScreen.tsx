import { Pressable, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Link, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHostDashboardScreenState } from "@/features/host-dashboard/hooks/useHostDashboardScreenState";
import { HostDashboardContent } from "@/features/host-dashboard/ui/HostDashboardContent";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

export default function HostDashboardCompanyDetailsScreen() {
  const { t } = useTranslation();
  const mode = resolveThemeMode(useColorScheme());
  const { connect } = useLocalSearchParams<{ connect?: string }>();
  const state = useHostDashboardScreenState();

  if (!state.isLoaded || state.hostPayoutStatus === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!state.isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <Ionicons name="grid-outline" size={40} color={getTokenColor(mode, "iconMuted")} />
          </View>
          <Text className="mb-2 text-center text-xl font-semibold text-foreground">{t("dashboard.hostDashboard")}</Text>
          <Text className="mb-6 text-center text-base text-muted-foreground">{t("dashboard.signInPrompt")}</Text>
          <Link href="/sign-in" asChild>
            <Pressable className="rounded-xl bg-primary px-6 py-3">
              <Text className="text-base font-semibold text-primary-foreground">{t("common.actions.signIn")}</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return <HostDashboardContent state={state} mode={mode} section="company_details" connect={connect} />;
}
