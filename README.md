# Láminas 2026

Tienda web para vender láminas físicas originales sobrantes de la colección FIFA World Cup 2026. Venta particular — no afiliada a Panini ni FIFA.

## Requisitos

- Node.js 20+
- pnpm 9+
- Cuenta [Supabase](https://supabase.com) (plan gratuito)

## Instalación

```bash
pnpm install
cp .env.example .env.local
# Completar variables en .env.local
```

## Supabase

### Proyecto remoto

1. Crear proyecto en Supabase.
2. Copiar URL, anon key y service role key a `.env.local`.
3. Aplicar migraciones:

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
npx supabase db execute --file supabase/seed.sql
```

### Supabase local (opcional)

```bash
npx supabase start
npx supabase db reset   # aplica migraciones + seed
```

Variables locales típicas:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service role de supabase start>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Admin

1. Crear usuario en Supabase Auth (Dashboard → Authentication → Users).
2. Insertar perfil admin:

```sql
insert into admin_profiles (id, email)
values ('UUID_DEL_USUARIO_AUTH', 'admin@ejemplo.com');
```

## Desarrollo

```bash
pnpm dev          # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test         # unitarias (+ integración si hay Supabase)
pnpm test:e2e     # Playwright (requiere Supabase + dev server)
```

## Importar inventario real (CSV)

Plantilla: `public/plantilla-inventario.csv`

```csv
section,code,name,stock,enabled
BRA,BRA 1,Escudo Brasil,2,true
FWC,FWC 12,Lámina FWC 12,1,true
```

1. Ingresar a `/admin/inventario`.
2. Subir CSV — valida filas y reporta errores.
3. Crea/actualiza secciones, láminas y stock con movimiento auditado.

## Probar una compra

1. `pnpm dev` con Supabase configurado y seed aplicado.
2. Ir a `/elegir`, seleccionar ≥15 láminas (50 para promo $20.000).
3. «Reservar y comprar» → completar datos en checkout.
4. Ver pedido en `/pedido/{token}` con instrucciones de transferencia.
5. Admin: `/admin/login` → confirmar pago en Pedidos.

## Despliegue

### Supabase

- Migraciones: `supabase db push`
- Seed producción: importar CSV real vía admin
- Cron expiración: configurar GET/POST a `/api/cron/expire-reservations` con header `Authorization: Bearer CRON_SECRET` cada 2 min

### Frontend

**Recomendado para MVP:** [Vercel](https://vercel.com) (compatibilidad nativa Next.js 16).

Alternativa gratuita: Cloudflare Pages con adaptador OpenNext — verificar compatibilidad antes de producción.

Variables en el hosting:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor desarrollo |
| `pnpm build` | Build producción |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm test:all` | typecheck + lint + test |

## Estructura

```
src/app/          Páginas (landing, elegir, checkout, pedido, admin)
src/actions/      Server Actions
src/components/   UI
src/lib/          Pricing, Supabase, validación
supabase/         Migraciones SQL + seed
tests/            Unit, integración, E2E
```

## Aviso legal

Sitio independiente de reventa particular. No afiliado ni patrocinado por Panini, FIFA ni sus asociados.
