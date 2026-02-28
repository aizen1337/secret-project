import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/components/feedback/useToast";
import { hostDashboardApi } from "@/features/host-dashboard/api";
import { useHostBookingActions } from "@/features/host-dashboard/hooks/useHostBookingActions";
import { useHostDashboardData } from "@/features/host-dashboard/hooks/useHostDashboardData";
import { useHostListingActions } from "@/features/host-dashboard/hooks/useHostListingActions";

export function useHostDashboardScreenState() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = Boolean(isSignedIn);

  const archiveHostCar = useMutation(hostDashboardApi.archiveHostCar) as any;
  const unarchiveHostCar = useMutation(hostDashboardApi.unarchiveHostCar) as any;
  const deleteHostCar = useMutation(hostDashboardApi.deleteHostCar) as any;
  const fileHostDepositCase = useMutation(hostDashboardApi.fileHostDepositCase) as any;
  const cancelReservation = useMutation(hostDashboardApi.cancelReservation) as any;

  const listingActions = useHostListingActions({
    t,
    toast,
    archiveHostCar,
    unarchiveHostCar,
    deleteHostCar,
  });
  const dataState = useHostDashboardData(signedIn, listingActions.optimisticStatusByCarId);
  const bookingActions = useHostBookingActions({
    t,
    router,
    toast,
    fileHostDepositCase,
    cancelReservation,
  });

  return {
    isLoaded,
    isSignedIn,
    router,
    ...dataState,
    ...listingActions,
    ...bookingActions,
  };
}

export type HostDashboardScreenController = ReturnType<typeof useHostDashboardScreenState>;
