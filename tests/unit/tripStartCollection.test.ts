import { describe, expect, it } from "vitest";

import {
  buildTripStartCollectionConfirmationPatch,
  getLockboxCodeVisibility,
} from "../../convex/features/bookings/domain/tripStartCollection";

describe("tripStartCollection domain", () => {
  it("keeps lockbox code visible for host, but gates renter visibility by reveal window", () => {
    const startDate = "2026-03-10T10:00:00.000Z";
    const twoHoursBefore = new Date("2026-03-10T08:00:00.000Z").getTime();

    const hostVisibility = getLockboxCodeVisibility({
      method: "lockbox",
      viewerRole: "host",
      startDate,
      now: twoHoursBefore - 1000,
    });
    expect(hostVisibility.isLockboxCodeVisible).toBe(true);
    expect(hostVisibility.lockboxCodeVisibleAt).toBe(twoHoursBefore);

    const renterTooEarly = getLockboxCodeVisibility({
      method: "lockbox",
      viewerRole: "renter",
      startDate,
      now: twoHoursBefore - 1000,
    });
    expect(renterTooEarly.isLockboxCodeVisible).toBe(false);

    const renterInWindow = getLockboxCodeVisibility({
      method: "lockbox",
      viewerRole: "renter",
      startDate,
      now: twoHoursBefore,
    });
    expect(renterInWindow.isLockboxCodeVisible).toBe(true);
  });

  it("tracks host and renter confirmations idempotently and starts trip on renter confirm", () => {
    const startDate = "2026-03-10T10:00:00.000Z";
    const now = new Date("2026-03-10T09:00:00.000Z").getTime();

    const hostConfirm = buildTripStartCollectionConfirmationPatch({
      booking: { status: "confirmed", startDate },
      actorRole: "host",
      now,
    });
    expect(hostConfirm.patch).toEqual({
      hostCollectionConfirmedAt: now,
      updatedAt: now,
    });

    const renterConfirm = buildTripStartCollectionConfirmationPatch({
      booking: { status: "confirmed", startDate },
      actorRole: "renter",
      now,
    });
    expect(renterConfirm.patch).toEqual({
      renterCollectionConfirmedAt: now,
      status: "in_progress",
      tripStartedAt: now,
      updatedAt: now,
    });

    const renterIdempotent = buildTripStartCollectionConfirmationPatch({
      booking: {
        status: "in_progress",
        startDate,
        renterCollectionConfirmedAt: now,
        tripStartedAt: now,
      },
      actorRole: "renter",
      now: now + 1000,
    });
    expect(renterIdempotent.patch).toEqual({});
  });

  it("rejects confirmation before reveal window", () => {
    const startDate = "2026-03-10T10:00:00.000Z";
    const tooEarly = new Date("2026-03-10T07:59:59.000Z").getTime();

    expect(() =>
      buildTripStartCollectionConfirmationPatch({
        booking: { status: "confirmed", startDate },
        actorRole: "renter",
        now: tooEarly,
      }),
    ).toThrow("INVALID_INPUT: Trip collection can be confirmed only near the trip start.");
  });
});

