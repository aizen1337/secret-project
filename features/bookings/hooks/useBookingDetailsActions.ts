import { useCallback, useState } from "react";
import * as ExpoLinking from "expo-linking";
import type { TFunction } from "i18next";
import { toReadableFallback } from "@/features/bookings/helpers/statusPresentation";
import { useStripePaymentSheet } from "@/features/payments/hooks/useStripePaymentSheet";
import { toLocalizedErrorMessage } from "@/lib/errors";
type UseBookingDetailsActionsParams = {
  t: TFunction;
  router: { canGoBack?: () => boolean; back: () => void; replace: (path: any) => void; push: (path: any) => void };
  toast: { success: (message: string) => void; error: (message: string) => void };
  fallbackPath: string;
  details: any;
  confirmTripStartCollection: (args: { bookingId: any }) => Promise<unknown>;
  cancelReservation: (args: { bookingId: any }) => Promise<unknown>;
  createBookingReview: (args: { bookingId: any; rating: number; comment: string }) => Promise<unknown>;
  createReservationPayNowSession: (args: {
    bookingId: any;
    successUrl: string;
    cancelUrl: string;
  }) => Promise<{ url: string }>;
  createEmbeddedPayNowIntent: (args: {
    bookingId: any;
  }) => Promise<{ paymentId: string; paymentIntentClientSecret: string }>;
  confirmEmbeddedPaymentServerSync: (args: {
    paymentId: string;
    stripePaymentIntentId?: string;
  }) => Promise<unknown>;
  retryHostPayoutTransfer: (args: { bookingId: any }) => Promise<{ released?: boolean; reason?: string }>;
};

export function useBookingDetailsActions({
  t,
  router,
  toast,
  fallbackPath,
  details,
  confirmTripStartCollection,
  cancelReservation,
  createBookingReview,
  createReservationPayNowSession,
  createEmbeddedPayNowIntent,
  confirmEmbeddedPaymentServerSync,
  retryHostPayoutTransfer,
}: UseBookingDetailsActionsParams) {
  const { initPaymentSheet, presentPaymentSheet } = useStripePaymentSheet();
  const [pendingPayNow, setPendingPayNow] = useState(false);
  const [pendingCollectionConfirm, setPendingCollectionConfirm] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [pendingPayoutRetry, setPendingPayoutRetry] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [webPaymentOpen, setWebPaymentOpen] = useState(false);
  const [webPaymentClientSecret, setWebPaymentClientSecret] = useState<string | null>(null);
  const [webPaymentId, setWebPaymentId] = useState<string | null>(null);
  const embeddedPaymentsEnabled = process.env.EXPO_PUBLIC_ENABLE_EMBEDDED_PAYMENTS !== "false";
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: "" });
  const handleGoBack = useCallback(() => {
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
    router.replace(fallbackPath as any);
  }, [fallbackPath, router]);
  const handleOpenCarOffer = useCallback((carId: string) => {
    if (!carId) return;
    router.push({
      pathname: `/car/${carId}`,
      params: { startDate: details?.booking?.startDate, endDate: details?.booking?.endDate },
    } as any);
  }, [details?.booking?.endDate, details?.booking?.startDate, router]);
  const openUserProfile = useCallback((userId: string, role: "host" | "renter") => {
    if (!userId) return;
    router.push({ pathname: "/user/[userId]", params: { userId, role } } as any);
  }, [router]);
  const handleOpenChat = useCallback(() => {
    if (!details?.booking?.id) return;
    router.push({ pathname: "/booking/[bookingId]/chat", params: { bookingId: details.booking.id } } as any);
  }, [details?.booking?.id, router]);

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
      } catch (error) {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
      }
    },
    [confirmEmbeddedPaymentServerSync, t, toast, webPaymentId],
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

  const handlePayNow = useCallback(async () => {
    if (!details?.booking?.id) return;
    setPendingPayNow(true);
    try {
      if (!embeddedPaymentsEnabled) {
        const isWeb = typeof window !== "undefined";
        const webOrigin = isWeb ? window.location.origin : null;
        const successUrl = webOrigin
          ? `${webOrigin}/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}`
          : ExpoLinking.createURL("/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}");
        const cancelUrl = webOrigin
          ? `${webOrigin}/trips?checkout=cancelled`
          : ExpoLinking.createURL("/trips?checkout=cancelled");
        const checkout = await createReservationPayNowSession({ bookingId: details.booking.id as any, successUrl, cancelUrl });
        if (isWeb) {
          window.location.href = checkout.url;
          return;
        }
        await ExpoLinking.openURL(checkout.url);
        return;
      }

      const embedded = await createEmbeddedPayNowIntent({ bookingId: details.booking.id as any });
      const isWeb = typeof window !== "undefined";
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
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      if (raw.startsWith("HOST_PAYOUTS_NOT_READY:")) {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.HOST_PAYOUTS_NOT_READY"));
      } else {
        toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
      }
    } finally {
      setPendingPayNow(false);
    }
  }, [
    confirmEmbeddedPaymentServerSync,
    createEmbeddedPayNowIntent,
    createReservationPayNowSession,
    details?.booking?.id,
    embeddedPaymentsEnabled,
    initPaymentSheet,
    presentPaymentSheet,
    t,
    toast,
  ]);
  const handleCancelReservation = useCallback(async () => {
    if (!details?.booking?.id) return;
    setPendingCancel(true);
    try {
      await cancelReservation({ bookingId: details.booking.id as any });
      toast.success(t("trips.cancelReservationSuccess"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingCancel(false);
    }
  }, [cancelReservation, details?.booking?.id, t, toast]);
  const handleConfirmTripStartCollection = useCallback(async () => {
    if (!details?.booking?.id) return;
    setPendingCollectionConfirm(true);
    try {
      await confirmTripStartCollection({ bookingId: details.booking.id as any });
      toast.success(t("bookingDetails.collectionConfirmSuccess"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingCollectionConfirm(false);
    }
  }, [confirmTripStartCollection, details?.booking?.id, t, toast]);
  const handleRetryPayout = useCallback(async () => {
    if (!details?.booking?.id) return;
    setPendingPayoutRetry(true);
    try {
      const result = await retryHostPayoutTransfer({ bookingId: details.booking.id as any });
      if (result?.released) toast.success(t("bookingDetails.payoutRetrySuccess"));
      else toast.error(t("bookingDetails.payoutRetryFailed", { reason: toReadableFallback(String(result?.reason ?? "unknown")) }));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingPayoutRetry(false);
    }
  }, [details?.booking?.id, retryHostPayoutTransfer, t, toast]);
  const handleSubmitReview = useCallback(async () => {
    if (!details?.booking?.id) return;
    setPendingReview(true);
    try {
      await createBookingReview({ bookingId: details.booking.id as any, rating: reviewDraft.rating, comment: reviewDraft.comment });
      toast.success(t("profile.reviews.submitSuccess"));
      setReviewDraft({ rating: 5, comment: "" });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingReview(false);
    }
  }, [createBookingReview, details?.booking?.id, reviewDraft.comment, reviewDraft.rating, t, toast]);
  return {
    pendingPayNow,
    pendingCollectionConfirm,
    pendingCancel,
    pendingPayoutRetry,
    pendingReview,
    reviewDraft,
    setReviewDraft,
    handleGoBack,
    handleOpenCarOffer,
    openUserProfile,
    handleOpenChat,
    handlePayNow,
    webPaymentOpen,
    webPaymentClientSecret,
    handleEmbeddedPaymentSuccess,
    handleCloseWebPayment,
    handleEmbeddedPaymentError,
    handleConfirmTripStartCollection,
    handleCancelReservation,
    handleRetryPayout,
    handleSubmitReview,
  };
}
