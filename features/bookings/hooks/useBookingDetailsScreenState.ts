import { useLocalSearchParams, useRouter } from "expo-router";
import { useAction, useMutation } from "convex/react";
import { useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { bookingsApi } from "@/features/bookings/api";
import { useBookingDetailsActions } from "@/features/bookings/hooks/useBookingDetailsActions";
import { useBookingDetailsDerived } from "@/features/bookings/hooks/useBookingDetailsDerived";
import { useBookingDetailsQueries } from "@/features/bookings/hooks/useBookingDetailsQueries";
import { normalizeParam } from "@/features/shared/helpers/routeParams";

type BookingDetailsParams = {
  bookingId?: string | string[];
  source?: string | string[];
};

export function useBookingDetailsScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<BookingDetailsParams>();
  const bookingIdParam = normalizeParam(params.bookingId);
  const sourceParam = normalizeParam(params.source);
  const source = sourceParam === "dashboard" ? "dashboard" : "trips";
  const fallbackPath = source === "dashboard" ? "/dashboard" : "/trips";
  const isDesktop = width >= 1100;
  const isTablet = width >= 760;

  const { details } = useBookingDetailsQueries(bookingIdParam);
  const confirmTripStartCollection = useMutation(bookingsApi.confirmTripStartCollection) as any;
  const cancelReservation = useMutation(bookingsApi.cancelReservation) as any;
  const createBookingReview = useMutation(bookingsApi.createBookingReview) as any;
  const createReservationPayNowSession = useAction(bookingsApi.createReservationPayNowSession) as any;
  const retryHostPayoutTransfer = useAction(bookingsApi.retryHostPayoutTransfer) as any;

  const actions = useBookingDetailsActions({
    t,
    router,
    toast,
    fallbackPath,
    details,
    confirmTripStartCollection,
    cancelReservation,
    createBookingReview,
    createReservationPayNowSession,
    retryHostPayoutTransfer,
  });
  const derived = useBookingDetailsDerived({ details, t, isTablet, isDesktop });

  return {
    bookingIdParam,
    details,
    isDesktop,
    isTablet,
    ...actions,
    ...derived,
  };
}

export type BookingDetailsScreenController = ReturnType<typeof useBookingDetailsScreenState>;
