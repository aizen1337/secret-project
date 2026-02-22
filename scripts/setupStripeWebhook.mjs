#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const convexArgs = ["convex", "run", "stripeWebhook:setupWebhookEndpoint", "{}"];

if (args.includes("--prod")) {
  convexArgs.splice(2, 0, "--prod");
}

const previewIdx = args.indexOf("--preview");
if (previewIdx >= 0 && args[previewIdx + 1]) {
  convexArgs.splice(2, 0, "--preview-name", args[previewIdx + 1]);
}

const result = spawnSync("npx", convexArgs, {
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
