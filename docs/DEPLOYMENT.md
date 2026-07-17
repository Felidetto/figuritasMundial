# Despliegue — Láminas 2026

## Proveedor recomendado: Vercel

El repositorio incluye `vercel.json` con cron de expiración de reservas. Vercel soporta nativamente:

- Next.js 16 App Router
- Server Actions
- Middleware (`src/middleware.ts`)
- Rutas API (`/api/cron/expire-reservations`)

**Cloudflare Workers/OpenNext** requeriría adaptador adicional y validación de compatibilidad con middleware y Server Actions; no recomendado para el MVP.

## Branches

| Branch       | Uso                                      |
| ------------ | ---------------------------------------- |
| `main`       | Desarrollo estable                       |
| `production` | Despliegue productivo (Vercel Production) |

Configurar Vercel: **Production Branch = `production`**.

## Variables de entorno (Production)

Configurar en Vercel → Project → Settings → Environment Variables (Production):

| Variable                         | Entorno   | Notas                                      |
| -------------------------------- | --------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`       | Production | URL del proyecto Supabase remoto          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Production | Clave anon (pública)                       |
| `SUPABASE_SERVICE_ROLE_KEY`      | Production | **Solo servidor** — nunca `NEXT_PUBLIC_`   |
| `NEXT_PUBLIC_APP_URL`            | Production | URL pública final (ej. `https://…vercel.app`) |
| `CRON_SECRET`                    | Production | Secreto para `/api/cron/expire-reservations` |

Alias opcionales soportados por `src/lib/env.ts`:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → equivalente a anon
- `SUPABASE_SECRET_KEY` → equivalente a service role

## Preview / desarrollo

- **Local:** `.env.local` (generado con `pnpm setup:env`, no versionado)
- **Preview (Vercel):** mismas variables apuntando a Supabase remoto o proyecto de staging

## Post-despliegue

1. Obtener URL pública de Vercel
2. Actualizar `NEXT_PUBLIC_APP_URL` en Production
3. Redeploy
4. Ejecutar smoke test: `pnpm test:smoke` contra URL pública (configurar `NEXT_PUBLIC_APP_URL`)
5. Verificar `/elegir`, admin, reserva y pedido público

## Cron

Vercel Cron invoca `GET /api/cron/expire-reservations` cada 2 minutos (`vercel.json`).
El endpoint exige header `Authorization: Bearer <CRON_SECRET>`.

## Seguridad

- Service role solo en server actions / API routes
- Admin: middleware + `requireAdminAction()` + `admin_profiles`
- `/admin/*`: `robots: noindex` en layout
- Catálogo remoto: 980 códigos, stock real vía admin (sin seed ficticio en producción)
