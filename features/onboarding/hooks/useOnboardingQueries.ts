import { useMemo } from "react";
import { useQuery } from "convex/react";

import { onboardingApi } from "@/features/onboarding/api";

export type OnboardingRole = "renter" | "host" | "both";
export const ONBOARDING_ROLES: OnboardingRole[] = ["renter", "host", "both"];

function isOnboardingRole(value: unknown): value is OnboardingRole {
  return value === "renter" || value === "host" || value === "both";
}

export function useOnboardingQueries(isSignedIn: boolean) {
  const convexUser = useQuery(onboardingApi.getCurrentUser, isSignedIn ? {} : "skip");
  const renterVerification = useQuery(
    onboardingApi.getMyRenterVerificationStatus,
    isSignedIn ? {} : "skip",
  );
  const hostPayoutStatus = useQuery(onboardingApi.getHostPayoutStatus, isSignedIn ? {} : "skip");

  const selectedRole = isOnboardingRole(convexUser?.onboardingRole)
    ? convexUser.onboardingRole
    : undefined;
  const showActivationStep = Boolean(selectedRole);
  const hasAnyOnboardingState = Boolean(convexUser?.onboardingStatus || selectedRole);
  const renterReady = Boolean(renterVerification?.readyToBook);
  const renterEnabled = renterVerification?.enabled ?? false;
  const driverLicenseStatus = renterVerification?.driverLicenseStatus ?? "unverified";
  const hostReady = Boolean(hostPayoutStatus?.payoutsEnabled);
  const hostVerified = Boolean(hostPayoutStatus?.hostVerified);
  const hasConnectAccount = Boolean(hostPayoutStatus?.hasConnectAccount);
  const hostOnboardingComplete = Boolean(hostPayoutStatus?.onboardingComplete);
  const hostChargesEnabled = Boolean(hostPayoutStatus?.chargesEnabled);
  const hostPayoutsEnabled = Boolean(hostPayoutStatus?.payoutsEnabled);
  const hostVerificationState = hostPayoutStatus?.verificationState ?? "unverified";
  const hostRequiredActions = Array.isArray(hostPayoutStatus?.requiredActions)
    ? hostPayoutStatus.requiredActions
    : [];
  const hostDisabledReason = hostPayoutStatus?.disabledReason ?? null;
  const hostIdentityDocumentRequired = Boolean(hostPayoutStatus?.identityDocumentRequired);
  const requiresRenter = selectedRole === "renter" || selectedRole === "both";
  const requiresHost = selectedRole === "host" || selectedRole === "both";

  const activationComplete = useMemo(() => {
    if (!selectedRole) return false;
    if (selectedRole === "renter") return renterReady;
    if (selectedRole === "host") return hostReady;
    return renterReady && hostReady;
  }, [hostReady, renterReady, selectedRole]);

  return {
    convexUser,
    selectedRole,
    showActivationStep,
    hasAnyOnboardingState,
    renterReady,
    renterEnabled,
    driverLicenseStatus,
    hostReady,
    hostVerified,
    hasConnectAccount,
    hostOnboardingComplete,
    hostChargesEnabled,
    hostPayoutsEnabled,
    hostVerificationState,
    hostRequiredActions,
    hostDisabledReason,
    hostIdentityDocumentRequired,
    requiresRenter,
    requiresHost,
    activationComplete,
  };
}
