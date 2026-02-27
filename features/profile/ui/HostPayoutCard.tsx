import { Pressable, Text, View } from "react-native";
import { useAction, useQuery } from "convex/react";
import * as ExpoLinking from "expo-linking";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/feedback/useToast";
import { profileApi } from "@/features/profile/api";
import { toLocalizedErrorMessage } from "@/lib/errors";

type HostPayoutCardProps = {
  connect?: string;
};

export function HostPayoutCard({ connect }: HostPayoutCardProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const hostPayoutStatus = useQuery(profileApi.getHostPayoutStatus);
  const createHostOnboardingLink = useAction(profileApi.createHostOnboardingLink);
  const refreshHostConnectStatus = useAction(profileApi.refreshHostConnectStatus);
  const [isOpeningPayoutSetup, setIsOpeningPayoutSetup] = useState(false);
  const [isRefreshingPayoutStatus, setIsRefreshingPayoutStatus] = useState(false);

  useEffect(() => {
    if (connect !== "return" && connect !== "refresh") return;

    let active = true;
    void (async () => {
      setIsRefreshingPayoutStatus(true);
      try {
        await refreshHostConnectStatus({});
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
  }, [connect, refreshHostConnectStatus, t, toast]);

  const payoutStatusLabel = !hostPayoutStatus?.hasConnectAccount
    ? t("profile.payouts.statuses.onboarding")
    : hostPayoutStatus.payoutsEnabled
      ? t("profile.payouts.statuses.ready")
      : t("profile.payouts.statuses.pending");
  const hostVerificationLabel = hostPayoutStatus?.hostVerified
    ? t("profile.verification.status.verified")
    : t("profile.verification.status.unverified");

  const handleOpenPayoutSetup = async () => {
    setIsOpeningPayoutSetup(true);
    try {
      const result = (await createHostOnboardingLink({})) as { url: string };
      if (typeof window !== "undefined") {
        window.location.href = result.url;
      } else {
        await ExpoLinking.openURL(result.url);
      }
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
      {isRefreshingPayoutStatus ? (
        <Text className="text-xs text-muted-foreground mb-2">{t("common.loading")}</Text>
      ) : null}
      <Pressable
        onPress={handleOpenPayoutSetup}
        disabled={isOpeningPayoutSetup}
        className={`rounded-lg px-3 py-3 items-center ${isOpeningPayoutSetup ? "bg-primary/70" : "bg-primary"}`}
      >
        <Text className="text-primary-foreground font-semibold">
          {isOpeningPayoutSetup ? t("profile.payouts.opening") : t("common.actions.setUpPayouts")}
        </Text>
      </Pressable>
    </View>
  );
}
