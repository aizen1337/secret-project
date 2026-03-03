const LOCKBOX_REVEAL_WINDOW_MS = 2 * 60 * 60 * 1000;

export type TripStartCollectionMethod = "in_person" | "lockbox" | "host_delivery";
export type TripStartCollectionViewerRole = "host" | "renter";
export type TripStartCollectionStatus = "confirmed" | "in_progress";

export type TripStartCollectionBookingState = {
  status: string;
  startDate: string;
  hostCollectionConfirmedAt?: number;
  renterCollectionConfirmedAt?: number;
  tripStartedAt?: number;
};

export function getLockboxCodeVisibleAt(startDate: string): number | null {
  const tripStartTs = new Date(startDate).getTime();
  if (!Number.isFinite(tripStartTs)) {
    return null;
  }
  return tripStartTs - LOCKBOX_REVEAL_WINDOW_MS;
}

export function getLockboxCodeVisibility(args: {
  method: TripStartCollectionMethod;
  viewerRole: TripStartCollectionViewerRole;
  startDate: string;
  now: number;
}) {
  if (args.method !== "lockbox") {
    return {
      lockboxCodeVisibleAt: null,
      isLockboxCodeVisible: false,
    };
  }

  const lockboxCodeVisibleAt = getLockboxCodeVisibleAt(args.startDate);
  return {
    lockboxCodeVisibleAt,
    isLockboxCodeVisible:
      args.viewerRole === "host" ||
      (typeof lockboxCodeVisibleAt === "number" && args.now >= lockboxCodeVisibleAt),
  };
}

function isTripStartCollectionStatus(status: string): status is TripStartCollectionStatus {
  return status === "confirmed" || status === "in_progress";
}

type TripStartCollectionPatch = {
  hostCollectionConfirmedAt?: number;
  renterCollectionConfirmedAt?: number;
  status?: TripStartCollectionStatus;
  tripStartedAt?: number;
  updatedAt?: number;
};

export function buildTripStartCollectionConfirmationPatch(args: {
  booking: TripStartCollectionBookingState;
  actorRole: TripStartCollectionViewerRole;
  now: number;
}) {
  if (!isTripStartCollectionStatus(args.booking.status)) {
    throw new Error("INVALID_INPUT: Trip start confirmation is unavailable for this booking.");
  }

  const lockboxCodeVisibleAt = getLockboxCodeVisibleAt(args.booking.startDate);
  if (typeof lockboxCodeVisibleAt !== "number") {
    throw new Error("INVALID_INPUT: Booking start date is invalid.");
  }
  if (args.now < lockboxCodeVisibleAt) {
    throw new Error("INVALID_INPUT: Trip collection can be confirmed only near the trip start.");
  }

  const patch: TripStartCollectionPatch = {};
  if (args.actorRole === "host" && !args.booking.hostCollectionConfirmedAt) {
    patch.hostCollectionConfirmedAt = args.now;
  }
  if (args.actorRole === "renter" && !args.booking.renterCollectionConfirmedAt) {
    patch.renterCollectionConfirmedAt = args.now;
  }
  if (args.actorRole === "renter" && args.booking.status === "confirmed") {
    patch.status = "in_progress";
  }
  if (args.actorRole === "renter" && !args.booking.tripStartedAt) {
    patch.tripStartedAt = args.now;
  }
  if (Object.keys(patch).length > 0) {
    patch.updatedAt = args.now;
  }

  return { patch, lockboxCodeVisibleAt };
}

