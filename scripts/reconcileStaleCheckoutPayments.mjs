#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const payload = {};

const limitIdx = args.indexOf("--limit");
if (limitIdx >= 0 && args[limitIdx + 1]) {
  const parsed = Number(args[limitIdx + 1]);
  if (Number.isFinite(parsed) && parsed > 0) {
    payload.limit = Math.floor(parsed);
  }
}

const olderThanIdx = args.indexOf("--older-than-ms");
if (olderThanIdx >= 0 && args[olderThanIdx + 1]) {
  const parsed = Number(args[olderThanIdx + 1]);
  if (Number.isFinite(parsed) && parsed >= 0) {
    payload.olderThanMs = Math.floor(parsed);
  }
}

const convexArgs = [
  "convex",
  "run",
  "stripe:reconcileStaleCheckoutPayments",
  JSON.stringify(payload),
];

if (args.includes("--prod")) {
  convexArgs.splice(2, 0, "--prod");
}

const previewIdx = args.indexOf("--preview");
if (previewIdx >= 0 && args[previewIdx + 1]) {
  convexArgs.splice(2, 0, "--preview-name", args[previewIdx + 1]);
}

const result =
  process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npx", ...convexArgs], { stdio: "inherit" })
    : spawnSync("npx", convexArgs, { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
