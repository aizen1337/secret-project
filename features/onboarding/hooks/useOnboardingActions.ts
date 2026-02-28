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
  startRenterIdentityCheck: (args: { returnUrl: string }) => Promise<{ url: string }>;
  startRenterDriverLicenseCheck: (args: { returnUrl: string }) => Promise<{ url: string }>;
  createHostOnboardingLink: (args: {
    returnUrl: string;
    refreshUrl: string;
  }) => Promise<{ url: string }>;
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
  startRenterIdentityCheck,
  startRenterDriverLicenseCheck,
  createHostOnboardingLink,
  toast,
}: UseOnboardingActionsParams) {
  const [isSettingRole, setIsSettingRole] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isStartingIdentity, setIsStartingIdentity] = useState(false);
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

  const handleStartIdentity = useCallback(async () => {
    setIsStartingIdentity(true);
    try {
      const returnUrl = createOnboardingUrl(`${onboardingStepPrefix}&verification=return`);
      const result = await startRenterIdentityCheck({ returnUrl });
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingIdentity(false);
    }
  }, [onboardingStepPrefix, startRenterIdentityCheck, t, toast]);

  const handleStartDriverLicense = useCallback(async () => {
    setIsStartingLicense(true);
    try {
      const returnUrl = createOnboardingUrl(`${onboardingStepPrefix}&verification=return`);
      const result = await startRenterDriverLicenseCheck({ returnUrl });
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
      const result = await createHostOnboardingLink({ returnUrl, refreshUrl });
      await openExternalUrl(result.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setIsStartingHostSetup(false);
    }
  }, [createHostOnboardingLink, onboardingStepPrefix, t, toast]);

  return {
    isSettingRole,
    isFinalizing,
    isStartingIdentity,
    isStartingLicense,
    isStartingHostSetup,
    handleSelectRole,
    handleFinalize,
    handleStartIdentity,
    handleStartDriverLicense,
    handleStartHostSetup,
  };
}
