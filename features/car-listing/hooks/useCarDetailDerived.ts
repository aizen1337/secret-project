import { useMemo } from "react";

import {
  toEndOfHourIso,
  toStartOfHourIso,
} from "@/features/cars/components/dashboard/searchUtils";

type UseCarDetailDerivedParams = {
  offer: any;
  currentUser: any;
  selectedStartDate: string;
  selectedEndDate: string;
  selectedStartHour: string;
  selectedEndHour: string;
  activeImageIndex: number;
};

export function useCarDetailDerived({
  offer,
  currentUser,
  selectedStartDate,
  selectedEndDate,
  selectedStartHour,
  selectedEndHour,
  activeImageIndex,
}: UseCarDetailDerivedParams) {
  const car = offer?.car;
  const host = offer?.hostPublic;
  const hostUser = offer?.hostUserPublic;
  const startIso = toStartOfHourIso(selectedStartDate, selectedStartHour);
  const endIso = toEndOfHourIso(selectedEndDate, selectedEndHour);
  const startTs = new Date(startIso).getTime();
  const endTs = new Date(endIso).getTime();
  const dateRangeValid = Number.isFinite(startTs) && Number.isFinite(endTs) && startTs <= endTs;
  const selectedDays = dateRangeValid ? Math.max(1, Math.ceil((endTs - startTs + 1) / (24 * 60 * 60 * 1000))) : 1;
  const totalPrice = (car?.pricePerDay ?? 0) * selectedDays;
  const serviceFee = Math.round(totalPrice * 0.1);
  const depositAmount = Number(car?.depositAmount ?? 0);
  const grandTotal = totalPrice + serviceFee + depositAmount;
  const paymentDueAt = new Date(startTs - 24 * 60 * 60 * 1000);
  const paymentDueLabel = dateRangeValid ? paymentDueAt.toLocaleString() : "-";
  const carImages = Array.isArray(car?.images) ? (car.images as string[]) : [];
  const galleryImages: string[] = carImages.length > 0 ? carImages : [""];
  const sideImages = galleryImages
    .map((image, index) => ({ image, index }))
    .filter((item) => item.index !== activeImageIndex)
    .slice(0, 4);
  const extraPhotosCount = Math.max(0, galleryImages.length - (sideImages.length + 1));
  const displayFeatures = [...(car?.features ?? []), ...(car?.customFeatures ?? [])].filter(Boolean);
  const hostInitial = (hostUser?.name?.trim()?.charAt(0) || "H").toUpperCase();
  const hostMemberSince = useMemo(
    () =>
      host
        ? new Date(host.createdAt).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })
        : null,
    [host],
  );
  const isOwnListing = Boolean(currentUser?._id && hostUser?.id && String(currentUser._id) === String(hostUser.id));
  const hostUserId = hostUser?.id ? String(hostUser.id) : "";
  return {
    car,
    host,
    hostUser,
    startIso,
    endIso,
    dateRangeValid,
    selectedDays,
    totalPrice,
    serviceFee,
    depositAmount,
    grandTotal,
    paymentDueLabel,
    galleryImages,
    sideImages,
    extraPhotosCount,
    displayFeatures,
    hostInitial,
    hostMemberSince,
    isOwnListing,
    hostUserId,
  };
}
