import type {
  CreateVerificationSessionArgs,
  CreateVerificationSessionResult,
  FetchVerificationSessionResult,
} from "./verificationProvider";

export async function createMobywatelVerificationSession(
  _args: CreateVerificationSessionArgs,
): Promise<CreateVerificationSessionResult> {
  throw new Error("UNAVAILABLE: mObywatel verification will be implemented soon.");
}

export async function fetchMobywatelVerificationSession(
  sessionId: string,
): Promise<FetchVerificationSessionResult> {
  return {
    sessionId,
    status: "pending",
    checkType: "driver_license",
  };
}
