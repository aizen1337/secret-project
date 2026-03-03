import fs from "node:fs";
import path from "node:path";
import { parseEnvFile, runCapture, writeJson } from "../../../scripts/loadtest/_utils.mjs";

const root = process.cwd();
const runDir = process.argv[2];
if (!runDir) {
  console.error("Usage: node tests/load/validators/validate-consistency.mjs <run-dir>");
  process.exit(1);
}

const absoluteRunDir = path.isAbsolute(runDir) ? runDir : path.join(root, runDir);
const envLocal = parseEnvFile(path.join(root, ".env.local"));
const convexEnv = { ...process.env };
if (envLocal.CONVEX_SELF_HOSTED_URL) convexEnv.CONVEX_SELF_HOSTED_URL = envLocal.CONVEX_SELF_HOSTED_URL;
if (envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY) convexEnv.CONVEX_SELF_HOSTED_ADMIN_KEY = envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY;

const stdout = runCapture(
  "npx",
  ["convex", "run", "loadtestSynthetic:getSyntheticStats", "{}"],
  { env: convexEnv },
);
const snapshot = JSON.parse(stdout);
writeJson(path.join(absoluteRunDir, "snapshot-after.json"), snapshot);

const invalidCounters = Object.entries(snapshot.counters || {}).filter(([, value]) => {
  return typeof value !== "number" || !Number.isFinite(value) || value < 0;
});
const invalidSampleCount =
  typeof snapshot.samplesCountApprox !== "number" || snapshot.samplesCountApprox < 0;
const invalidBucketCount =
  typeof snapshot.distinctBucketsApprox !== "number" || snapshot.distinctBucketsApprox < 0;
const invalidBytes =
  typeof snapshot.payloadBytesApprox !== "number" || snapshot.payloadBytesApprox < 0;

const checks = {
  generatedAt: Date.now(),
  invalidCounters,
  invalidSampleCount,
  invalidBucketCount,
  invalidBytes,
  consistencyViolationCount:
    invalidCounters.length +
    (invalidSampleCount ? 1 : 0) +
    (invalidBucketCount ? 1 : 0) +
    (invalidBytes ? 1 : 0),
};
writeJson(path.join(absoluteRunDir, "checks.json"), checks);
if (checks.consistencyViolationCount > 0) {
  console.error("Consistency validation failed.");
  process.exit(2);
}
console.log("Consistency validation passed.");
