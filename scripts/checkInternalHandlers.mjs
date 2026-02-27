import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const convexRoot = path.join(projectRoot, "convex");
const bannedPattern = /export\s+const\s+([A-Za-z0-9_]*Internal)\s*=\s*(query|mutation|action)\s*\(/g;

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_generated") {
        continue;
      }
      files.push(...walk(resolved));
      continue;
    }
    if (entry.isFile() && resolved.endsWith(".ts")) {
      files.push(resolved);
    }
  }
  return files;
}

function toLineNumber(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source[i] === "\n") {
      line += 1;
    }
  }
  return line;
}

if (!fs.existsSync(convexRoot)) {
  console.error("convex directory not found.");
  process.exit(1);
}

const violations = [];
for (const filePath of walk(convexRoot)) {
  const source = fs.readFileSync(filePath, "utf8");
  bannedPattern.lastIndex = 0;
  let match = bannedPattern.exec(source);
  while (match) {
    const exportName = match[1];
    const handlerType = match[2];
    violations.push({
      file: path.relative(projectRoot, filePath).replaceAll("\\", "/"),
      line: toLineNumber(source, match.index),
      exportName,
      handlerType,
    });
    match = bannedPattern.exec(source);
  }
}

if (violations.length > 0) {
  console.error("Found *Internal exports using public handlers:");
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.exportName} uses ${violation.handlerType}`,
    );
  }
  process.exit(1);
}

console.log("Internal handler naming check passed.");
