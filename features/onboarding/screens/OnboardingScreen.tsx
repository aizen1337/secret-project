import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import * as ExpoLinking from "expo-linking";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/components/feedback/useToast";
import { onboardingApi } from "@/features/onboarding/api";
import { normalizeParam } from "@/features/shared/helpers/routeParams";
import { toLocalizedErrorMessage } from "@/lib/errors";
import { getTokenColor, resolveThemeMode } from "@/lib/themeTokens";

type OnboardingRole = "renter" | "host" | "both";

function isOnboardingRole(value: unknown): value is OnboardingRole {
  return value === "renter" || value === "host" || value === "both";
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const mode = resolveThemeMode(useColorScheme());
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{
    source?: string | string[];
    step?: string | string[];
    verification?: string | string[];
    connect?: string | string[];
  }>();

  const source = normalizeParam(params.source);
  const verificationParam = normalizeParam(params.verification);
  const connectParam = normalizeParam(params.connect);
  const isSignupSource = source === "signup";

  const convexUser = useQuery(onboardingApi.getCurrentUser, isSignedIn ? {} : "skip");
  const renterVerification = useQuery(
    onboardingApi.getMyRenterVerificationStatus,
    isSignedIn ? {} : "skip",
  );
  const hostPayoutStatus = useQuery(onboardingApi.getHostPayoutStatus, isSignedIn ? {} : "skip");

  const beginSignupOnboarding = useMutation(onboardingApi.beginSignupOnboarding);
  const setOnboardingRole = useMutation(onboardingApi.setOnboardingRole);
  const finalizeOnboarding = useMutation(onboardingApi.finalizeOnboarding);
  const startRenterIdentityCheck = useAction(onboardingApi.startRenterIdentityCheck);
  const startRenterDriverLicenseCheck = useAction(onboardingApi.startRenterDriverLicenseCheck);
  const syncRenterVerificationSession = useAction(onboardingApi.syncRenterVerificationSession);
  const createHostOnboardingLink = useAction(onboardingApi.createHostOnboardingLink);
  const refreshHostConnectStatus = useAction(onboardingApi.refreshHostConnectStatus);

  const [isSettingRole, setIsSettingRole] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isStartingIdentity, setIsStartingIdentity] = useState(false);
  const [isStartingLicense, setIsStartingLicense] = useState(false);
  const [isStartingHostSetup, setIsStartingHostSetup] = useState(false);
  const [isSyncingReturnState, setIsSyncingReturnState] = useState(false);
  const [isRefreshingConnectState, setIsRefreshingConnectState] = useState(false);

  const startedSignupInitRef = useRef(false);
  const handledVerificationReturnRef = useRef(false);
  const handledConnectReturnRef = useRef(false);
  const redirectedAwayRef = useRef(false);

  const selectedRole = isOnboardingRole(convexUser?.onboardingRole)
    ? convexUser?.onboardingRole
    : undefined;
  const showActivationStep = Boolean(selectedRole);
  const hasAnyOnboardingState = Boolean(convexUser?.onboardingStatus || selectedRole);

  const renterReady = Boolean(renterVerification?.readyToBook);
  const renterEnabled = renterVerification?.enabled ?? false;
  const identityStatus = renterVerification?.identityStatus ?? "unverified";
  const driverLicenseStatus = renterVerification?.driverLicenseStatus ?? "unverified";
  const hostReady = Boolean(hostPayoutStatus?.payoutsEnabled);
  const hasConnectAccount = Boolean(hostPayoutStatus?.hasConnectAccount);

  const requiresRenter = selectedRole === "renter" || selectedRole === "both";
  const requiresHost = selectedRole === "host" || selectedRole === "both";

  const activationComplete = useMemo(() => {
    if (!selectedRole) return false;
    if (selectedRole === "renter") return renterReady;
    if (selectedRole === "host") return hostReady;
    return renterReady && hostReady;
  }, [hostReady, renterReady, selectedRole]);

  const appOnboardingUrl = (query: string) => {
    const pathname = `/onboarding?${query}`;
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${pathname}`;
    }
    return ExpoLinking.createURL(pathname);
  };

  const onboardingStepPrefix = isSignupSource ? "source=signup&step=activation" : "step=activation";

  const openExternalUrl = async (url: string) => {
    if (typeof window !== "undefined") {
      window.location.href = url;
      return;
    }
    await ExpoLinking.openURL(url);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!isSignupSource) return;
    if (startedSignupInitRef.current) return;
    startedSignupInitRef.current = true;

    void beginSignupOnboarding({})
      .catch((error: unknown) => {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
      });
  }, [beginSignupOnboarding, isLoaded, isSignedIn, isSignupSource, t, toast]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (isSignupSource) return;
    if (convexUser === undefined) return;
    if (hasAnyOnboardingState) return;
    if (redirectedAwayRef.current) return;

    redirectedAwayRef.current = true;
    router.replace("/(tabs)");
  }, [convexUser, hasAnyOnboardingState, isLoaded, isSignedIn, isSignupSource, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    if (verificationParam !== "return") return;
    if (handledVerificationReturnRef.current) return;
    handledVerificationReturnRef.current = true;
    setIsSyncingReturnState(true);

    void syncRenterVerificationSession({})
      .then(() => {
        toast.success(t("onboarding.messages.verificationRefreshed"));
      })
      .catch((error: unknown) => {
        toast.warning(toLocalizedErrorMessage(error, t, "onboarding.messages.verificationRefreshFailed"));
      })
      .finally(() => {
        setIsSyncingReturnState(false);
      });
  }, [isSignedIn, syncRenterVerificationSession, t, toast, verificationParam]);

  useEffect(() => {
    if (!isSignedIn) return;
    if (connectParam !== "return" && connectParam !== "refresh") return;
    if (handledConnectReturnRef.current) return;
    handledConnectReturnRef.current = true;
    setIsRefreshingConnectState(true);

    void refreshHostConnectStatus({})
      .then(() => {
        toast.success(t("onboarding.messages.connectRefreshed"));
      })
      .catch((error: unknown) => {
        toast.warning(toLocalizedErrorMessage(error, t, "onboarding.messages.connectRefreshFailed"));
      })
      .finally(() => {
        setIsRefreshingConnectState(false);
      });
  }, [connectParam, isSignedIn, refreshHostConnectStatus, t, toast]);

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
    return <Redirect href="/sign-in" />;
  }

  if (convexUser === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-muted-foreground">{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignupSource && !hasAnyOnboardingState) {
    return null;
  }

  const handleSelectRole = async (role: OnboardingRole) => {
    setIsSettingRole(true);
    try {
      await setOnboardingRole({ role });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsSettingRole(false);
    }
  };

  const handleFinalize = async (status: "completed" | "skipped") => {
    setIsFinalizing(true);
    try {
      await finalizeOnboarding({ status });
      router.replace("/(tabs)");
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleStartIdentity = async () => {
    setIsStartingIdentity(true);
    try {
      const returnUrl = appOnboardingUrl(`${onboardingStepPrefix}&verification=return`);
      const result = (await startRenterIdentityCheck({ returnUrl })) as { url: string };
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingIdentity(false);
    }
  };

  const handleStartDriverLicense = async () => {
    setIsStartingLicense(true);
    try {
      const returnUrl = appOnboardingUrl(`${onboardingStepPrefix}&verification=return`);
      const result = (await startRenterDriverLicenseCheck({ returnUrl })) as { url: string };
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingLicense(false);
    }
  };

  const handleStartHostSetup = async () => {
    setIsStartingHostSetup(true);
    try {
      const returnUrl = appOnboardingUrl(`${onboardingStepPrefix}&connect=return`);
      const refreshUrl = appOnboardingUrl(`${onboardingStepPrefix}&connect=refresh`);
      const result = (await createHostOnboardingLink({
        returnUrl,
        refreshUrl,
      })) as { url: string };
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingHostSetup(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="mb-4">
          <Text className="text-2xl font-bold text-foreground">{t("onboarding.title")}</Text>
          <Text className="mt-1 text-sm text-muted-foreground">{t("onboarding.subtitle")}</Text>
        </View>

        {!showActivationStep ? (
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-xs uppercase text-muted-foreground">{t("onboarding.steps.role")}</Text>
            <Text className="mt-1 text-lg font-semibold text-foreground">{t("onboarding.role.title")}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">{t("onboarding.role.subtitle")}</Text>

            <View className="mt-4 gap-2">
              {(["renter", "host", "both"] as OnboardingRole[]).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => handleSelectRole(role)}
                  disabled={isSettingRole}
                  className={`rounded-xl border px-4 py-3 ${
                    isSettingRole ? "border-primary/40 bg-primary/10" : "border-border bg-background"
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
                {(["renter", "host", "both"] as OnboardingRole[]).map((role) => {
                  const isActive = selectedRole === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() => handleSelectRole(role)}
                      disabled={isSettingRole}
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

            {requiresRenter ? (
              <View className="rounded-xl border border-border bg-card p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-foreground">{t("onboarding.activation.renter.title")}</Text>
                  <View className={`rounded-full px-2 py-1 ${renterReady ? "bg-green-100" : "bg-secondary"}`}>
                    <Text className={`text-xs font-semibold ${renterReady ? "text-green-700" : "text-muted-foreground"}`}>
                      {renterReady
                        ? t("onboarding.activation.status.ready")
                        : t("onboarding.activation.status.pending")}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm text-muted-foreground">{t("onboarding.activation.renter.required")}</Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {renterEnabled
                    ? t("onboarding.activation.renter.enabled")
                    : t("onboarding.activation.renter.disabled")}
                </Text>

                <View className="mt-3 rounded-lg border border-border p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-foreground">{t("profile.verification.driverLicense")}</Text>
                    <Text className="text-xs text-muted-foreground">{t(`profile.verification.status.${driverLicenseStatus}`)}</Text>
                  </View>
                  <Pressable
                    onPress={handleStartDriverLicense}
                    disabled={!renterEnabled || isStartingLicense || driverLicenseStatus === "verified"}
                    className={`mt-2 rounded-lg py-2 items-center ${
                      !renterEnabled || isStartingLicense || driverLicenseStatus === "verified"
                        ? "bg-primary/60"
                        : "bg-primary"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {driverLicenseStatus === "verified"
                        ? t("profile.verification.verified")
                        : t("profile.verification.start")}
                    </Text>
                  </Pressable>
                </View>

                <View className="mt-3 rounded-lg border border-border p-3 bg-secondary/20">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-muted-foreground">{t("profile.verification.identityOptional")}</Text>
                    <Text className="text-xs text-muted-foreground">{t(`profile.verification.status.${identityStatus}`)}</Text>
                  </View>
                  <Pressable
                    onPress={handleStartIdentity}
                    disabled={!renterEnabled || isStartingIdentity || identityStatus === "verified"}
                    className={`mt-2 rounded-lg py-2 items-center ${
                      !renterEnabled || isStartingIdentity || identityStatus === "verified"
                        ? "bg-primary/60"
                        : "bg-primary"
                    }`}
                  >
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {identityStatus === "verified"
                        ? t("profile.verification.verified")
                        : t("profile.verification.start")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {requiresHost ? (
              <View className="rounded-xl border border-border bg-card p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-foreground">{t("onboarding.activation.host.title")}</Text>
                  <View className={`rounded-full px-2 py-1 ${hostReady ? "bg-green-100" : "bg-secondary"}`}>
                    <Text className={`text-xs font-semibold ${hostReady ? "text-green-700" : "text-muted-foreground"}`}>
                      {hostReady
                        ? t("onboarding.activation.status.ready")
                        : t("onboarding.activation.status.pending")}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm text-muted-foreground">{t("onboarding.activation.host.required")}</Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {hasConnectAccount
                    ? t("onboarding.activation.host.connectExists")
                    : t("onboarding.activation.host.connectMissing")}
                </Text>
                <Pressable
                  onPress={handleStartHostSetup}
                  disabled={isStartingHostSetup}
                  className={`mt-3 rounded-lg py-2 items-center ${isStartingHostSetup ? "bg-primary/60" : "bg-primary"}`}
                >
                  <Text className="text-sm font-semibold text-primary-foreground">
                    {isStartingHostSetup ? t("common.loading") : t("common.actions.setUpPayouts")}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {(isSyncingReturnState || isRefreshingConnectState) ? (
              <View className="rounded-xl border border-border bg-card px-4 py-3 flex-row items-center">
                <Ionicons name="sync-outline" size={16} color={getTokenColor(mode, "iconMuted")} />
                <Text className="ml-2 text-sm text-muted-foreground">{t("onboarding.messages.refreshing")}</Text>
              </View>
            ) : null}

            <View
              className={`rounded-xl border px-4 py-3 ${
                activationComplete ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <Text className={`text-sm font-semibold ${activationComplete ? "text-green-700" : "text-amber-700"}`}>
                {activationComplete
                  ? t("onboarding.activation.readyToFinish")
                  : t("onboarding.activation.canSkip")}
              </Text>
            </View>

            <Pressable
              onPress={() => handleFinalize(activationComplete ? "completed" : "skipped")}
              disabled={isFinalizing}
              className={`rounded-xl py-4 items-center ${isFinalizing ? "bg-primary/60" : "bg-primary"}`}
            >
              <Text className="text-base font-semibold text-primary-foreground">
                {isFinalizing
                  ? t("common.loading")
                  : activationComplete
                    ? t("onboarding.actions.finish")
                    : t("onboarding.actions.continueUnverified")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleFinalize("skipped")}
              disabled={isFinalizing}
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
