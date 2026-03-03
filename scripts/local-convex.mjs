import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const command = (process.argv[2] || "").trim().toLowerCase();
const composeFile = path.join(root, "infra", "convex-selfhost", "docker-compose.yml");
const envFile = path.join(root, "infra", "convex-selfhost", ".env");
const appEnvFile = path.join(root, ".env.local");

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function parseEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

function loadAppEnv() {
  if (!fs.existsSync(appEnvFile)) return {};
  return parseEnv(fs.readFileSync(appEnvFile, "utf8"));
}

function getSelfHostedConvexCliEnv() {
  const appEnv = loadAppEnv();
  const url = appEnv.CONVEX_SELF_HOSTED_URL || process.env.CONVEX_SELF_HOSTED_URL;
  const adminKey = appEnv.CONVEX_SELF_HOSTED_ADMIN_KEY || process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;

  if (!url) {
    console.error("Missing CONVEX_SELF_HOSTED_URL in .env.local (or process env).");
    process.exit(1);
  }
  if (!adminKey || adminKey === "replace_me") {
    console.error("Missing CONVEX_SELF_HOSTED_ADMIN_KEY in .env.local (or process env).");
    process.exit(1);
  }

  const env = {
    ...process.env,
    ...appEnv,
    CONVEX_SELF_HOSTED_URL: url,
    CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
  };
  delete env.CONVEX_DEPLOYMENT;
  return env;
}

function getBackendVersionUrl() {
  const fromEnvFile = fs.existsSync(envFile) ? parseEnv(fs.readFileSync(envFile, "utf8")) : {};
  const port = fromEnvFile.PORT || "3210";
  return `http://127.0.0.1:${port}/version`;
}

async function health() {
  const url = getBackendVersionUrl();
  const attempts = Number(process.env.LOCAL_CONVEX_HEALTH_RETRIES || "20");
  const retryDelayMs = Number(process.env.LOCAL_CONVEX_HEALTH_RETRY_DELAY_MS || "1000");

  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`Convex backend healthy at ${url}`);
        return;
      }
      lastError = new Error(`Health check failed with status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  throw lastError ?? new Error("Health check failed.");
}

if (!fs.existsSync(composeFile)) {
  console.error("Missing compose file: infra/convex-selfhost/docker-compose.yml");
  process.exit(1);
}
if (!fs.existsSync(envFile)) {
  console.error("Missing infra/convex-selfhost/.env. Copy from .env.example first.");
  process.exit(1);
}

const composeArgs = ["compose", "-f", composeFile, "--env-file", envFile];

if (command === "up") {
  run("docker", [...composeArgs, "up", "-d"]);
  await health();
  process.exit(0);
}
if (command === "down") {
  run("docker", [...composeArgs, "down"]);
  process.exit(0);
}
if (command === "logs") {
  run("docker", [...composeArgs, "logs", "-f", "--tail", "200"]);
  process.exit(0);
}
if (command === "health") {
  await health();
  process.exit(0);
}
if (command === "codegen") {
  run("npx", ["convex", "codegen"], { env: getSelfHostedConvexCliEnv() });
  process.exit(0);
}
if (command === "push") {
  run("npx", ["convex", "dev", "--once"], { env: getSelfHostedConvexCliEnv() });
  process.exit(0);
}

console.error("Usage: node scripts/local-convex.mjs <up|down|logs|health|codegen|push>");
process.exit(1);
