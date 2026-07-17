/**
 * Resolución centralizada de variables de entorno.
 * Soporta nombres legacy y nuevos alias de Supabase sin exponer secretos al cliente.
 */

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((v) => v && v.length > 0);
}

/** URL pública del proyecto Supabase (cliente + servidor). */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Clave anon/publishable — segura para el navegador. */
export function getSupabaseAnonKey(): string | undefined {
  return firstDefined(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Service role / secret — solo servidor. Nunca importar desde componentes cliente. */
export function getSupabaseServiceRoleKey(): string | undefined {
  return firstDefined(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SECRET_KEY);
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey() && getSupabaseServiceRoleKey());
}
