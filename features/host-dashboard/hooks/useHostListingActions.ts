import { useCallback, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { TFunction } from "i18next";

import { toLocalizedErrorMessage } from "@/lib/errors";

type UseHostListingActionsParams = {
  t: TFunction;
  toast: { error: (message: string) => void };
  archiveHostCar: (args: { carId: Id<"cars"> }) => Promise<unknown>;
  unarchiveHostCar: (args: { carId: Id<"cars"> }) => Promise<unknown>;
  deleteHostCar: (args: { carId: Id<"cars"> }) => Promise<unknown>;
};

export function useHostListingActions({
  t,
  toast,
  archiveHostCar,
  unarchiveHostCar,
  deleteHostCar,
}: UseHostListingActionsParams) {
  const [pendingCarId, setPendingCarId] = useState<string | null>(null);
  const [optimisticStatusByCarId, setOptimisticStatusByCarId] = useState<Record<string, boolean>>({});

  const clearOptimisticStatus = useCallback((carId: string) => {
    setOptimisticStatusByCarId((prev) => {
      const next = { ...prev };
      delete next[carId];
      return next;
    });
  }, []);

  const handleArchiveCar = useCallback(async (carId: string) => {
    setPendingCarId(carId);
    setOptimisticStatusByCarId((prev) => ({ ...prev, [carId]: false }));
    try {
      await archiveHostCar({ carId: carId as Id<"cars"> });
    } catch (error) {
      clearOptimisticStatus(carId);
      toast.error(toLocalizedErrorMessage(error, t, "dashboard.listingErrors.archive"));
    } finally {
      setPendingCarId(null);
    }
  }, [archiveHostCar, clearOptimisticStatus, t, toast]);

  const handleUnarchiveCar = useCallback(async (carId: string) => {
    setPendingCarId(carId);
    setOptimisticStatusByCarId((prev) => ({ ...prev, [carId]: true }));
    try {
      await unarchiveHostCar({ carId: carId as Id<"cars"> });
    } catch (error) {
      clearOptimisticStatus(carId);
      toast.error(toLocalizedErrorMessage(error, t, "dashboard.listingErrors.unarchive"));
    } finally {
      setPendingCarId(null);
    }
  }, [clearOptimisticStatus, t, toast, unarchiveHostCar]);

  const handleDeleteCar = useCallback(async (carId: string) => {
    setPendingCarId(carId);
    try {
      await deleteHostCar({ carId: carId as Id<"cars"> });
    } catch (error) {
      toast.error(toLocalizedErrorMessage(error, t, "dashboard.listingErrors.delete"));
    } finally {
      setPendingCarId(null);
    }
  }, [deleteHostCar, t, toast]);

  return {
    pendingCarId,
    optimisticStatusByCarId,
    handleArchiveCar,
    handleUnarchiveCar,
    handleDeleteCar,
  };
}
