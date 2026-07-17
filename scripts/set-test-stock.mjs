#!/usr/bin/env node
/**
 * Configura stock de prueba vía Supabase CLI (sin leer .env.local).
 * Uso: pnpm stock:test-setup
 */
import { execSync } from "node:child_process";

try {
  execSync("pnpm exec supabase db query --linked -f supabase/set-test-stock.sql", {
    stdio: "inherit",
  });
  console.log("✅ Stock de prueba configurado");
} catch {
  console.error("❌ Falló set-test-stock.sql");
  process.exit(1);
}
