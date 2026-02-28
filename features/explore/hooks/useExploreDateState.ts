import { useCallback, useMemo, useState } from "react";

import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  toDateInputValue,
  toEndOfHourIso,
  toStartOfHourIso,
} from "@/features/cars/components/dashboard/searchUtils";

export function useExploreDateState() {
  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  }, []);

  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(defaultEnd));
  const [startHour, setStartHour] = useState(DEFAULT_START_HOUR);
  const [endHour, setEndHour] = useState(DEFAULT_END_HOUR);
  const startIso = useMemo(() => toStartOfHourIso(startDate, startHour), [startDate, startHour]);
  const endIso = useMemo(() => toEndOfHourIso(endDate, endHour), [endDate, endHour]);
  const isDateRangeValid = useMemo(
    () => new Date(startIso).getTime() <= new Date(endIso).getTime(),
    [endIso, startIso],
  );

  const onApplyDates = useCallback((nextStartDate: string, nextEndDate: string) => {
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
  }, []);

  const onApplyHours = useCallback((nextStartHour: string, nextEndHour: string) => {
    setStartHour(nextStartHour);
    setEndHour(nextEndHour);
  }, []);

  return {
    startDate,
    endDate,
    startHour,
    endHour,
    startIso,
    endIso,
    isDateRangeValid,
    onApplyDates,
    onApplyHours,
  };
}
