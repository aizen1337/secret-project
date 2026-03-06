import { Pressable, Text, View } from "react-native";
import { useAction, useQuery } from "convex/react";
import * as ExpoLinking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/feedback/useToast";
import { profileApi } from "@/features/profile/api";
import { toLocalizedErrorMessage } from "@/lib/errors";

type HostPayoutCardProps = {
  connect?: string;
  redirectPath?: string;
};

export function HostPayoutCard({ connect, redirectPath = "/dashboard/company-details" }: HostPayoutCardProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const hostPayoutStatus = useQuery(profileApi.getHostPayoutStatus);
  const createHostOnboardingLink = useAction(profileApi.createHostOnboardingLink);
  const refreshHostConnectStatus = useAction(profileApi.refreshHostConnectStatus);
  const [isOpeningPayoutSetup, setIsOpeningPayoutSetup] = useState(false);
  const [isRefreshingPayoutStatus, setIsRefreshingPayoutStatus] = useState(false);
  const connectRedirectArgs = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const refreshUrl = new URL(redirectPath, window.location.origin);
    refreshUrl.searchParams.set("connect", "refresh");
    const returnUrl = new URL(redirectPath, window.location.origin);
    returnUrl.searchParams.set("connect", "return");
    return {
      refreshUrl: refreshUrl.toString(),
      returnUrl: returnUrl.toString(),
    };
  }, [redirectPath]);

  useEffect(() => {
    if (connect !== "return" && connect !== "refresh") return;

    let active = true;
    void (async () => {
      setIsRefreshingPayoutStatus(true);
      try {
        await refreshHostConnectStatus(connectRedirectArgs ?? {});
      } catch (error) {
        if (active) {
          toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
        }
      } finally {
        if (active) {
          setIsRefreshingPayoutStatus(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [connect, connectRedirectArgs, refreshHostConnectStatus, t, toast]);

  const payoutStatusLabel = !hostPayoutStatus?.hasConnectAccount
    ? t("profile.payouts.statuses.onboarding")
    : hostPayoutStatus.payoutsEnabled
      ? t("profile.payouts.statuses.ready")
      : t("profile.payouts.statuses.pending");
  const hostVerificationLabel = hostPayoutStatus?.hostVerified
    ? t("profile.verification.status.verified")
    : t("profile.verification.status.unverified");
  const verificationStateDescription = hostPayoutStatus
    ? t(`profile.payouts.verificationState.${hostPayoutStatus.verificationState}`)
    : "";
  const requiredActions = Array.isArray(hostPayoutStatus?.requiredActions)
    ? hostPayoutStatus.requiredActions
    : [];
  const shouldShowIdentityVerification = Boolean(hostPayoutStatus?.identityDocumentRequired);
  const shouldShowManagePayouts = Boolean(
    hostPayoutStatus?.verificationState === "verified_ready" && !shouldShowIdentityVerification,
  );
  const showRequiredActions = requiredActions.length > 0;
  const requiredActionInstructions = [
    shouldShowIdentityVerification ? t("profile.payouts.verifyIdentityDocument") : null,
    !shouldShowIdentityVerification && showRequiredActions
      ? t("profile.payouts.resolveRequiredActions")
      : null,
    hostPayoutStatus && !hostPayoutStatus.onboardingComplete
      ? t("profile.payouts.continueSetup")
      : null,
  ].filter(Boolean) as string[];

  const handleOpenPayoutSetup = async () => {
    setIsOpeningPayoutSetup(true);
    try {
      const result = shouldShowIdentityVerification
        ? ((await createHostOnboardingLink(connectRedirectArgs ?? {})) as { url: string })
        : (() => {
            return refreshHostConnectStatus(connectRedirectArgs ?? {}).then(
              (refreshed: { verificationUrl?: string | null }) =>
                refreshed?.verificationUrl
                  ? { url: refreshed.verificationUrl }
                  : createHostOnboardingLink(connectRedirectArgs ?? {}),
            ) as Promise<{ url: string }>;
          })();
      const resolved = await result;
      if (typeof window !== "undefined") {
        window.location.href = resolved.url;
      } else {
        await ExpoLinking.openURL(resolved.url);
      }
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
    } finally {
      setIsOpeningPayoutSetup(false);
    }
  };

  return (
    <View className="bg-card rounded-xl border border-border p-4">
      <Text className="text-base font-semibold text-foreground mb-2">{t("profile.payouts.title")}</Text>
      <View className="mb-2 flex-row items-center justify-between rounded-lg border border-border px-3 py-2">
        <Text className="text-sm text-foreground">{t("profile.payouts.hostVerificationLabel")}</Text>
        <Text className={`text-xs font-semibold ${hostPayoutStatus?.hostVerified ? "text-green-700" : "text-amber-700"}`}>
          {hostVerificationLabel}
        </Text>
      </View>
      <Text className="text-sm text-muted-foreground mb-3">
        {t("profile.payouts.statusLabel", { status: payoutStatusLabel })}
      </Text>
      {hostPayoutStatus ? (
        <View className="mb-3 rounded-lg border border-border px-3 py-2">
          <Text className="text-xs text-muted-foreground mb-2">{verificationStateDescription}</Text>
          {hostPayoutStatus.disabledReason ? (
            <Text className="mb-2 text-xs text-amber-700">
              {t("profile.payouts.disabledReason", { reason: hostPayoutStatus.disabledReason })}
            </Text>
          ) : null}
          {showRequiredActions ? (
            <View className="mb-2 rounded-md border border-border bg-secondary/20 px-2 py-2">
              <Text className="text-xs font-semibold text-foreground mb-1">
                {t("profile.payouts.requiredActionsTitle")}
              </Text>
              {requiredActionInstructions.map((instruction, index) => (
                <Text key={`instruction-${index}`} className="text-xs text-muted-foreground">
                  {`\u2022 ${instruction}`}
                </Text>
              ))}
            </View>
          ) : null}
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-foreground">{t("profile.payouts.capabilities.onboarding")}</Text>
            <Text className={`text-xs font-semibold ${hostPayoutStatus.onboardingComplete ? "text-green-700" : "text-amber-700"}`}>
              {hostPayoutStatus.onboardingComplete ? t("profile.payouts.capability.enabled") : t("profile.payouts.capability.disabled")}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-foreground">{t("profile.payouts.capabilities.charges")}</Text>
            <Text className={`text-xs font-semibold ${hostPayoutStatus.chargesEnabled ? "text-green-700" : "text-amber-700"}`}>
              {hostPayoutStatus.chargesEnabled ? t("profile.payouts.capability.enabled") : t("profile.payouts.capability.disabled")}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-foreground">{t("profile.payouts.capabilities.payouts")}</Text>
            <Text className={`text-xs font-semibold ${hostPayoutStatus.payoutsEnabled ? "text-green-700" : "text-amber-700"}`}>
              {hostPayoutStatus.payoutsEnabled ? t("profile.payouts.capability.enabled") : t("profile.payouts.capability.disabled")}
            </Text>
          </View>
        </View>
      ) : null}
      {isRefreshingPayoutStatus ? (
        <Text className="text-xs text-muted-foreground mb-2">{t("common.loading")}</Text>
      ) : null}
      <Pressable
        onPress={handleOpenPayoutSetup}
        disabled={isOpeningPayoutSetup}
        className={`rounded-lg px-3 py-3 items-center ${isOpeningPayoutSetup ? "bg-primary/70" : "bg-primary"}`}
      >
        <Text className="text-primary-foreground font-semibold">
          {isOpeningPayoutSetup
            ? t("profile.payouts.opening")
            : shouldShowIdentityVerification
              ? t("profile.payouts.verifyIdentityDocument")
              : shouldShowManagePayouts
                ? t("profile.payouts.manageCompanyDetails")
                : t("profile.payouts.resolveRequiredActions")}
        </Text>
      </Pressable>
    </View>
  );
}
