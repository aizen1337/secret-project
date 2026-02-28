import { useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { TFunction } from "i18next";

import { toLocalizedErrorMessage } from "@/lib/errors";

WebBrowser.maybeCompleteAuthSession();

type SocialProvider = "google" | "apple" | "facebook";
type SocialStrategy = "oauth_google" | "oauth_apple" | "oauth_facebook";

type UseAuthSocialFlowParams = {
  isLoaded: boolean;
  redirectUrl: string;
  redirectUrlComplete: string;
  successPath: string;
  cancelledKey: string;
  failedKey: string;
  t: TFunction;
  toast: {
    warning: (message: string) => void;
    error: (message: string) => void;
  };
  router: { replace: (path: any) => void };
  authenticateWithRedirect: (args: {
    strategy: SocialStrategy;
    redirectUrl: string;
    redirectUrlComplete: string;
  }) => Promise<unknown>;
  startSSOFlow: (args: {
    strategy: SocialStrategy;
    redirectUrl: string;
  }) => Promise<{
    createdSessionId?: string | null;
    setActive?: ((args: { session: string }) => Promise<unknown>) | null;
    authSessionResult?: { type?: string } | null;
  }>;
};

function toStrategy(provider: SocialProvider): SocialStrategy {
  return provider === "google"
    ? "oauth_google"
    : provider === "apple"
      ? "oauth_apple"
      : "oauth_facebook";
}

export function useAuthSocialFlow({
  isLoaded,
  redirectUrl,
  redirectUrlComplete,
  successPath,
  cancelledKey,
  failedKey,
  t,
  toast,
  router,
  authenticateWithRedirect,
  startSSOFlow,
}: UseAuthSocialFlowParams) {
  return useCallback(
    async (provider: SocialProvider) => {
      if (!isLoaded) return;
      const strategy = toStrategy(provider);

      try {
        if (Platform.OS === "web") {
          await authenticateWithRedirect({ strategy, redirectUrl, redirectUrlComplete });
          return;
        }

        const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
          strategy,
          redirectUrl,
        });
        if (createdSessionId) {
          await setActive?.({ session: createdSessionId });
          router.replace(successPath);
          return;
        }

        const cancelled =
          authSessionResult?.type === "cancel" || authSessionResult?.type === "dismiss";
        if (cancelled) toast.warning(t(cancelledKey));
        else toast.error(t(failedKey));
      } catch (err) {
        toast.error(toLocalizedErrorMessage(err, t, failedKey));
      }
    },
    [
      authenticateWithRedirect,
      cancelledKey,
      failedKey,
      isLoaded,
      redirectUrl,
      redirectUrlComplete,
      router,
      startSSOFlow,
      successPath,
      t,
      toast,
    ],
  );
}
