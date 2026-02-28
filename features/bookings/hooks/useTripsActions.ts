import { useCallback, useState } from "react";
import * as ExpoLinking from "expo-linking";
import type { TFunction } from "i18next";

import { toReadableFallback } from "@/features/bookings/helpers/statusPresentation";
import { toLocalizedErrorMessage } from "@/lib/errors";

type UseTripsActionsParams = {
  t: TFunction;
  router: { push: (route: any) => void };
  cancelReservation: (args: { bookingId: any }) => Promise<unknown>;
  createReservationPayNowSession: (args: {
    bookingId: any;
    successUrl: string;
    cancelUrl: string;
  }) => Promise<{ url: string }>;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
};

export function useTripsActions({
  t,
  router,
  cancelReservation,
  createReservationPayNowSession,
  toast,
}: UseTripsActionsParams) {
  const [pendingPayNowBookingId, setPendingPayNowBookingId] = useState<string | null>(null);
  const [pendingCancelBookingId, setPendingCancelBookingId] = useState<string | null>(null);

  const localizeStatus = useCallback((status: string | undefined) => {
    if (!status) return t("common.unknown");
    const normalized = status.toLowerCase();
    const key = `trips.statuses.${normalized}`;
    const translated = t(key);
    if (translated === key) return toReadableFallback(normalized);
    return translated;
  }, [t]);

  const openBookingDetails = useCallback((bookingId: string) => {
    router.push({
      pathname: "/booking/[bookingId]",
      params: { bookingId, source: "trips" },
    } as any);
  }, [router]);

  const openBookingChat = useCallback((bookingId: string) => {
    if (!bookingId) return;
    router.push({ pathname: "/booking/[bookingId]/chat", params: { bookingId } } as any);
  }, [router]);

  const openUserProfile = useCallback((userId: string, role: "host" | "renter") => {
    if (!userId) return;
    router.push({ pathname: "/user/[userId]", params: { userId, role } } as any);
  }, [router]);

  const handlePayNow = useCallback(async (bookingId: string) => {
    setPendingPayNowBookingId(bookingId);
    try {
      const isWeb = typeof window !== "undefined";
      const webOrigin = isWeb ? window.location.origin : null;
      const successUrl = webOrigin
        ? `${webOrigin}/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : ExpoLinking.createURL("/trips?checkout=success&session_id={CHECKOUT_SESSION_ID}");
      const cancelUrl = webOrigin
        ? `${webOrigin}/trips?checkout=cancelled`
        : ExpoLinking.createURL("/trips?checkout=cancelled");
      const checkout = await createReservationPayNowSession({
        bookingId: bookingId as any,
        successUrl,
        cancelUrl,
      });
      if (isWeb) {
        window.location.href = checkout.url;
        return;
      }
      await ExpoLinking.openURL(checkout.url);
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "apiErrors.default"));
    } finally {
      setPendingPayNowBookingId(null);
    }
  }, [createReservationPayNowSession, t, toast]);

  const handleCancelReservation = useCallback(async (bookingId: string) => {
    setPendingCancelBookingId(bookingId);
    try {
      await cancelReservation({ bookingId: bookingId as any });
      toast.success(t("trips.cancelReservationSuccess"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingCancelBookingId(null);
    }
  }, [cancelReservation, t, toast]);

  return {
    localizeStatus,
    pendingPayNowBookingId,
    pendingCancelBookingId,
    openBookingDetails,
    openBookingChat,
    openUserProfile,
    handlePayNow,
    handleCancelReservation,
  };
}
