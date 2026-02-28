import { useCallback, useState } from "react";
import { useSignUp, useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { useAuthSocialFlow } from "@/features/auth/hooks/useAuthSocialFlow";
import { toLocalizedErrorMessage } from "@/lib/errors";

export function useSignUpScreenState() {
  const { t } = useTranslation();
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const toast = useToast();
  const redirectUrl = AuthSession.makeRedirectUri({ path: "sso-callback" });
  const redirectUrlComplete = "/onboarding?source=signup";

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  const onSignUpPress = useCallback(async () => {
    if (!isLoaded || !signUp) return;
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      toast.error(toLocalizedErrorMessage(err, t, "auth.signUp.failedDetails"));
    }
  }, [emailAddress, isLoaded, password, signUp, t, toast]);

  const onVerifyPress = useCallback(async () => {
    if (!isLoaded || !signUp) return;
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });
      if (signUpAttempt.status === "complete") {
        await setActive({
          session: signUpAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }
            router.replace("/onboarding?source=signup");
          },
        });
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));
        toast.error(t("auth.signUp.verifyFailed"));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      toast.error(t("auth.signUp.verifyFailed"));
    }
  }, [code, isLoaded, router, setActive, signUp, t, toast]);

  const onSocialPress = useAuthSocialFlow({
    isLoaded,
    redirectUrl,
    redirectUrlComplete,
    successPath: "/onboarding?source=signup",
    cancelledKey: "auth.signUp.cancelled",
    failedKey: "auth.signUp.failed",
    t,
    toast,
    router,
    authenticateWithRedirect: async (args) => {
      if (!signUp) return;
      await signUp.authenticateWithRedirect(args);
    },
    startSSOFlow,
  });

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
