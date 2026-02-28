import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import type { Id } from "@/convex/_generated/dataModel";
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  isDateInput,
  isHourInput,
  toDateInputValue,
} from "@/features/cars/components/dashboard/searchUtils";

type CarDetailParams = {
  id: string;
  startDate?: string;
  endDate?: string;
  startHour?: string;
  endHour?: string;
};

export function useCarDetailRouteState() {
  const params = useLocalSearchParams<CarDetailParams>();
  const carId = typeof params.id === "string" ? (params.id as Id<"cars">) : undefined;
  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() + 2);
    return value;
  }, [today]);

  const [selectedStartDate, setSelectedStartDate] = useState(
    isDateInput(params.startDate) ? params.startDate : toDateInputValue(today),
  );
  const [selectedEndDate, setSelectedEndDate] = useState(
    isDateInput(params.endDate) ? params.endDate : toDateInputValue(defaultEnd),
  );
  const [selectedStartHour, setSelectedStartHour] = useState(
    isHourInput(params.startHour) ? params.startHour : DEFAULT_START_HOUR,
  );
  const [selectedEndHour, setSelectedEndHour] = useState(
    isHourInput(params.endHour) ? params.endHour : DEFAULT_END_HOUR,
  );

  return {
    carId,
    selectedStartDate,
    selectedEndDate,
    selectedStartHour,
    selectedEndHour,
    setSelectedStartDate,
    setSelectedEndDate,
    setSelectedStartHour,
    setSelectedEndHour,
  };
}
