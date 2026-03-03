import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const rootDir = process.cwd();
export const artifactsDir = path.join(rootDir, "artifacts", "loadtest");
const convexCliEntry = path.join(rootDir, "node_modules", "convex", "dist", "cli.bundle.cjs");

function resolveCommand(command) {
  if (process.platform !== "win32") return command;
  if (command === "npm") return "npm.cmd";
  return command;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function run(command, args, options = {}) {
  const result = spawnSync(resolveCommand(command), args, {
    shell: false,
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function runCapture(command, args, options = {}) {
  const result = spawnSync(resolveCommand(command), args, {
    shell: false,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    throw new Error(stderr || `Command failed: ${command} ${args.join(" ")}`);
  }
  return String(result.stdout || "").trim();
}

export function runConvex(args, options = {}) {
  run("node", [convexCliEntry, ...args], options);
}

export function runConvexCapture(args, options = {}) {
  return runCapture("node", [convexCliEntry, ...args], options);
}

export function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

export function nowRunId() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}
