const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
];

function parseOrigins(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toOriginOrNull(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  const configured = new Set<string>();

  parseOrigins(process.env.ALLOWED_REDIRECT_ORIGINS).forEach((origin) => configured.add(origin));
  parseOrigins(process.env.EXPO_PUBLIC_ALLOWED_REDIRECT_ORIGINS).forEach((origin) =>
    configured.add(origin),
  );

  [
    process.env.STRIPE_CONNECT_REFRESH_URL,
    process.env.STRIPE_CONNECT_RETURN_URL,
    process.env.STRIPE_IDENTITY_RETURN_URL,
    process.env.STRIPE_CHECKOUT_SUCCESS_URL,
    process.env.STRIPE_CHECKOUT_CANCEL_URL,
  ]
    .map((value) => toOriginOrNull(value))
    .filter((origin): origin is string => Boolean(origin))
    .forEach((origin) => configured.add(origin));

  if (configured.size === 0) {
    DEFAULT_ALLOWED_ORIGINS.forEach((origin) => configured.add(origin));
  }

  return configured;
}

function normalizeHttpUrl(raw: string, fieldName: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`INVALID_INPUT: ${fieldName} is required.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`INVALID_INPUT: ${fieldName} must be a valid absolute URL.`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`INVALID_INPUT: ${fieldName} protocol is not allowed.`);
  }

  return parsed;
}

export function assertAllowedRedirectUrl(rawUrl: string, fieldName: string) {
  const parsed = normalizeHttpUrl(rawUrl, fieldName);
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.has(parsed.origin)) {
    throw new Error(`INVALID_INPUT: ${fieldName} origin is not allowed.`);
  }
  return parsed.toString();
}
