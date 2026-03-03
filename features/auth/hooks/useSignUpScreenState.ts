import { useCallback, useState } from "react";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { authClient } from "@/lib/auth/authClient";
import { toLocalizedErrorMessage } from "@/lib/errors";

export function useSignUpScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const redirectUrl = AuthSession.makeRedirectUri({ path: "sso-callback" });
  const redirectUrlComplete = `${redirectUrl}?onboarding=1`;

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  const onSignUpPress = useCallback(async () => {
    try {
      const result = await authClient.signUp.email({
        email: emailAddress.trim(),
        password,
        name: emailAddress.trim(),
      });
      if (result.error) throw result.error;
      await authClient.getSession();
      (authClient as any).updateSession?.();
      setPendingVerification(false);
      router.replace("/onboarding?source=signup");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      toast.error(toLocalizedErrorMessage(err, t, "auth.signUp.failedDetails"));
    }
  }, [emailAddress, password, router, t, toast]);

  const onVerifyPress = useCallback(async () => {
    if (!code.trim()) {
      toast.error(t("auth.signUp.verifyFailed"));
    }
  }, [code, t, toast]);

  const onSocialPress = useCallback(
    async (provider: "google" | "apple" | "facebook") => {
      try {
        const result = await authClient.signIn.social({
          provider,
          callbackURL: redirectUrlComplete,
          errorCallbackURL: "/sign-up",
          newUserCallbackURL: "/onboarding?source=signup",
        });
        if (result.error) throw result.error;
        await authClient.getSession();
        (authClient as any).updateSession?.();
      } catch (err) {
        toast.error(toLocalizedErrorMessage(err, t, "auth.signUp.failed"));
      }
    },
    [redirectUrlComplete, t, toast],
  );

  return {
    emailAddress,
    setEmailAddress,
    password,
    setPassword,
    pendingVerification,
    code,
    setCode,
    onSignUpPress,
    onVerifyPress,
    onSocialPress,
  };
}

export type SignUpScreenController = ReturnType<typeof useSignUpScreenState>;

