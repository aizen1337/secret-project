import type { VerificationCheckType, VerificationProvider } from "./verificationPolicy";
import { createStripeVerificationSession } from "./verificationProviderStripe";

export type CreateVerificationSessionArgs = {
  checkType: VerificationCheckType;
  subjectType: "renter";
  userId: string;
  returnUrl: string;
  metadata?: Record<string, string>;
};

export type CreateVerificationSessionResult = {
  sessionId: string;
  status: string;
  url: string;
};

export type VerificationProviderClient = {
  createSession: (args: CreateVerificationSessionArgs) => Promise<CreateVerificationSessionResult>;
};

export function getVerificationProvider(provider: VerificationProvider): VerificationProviderClient {
  if (provider === "stripe") {
    return {
      createSession: createStripeVerificationSession,
    };
  }
  throw new Error(`Unsupported verification provider: ${provider}`);
}
