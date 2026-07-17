#!/usr/bin/env node
/**
 * Crea .env.local desde Supabase CLI (proyecto vinculado).
 * No imprime valores de claves.
 * Uso: pnpm setup:env
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = ".env.local";
const PROJECT_REF = "ztuhhzokzrtytzcjmxhu";

function parseLinkedRef() {
  try {
    const toml = readFileSync("supabase/.temp/project-ref", "utf8").trim();
    if (toml) return toml;
  } catch {
    // ignore
  }
  return PROJECT_REF;
}

function fetchKeys(ref) {
  const raw = execSync(`pnpm exec supabase projects api-keys --project-ref ${ref} -o json`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return JSON.parse(raw);
}

function main() {
  if (existsSync(ENV_PATH)) {
    console.log("ℹ️  .env.local ya existe — no se sobrescribe.");
    console.log("   Elimínalo manualmente si necesitas regenerarlo.");
    process.exit(0);
  }

  const ref = parseLinkedRef();
  const keys = fetchKeys(ref);
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const service = keys.find((k) => k.name === "service_role")?.api_key;

  if (!anon || !service) {
    console.error("❌ No se pudieron obtener claves desde Supabase CLI.");
    process.exit(1);
  }

  const cron = randomBytes(24).toString("hex");
  const content = `# Generado por pnpm setup:env — no commitear
NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${service}
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=${cron}
`;

  writeFileSync(ENV_PATH, content, { mode: 0o600 });
  console.log("✅ .env.local creado (valores no mostrados).");
  console.log("   Reinicia pnpm dev si estaba corriendo.");
}

main();
