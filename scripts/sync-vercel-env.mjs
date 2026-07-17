#!/usr/bin/env node
/**
 * Sincroniza variables de .env.local a Vercel Production sin imprimir valores.
 * Uso: pnpm vercel:env
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const TARGETS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

function parseEnv(path) {
  const map = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

function run(cmd, input) {
  execSync(cmd, {
    input,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
  });
}

function upsertEnv(key, value, envName) {
  try {
    execSync(`pnpm dlx vercel env rm ${key} ${envName} --yes`, {
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // no existía
  }
  run(`pnpm dlx vercel env add ${key} ${envName} --yes`, value);
  console.log(`✅ ${key} → ${envName}`);
}

if (!existsSync(ENV_FILE)) {
  console.error("❌ Falta .env.local");
  process.exit(1);
}

const env = parseEnv(ENV_FILE);

for (const key of TARGETS) {
  const value = env[key];
  if (!value) {
    console.error(`❌ Variable ausente en .env.local: ${key}`);
    process.exit(1);
  }
}

console.log("Sincronizando variables a Vercel (production + preview)…");
for (const key of TARGETS) {
  upsertEnv(key, env[key], "production");
  upsertEnv(key, env[key], "preview");
}

console.log("✅ Variables sincronizadas");
