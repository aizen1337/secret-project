import { api } from "@/convex/_generated/api";

export const onboardingApi = {
  getCurrentUser: api.users.getCurrentUser,
  getMyRenterVerificationStatus: api.verification.getMyRenterVerificationStatus,
  getHostPayoutStatus: api.users.getHostPayoutStatus,
  beginSignupOnboarding: api.users.beginSignupOnboarding,
  setOnboardingRole: api.users.setOnboardingRole,
  finalizeOnboarding: api.users.finalizeOnboarding,
  startRenterIdentityCheck: api.verification.startRenterIdentityCheck,
  startRenterDriverLicenseCheck: api.verification.startRenterDriverLicenseCheck,
  syncRenterVerificationSession: api.verification.syncRenterVerificationSession,
  createHostOnboardingLink: api.stripeConnect.createHostOnboardingLink,
  refreshHostConnectStatus: api.stripeConnect.refreshHostConnectStatus,
};
