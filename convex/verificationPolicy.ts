export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type VerificationCheckType = "driver_license";
export type VerificationSubjectType = "renter";
export type VerificationProvider = "stripe" | "mobywatel";
export type VerificationReasonCode =
  | "VERIFICATION_PENDING"
  | "VERIFICATION_REJECTED"
  | "UNVERIFIED_RENTER";

export function resolveDefaultVerificationProvider(
  configuredValue = process.env.VERIFICATION_PROVIDER_DEFAULT,
): VerificationProvider {
  const normalized = String(configuredValue ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "stripe") return "stripe";
  if (normalized === "mobywatel") return "mobywatel";
  return "stripe";
}

export const requiredRenterChecks: VerificationCheckType[] = ["driver_license"];

export function evaluateRenterBookingEligibility(
  checks: Record<VerificationCheckType, VerificationStatus>,
): {
  readyToBook: boolean;
  reasonCode?: VerificationReasonCode;
  missingChecks: VerificationCheckType[];
} {
  const missingChecks = requiredRenterChecks.filter((check) => checks[check] !== "verified");
  if (missingChecks.length === 0) {
    return { readyToBook: true, missingChecks: [] };
  }

  const hasPending = missingChecks.some((check) => checks[check] === "pending");
  if (hasPending) {
    return { readyToBook: false, reasonCode: "VERIFICATION_PENDING", missingChecks };
  }

  const hasRejected = missingChecks.some((check) => checks[check] === "rejected");
  if (hasRejected) {
    return { readyToBook: false, reasonCode: "VERIFICATION_REJECTED", missingChecks };
  }

  return {
    readyToBook: false,
    reasonCode: "UNVERIFIED_RENTER",
    missingChecks,
  };
}
