import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mode = (process.argv[2] || "").trim().toLowerCase();
const profileMap = {
  cloud: ".env.local.cloud.example",
  selfhost: ".env.local.selfhost.example",
};

if (!profileMap[mode]) {
  console.error("Usage: node scripts/switch-env.mjs <cloud|selfhost>");
  process.exit(1);
}

const profilePath = path.join(root, profileMap[mode]);
if (!fs.existsSync(profilePath)) {
  console.error(`Missing profile file: ${profileMap[mode]}`);
  process.exit(1);
}

const targetPath = path.join(root, ".env.local");
const profileRaw = fs.readFileSync(profilePath, "utf8");
const profileEntries = new Map();
for (const line of profileRaw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) continue;
  profileEntries.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
}

const requiredKeys = ["CONVEX_DEPLOYMENT", "EXPO_PUBLIC_CONVEX_URL"];
const selfHostedKeys = ["CONVEX_SELF_HOSTED_URL", "CONVEX_SELF_HOSTED_ADMIN_KEY"];
const managedKeys = [...requiredKeys, ...selfHostedKeys];
for (const key of requiredKeys) {
  if (!profileEntries.has(key)) {
    console.error(`${profileMap[mode]} is missing required key ${key}`);
    process.exit(1);
  }
}

const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
const lines = existing.split(/\r?\n/);
const seen = new Set();
const nextLines = lines.map((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return line;
  const eq = line.indexOf("=");
  if (eq <= 0) return line;
  const key = line.slice(0, eq).trim();
  if (managedKeys.includes(key)) {
    seen.add(key);
    const replacement = profileEntries.get(key);
    if (typeof replacement === "string") {
      return `${key}=${replacement}`;
    }
    return `# ${key}=`;
  }
  return line;
});

for (const key of managedKeys) {
  if (!seen.has(key)) {
    const replacement = profileEntries.get(key);
    if (typeof replacement === "string") {
      nextLines.push(`${key}=${replacement}`);
    }
  }
}

fs.writeFileSync(targetPath, `${nextLines.join("\n").replace(/\n+$/g, "")}\n`);
console.log(`Updated .env.local for "${mode}" mode.`);
