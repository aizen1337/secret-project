import path from "node:path";
import { artifactsDir, parseEnvFile, runConvexCapture, writeJson } from "../loadtest/_utils.mjs";

const root = process.cwd();
const envLocal = parseEnvFile(path.join(root, ".env.local"));
const convexEnv = { ...process.env };
if (envLocal.CONVEX_SELF_HOSTED_URL) convexEnv.CONVEX_SELF_HOSTED_URL = envLocal.CONVEX_SELF_HOSTED_URL;
if (envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY) convexEnv.CONVEX_SELF_HOSTED_ADMIN_KEY = envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY;

const stdout = runConvexCapture(["run", "loadtest:resetLoadtestDatasetInternal", "{}"], {
  env: convexEnv,
});

const result = JSON.parse(stdout);
writeJson(path.join(artifactsDir, "seed-reset-state.json"), {
  generatedAt: Date.now(),
  result,
});
console.log("Seed reset completed.");
