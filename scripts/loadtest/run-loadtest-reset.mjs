import path from "node:path";
import { artifactsDir, parseEnvFile, runConvexCapture, writeJson } from "./_utils.mjs";

const root = process.cwd();
const envLocal = parseEnvFile(path.join(root, ".env.local"));
const convexEnv = { ...process.env };
if (envLocal.CONVEX_SELF_HOSTED_URL) convexEnv.CONVEX_SELF_HOSTED_URL = envLocal.CONVEX_SELF_HOSTED_URL;
if (envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY) convexEnv.CONVEX_SELF_HOSTED_ADMIN_KEY = envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY;

const chunkSize = Number(process.env.LOADTEST_RESET_CHUNK_SIZE || "1000");
const result = {
  ok: true,
  deletedSamples: 0,
  deletedCounters: 0,
  chunks: 0,
};
while (true) {
  const stdout = runConvexCapture(
    ["run", "loadtestSynthetic:resetSyntheticDataset", JSON.stringify({ numItems: chunkSize })],
    { env: convexEnv },
  );
  const chunk = JSON.parse(stdout);
  result.deletedSamples += chunk.deletedSamples ?? 0;
  result.deletedCounters += chunk.deletedCounters ?? 0;
  result.chunks += 1;
  if (!chunk.hasMore) {
    break;
  }
}
writeJson(path.join(artifactsDir, "reset-state.json"), {
  generatedAt: Date.now(),
  result,
});
console.log("Loadtest reset completed.");
