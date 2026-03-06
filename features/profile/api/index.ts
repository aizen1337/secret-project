import { api } from "@/convex/_generated/api";

export const profileApi = {
  getCurrentUser: api.users.getCurrentUser,
  getPublicUserProfile: api.users.getPublicUserProfile,
  getHostPayoutStatus: api.users.getHostPayoutStatus,
  getMyRenterVerificationStatus: api.verification.getMyRenterVerificationStatus,
  listReviewsForUser: api.bookingReviews.listReviewsForUser,
  getUserReviewSummary: api.bookingReviews.getUserReviewSummary,
  createHostOnboardingLink: api.stripeConnect.createHostOnboardingLink,
  refreshHostConnectStatus: api.stripeConnect.refreshHostConnectStatus,
  startRenterDriverLicenseCheck: api.verification.startRenterDriverLicenseCheck,
  syncRenterVerificationSession: api.verification.syncRenterVerificationSession,
};
