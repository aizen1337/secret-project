import { describe, expect, it } from "vitest";

import { deriveHostVerificationState } from "../../convex/features/users/domain/hostVerificationState";

describe("deriveHostVerificationState", () => {
  it("returns unverified when no Connect account exists", () => {
    expect(
      deriveHostVerificationState({
        hasConnectAccount: false,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      }),
    ).toBe("unverified");
  });

  it("returns verified_pending_capabilities when onboarding is complete but capabilities are not", () => {
    expect(
      deriveHostVerificationState({
        hasConnectAccount: true,
        onboardingComplete: true,
        chargesEnabled: true,
        payoutsEnabled: false,
      }),
    ).toBe("verified_pending_capabilities");

    expect(
      deriveHostVerificationState({
        hasConnectAccount: true,
        onboardingComplete: true,
        chargesEnabled: false,
        payoutsEnabled: true,
      }),
    ).toBe("verified_pending_capabilities");
  });

  it("returns verified_ready when onboarding and payout capabilities are enabled", () => {
    expect(
      deriveHostVerificationState({
        hasConnectAccount: true,
        onboardingComplete: true,
        chargesEnabled: true,
        payoutsEnabled: true,
      }),
    ).toBe("verified_ready");
  });
});
