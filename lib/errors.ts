import type { TFunction } from "i18next";

const API_ERROR_PREFIXES = [
  "INVALID_INPUT",
  "NOT_FOUND",
  "UNAVAILABLE",
  "UNAUTHORIZED",
  "UNVERIFIED_RENTER",
  "VERIFICATION_PENDING",
  "VERIFICATION_REJECTED",
] as const;

export function toUserErrorMessage(error: unknown, fallback = "Something went wrong.") {
  const raw = error instanceof Error ? error.message : fallback;
  const firstLine = raw.split("\n")[0] ?? fallback;
  return firstLine
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/\s*\[Request ID:[^\]]+\]/gi, "")
    .replace(/\s+at\s.+$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function toLocalizedErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey = "apiErrors.default",
) {
  const sanitized = toUserErrorMessage(error, t(fallbackKey));
  const matchedPrefix = API_ERROR_PREFIXES.find((prefix) => sanitized.startsWith(`${prefix}:`) || sanitized === prefix);

  if (!matchedPrefix) return sanitized || t(fallbackKey);
  return t(`apiErrors.${matchedPrefix}`);
}
