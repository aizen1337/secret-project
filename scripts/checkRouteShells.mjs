import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const appRoot = path.join(projectRoot, "app");

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(resolved));
      continue;
    }
    if (entry.isFile() && resolved.endsWith(".tsx")) {
      files.push(resolved);
    }
  }
  return files;
}

function isLayoutFile(relativePath) {
  return relativePath.endsWith("/_layout.tsx");
}

function isAllowedSpecialRoute(relativePath, source) {
  if (relativePath === "app/index.tsx") {
    return source.includes("Redirect");
  }
  return false;
}

function isThinShell(source) {
  const trimmed = source.trim();
  if (/^export\s+\{\s*default\s*\}\s+from\s+["'][^"']+["'];?$/m.test(trimmed)) {
    return true;
  }
  if (/^export\s+\{\s*default\s+as\s+default\s*\}\s+from\s+["'][^"']+["'];?$/m.test(trimmed)) {
    return true;
  }
  return false;
}

if (!fs.existsSync(appRoot)) {
  console.error("app directory not found.");
  process.exit(1);
}

const violations = [];
for (const filePath of walk(appRoot)) {
  const relativePath = path.relative(projectRoot, filePath).replaceAll("\\", "/");
  if (isLayoutFile(relativePath)) {
    continue;
  }
  const source = fs.readFileSync(filePath, "utf8");
  const hasClientDataHooks =
    source.includes("useQuery(") || source.includes("useMutation(") || source.includes("useAction(");

  if (isThinShell(source)) {
    if (hasClientDataHooks) {
      violations.push(`${relativePath} contains data hooks and is not a strict shell.`);
    }
    continue;
  }

  if (isAllowedSpecialRoute(relativePath, source) && !hasClientDataHooks) {
    continue;
  }

  violations.push(`${relativePath} is not a shell route.`);
}

if (violations.length > 0) {
  console.error("Route shell check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Route shell check passed.");
