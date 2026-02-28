import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";

import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  isDateInput,
  isHourInput,
  normalizeParam,
  toDateInputValue,
} from "@/features/cars/components/dashboard/searchUtils";

type SearchParams = {
  location?: string | string[];
  lat?: string | string[];
  lng?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
  startHour?: string | string[];
  endHour?: string | string[];
};

export function useSearchRouteState() {
  const params = useLocalSearchParams<SearchParams>();
  const initialLocation = normalizeParam(params.location)?.trim() ?? "";
  const latRaw = normalizeParam(params.lat);
  const lngRaw = normalizeParam(params.lng);
  const parsedLat = Number(latRaw);
  const parsedLng = Number(lngRaw);
  const hasValidCenter = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

  const startDateFromParams = normalizeParam(params.startDate);
  const endDateFromParams = normalizeParam(params.endDate);
  const startHourFromParams = normalizeParam(params.startHour);
  const endHourFromParams = normalizeParam(params.endHour);

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  }, []);

  return {
    initialLocation,
    hasValidCenter,
    initialCenterLat: hasValidCenter ? parsedLat : 0,
    initialCenterLng: hasValidCenter ? parsedLng : 0,
    initialStartDate: isDateInput(startDateFromParams)
      ? startDateFromParams
      : toDateInputValue(today),
    initialEndDate: isDateInput(endDateFromParams)
      ? endDateFromParams
      : toDateInputValue(defaultEnd),
    initialStartHour: isHourInput(startHourFromParams)
      ? startHourFromParams
      : DEFAULT_START_HOUR,
    initialEndHour: isHourInput(endHourFromParams)
      ? endHourFromParams
      : DEFAULT_END_HOUR,
  };
}
