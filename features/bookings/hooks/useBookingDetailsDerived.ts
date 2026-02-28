import { useMemo } from "react";
import type { TFunction } from "i18next";

import { buildRegionForRadius } from "@/features/cars/components/dashboard/searchUtils";
import { statusBadgeClasses, toReadableFallback } from "@/features/bookings/helpers/statusPresentation";
import type { CarLocation } from "@/features/map/SearchMap";

type UseBookingDetailsDerivedParams = {
  details: any;
  t: TFunction;
  isTablet: boolean;
  isDesktop: boolean;
};

function localizeStatus(t: TFunction, status: string | undefined) {
  if (!status) return t("common.unknown");
  const normalized = status.toLowerCase();
  const key = `trips.statuses.${normalized}`;
  const translated = t(key);
  return translated === key ? toReadableFallback(normalized) : translated;
}

function localizeCollectionMethod(t: TFunction, method: string | undefined) {
  if (!method) return t("common.unknown");
  const key = `bookingDetails.collection.methods.${method}`;
  const translated = t(key);
  return translated === key ? toReadableFallback(method) : translated;
}

export function useBookingDetailsDerived({
  details,
  t,
  isTablet,
  isDesktop,
}: UseBookingDetailsDerivedParams) {
  const payoutReleaseAt = useMemo(() => {
    if (details?.viewerRole !== "host" || !details.payment?.releaseAt) return null;
    if (details.payment.payoutStatus !== "eligible") return null;
    return new Date(details.payment.releaseAt);
  }, [details]);

  const mapCars = useMemo<CarLocation[]>(() => {
    if (!details?.car?.id || typeof details.car.location?.lat !== "number" || typeof details.car.location?.lng !== "number") {
      return [];
    }
    return [
      {
        id: String(details.car.id),
        latitude: details.car.location.lat,
        longitude: details.car.location.lng,
        pricePerDay: Number(details.car.pricePerDay ?? 0),
        title: details.car.title || `${details.car.make} ${details.car.model}`,
        make: details.car.make,
        model: details.car.model,
        locationCity: details.car.location.city,
        locationCountry: details.car.location.country,
        imageUrl: details.car.images?.[0] ?? null,
      },
    ];
  }, [details]);

  const mapRegion = useMemo(() => {
    const lat = mapCars[0]?.latitude;
    const lng = mapCars[0]?.longitude;
    if (typeof lat === "number" && typeof lng === "number") return buildRegionForRadius(lat, lng, 8);
    return buildRegionForRadius(37.7749, -122.4194, 8);
  }, [mapCars]);

  const isHostViewer = details?.viewerRole === "host";
  const bookingStatusTone = statusBadgeClasses(details?.booking?.status);
  const paymentStatusTone = statusBadgeClasses(details?.payment?.status);
  const payoutStatusTone = isHostViewer ? statusBadgeClasses(details?.payment?.payoutStatus) : null;
  const depositStatusTone = statusBadgeClasses(details?.payment?.depositStatus);
  const bookingStatusLabel = localizeStatus(t, details?.booking?.status);
  const paymentStatusLabel = localizeStatus(t, details?.payment?.status ?? "pending");
  const payoutStatusLabel = isHostViewer ? localizeStatus(t, details?.payment?.payoutStatus ?? "pending") : null;
  const depositStatusLabel = localizeStatus(t, details?.payment?.depositStatus);
  const tripDateLabel =
    details?.booking?.startDate && details?.booking?.endDate
      ? `${new Date(details.booking.startDate).toLocaleDateString()} - ${new Date(details.booking.endDate).toLocaleDateString()}`
      : t("common.unknown");
  const canRetryPayout = Boolean(
    isHostViewer &&
      details?.payment?.canRetryPayout &&
      details?.payment?.payoutStatus !== "transferred" &&
      details?.payment?.payoutStatus !== "reversed",
  );
  const collectionMethod = details?.collection?.method;
  const collectionMethodLabel = localizeCollectionMethod(t, collectionMethod);
  const collectionCodeVisibleAt = details?.collection?.lockboxCodeVisibleAt ?? null;
  const canConfirmTripStartCollection =
    (details?.booking?.status === "confirmed" || details?.booking?.status === "in_progress") &&
    (typeof collectionCodeVisibleAt !== "number" || Date.now() >= collectionCodeVisibleAt);

  return {
    isHostViewer,
    bookingStatusTone,
    paymentStatusTone,
    payoutStatusTone,
    depositStatusTone,
    bookingStatusLabel,
    paymentStatusLabel,
    payoutStatusLabel,
    depositStatusLabel,
    tripDateLabel,
    collectionMethodLabel,
    canConfirmTripStartCollection,
    collectionCodeVisibleAt,
    canRetryPayout,
    payoutReleaseAt,
    mapCars,
    mapRegion,
    detailGridLeftItemStyle: { width: isTablet ? "50%" : "100%", paddingRight: isTablet ? 24 : 0 } as const,
    detailGridRightItemStyle: { width: isTablet ? "50%" : "100%", paddingLeft: isTablet ? 24 : 0 } as const,
    detailGridFullItemStyle: { width: "100%" } as const,
    mapContainerClassName: isDesktop
      ? "mt-3 h-[72vh] w-full overflow-hidden"
      : "mt-3 h-[55vh] w-full overflow-hidden",
  };
}
