import { describe, expect, it } from "vitest";

import {
  evaluateRenterBookingEligibility,
  resolveDefaultVerificationProvider,
} from "../../convex/verificationPolicy";

describe("verificationPolicy", () => {
  it("defaults verification provider to poland_local", () => {
    expect(resolveDefaultVerificationProvider(undefined)).toBe("poland_local");
    expect(resolveDefaultVerificationProvider("")).toBe("poland_local");
    expect(resolveDefaultVerificationProvider("unknown")).toBe("poland_local");
    expect(resolveDefaultVerificationProvider("poland_local")).toBe("poland_local");
    expect(resolveDefaultVerificationProvider("stripe")).toBe("stripe");
  });

  it("keeps renter booking gate on driver_license", () => {
    const blocked = evaluateRenterBookingEligibility({
      identity: "verified",
      driver_license: "pending",
    });
    expect(blocked.readyToBook).toBe(false);
    expect(blocked.reasonCode).toBe("VERIFICATION_PENDING");
    expect(blocked.missingChecks).toEqual(["driver_license"]);

    const allowed = evaluateRenterBookingEligibility({
      identity: "unverified",
      driver_license: "verified",
    });
    expect(allowed.readyToBook).toBe(true);
    expect(allowed.missingChecks).toEqual([]);
  });
});
