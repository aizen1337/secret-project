import { useLocalSearchParams, useRouter } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { bookingsApi } from "@/features/bookings/api";
import { useTripsActions } from "@/features/bookings/hooks/useTripsActions";
import { useTripsCheckoutSync } from "@/features/bookings/hooks/useTripsCheckoutSync";
import { normalizeParam } from "@/features/shared/helpers/routeParams";

type TripsParams = {
  checkout?: string | string[];
  session_id?: string | string[];
};

export function useTripsScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<TripsParams>();
  const checkoutParam = normalizeParam(params.checkout);
  const checkoutSessionIdParam = normalizeParam(params.session_id);
  const toast = useToast();
  const { isSignedIn } = useAuth();
  const trips = useQuery(bookingsApi.listMyTripsWithPayments, isSignedIn ? {} : "skip");
  const cancelReservation = useMutation(bookingsApi.cancelReservation) as any;
  const createReservationPayNowSession = useAction(bookingsApi.createReservationPayNowSession) as any;
  const reconcileCheckoutSessionFromRedirect = useAction(
    bookingsApi.reconcileCheckoutSessionFromRedirect,
  ) as any;

  useTripsCheckoutSync({
    checkoutParam,
    checkoutSessionIdParam,
    reconcileCheckoutSessionFromRedirect,
    router,
    t,
    toast,
  });

  const actions = useTripsActions({
    t,
    router,
    cancelReservation,
    createReservationPayNowSession,
    toast,
  });

  return { trips, ...actions };
}

export type TripsScreenController = ReturnType<typeof useTripsScreenState>;
