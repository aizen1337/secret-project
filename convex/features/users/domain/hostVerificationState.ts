export type HostVerificationState =
  | "unverified"
  | "verified_pending_capabilities"
  | "verified_ready";

export function deriveHostVerificationState(args: {
  hasConnectAccount: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}): HostVerificationState {
  if (!args.hasConnectAccount || !args.onboardingComplete) {
    return "unverified";
  }

  if (!args.payoutsEnabled || !args.chargesEnabled) {
    return "verified_pending_capabilities";
  }

  return "verified_ready";
}
