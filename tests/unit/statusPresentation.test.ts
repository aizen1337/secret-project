import { describe, expect, it } from "vitest";

import { statusBadgeClasses, toReadableFallback } from "../../features/bookings/helpers/statusPresentation";

describe("statusPresentation", () => {
  it("formats unknown statuses safely", () => {
    expect(toReadableFallback(undefined)).toBe("-");
    expect(toReadableFallback("payment_pending")).toBe("Payment Pending");
  });

  it("maps status tones", () => {
    expect(statusBadgeClasses("paid").container).toContain("green");
    expect(statusBadgeClasses("error").container).toContain("red");
    expect(statusBadgeClasses("pending").container).toContain("amber");
  });
});
