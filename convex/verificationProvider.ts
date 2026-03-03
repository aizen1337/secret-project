import type { VerificationCheckType, VerificationProvider } from "./verificationPolicy";
import {
  createPolandLocalVerificationSession,
  fetchPolandLocalVerificationSession,
} from "./verificationProviderPolandLocal";
import {
  createStripeVerificationSession,
  fetchStripeVerificationSession,
} from "./verificationProviderStripe";

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
  fetchSession: (sessionId: string) => Promise<FetchVerificationSessionResult>;
};

export type FetchVerificationSessionResult = {
  sessionId: string;
  status: string;
  checkType?: VerificationCheckType;
  rejectionReason?: string;
};

export function getVerificationProvider(provider: VerificationProvider): VerificationProviderClient {
  if (provider === "stripe") {
    return {
      createSession: createStripeVerificationSession,
      fetchSession: fetchStripeVerificationSession,
    };
  }
  if (provider === "poland_local") {
    return {
      createSession: createPolandLocalVerificationSession,
      fetchSession: fetchPolandLocalVerificationSession,
    };
  }
  throw new Error(`Unsupported verification provider: ${provider}`);
}
