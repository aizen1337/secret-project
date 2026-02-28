import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel";

import { hostDashboardApi } from "@/features/host-dashboard/api";

export function useHostDashboardData(signedIn: boolean, optimisticStatusByCarId: Record<string, boolean>) {
  const [activeTab, setActiveTab] = useState<"listings" | "bookings">("listings");
  const [listingStatus, setListingStatus] = useState<"active" | "archived">("active");
  const hostPayoutStatus = useQuery(hostDashboardApi.getHostPayoutStatus, signedIn ? {} : "skip");
  const hostVerified = Boolean(hostPayoutStatus?.hostVerified);
  const myCars = useQuery(
    hostDashboardApi.listHostCars,
    signedIn && hostVerified ? { status: listingStatus } : "skip",
  );
  const hostPayouts = useQuery(
    hostDashboardApi.listHostBookingsWithPayouts,
    signedIn && hostVerified ? {} : "skip",
  );
  const displayedCars = useMemo(() => {
    const cars: Doc<"cars">[] = myCars ?? [];
    return cars.filter((car) => {
      const optimisticActive = optimisticStatusByCarId[car._id];
      const effectiveIsActive = optimisticActive ?? car.isActive;
      return listingStatus === "active" ? effectiveIsActive : !effectiveIsActive;
    });
  }, [myCars, optimisticStatusByCarId, listingStatus]);

  const listingStats = useMemo(() => {
    const total = displayedCars.length;
    const averagePrice =
      total > 0 ? Math.round(displayedCars.reduce((sum, car) => sum + car.pricePerDay, 0) / total) : 0;
    return { total, averagePrice };
  }, [displayedCars]);

  return {
    activeTab,
    setActiveTab,
    listingStatus,
    setListingStatus,
    hostPayoutStatus,
    hostVerified,
    myCars,
    hostPayouts,
    displayedCars,
    listingStats,
    isLoading: signedIn && hostVerified && myCars === undefined,
  };
}
