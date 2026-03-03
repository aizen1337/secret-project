import { Pressable, Text, View } from "react-native";
import { useAction, useQuery } from "convex/react";
import * as ExpoLinking from "expo-linking";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/feedback/useToast";
import { profileApi } from "@/features/profile/api";
import { toLocalizedErrorMessage } from "@/lib/errors";
import { verificationBadge } from "./verificationUi";

export function RenterVerificationCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const renterVerification = useQuery(profileApi.getMyRenterVerificationStatus);
  const startRenterDriverLicenseCheck = useAction(profileApi.startRenterDriverLicenseCheck);
  const [isStartingLicenseVerification, setIsStartingLicenseVerification] = useState(false);

  const openExternalUrl = async (url: string) => {
    if (typeof window !== "undefined") {
      window.location.href = url;
      return;
    }
    await ExpoLinking.openURL(url);
  };

  const handleStartStripeVerification = async () => {
    setIsStartingLicenseVerification(true);
    try {
      const result = (await startRenterDriverLicenseCheck({
        provider: "stripe",
      })) as { url: string };
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingLicenseVerification(false);
    }
  };

  const verificationEnabled = renterVerification?.enabled ?? false;
  const driverLicenseStatus = renterVerification?.driverLicenseStatus ?? "unverified";
  const readyToBook = renterVerification?.readyToBook ?? false;
  const renterVerified = verificationEnabled && readyToBook;

  return (
    <View className="bg-card rounded-xl border border-border p-4">
      <Text className="text-base font-semibold text-foreground mb-2">{t("profile.verification.title")}</Text>
      <View className="mb-2 flex-row items-center justify-between rounded-lg border border-border px-3 py-2">
        <Text className="text-sm text-foreground">{t("profile.verification.renterLabel")}</Text>
        <Text className={`text-xs font-semibold ${renterVerified ? "text-green-700" : "text-amber-700"}`}>
          {renterVerified ? t("profile.verification.status.verified") : t("profile.verification.status.unverified")}
        </Text>
      </View>
      {!verificationEnabled ? (
        <Text className="text-xs text-muted-foreground mb-3">{t("profile.verification.disabled")}</Text>
      ) : (
        <>
          <Text className="text-sm text-muted-foreground mb-2">
            {readyToBook ? t("profile.verification.ready") : t("profile.verification.notReady")}
          </Text>
          <Text className="text-xs text-muted-foreground mb-3">{t("profile.verification.whereToVerify")}</Text>
        </>
      )}

      <View className="rounded-lg border border-border p-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-foreground">{t("profile.verification.driverLicense")}</Text>
          <View className={`rounded-full px-2 py-1 ${verificationBadge(driverLicenseStatus)}`}>
            <Text className="text-xs font-semibold">{t(`profile.verification.status.${driverLicenseStatus}`)}</Text>
          </View>
        </View>
        <Pressable
          onPress={handleStartStripeVerification}
          disabled={!verificationEnabled || isStartingLicenseVerification || driverLicenseStatus === "verified"}
          className={`mt-2 rounded-lg py-2 items-center ${
            !verificationEnabled || isStartingLicenseVerification || driverLicenseStatus === "verified"
              ? "bg-primary/60"
              : "bg-primary"
          }`}
        >
          <Text className="text-sm font-semibold text-primary-foreground">
            {driverLicenseStatus === "verified"
              ? t("profile.verification.verified")
              : t("profile.verification.startStripe")}
          </Text>
        </Pressable>

        <View className="mt-2 rounded-lg border border-border bg-secondary/20 px-3 py-2">
          <Text className="text-sm font-semibold text-muted-foreground">{t("profile.verification.startMobywatel")}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">{t("profile.verification.mobywatelComingSoon")}</Text>
        </View>
      </View>
    </View>
  );
}
