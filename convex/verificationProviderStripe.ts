import type {
  CreateVerificationSessionArgs,
  CreateVerificationSessionResult,
  FetchVerificationSessionResult,
} from "./verificationProvider";
import type { VerificationCheckType } from "./verificationPolicy";

function getStripeSecretKey() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY in Convex environment.");
  }
  return stripeSecretKey;
}

async function stripeFormRequest(path: string, body: URLSearchParams, idempotencyKey?: string) {
  const stripeSecretKey = getStripeSecretKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeSecretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers,
    body: body.toString(),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Stripe request failed.");
  }
  return payload;
}

async function stripeGetRequest(path: string) {
  const stripeSecretKey = getStripeSecretKey();
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Stripe request failed.");
  }
  return payload;
}

export async function createStripeVerificationSession(
  args: CreateVerificationSessionArgs,
): Promise<CreateVerificationSessionResult> {
  const body = new URLSearchParams({
    type: "document",
    return_url: args.returnUrl,
    "metadata[userId]": args.userId,
    "metadata[subjectType]": args.subjectType,
    "metadata[checkType]": args.checkType,
  });

  if (args.metadata) {
    for (const [key, value] of Object.entries(args.metadata)) {
      body.set(`metadata[${key}]`, value);
    }
  }

  if (args.checkType === "driver_license") {
    body.set("options[document][allowed_types][0]", "driving_license");
  }

  const payload = await stripeFormRequest(
    "identity/verification_sessions",
    body,
    `${args.subjectType}-${args.checkType}-${args.userId}-${Math.floor(Date.now() / 60000)}`,
  );

  return {
    sessionId: payload.id as string,
    status: payload.status as string,
    url: payload.url as string,
  };
}

function parseStripeCheckType(metadata?: Record<string, string>): VerificationCheckType | undefined {
  if (metadata?.checkType === "driver_license" || metadata?.verificationType === "driver_license") {
    return "driver_license";
  }
  if (metadata?.checkType === "identity" || metadata?.verificationType === "identity") {
    return "identity";
  }
  return undefined;
}

export async function fetchStripeVerificationSession(
  sessionId: string,
): Promise<FetchVerificationSessionResult> {
  const payload = await stripeGetRequest(
    `identity/verification_sessions/${encodeURIComponent(sessionId)}`,
  );
  const rejectionReason =
    payload?.status === "requires_input" || payload?.status === "canceled"
      ? typeof payload?.last_error?.reason === "string"
        ? payload.last_error.reason
        : payload?.status === "canceled"
          ? "canceled"
          : "requires_input"
      : undefined;

  return {
    sessionId: payload.id as string,
    status: payload.status as string,
    checkType: parseStripeCheckType(payload?.metadata as Record<string, string> | undefined),
    rejectionReason,
  };
}
