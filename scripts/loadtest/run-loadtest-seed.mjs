import path from "node:path";
import { artifactsDir, ensureDir, parseEnvFile, runConvexCapture, writeJson } from "./_utils.mjs";

const root = process.cwd();
const envLocal = parseEnvFile(path.join(root, ".env.local"));
const convexEnv = { ...process.env };
if (envLocal.CONVEX_SELF_HOSTED_URL) convexEnv.CONVEX_SELF_HOSTED_URL = envLocal.CONVEX_SELF_HOSTED_URL;
if (envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY) convexEnv.CONVEX_SELF_HOSTED_ADMIN_KEY = envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY;

const bucketCount = Number(process.env.LOADTEST_BUCKET_COUNT || "256");
const samplesPerBucket = Number(process.env.LOADTEST_SAMPLES_PER_BUCKET || "32");
const payloadSize = Number(process.env.LOADTEST_PAYLOAD_SIZE || "256");
const raceKey = process.env.LOADTEST_RACE_KEY || "global";

const payload = {
  bucketCount,
  samplesPerBucket,
  payloadSize,
  counterKeys: [raceKey],
};

const stdout = runConvexCapture(
  ["run", "loadtestSynthetic:seedSyntheticDataset", JSON.stringify(payload)],
  { env: convexEnv },
);
const result = JSON.parse(stdout);

const runState = {
  generatedAt: Date.now(),
  seedInput: payload,
  seedResult: result,
  race: {
    key: raceKey,
  },
};
ensureDir(artifactsDir);
writeJson(path.join(artifactsDir, "seed-state.json"), runState);
console.log("Loadtest seed completed.");
