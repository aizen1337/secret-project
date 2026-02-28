import { useCallback, useState } from "react";
import { useSignIn, useSSO } from "@clerk/clerk-expo";
import type { EmailCodeFactor } from "@clerk/types";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { useAuthSocialFlow } from "@/features/auth/hooks/useAuthSocialFlow";
import { toLocalizedErrorMessage } from "@/lib/errors";

export function useSignInScreenState() {
  const { t } = useTranslation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const toast = useToast();
  const redirectUrl = AuthSession.makeRedirectUri({ path: "sso-callback" });
  const redirectUrlComplete = "/(tabs)";

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showEmailCode, setShowEmailCode] = useState(false);

  const onSignInPress = useCallback(async () => {
    if (!isLoaded || !signIn) return;
    try {
      const signInAttempt = await signIn.create({ identifier: emailAddress, password });
      if (signInAttempt.status === "complete") {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }
            router.replace("/");
          },
        });
      } else if (signInAttempt.status === "needs_second_factor") {
        const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
          (factor): factor is EmailCodeFactor => factor.strategy === "email_code",
        );
        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setShowEmailCode(true);
        }
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        toast.warning(t("auth.signIn.warningPending"));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      toast.error(toLocalizedErrorMessage(err, t, "auth.signIn.failedCredentials"));
    }
  }, [emailAddress, isLoaded, password, router, setActive, signIn, t, toast]);

  const onVerifyPress = useCallback(async () => {
    if (!isLoaded || !signIn) return;
    try {
      const signInAttempt = await signIn.attemptSecondFactor({ strategy: "email_code", code });
      if (signInAttempt.status === "complete") {
        await setActive({
          session: signInAttempt.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }
            router.replace("/(tabs)");
          },
        });
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        toast.error(t("auth.signIn.verifyFailed"));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      toast.error(t("auth.signIn.verifyFailed"));
    }
  }, [code, isLoaded, router, setActive, signIn, t, toast]);

  const onSocialPress = useAuthSocialFlow({
    isLoaded,
    redirectUrl,
    redirectUrlComplete,
    successPath: "/(tabs)",
    cancelledKey: "auth.signIn.cancelled",
    failedKey: "auth.signIn.failed",
    t,
    toast,
    router,
    authenticateWithRedirect: async (args) => {
      if (!signIn) return;
      await signIn.authenticateWithRedirect(args);
    },
    startSSOFlow,
  });

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
