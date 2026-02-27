import { describe, expect, it } from "vitest";

import {
  calculateBillableDays,
  canCancelReservation,
  canPayNowForBooking,
  canRetryPayoutForHost,
} from "../../convex/features/bookings/domain/bookingPolicies";

describe("bookingPolicies", () => {
  it("calculates 24h-block billable days", () => {
    expect(calculateBillableDays("2026-03-01T10:00:00.000Z", "2026-03-02T09:59:59.999Z")).toBe(1);
    expect(calculateBillableDays("2026-03-01T10:00:00.000Z", "2026-03-02T10:00:00.000Z")).toBe(2);
    expect(calculateBillableDays("2026-03-01T10:00:00.000Z", "2026-03-01T11:00:00.000Z")).toBe(1);
  });

  it("guards cancellable reservation states", () => {
    const booking = { status: "payment_pending" };
    expect(canCancelReservation(booking, null)).toBe(true);
    expect(canCancelReservation({ status: "completed" }, null)).toBe(false);
    expect(canCancelReservation({ status: "confirmed" }, null)).toBe(false);
    expect(canCancelReservation(booking, { status: "method_saved" })).toBe(true);
    expect(canCancelReservation(booking, { status: "paid" })).toBe(false);
  });

  it("detects pay-now eligibility", () => {
    const booking = { status: "payment_pending" };
    const payment = { status: "method_saved", paymentDueAt: Date.now() + 10_000 };
    expect(canPayNowForBooking(booking, payment)).toBe(true);
    expect(canPayNowForBooking(booking, { ...payment, paymentDueAt: Date.now() - 10_000 })).toBe(false);
  });

  it("detects payout retry eligibility", () => {
    expect(
      canRetryPayoutForHost({
        status: "paid",
        paymentStrategy: "platform_transfer_fallback",
        payoutStatus: "error",
        releaseAt: Date.now() - 1,
      }),
    ).toBe(true);
    expect(
      canRetryPayoutForHost({
        status: "paid",
        paymentStrategy: "platform_transfer_fallback",
        payoutStatus: "transferred",
        releaseAt: Date.now() - 1,
      }),
    ).toBe(false);
  });
});
