import { useCallback, useState } from "react";
import type { TFunction } from "i18next";

import { toReadableFallback } from "@/features/bookings/helpers/statusPresentation";
import { toLocalizedErrorMessage } from "@/lib/errors";

type UseHostBookingActionsParams = {
  t: TFunction;
  router: { push: (path: any) => void };
  toast: { success: (message: string) => void; error: (message: string) => void };
  fileHostDepositCase: (args: { bookingId: any; reason: string }) => Promise<unknown>;
  cancelReservation: (args: { bookingId: any }) => Promise<unknown>;
};

export function useHostBookingActions({
  t,
  router,
  toast,
  fileHostDepositCase,
  cancelReservation,
}: UseHostBookingActionsParams) {
  const [pendingDepositCaseBookingId, setPendingDepositCaseBookingId] = useState<string | null>(null);
  const [pendingCancelBookingId, setPendingCancelBookingId] = useState<string | null>(null);

  const localizeStatus = useCallback((status: string | undefined) => {
    if (!status) return t("common.unknown");
    const normalized = status.toLowerCase();
    const key = `trips.statuses.${normalized}`;
    const translated = t(key);
    if (translated === key) return toReadableFallback(normalized);
    return translated;
  }, [t]);

  const handleFileDepositCase = useCallback(async (bookingId: string) => {
    setPendingDepositCaseBookingId(bookingId);
    try {
      await fileHostDepositCase({
        bookingId: bookingId as any,
        reason: "Host-reported issue with trip condition or policy compliance.",
      });
      toast.success(t("dashboard.depositCaseFiled"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingDepositCaseBookingId(null);
    }
  }, [fileHostDepositCase, t, toast]);

  const handleCancelReservation = useCallback(async (bookingId: string) => {
    setPendingCancelBookingId(bookingId);
    try {
      await cancelReservation({ bookingId: bookingId as any });
      toast.success(t("dashboard.cancelReservationSuccess"));
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t));
    } finally {
      setPendingCancelBookingId(null);
    }
  }, [cancelReservation, t, toast]);

  const openBookingDetails = useCallback((bookingId: string) => {
    if (!bookingId) return;
    router.push({ pathname: "/booking/[bookingId]", params: { bookingId, source: "dashboard" } } as any);
  }, [router]);

  const openBookingChat = useCallback((bookingId: string) => {
    if (!bookingId) return;
    router.push({ pathname: "/booking/[bookingId]/chat", params: { bookingId } } as any);
  }, [router]);

  const openUserProfile = useCallback((userId: string, role: "host" | "renter") => {
    if (!userId) return;
    router.push({ pathname: "/user/[userId]", params: { userId, role } } as any);
  }, [router]);

  return {
    localizeStatus,
    pendingDepositCaseBookingId,
    pendingCancelBookingId,
    handleFileDepositCase,
    handleCancelReservation,
    openBookingDetails,
    openBookingChat,
    openUserProfile,
  };
}
