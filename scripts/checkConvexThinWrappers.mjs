import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const wrapperFiles = [
  "convex/cars.ts",
  "convex/bookings.ts",
  "convex/bookingChat.ts",
  "convex/bookingReviews.ts",
  "convex/stripe.ts",
  "convex/stripeWebhook.ts",
  "convex/stripePayouts.ts",
  "convex/stripeConnect.ts",
  "convex/depositCases.ts",
  "convex/users.ts",
  "convex/verification.ts",
  "convex/recentSearches.ts",
  "convex/identity.ts",
];

const bannedPatterns = [
  "ctx.db",
  "ctx.runQuery",
  "ctx.runMutation",
  "ctx.runAction",
  "fetch(",
  "query(",
  "mutation(",
  "action(",
  "internalQuery(",
  "internalMutation(",
  "internalAction(",
];

const violations = [];
for (const relativePath of wrapperFiles) {
  const filePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    violations.push(`${relativePath} is missing.`);
    continue;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const trimmed = source.trim();
  const nonEmptyLines = trimmed
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!trimmed.startsWith("export * from \"./features/")) {
    violations.push(`${relativePath} is not delegating to a feature entrypoint.`);
  }

  if (nonEmptyLines.length > 2) {
    violations.push(`${relativePath} is not a thin wrapper (too many lines).`);
  }

  for (const pattern of bannedPatterns) {
    if (source.includes(pattern)) {
      violations.push(`${relativePath} contains banned implementation pattern: ${pattern}`);
      break;
    }
  }
}

if (violations.length > 0) {
  console.error("Convex thin wrapper check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Convex thin wrapper check passed.");
