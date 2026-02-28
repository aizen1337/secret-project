import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ONBOARDING_ROLES,
  type OnboardingScreenController,
} from "@/features/onboarding/hooks/useOnboardingScreenState";
import { getTokenColor, type ThemeMode } from "@/lib/themeTokens";

type OnboardingContentProps = {
  state: OnboardingScreenController;
  mode: ThemeMode;
};

export function OnboardingContent({ state, mode }: OnboardingContentProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="mb-4">
          <Text className="text-2xl font-bold text-foreground">{t("onboarding.title")}</Text>
          <Text className="mt-1 text-sm text-muted-foreground">{t("onboarding.subtitle")}</Text>
        </View>

        {!state.showActivationStep ? (
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-xs uppercase text-muted-foreground">{t("onboarding.steps.role")}</Text>
            <Text className="mt-1 text-lg font-semibold text-foreground">{t("onboarding.role.title")}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">{t("onboarding.role.subtitle")}</Text>

            <View className="mt-4 gap-2">
              {ONBOARDING_ROLES.map((role) => (
                <Pressable
                  key={role}
                  onPress={() => state.handleSelectRole(role)}
                  disabled={state.isSettingRole}
                  className={`rounded-xl border px-4 py-3 ${
                    state.isSettingRole ? "border-primary/40 bg-primary/10" : "border-border bg-background"
                  }`}
                >
                  <Text className="text-base font-semibold text-foreground">{t(`onboarding.role.options.${role}.label`)}</Text>
                  <Text className="mt-1 text-sm text-muted-foreground">
                    {t(`onboarding.role.options.${role}.description`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="gap-4">
            <View className="rounded-xl border border-border bg-card p-4">
              <Text className="text-xs uppercase text-muted-foreground">{t("onboarding.steps.activation")}</Text>
              <Text className="mt-1 text-lg font-semibold text-foreground">{t("onboarding.activation.title")}</Text>
              <Text className="mt-1 text-sm text-muted-foreground">{t("onboarding.activation.subtitle")}</Text>

              <View className="mt-3 flex-row flex-wrap gap-2">
                {ONBOARDING_ROLES.map((role) => {
                  const isActive = state.selectedRole === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => state.handleSelectRole(role)}
                      disabled={state.isSettingRole}
                      className={`rounded-full border px-3 py-1 ${
                        isActive ? "border-primary bg-primary/10" : "border-border bg-background"
                      }`}
                    >
                      <Text className={isActive ? "text-primary font-semibold text-xs" : "text-muted-foreground text-xs"}>
                        {t(`onboarding.role.options.${role}.label`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {state.requiresRenter ? (
              <View className="rounded-xl border border-border bg-card p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-foreground">{t("onboarding.activation.renter.title")}</Text>
                  <View className={`rounded-full px-2 py-1 ${state.renterReady ? "bg-green-100" : "bg-secondary"}`}>
                    <Text className={`text-xs font-semibold ${state.renterReady ? "text-green-700" : "text-muted-foreground"}`}>
                      {state.renterReady ? t("onboarding.activation.status.ready") : t("onboarding.activation.status.pending")}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm text-muted-foreground">{t("onboarding.activation.renter.required")}</Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {state.renterEnabled ? t("onboarding.activation.renter.enabled") : t("onboarding.activation.renter.disabled")}
                </Text>

                <View className="mt-3 rounded-lg border border-border p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-foreground">{t("profile.verification.driverLicense")}</Text>
                    <Text className="text-xs text-muted-foreground">{t(`profile.verification.status.${state.driverLicenseStatus}`)}</Text>
                  </View>
                  <Pressable
                    onPress={state.handleStartDriverLicense}
                    disabled={!state.renterEnabled || state.isStartingLicense || state.driverLicenseStatus === "verified"}
                    className={`mt-2 rounded-lg py-2 items-center ${
                      !state.renterEnabled || state.isStartingLicense || state.driverLicenseStatus === "verified"
                        ? "bg-primary/60"
                        : "bg-primary"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {state.driverLicenseStatus === "verified"
                        ? t("profile.verification.verified")
                        : t("profile.verification.start")}
                    </Text>
                  </Pressable>
                </View>

                <View className="mt-3 rounded-lg border border-border p-3 bg-secondary/20">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-muted-foreground">{t("profile.verification.identityOptional")}</Text>
                    <Text className="text-xs text-muted-foreground">{t(`profile.verification.status.${state.identityStatus}`)}</Text>
                  </View>
                  <Pressable
                    onPress={state.handleStartIdentity}
                    disabled={!state.renterEnabled || state.isStartingIdentity || state.identityStatus === "verified"}
                    className={`mt-2 rounded-lg py-2 items-center ${
                      !state.renterEnabled || state.isStartingIdentity || state.identityStatus === "verified"
                        ? "bg-primary/60"
                        : "bg-primary"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {state.identityStatus === "verified"
                        ? t("profile.verification.verified")
                        : t("profile.verification.start")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {state.requiresHost ? (
              <View className="rounded-xl border border-border bg-card p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-foreground">{t("onboarding.activation.host.title")}</Text>
                  <View className={`rounded-full px-2 py-1 ${state.hostReady ? "bg-green-100" : "bg-secondary"}`}>
                    <Text className={`text-xs font-semibold ${state.hostReady ? "text-green-700" : "text-muted-foreground"}`}>
                      {state.hostReady ? t("onboarding.activation.status.ready") : t("onboarding.activation.status.pending")}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm text-muted-foreground">{t("onboarding.activation.host.required")}</Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {state.hasConnectAccount
                    ? t("onboarding.activation.host.connectExists")
                    : t("onboarding.activation.host.connectMissing")}
                </Text>
                <Pressable
                  onPress={state.handleStartHostSetup}
                  disabled={state.isStartingHostSetup}
                  className={`mt-3 rounded-lg py-2 items-center ${state.isStartingHostSetup ? "bg-primary/60" : "bg-primary"}`}
                >
                  <Text className="text-sm font-semibold text-primary-foreground">
                    {state.isStartingHostSetup ? t("common.loading") : t("common.actions.setUpPayouts")}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {state.isSyncingReturnState || state.isRefreshingConnectState ? (
              <View className="rounded-xl border border-border bg-card px-4 py-3 flex-row items-center">
                <Ionicons name="sync-outline" size={16} color={getTokenColor(mode, "iconMuted")} />
                <Text className="ml-2 text-sm text-muted-foreground">{t("onboarding.messages.refreshing")}</Text>
              </View>
            ) : null}

            <View
              className={`rounded-xl border px-4 py-3 ${
                state.activationComplete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <Text className={`text-sm font-semibold ${state.activationComplete ? "text-green-700" : "text-amber-700"}`}>
                {state.activationComplete
                  ? t("onboarding.activation.readyToFinish")
                  : t("onboarding.activation.canSkip")}
              </Text>
            </View>

            <Pressable
              onPress={() => state.handleFinalize(state.activationComplete ? "completed" : "skipped")}
              disabled={state.isFinalizing}
              className={`rounded-xl py-4 items-center ${state.isFinalizing ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-base font-semibold text-primary-foreground">
                {state.isFinalizing
                  ? t("common.loading")
                  : state.activationComplete
                    ? t("onboarding.actions.finish")
                    : t("onboarding.actions.continueUnverified")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => state.handleFinalize("skipped")}
              disabled={state.isFinalizing}
              className="rounded-xl border border-border bg-card py-4 items-center"
            >
              <Text className="text-base font-semibold text-foreground">{t("onboarding.actions.skipForNow")}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
