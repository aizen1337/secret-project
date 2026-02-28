import { useLocalSearchParams, useRouter } from "expo-router";
import { useAction, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { onboardingApi } from "@/features/onboarding/api";
import { useOnboardingActions } from "@/features/onboarding/hooks/useOnboardingActions";
import { useOnboardingInitEffects } from "@/features/onboarding/hooks/useOnboardingInitEffects";
import {
  ONBOARDING_ROLES,
  type OnboardingRole,
  useOnboardingQueries,
} from "@/features/onboarding/hooks/useOnboardingQueries";
import { useOnboardingReturnSync } from "@/features/onboarding/hooks/useOnboardingReturnSync";
import { normalizeParam } from "@/features/shared/helpers/routeParams";

type OnboardingParams = {
  source?: string | string[];
  verification?: string | string[];
  connect?: string | string[];
};

export { ONBOARDING_ROLES };
export type { OnboardingRole };

export function useOnboardingScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { isLoaded, isSignedIn } = useAuth();
  const params = useLocalSearchParams<OnboardingParams>();
  const source = normalizeParam(params.source);
  const verificationParam = normalizeParam(params.verification);
  const connectParam = normalizeParam(params.connect);
  const isSignupSource = source === "signup";

  const queries = useOnboardingQueries(Boolean(isSignedIn));
  const beginSignupOnboarding = useMutation(onboardingApi.beginSignupOnboarding) as any;
  const setOnboardingRole = useMutation(onboardingApi.setOnboardingRole) as any;
  const finalizeOnboarding = useMutation(onboardingApi.finalizeOnboarding) as any;
  const syncRenterVerificationSession = useAction(onboardingApi.syncRenterVerificationSession) as any;
  const refreshHostConnectStatus = useAction(onboardingApi.refreshHostConnectStatus) as any;
  const startRenterIdentityCheck = useAction(onboardingApi.startRenterIdentityCheck) as any;
  const startRenterDriverLicenseCheck = useAction(onboardingApi.startRenterDriverLicenseCheck) as any;
  const createHostOnboardingLink = useAction(onboardingApi.createHostOnboardingLink) as any;

  useOnboardingInitEffects({
    t,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    isSignupSource,
    convexUser: queries.convexUser,
    hasAnyOnboardingState: queries.hasAnyOnboardingState,
    beginSignupOnboarding,
    router,
    toast,
  });

  const returnSync = useOnboardingReturnSync({
    t,
    isSignedIn: Boolean(isSignedIn),
    verificationParam,
    connectParam,
    syncRenterVerificationSession,
    refreshHostConnectStatus,
    toast,
  });

  const actions = useOnboardingActions({
    t,
    isSignupSource,
    router,
    setOnboardingRole,
    finalizeOnboarding,
    startRenterIdentityCheck,
    startRenterDriverLicenseCheck,
    createHostOnboardingLink,
    toast,
  });

  return {
    isLoaded,
    isSignedIn,
    isSignupSource,
    ...queries,
    ...returnSync,
    ...actions,
  };
}

export type OnboardingScreenController = ReturnType<typeof useOnboardingScreenState>;
