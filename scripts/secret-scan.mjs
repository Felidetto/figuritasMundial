#!/usr/bin/env node
/**
 * Escaneo básico de secretos antes de commit.
 * Uso: pnpm secret:scan
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".pnpm-store",
  "coverage",
  "dist",
  "build",
]);

const SKIP_FILES = new Set(["pnpm-lock.yaml", "secret-scan.mjs", "setup-local-env.mjs"]);

const PATTERNS = [
  { name: "service_role JWT", re: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
  { name: "Supabase service_role key prefix", re: /sb_secret_[a-zA-Z0-9_-]+/ },
  { name: "Generic API key assignment", re: /(?:service_role|secret_key|password)\s*[:=]\s*['"][^'"]{8,}['"]/i },
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(path);
    if (st.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function isTextFile(path) {
  return /\.(ts|tsx|js|mjs|json|md|sql|toml|yaml|yml|css|html|txt|example|env)$/i.test(path);
}

function scanStaged() {
  let staged = [];
  try {
    staged = execSync("git diff --cached --name-only", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    staged = walk(".");
  }

  const forbidden = [".env.local", ".env.production.local", ".env.development.local"];
  for (const f of staged) {
    if (forbidden.some((x) => f === x || f.endsWith(`/${x}`))) {
      console.error(`❌ Archivo prohibido en staging: ${f}`);
      process.exit(1);
    }
  }

  const issues = [];
  for (const file of staged) {
    if (SKIP_FILES.has(file.split("/").pop() ?? "")) continue;
    if (!isTextFile(file)) continue;
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const { name, re } of PATTERNS) {
      if (re.test(content) && !file.endsWith(".example") && !file.includes("secret-scan")) {
        issues.push({ file, name });
      }
    }
  }

  if (issues.length) {
    console.error("❌ Posibles secretos detectados:");
    for (const i of issues) console.error(`  - ${i.file}: ${i.name}`);
    process.exit(1);
  }

  console.log(`✅ Escaneo OK (${staged.length} archivos revisados)`);
}

scanStaged();
