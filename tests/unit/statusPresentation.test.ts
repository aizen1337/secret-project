import { describe, expect, it } from "vitest";

import { statusBadgeClasses, toReadableFallback } from "../../features/bookings/helpers/statusPresentation";
import { en } from "../../lib/i18n/resources/en";
import { pl } from "../../lib/i18n/resources/pl";

describe("statusPresentation", () => {
  it("formats unknown statuses safely", () => {
    expect(toReadableFallback(undefined)).toBe("-");
    expect(toReadableFallback("payment_pending")).toBe("Payment Pending");
  });

  it("maps status tones", () => {
    expect(statusBadgeClasses("paid").container).toContain("green");
    expect(statusBadgeClasses("in_progress").container).toContain("green");
    expect(statusBadgeClasses("error").container).toContain("red");
    expect(statusBadgeClasses("pending").container).toContain("amber");
  });

  it("contains in_progress localization in both languages", () => {
    expect(en.trips.statuses.in_progress).toBe("In progress");
    expect(pl.trips.statuses.in_progress).toBe("W trakcie");
  });
});
