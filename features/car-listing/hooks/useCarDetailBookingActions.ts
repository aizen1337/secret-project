import { useCallback, useState } from "react";
import * as ExpoLinking from "expo-linking";
import type { TFunction } from "i18next";

import type { Id } from "@/convex/_generated/dataModel";
import { useStripePaymentSheet } from "@/features/payments/hooks/useStripePaymentSheet";
import { toLocalizedErrorMessage } from "@/lib/errors";

type CollectionMethod = "in_person" | "lockbox" | "host_delivery";

type UseCarDetailBookingActionsParams = {
  t: TFunction;
  router: { push: (path: any) => void };
  toast: { error: (message: string) => void };
  isSignedIn: boolean;
  isWeb: boolean;
  car: any;
  hostUserId: string;
  isOwnListing: boolean;
  dateRangeValid: boolean;
  startIso: string;
  endIso: string;
  selectedCollectionMethod: CollectionMethod;
  createCheckoutSession: (args: {
    offerId: Id<"car_offers">;
    successUrl: string;
    cancelUrl: string;
    startDate: string;
    endDate: string;
    collectionMethod?: CollectionMethod;
  }) => Promise<{ url: string }>;
  createEmbeddedPaymentIntent: (args: {
    offerId: Id<"car_offers">;
    startDate: string;
    endDate: string;
    collectionMethod?: CollectionMethod;
  }) => Promise<{ paymentId: string; paymentIntentClientSecret: string }>;
  confirmEmbeddedPaymentServerSync: (args: {
    paymentId: string;
    stripePaymentIntentId?: string;
  }) => Promise<unknown>;
};

export function useCarDetailBookingActions({
  t,
  router,
  toast,
  isSignedIn,
  isWeb,
  car,
  hostUserId,
  isOwnListing,
  dateRangeValid,
  startIso,
  endIso,
  selectedCollectionMethod,
  createCheckoutSession,
  createEmbeddedPaymentIntent,
  confirmEmbeddedPaymentServerSync,
}: UseCarDetailBookingActionsParams) {
  const { initPaymentSheet, presentPaymentSheet } = useStripePaymentSheet();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [webPaymentOpen, setWebPaymentOpen] = useState(false);
  const [webPaymentClientSecret, setWebPaymentClientSecret] = useState<string | null>(null);
  const [webPaymentId, setWebPaymentId] = useState<string | null>(null);
  const embeddedPaymentsEnabled = process.env.EXPO_PUBLIC_ENABLE_EMBEDDED_PAYMENTS !== "false";

  const handleOpenHostProfile = useCallback(() => {
    if (!hostUserId) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    router.push({ pathname: "/user/[userId]", params: { userId: hostUserId, role: "host" } } as any);
  }, [hostUserId, isSignedIn, router]);

  const handleEmbeddedPaymentSuccess = useCallback(
    async (paymentIntentId?: string) => {
      if (!webPaymentId) return;
      try {
        await confirmEmbeddedPaymentServerSync({
          paymentId: webPaymentId,
          stripePaymentIntentId: paymentIntentId,
        });
        setWebPaymentOpen(false);
        setWebPaymentClientSecret(null);
        setWebPaymentId(null);
        router.push("/trips");
      } catch (error) {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
      }
    },
    [confirmEmbeddedPaymentServerSync, router, t, toast, webPaymentId],
  );

  const handleCloseWebPayment = useCallback(() => {
    setWebPaymentOpen(false);
    setWebPaymentClientSecret(null);
    setWebPaymentId(null);
  }, []);

  const handleEmbeddedPaymentError = useCallback(
    (message: string) => {
      toast.error(message || t("apiErrors.default"));
    },
    [t, toast],
  );

  const handleBook = useCallback(async () => {
    if (isOwnListing) {
      toast.error(t("carDetail.cannotBookOwnListing"));
      return;
    }
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (!dateRangeValid) {
      toast.error(t("carDetail.invalidDateRange"));
      return;
    }

    setIsCreatingCheckout(true);
    try {
      if (!embeddedPaymentsEnabled) {
        const webOrigin = isWeb && typeof window !== "undefined" ? window.location.origin : null;
        const successUrl = webOrigin
          ? `${webOrigin}/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}`
          : ExpoLinking.createURL("/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}");
        const cancelUrl = webOrigin
          ? `${webOrigin}/car/${car.id}?checkout=cancelled`
          : ExpoLinking.createURL(`/car/${car.id}?checkout=cancelled`);
        const checkout = await createCheckoutSession({
          offerId: car.id as Id<"car_offers">,
          successUrl,
          cancelUrl,
          startDate: startIso,
          endDate: endIso,
          collectionMethod: selectedCollectionMethod,
        });
        if (isWeb && typeof window !== "undefined") {
          window.location.href = checkout.url;
          return;
        }
        await ExpoLinking.openURL(checkout.url);
        return;
      }

      const embedded = await createEmbeddedPaymentIntent({
        offerId: car.id as Id<"car_offers">,
        startDate: startIso,
        endDate: endIso,
        collectionMethod: selectedCollectionMethod,
      });
      if (isWeb) {
        setWebPaymentId(embedded.paymentId);
        setWebPaymentClientSecret(embedded.paymentIntentClientSecret);
        setWebPaymentOpen(true);
        return;
      }

      const init = await initPaymentSheet({
        merchantDisplayName: "DriveShare",
        paymentIntentClientSecret: embedded.paymentIntentClientSecret,
      });
      if (init.error) {
        throw new Error(init.error.message || "Payment sheet init failed.");
      }
      const presented = await presentPaymentSheet();
      if (presented.error) {
        throw new Error(presented.error.message || "Payment sheet failed.");
      }
      await confirmEmbeddedPaymentServerSync({ paymentId: embedded.paymentId });
      router.push("/trips");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      if (raw.startsWith("HOST_PAYOUTS_NOT_READY:")) {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.HOST_PAYOUTS_NOT_READY"));
        return;
      }
      if (
        raw.startsWith("UNVERIFIED_RENTER:") ||
        raw.startsWith("VERIFICATION_PENDING:") ||
        raw.startsWith("VERIFICATION_REJECTED:")
      ) {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
        router.push("/profile");
      } else {
        toast.error(toLocalizedErrorMessage(error, t, "carDetail.checkoutFailed"));
      }
    } finally {
      setIsCreatingCheckout(false);
    }
  }, [
    car?.id,
    confirmEmbeddedPaymentServerSync,
    createCheckoutSession,
    createEmbeddedPaymentIntent,
    dateRangeValid,
    embeddedPaymentsEnabled,
    endIso,
    initPaymentSheet,
    isOwnListing,
    isSignedIn,
    isWeb,
    presentPaymentSheet,
    router,
    selectedCollectionMethod,
    startIso,
    t,
    toast,
  ]);

  return {
    isCreatingCheckout,
    handleOpenHostProfile,
    handleBook,
    webPaymentOpen,
    webPaymentClientSecret,
    handleEmbeddedPaymentSuccess,
    handleCloseWebPayment,
    handleEmbeddedPaymentError,
  };
}
