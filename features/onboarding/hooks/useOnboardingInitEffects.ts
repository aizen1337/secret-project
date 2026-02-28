import { useEffect, useRef } from "react";
import type { TFunction } from "i18next";

import { toLocalizedErrorMessage } from "@/lib/errors";

type UseOnboardingInitEffectsParams = {
  t: TFunction;
  isLoaded: boolean;
  isSignedIn: boolean;
  isSignupSource: boolean;
  convexUser: unknown;
  hasAnyOnboardingState: boolean;
  beginSignupOnboarding: (args: Record<string, never>) => Promise<unknown>;
  router: { replace: (path: any) => void };
  toast: {
    error: (message: string) => void;
  };
};

export function useOnboardingInitEffects({
  t,
  isLoaded,
  isSignedIn,
  isSignupSource,
  convexUser,
  hasAnyOnboardingState,
  beginSignupOnboarding,
  router,
  toast,
}: UseOnboardingInitEffectsParams) {
  const startedSignupInitRef = useRef(false);
  const redirectedAwayRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isSignupSource || startedSignupInitRef.current) return;
    startedSignupInitRef.current = true;
    void beginSignupOnboarding({}).catch((error: unknown) => {
      toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
    });
  }, [beginSignupOnboarding, isLoaded, isSignedIn, isSignupSource, t, toast]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isSignupSource || convexUser === undefined || hasAnyOnboardingState) {
      return;
    }
    if (redirectedAwayRef.current) return;
    redirectedAwayRef.current = true;
    router.replace("/(tabs)");
  }, [convexUser, hasAnyOnboardingState, isLoaded, isSignedIn, isSignupSource, router]);
}
