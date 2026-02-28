import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";

import { toLocalizedErrorMessage } from "@/lib/errors";

type UseOnboardingReturnSyncParams = {
  t: TFunction;
  isSignedIn: boolean;
  verificationParam: string | undefined;
  connectParam: string | undefined;
  syncRenterVerificationSession: (args: Record<string, never>) => Promise<unknown>;
  refreshHostConnectStatus: (args: Record<string, never>) => Promise<unknown>;
  toast: {
    success: (message: string) => void;
    warning: (message: string) => void;
  };
};

export function useOnboardingReturnSync({
  t,
  isSignedIn,
  verificationParam,
  connectParam,
  syncRenterVerificationSession,
  refreshHostConnectStatus,
  toast,
}: UseOnboardingReturnSyncParams) {
  const [isSyncingReturnState, setIsSyncingReturnState] = useState(false);
  const [isRefreshingConnectState, setIsRefreshingConnectState] = useState(false);
  const handledVerificationReturnRef = useRef(false);
  const handledConnectReturnRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || verificationParam !== "return" || handledVerificationReturnRef.current) return;
    handledVerificationReturnRef.current = true;
    setIsSyncingReturnState(true);
    void syncRenterVerificationSession({})
      .then(() => {
        toast.success(t("onboarding.messages.verificationRefreshed"));
      })
      .catch((error: unknown) => {
        toast.warning(toLocalizedErrorMessage(error, t, "onboarding.messages.verificationRefreshFailed"));
      })
      .finally(() => {
        setIsSyncingReturnState(false);
      });
  }, [isSignedIn, syncRenterVerificationSession, t, toast, verificationParam]);

  useEffect(() => {
    if (!isSignedIn || (connectParam !== "return" && connectParam !== "refresh")) return;
    if (handledConnectReturnRef.current) return;
    handledConnectReturnRef.current = true;
    setIsRefreshingConnectState(true);
    void refreshHostConnectStatus({})
      .then(() => {
        toast.success(t("onboarding.messages.connectRefreshed"));
      })
      .catch((error: unknown) => {
        toast.warning(toLocalizedErrorMessage(error, t, "onboarding.messages.connectRefreshFailed"));
      })
      .finally(() => {
        setIsRefreshingConnectState(false);
      });
  }, [connectParam, isSignedIn, refreshHostConnectStatus, t, toast]);

  return { isSyncingReturnState, isRefreshingConnectState };
}
