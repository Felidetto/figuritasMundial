#!/usr/bin/env node
/**
 * Verifica catálogo remoto vía Supabase CLI.
 * Uso: pnpm db:verify
 */
import { execSync } from "node:child_process";

const EXPECTED = {
  stickers_count: 980,
  inventory_count: 980,
  sections_count: 50,
  duplicate_pairs: 0,
  stickers_without_inventory: 0,
  negative_stock: 0,
  over_committed: 0,
  has_00: true,
  has_fwc_1: true,
  has_fwc_19: true,
  has_arg_1: true,
  has_arg_20: true,
};

function runQuery(file) {
  const raw = execSync(`pnpm exec supabase db query --linked -f ${file}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const match = raw.match(/\{[\s\S]*"rows"[\s\S]*\}/);
  if (!match) throw new Error(`No se pudo parsear salida de ${file}`);
  return JSON.parse(match[0]);
}

function verifyCatalog() {
  console.log("Verificando catálogo remoto…");
  const { rows } = runQuery("supabase/verify-catalog.sql");
  const row = rows[0];
  const errors = [];

  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (row[key] !== expected) {
      errors.push(`${key}: esperado ${expected}, obtenido ${row[key]}`);
    }
  }

  if (errors.length > 0) {
    console.error("❌ Verificación de catálogo falló:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log("✅ Catálogo OK:", row);
}

function verifyRls() {
  console.log("\nVerificando políticas RLS…");
  const { rows } = runQuery("supabase/verify-rls-policies.sql");
  const policies = rows;

  const required = [
    "sections_public_read",
    "stickers_public_read",
    "inventory_public_read",
    "inventory_admin",
  ];

  const names = policies.map((p) => p.policyname);
  const missing = required.filter((r) => !names.includes(r));

  if (missing.length > 0) {
    console.error("❌ Políticas faltantes:", missing.join(", "));
    process.exit(1);
  }

  const inventoryPublic = policies.find((p) => p.policyname === "inventory_public_read");
  if (inventoryPublic?.cmd !== "SELECT") {
    console.error("❌ inventory_public_read debe ser SELECT solamente");
    process.exit(1);
  }

  console.log(`✅ ${policies.length} políticas RLS encontradas`);
  console.log("✅ Catálogo público: SELECT en sections, stickers, inventory");
  console.log("✅ Modificaciones inventory: solo vía admin (policy inventory_admin)");
}

try {
  verifyCatalog();
  verifyRls();
  console.log("\n✅ db:verify completado");
} catch (err) {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
}
