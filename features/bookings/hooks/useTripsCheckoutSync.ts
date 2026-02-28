import { useEffect, useRef } from "react";
import type { TFunction } from "i18next";

import { toLocalizedErrorMessage } from "@/lib/errors";

type UseTripsCheckoutSyncParams = {
  checkoutParam: string | undefined;
  checkoutSessionIdParam: string | undefined;
  reconcileCheckoutSessionFromRedirect: (args: {
    stripeCheckoutSessionId: string;
  }) => Promise<unknown>;
  router: { replace: (path: any) => void };
  t: TFunction;
  toast: { error: (message: string) => void };
};

export function useTripsCheckoutSync({
  checkoutParam,
  checkoutSessionIdParam,
  reconcileCheckoutSessionFromRedirect,
  router,
  t,
  toast,
}: UseTripsCheckoutSyncParams) {
  const handledCheckoutSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (checkoutParam !== "success") return;
    if (!checkoutSessionIdParam || !checkoutSessionIdParam.startsWith("cs_")) {
      router.replace("/trips");
      return;
    }
    if (handledCheckoutSessionRef.current === checkoutSessionIdParam) return;
    handledCheckoutSessionRef.current = checkoutSessionIdParam;

    let cancelled = false;
    void (async () => {
      try {
        await reconcileCheckoutSessionFromRedirect({
          stripeCheckoutSessionId: checkoutSessionIdParam,
        });
      } catch (error) {
        if (!cancelled) toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
      } finally {
        if (!cancelled) router.replace("/trips");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    checkoutParam,
    checkoutSessionIdParam,
    reconcileCheckoutSessionFromRedirect,
    router,
    t,
    toast,
  ]);
}
