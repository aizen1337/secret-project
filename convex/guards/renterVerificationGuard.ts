import { internal } from "../_generated/api";
import { isEnvTrue } from "../env";

function isRenterVerificationEnabled() {
  return isEnvTrue("ENABLE_RENTER_VERIFICATION", false);
}

export async function assertRenterCanBook(ctx: any) {
  if (!isRenterVerificationEnabled()) {
    return;
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("You must be signed in to continue checkout.");
  }

  const verification = await ctx.runQuery(internal.verification.getRenterEligibilityInternal, {
    clerkUserId: identity.subject,
  });

  if (verification.readyToBook) {
    return;
  }

  if (verification.reasonCode === "VERIFICATION_PENDING") {
    throw new Error("VERIFICATION_PENDING: Please finish renter verification before booking.");
  }
  if (verification.reasonCode === "VERIFICATION_REJECTED") {
    throw new Error("VERIFICATION_REJECTED: Your verification needs attention before booking.");
  }

  throw new Error("UNVERIFIED_RENTER: Driver's license verification is required.");
}
