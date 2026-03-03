import type {
  CreateVerificationSessionArgs,
  CreateVerificationSessionResult,
  FetchVerificationSessionResult,
} from "./verificationProvider";
import type { VerificationCheckType } from "./verificationPolicy";

function getPolandVerificationApiBaseUrl() {
  const baseUrl = process.env.POLAND_VERIFICATION_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing POLAND_VERIFICATION_API_BASE_URL in Convex environment.");
  }
  return baseUrl.replace(/\/+$/, "");
}

function getPolandVerificationApiKey() {
  const apiKey = process.env.POLAND_VERIFICATION_API_KEY;
  if (!apiKey) {
    throw new Error("Missing POLAND_VERIFICATION_API_KEY in Convex environment.");
  }
  return apiKey;
}

function mapMethodByCheckType(checkType: VerificationCheckType) {
  return checkType === "driver_license" ? "drivers_license" : "identity";
}

function isMobywatelEnabled() {
  return (
    String(process.env.POLAND_VERIFICATION_ENABLE_MOBYWATEL ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

function resolvePrimaryMethod() {
  return isMobywatelEnabled() ? "mobywatel_eid" : "document_ocr_selfie";
}

function buildFallbackMethods(checkType: VerificationCheckType) {
  const fallbackEnabled =
    String(process.env.POLAND_VERIFICATION_ENABLE_OCR_FALLBACK ?? "")
      .trim()
      .toLowerCase() === "true";

  // OCR-first mode intentionally avoids additional fallback methods.
  if (!isMobywatelEnabled()) return [] as string[];
  if (!fallbackEnabled) return [] as string[];
  return ["document_ocr_selfie"];
}

function parseCheckType(value: unknown): VerificationCheckType | undefined {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "driver_license" || normalized === "drivers_license") return "driver_license";
  if (normalized === "identity") return "identity";
  return undefined;
}

export async function createPolandLocalVerificationSession(
  args: CreateVerificationSessionArgs,
): Promise<CreateVerificationSessionResult> {
  const baseUrl = getPolandVerificationApiBaseUrl();
  const apiKey = getPolandVerificationApiKey();
  const primaryMethod = resolvePrimaryMethod();
  const response = await fetch(`${baseUrl}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: args.userId,
      subjectType: args.subjectType,
      checkType: args.checkType,
      returnUrl: args.returnUrl,
      method: primaryMethod,
      fallbackMethods: buildFallbackMethods(args.checkType),
      metadata: {
        verificationType: args.checkType,
        preferredMethod: primaryMethod,
        ...args.metadata,
      },
      verificationProfile: {
        primary: primaryMethod,
        fallback: mapMethodByCheckType(args.checkType),
      },
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Poland local verification request failed.");
  }

  const sessionId = (payload?.sessionId ?? payload?.id) as string | undefined;
  const status = (payload?.status ?? "pending") as string;
  const url = (payload?.url ?? payload?.redirectUrl ?? payload?.nextUrl) as string | undefined;

  if (!sessionId || !url) {
    throw new Error("Poland local verification provider response is missing sessionId or url.");
  }

  return {
    sessionId,
    status,
    url,
  };
}

export async function fetchPolandLocalVerificationSession(
  sessionId: string,
): Promise<FetchVerificationSessionResult> {
  const baseUrl = getPolandVerificationApiBaseUrl();
  const apiKey = getPolandVerificationApiKey();
  const response = await fetch(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Poland local verification status fetch failed.");
  }

  return {
    sessionId: (payload?.sessionId ?? payload?.id ?? sessionId) as string,
    status: String(payload?.status ?? "pending"),
    checkType: parseCheckType(payload?.checkType ?? payload?.metadata?.checkType),
    rejectionReason:
      typeof payload?.rejectionReason === "string"
        ? payload.rejectionReason
        : typeof payload?.error?.code === "string"
          ? payload.error.code
          : undefined,
  };
}
