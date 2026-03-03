import { useCallback, useState } from "react";
import * as ExpoLinking from "expo-linking";
import type { TFunction } from "i18next";

import type { OnboardingRole } from "@/features/onboarding/hooks/useOnboardingQueries";
import { toLocalizedErrorMessage } from "@/lib/errors";

type UseOnboardingActionsParams = {
  t: TFunction;
  isSignupSource: boolean;
  router: { replace: (path: any) => void };
  setOnboardingRole: (args: { role: OnboardingRole }) => Promise<unknown>;
  finalizeOnboarding: (args: { status: "completed" | "skipped" }) => Promise<unknown>;
  startRenterDriverLicenseCheck: (args: {
    returnUrl: string;
    provider: "stripe" | "mobywatel";
  }) => Promise<{ url: string }>;
  createHostOnboardingLink: (args: {
    returnUrl: string;
    refreshUrl: string;
  }) => Promise<{ url: string }>;
  refreshHostConnectStatus: (args: Record<string, never>) => Promise<{ verificationUrl?: string | null }>;
  toast: { error: (message: string) => void };
};

function createOnboardingUrl(query: string) {
  const pathname = `/onboarding?${query}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${pathname}`;
  }
  return ExpoLinking.createURL(pathname);
}

async function openExternalUrl(url: string) {
  if (typeof window !== "undefined") {
    window.location.href = url;
    return;
  }
  await ExpoLinking.openURL(url);
}

export function useOnboardingActions({
  t,
  isSignupSource,
  router,
  setOnboardingRole,
  finalizeOnboarding,
  startRenterDriverLicenseCheck,
  createHostOnboardingLink,
  refreshHostConnectStatus,
  toast,
}: UseOnboardingActionsParams) {
  const [isSettingRole, setIsSettingRole] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isStartingLicense, setIsStartingLicense] = useState(false);
  const [isStartingHostSetup, setIsStartingHostSetup] = useState(false);
  const onboardingStepPrefix = isSignupSource ? "source=signup&step=activation" : "step=activation";

  const handleSelectRole = useCallback(async (role: OnboardingRole) => {
    setIsSettingRole(true);
    try {
      await setOnboardingRole({ role });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsSettingRole(false);
    }
  }, [setOnboardingRole, t, toast]);

  const handleFinalize = useCallback(async (status: "completed" | "skipped") => {
    setIsFinalizing(true);
    try {
      await finalizeOnboarding({ status });
      router.replace("/(tabs)");
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsFinalizing(false);
    }
  }, [finalizeOnboarding, router, t, toast]);

  const handleStartDriverLicense = useCallback(async (provider: "stripe" | "mobywatel") => {
    setIsStartingLicense(true);
    try {
      const returnUrl = createOnboardingUrl(`${onboardingStepPrefix}&verification=return`);
      const result = await startRenterDriverLicenseCheck({ returnUrl, provider });
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingLicense(false);
    }
  }, [onboardingStepPrefix, startRenterDriverLicenseCheck, t, toast]);

  const handleStartHostSetup = useCallback(async () => {
    setIsStartingHostSetup(true);
    try {
      const returnUrl = createOnboardingUrl(`${onboardingStepPrefix}&connect=return`);
      const refreshUrl = createOnboardingUrl(`${onboardingStepPrefix}&connect=refresh`);
      const refreshed = await refreshHostConnectStatus({});
      const result =
        refreshed?.verificationUrl
          ? { url: refreshed.verificationUrl }
          : await createHostOnboardingLink({ returnUrl, refreshUrl });
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingHostSetup(false);
    }
  }, [createHostOnboardingLink, onboardingStepPrefix, refreshHostConnectStatus, t, toast]);

  return {
    isSettingRole,
    isFinalizing,
    isStartingLicense,
    isStartingHostSetup,
    handleSelectRole,
    handleFinalize,
    handleStartDriverLicense,
    handleStartHostSetup,
  };
}
