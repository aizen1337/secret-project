import { describe, expect, it } from "vitest";

import {
  evaluateRenterBookingEligibility,
  resolveDefaultVerificationProvider,
} from "../../convex/verificationPolicy";

describe("verificationPolicy", () => {
  it("defaults verification provider to stripe", () => {
    expect(resolveDefaultVerificationProvider(undefined)).toBe("stripe");
    expect(resolveDefaultVerificationProvider("")).toBe("stripe");
    expect(resolveDefaultVerificationProvider("unknown")).toBe("stripe");
    expect(resolveDefaultVerificationProvider("mobywatel")).toBe("mobywatel");
    expect(resolveDefaultVerificationProvider("stripe")).toBe("stripe");
  });

  it("keeps renter booking gate on driver_license", () => {
    const blocked = evaluateRenterBookingEligibility({
      driver_license: "pending",
    });
    expect(blocked.readyToBook).toBe(false);
    expect(blocked.reasonCode).toBe("VERIFICATION_PENDING");
    expect(blocked.missingChecks).toEqual(["driver_license"]);

    const allowed = evaluateRenterBookingEligibility({
      driver_license: "verified",
    });
    expect(allowed.readyToBook).toBe(true);
    expect(allowed.missingChecks).toEqual([]);
  });
});
