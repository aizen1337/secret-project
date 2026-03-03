import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  artifactsDir,
  ensureDir,
  nowRunId,
  parseEnvFile,
  readJson,
  run,
  runConvexCapture,
  writeJson,
} from "./_utils.mjs";

const root = process.cwd();
const composeFile = path.join(root, "infra", "convex-selfhost", "docker-compose.yml");
const composeEnvFile = path.join(root, "infra", "convex-selfhost", ".env");
const k6Runner = (process.env.LOADTEST_K6_RUNNER || "docker").trim().toLowerCase();

const mode = (process.argv[2] || "").trim().toLowerCase();
if (!["smoke", "race", "full"].includes(mode)) {
  console.error("Usage: node scripts/loadtest/run-k6.mjs <smoke|race|full>");
  process.exit(1);
}

function ensureK6Installed() {
  if (k6Runner !== "local") return;
  const check = spawnSync("k6", ["version"], {
    shell: process.platform === "win32",
    stdio: "ignore",
  });
  if (check.status !== 0) {
    console.error("k6 is not installed or not in PATH. Install from https://k6.io/docs/get-started/installation/");
    process.exit(1);
  }
}

function ensureDockerComposeReady() {
  if (k6Runner !== "docker") return;
  if (!fs.existsSync(composeFile)) {
    console.error(`Missing compose file: ${path.relative(root, composeFile)}`);
    process.exit(1);
  }
  if (!fs.existsSync(composeEnvFile)) {
    console.error(`Missing compose env file: ${path.relative(root, composeEnvFile)}`);
    process.exit(1);
  }
}

function convexEnv() {
  const envLocal = parseEnvFile(path.join(process.cwd(), ".env.local"));
  const env = { ...process.env };
  if (envLocal.CONVEX_SELF_HOSTED_URL) env.CONVEX_SELF_HOSTED_URL = envLocal.CONVEX_SELF_HOSTED_URL;
  if (envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY) env.CONVEX_SELF_HOSTED_ADMIN_KEY = envLocal.CONVEX_SELF_HOSTED_ADMIN_KEY;
  return env;
}

function snapshotBefore(runDir) {
  const stdout = runConvexCapture(["run", "loadtestSynthetic:getSyntheticStats", "{}"], {
    env: convexEnv(),
  });
  const snapshot = JSON.parse(stdout);
  const file = path.join(runDir, "snapshot-before.json");
  writeJson(file, snapshot);
  return file;
}

function toContainerPath(filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  const relative = path.relative(root, absolute);
  const posixRelative = relative.split(path.sep).join("/");
  return `/workspace/${posixRelative}`;
}

function runSingleScenario(runDir, scenarioName, scriptPath, extraEnv = {}) {
  const summaryPath = path.join(runDir, `${scenarioName}-summary.json`);
  const timelinePath = path.join(runDir, "timeline.log");
  fs.appendFileSync(timelinePath, `${new Date().toISOString()} START ${scenarioName}\n`);

  const env = {
    ...process.env,
    ...extraEnv,
  };
  if (k6Runner === "docker") {
    const dockerEnvArgs = Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : ["-e", `${key}=${value}`],
    );
    run(
      "docker",
      [
        "compose",
        "-f",
        composeFile,
        "--env-file",
        composeEnvFile,
        "--profile",
        "loadtest",
        "run",
        "--rm",
        "-T",
        "-w",
        "/workspace",
        ...dockerEnvArgs,
        "k6",
        "run",
        toContainerPath(scriptPath),
        "--summary-export",
        toContainerPath(summaryPath),
      ],
      { env: process.env },
    );
  } else {
    run("k6", ["run", scriptPath, "--summary-export", summaryPath], { env });
  }
  fs.appendFileSync(timelinePath, `${new Date().toISOString()} END ${scenarioName}\n`);
}

function normalizeVuConfig(preAllocatedRaw, maxRaw) {
  const preAllocated = Math.max(1, Number(preAllocatedRaw || "1"));
  const maxVUs = Math.max(preAllocated, Number(maxRaw || String(preAllocated)));
  return {
    preAllocatedVUs: String(preAllocated),
    maxVUs: String(maxVUs),
  };
}

ensureK6Installed();
ensureDockerComposeReady();
ensureDir(artifactsDir);

const runId = nowRunId();
const runDir = path.join(artifactsDir, runId);
ensureDir(runDir);
writeJson(path.join(runDir, "run-meta.json"), {
  runId,
  mode,
  startedAt: Date.now(),
  host: process.env.COMPUTERNAME || process.env.HOSTNAME || "unknown",
});

const seedState = readJson(path.join(artifactsDir, "seed-state.json"), null);
if (!seedState?.seedResult?.raceKey) {
  console.error("Missing seed-state race key.");
  console.error(`Expected file: ${path.relative(root, path.join(artifactsDir, "seed-state.json"))}`);
  console.error("Run:");
  console.error("  npm run local:loadtest:seed");
  process.exit(1);
}
const snapshotFile = snapshotBefore(runDir);

const commonEnv = {
  CONVEX_BASE_URL: k6Runner === "docker" ? "http://backend:3210" : process.env.CONVEX_BASE_URL || "http://127.0.0.1:3210",
  LOADTEST_SEED_FILE:
    k6Runner === "docker"
      ? toContainerPath(path.join(artifactsDir, "seed-state.json"))
      : path.join(artifactsDir, "seed-state.json"),
  LOADTEST_SNAPSHOT_FILE: k6Runner === "docker" ? toContainerPath(snapshotFile) : snapshotFile,
};
const raceEnv = {
  ...commonEnv,
  RACE_KEY: seedState.seedResult.raceKey || "global",
};

if (mode === "smoke") {
  const vu = normalizeVuConfig(
    process.env.MIX_PREALLOCATED_VUS || "200",
    process.env.MIX_MAX_VUS || "300",
  );
  runSingleScenario(runDir, "mixed-smoke", "tests/load/k6/mixedTraffic.js", {
    ...commonEnv,
    MIX_TARGET_RATE: process.env.MIX_TARGET_RATE || "100",
    MIX_STEADY: process.env.MIX_STEADY || "30s",
    MIX_RAMP: process.env.MIX_RAMP || "20s",
    MIX_COOLDOWN: process.env.MIX_COOLDOWN || "10s",
    MIX_PREALLOCATED_VUS: vu.preAllocatedVUs,
    MIX_MAX_VUS: vu.maxVUs,
  });
} else if (mode === "race") {
  runSingleScenario(runDir, "overlap-race", "tests/load/k6/scenarios/overlapBookingRace.js", {
    ...raceEnv,
    RACE_VUS: process.env.RACE_VUS || "1500",
    RACE_DURATION: process.env.RACE_DURATION || "90s",
  });
} else {
  const vu = normalizeVuConfig(
    process.env.MIX_PREALLOCATED_VUS || "500",
    process.env.MIX_MAX_VUS || "5000",
  );
  runSingleScenario(runDir, "mixed-full", "tests/load/k6/mixedTraffic.js", {
    ...commonEnv,
    MIX_TARGET_RATE: process.env.MIX_TARGET_RATE || "1000",
    MIX_STEADY: process.env.MIX_STEADY || "5m",
    MIX_RAMP: process.env.MIX_RAMP || "2m",
    MIX_COOLDOWN: process.env.MIX_COOLDOWN || "1m",
    MIX_PREALLOCATED_VUS: vu.preAllocatedVUs,
    MIX_MAX_VUS: vu.maxVUs,
  });
  runSingleScenario(runDir, "overlap-race", "tests/load/k6/scenarios/overlapBookingRace.js", {
    ...raceEnv,
    RACE_VUS: process.env.RACE_VUS || "5000",
    RACE_DURATION: process.env.RACE_DURATION || "2m",
  });
}

run("node", ["tests/load/validators/validate-consistency.mjs", runDir]);
console.log(`Loadtest run completed: ${path.relative(process.cwd(), runDir)}`);
