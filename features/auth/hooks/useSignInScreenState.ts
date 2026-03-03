import { useCallback, useState } from "react";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { authClient } from "@/lib/auth/authClient";
import { toLocalizedErrorMessage } from "@/lib/errors";

export function useSignInScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const redirectUrl = AuthSession.makeRedirectUri({ path: "sso-callback" });
  const redirectUrlComplete = `${redirectUrl}?(tabs)`;

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showEmailCode] = useState(false);

  const onSignInPress = useCallback(async () => {
    try {
      const response = await authClient.signIn.email({
        email: emailAddress.trim(),
        password,
      });
      if (response.error) throw response.error;
      await authClient.getSession();
      (authClient as any).updateSession?.();
      router.replace("/");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      toast.error(toLocalizedErrorMessage(err, t, "auth.signIn.failedCredentials"));
    }
  }, [emailAddress, password, router, t, toast]);

  const onVerifyPress = useCallback(async () => {
    // Better Auth flow does not use this step in the current config.
    if (!code.trim()) {
      toast.error(t("auth.signIn.verifyFailed"));
    }
  }, [code, t, toast]);

  const onSocialPress = useCallback(
    async (provider: "google" | "apple" | "facebook") => {
      try {
        const result = await authClient.signIn.social({
          provider,
          callbackURL: redirectUrlComplete,
          errorCallbackURL: "/sign-in",
          newUserCallbackURL: "/onboarding?source=signup",
        });
        if (result.error) throw result.error;
        await authClient.getSession();
        (authClient as any).updateSession?.();
      } catch (err) {
        toast.error(toLocalizedErrorMessage(err, t, "auth.signIn.failed"));
      }
    },
    [redirectUrlComplete, t, toast],
  );

  return {
    emailAddress,
    setEmailAddress,
    password,
    setPassword,
    code,
    setCode,
    showEmailCode,
    onSignInPress,
    onVerifyPress,
    onSocialPress,
  };
}

export type SignInScreenController = ReturnType<typeof useSignInScreenState>;

