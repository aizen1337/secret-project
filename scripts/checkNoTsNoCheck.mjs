import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const roots = ["app", "components", "convex", "features", "hooks", "lib", "scripts"];

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_generated") continue;
      files.push(...walk(resolved));
      continue;
    }
    if (
      entry.isFile() &&
      (resolved.endsWith(".ts") ||
        resolved.endsWith(".tsx") ||
        resolved.endsWith(".js") ||
        resolved.endsWith(".mjs"))
    ) {
      files.push(resolved);
    }
  }
  return files;
}

const violations = [];
for (const root of roots) {
  const absolute = path.join(projectRoot, root);
  if (!fs.existsSync(absolute)) continue;
  for (const filePath of walk(absolute)) {
    const normalized = path.relative(projectRoot, filePath).replaceAll("\\", "/");
    if (normalized === "scripts/checkNoTsNoCheck.mjs") {
      continue;
    }
    const source = fs.readFileSync(filePath, "utf8");
    if (source.includes("@ts-nocheck")) {
      violations.push(normalized);
    }
  }
}

if (violations.length > 0) {
  console.error("Found forbidden @ts-nocheck usage:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("No @ts-nocheck directives found.");
