# Despliegue — Láminas 2026

## Proveedor: Vercel

- **Proyecto:** `figuritas-mundial/figuritas-mundial`
- **Branch productiva:** `production`
- **Framework:** Next.js 16.2.10 (App Router, Server Actions, middleware)

Cloudflare Workers/OpenNext no está configurado; Vercel es la opción de menor riesgo para este MVP.

## Comandos

```bash
# Variables locales → Vercel (no imprime valores)
pnpm vercel:env

# Despliegue productivo manual
pnpm dlx vercel deploy --prod --yes

# Verificación remota Supabase
pnpm db:verify

# Regenerar tipos TS
pnpm db:types

# Tests
pnpm test:all
pnpm test:smoke          # local
pnpm test:smoke:prod     # producción (requiere PRODUCTION_URL)

# Rollback: Vercel Dashboard → Deployments → Promote previous deployment
```

## Variables de entorno (solo nombres)

| Variable | Entorno | Notas |
| -------- | ------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Clave pública (alias: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Solo servidor (alias: `SUPABASE_SECRET_KEY`) |
| `NEXT_PUBLIC_APP_URL` | Production | URL HTTPS pública del sitio |
| `CRON_SECRET` | Production | Bearer token para cron de expiración |

Sincronización: `pnpm vercel:env` (lee `.env.local`, no versionado).

## Branches Git

| Branch | Uso |
| ------ | --- |
| `main` | Desarrollo estable |
| `production` | Despliegue productivo |

## Cron de reservas

- **Vercel Hobby:** `vercel.json` usa `0 3 * * *` (1× día, 03:00 UTC).
- **Expiración en uso:** también se invoca `expire_reservations()` al cargar `/elegir`.
- **Frecuencia alta (cada 2 min):** requiere Vercel Pro o cron externo (ej. cron-job.org) contra:
  `GET /api/cron/expire-reservations` con header `Authorization: Bearer <CRON_SECRET>`.

## Post-despliegue

1. Obtener URL de Vercel (`*.vercel.app`)
2. Actualizar `NEXT_PUBLIC_APP_URL` en Vercel Production
3. `pnpm vercel:env` + redeploy
4. Smoke test productivo

## Seguridad

- Service role nunca en cliente
- Admin protegido por middleware + `admin_profiles`
- `/admin/*`: `robots: noindex`
- Catálogo: 980 códigos en Supabase remoto, stock vía panel admin

## URL pública

_(Actualizar tras cada despliegue productivo)_

- **URL:** pendiente de registrar tras deploy exitoso
- **Último deploy:** pendiente
