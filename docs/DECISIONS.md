# Registro de Decisiones Arquitectónicas (ADR)

> **Estado:** FASE 0  
> **Formato:** Decisión | Contexto | Alternativas | Consecuencias

---

## ADR-001: Monolito Next.js + Supabase

**Decisión:** Un solo repositorio con Next.js App Router y Supabase como BaaS.

**Contexto:** MVP operado por un vendedor particular; equipo pequeño; necesidad de velocidad y simplicidad.

**Alternativas consideradas:**
- Microservicios (NestJS + PostgreSQL separado) — rechazado por complejidad operativa
- Shopify + app custom — rechazado; reglas de inventario/reserva muy específicas
- Firebase — rechazado; PostgreSQL y RLS son requisito explícito

**Consecuencias:**
- (+) Desarrollo rápido, un deploy frontend
- (+) RPC transaccional nativo en PostgreSQL
- (−) Acoplamiento a Supabase; migración futura requiere esfuerzo

**Estado:** Aprobado

---

## ADR-002: Inventario en PostgreSQL con RPC transaccional

**Decisión:** Toda lógica de reserva vive en funciones PostgreSQL invocadas vía `supabase.rpc()`, no en loops desde el cliente.

**Contexto:** Requisito crítico anti-overselling con concurrencia.

**Alternativas:**
- Optimistic locking en aplicación — insuficiente bajo race conditions
- Redis distributed locks — infra adicional innecesaria para MVP
- Supabase Edge Functions con transacciones — no garantizan atomicidad multi-row igual que RPC

**Consecuencias:**
- (+) Correctitud demostrable; testeable con SQL
- (−) Lógica de negocio dividida TS + PL/pgSQL; requiere disciplina de sincronización

**Estado:** Aprobado

---

## ADR-003: Carrito anónimo sin reserva de stock

**Decisión:** El carrito local/BD anónima no decrementa inventario. Solo `create_reservation` bloquea stock.

**Contexto:** Evitar stock fantasma por usuarios que abandonan; UX de selección libre.

**Alternativas:**
- Reserva soft al agregar al carrito — generaría muchas expiraciones y UX confusa
- Solo localStorage sin BD — pierde sync multi-dispositivo; aceptable como fallback

**Consecuencias:**
- (+) Inventario real solo cambia en momentos definidos
- (−) Usuario puede ver "disponible" y perderlo al reservar — mitigado con mensajes de conflicto

**Estado:** Aprobado

---

## ADR-004: Precios en BD, cálculo duplicado servidor + RPC

**Decisión:** Reglas en `pricing_rules`; cálculo en módulo TS para UI y validación en RPC al confirmar.

**Contexto:** No hardcodear en frontend; defensa en profundidad.

**Alternativas:**
- Solo calcular en frontend — viola requisito
- Solo en RPC — UI no puede mostrar total en tiempo real sin round-trip

**Consecuencias:**
- (+) Admin edita precios sin deploy
- (−) Mantener paridad TS/SQL; tests deben cubrir ambos

**Estado:** Aprobado

---

## ADR-005: Supabase Auth solo para administradores

**Decisión:** Compradores no crean cuenta. Admins usan Supabase Auth.

**Contexto:** Requisito explícito; reduce fricción de compra.

**Alternativas:**
- Auth anónimo de Supabase para compradores — posible pero innecesario; token custom suficiente
- NextAuth — capa adicional sin beneficio claro

**Consecuencias:**
- (+) Checkout simple
- (−) Comprador no tiene historial de pedidos sin guardar URL/token

**Estado:** Aprobado

---

## ADR-006: Pago MVP por transferencia manual

**Decisión:** Transferencia bancaria con confirmación admin; interfaz `PaymentProvider` para extensión.

**Contexto:** Mercado chileno; vendedor particular; MVP rápido.

**Alternativas:**
- Mercado Pago desde día 1 — más integración; diferido
- Flow — similar

**Consecuencias:**
- (+) Sin comisiones de pasarela en MVP
- (−) Fricción operativa manual; riesgo de pedidos `payment_reported` sin pago real

**Estado:** Aprobado

---

## ADR-007: Deploy en Cloudflare Pages

**Decisión:** Frontend en Cloudflare Pages con adaptador Next.js compatible.

**Contexto:** Requisito explícito; CDN global; costo bajo.

**Alternativas:**
- Vercel — funcional pero no requerido
- Self-hosted — innecesario

**Consecuencias:**
- (+) Edge CDN; cron triggers nativos
- (−) Verificar compatibilidad Server Actions/runtime en FASE 1

**Estado:** Aprobado (adaptador concreto pendiente FASE 1)

---

## ADR-008: Dinero como integer CLP

**Decisión:** Todos los montos en centavos no aplican; CLP sin decimales → `integer` en PostgreSQL.

**Contexto:** CLP no usa centavos en práctica retail.

**Consecuencias:**
- (+) Sin errores de punto flotante
- (−) Si se expande a otra moneda, revisar

**Estado:** Aprobado

---

## ADR-009: Identidad visual propia

**Decisión:** Branding original; avisos legales de no afiliación Panini/FIFA.

**Contexto:** Requisito legal/ético explícito.

**Consecuencias:**
- (+) Riesgo de marca reducido
- (−) Sin reconocimiento instantáneo de marca oficial

**Estado:** Aprobado

---

## ADR-010: Español de Chile (es-CL)

**Decisión:** Toda UI, mensajes, formatos en es-CL. Moneda `$` con separador miles punto (ej. `$20.000`).

**Contexto:** Requisito explícito.

**Consecuencias:**
- Formato fechas: `dd/mm/yyyy` o relativo según contexto
- Región/comuna: listas Chile

**Estado:** Aprobado

---

## ADR-011: Realtime para disponibilidad

**Decisión:** Supabase Realtime sobre cambios en `inventory.reserved_qty` y expiraciones.

**Contexto:** UX en selector con múltiples compradores concurrentes.

**Alternativas:**
- Polling cada N segundos — más simple; más carga
- SSE custom — innecesario con Realtime incluido

**Consecuencias:**
- (+) UX reactiva
- (−) Costo/conexiones Realtime; limitar suscripciones a sección visible

**Estado:** Aprobado

---

## ADR-012: Migraciones SQL versionadas

**Decisión:** `supabase/migrations/` con archivos timestamped; no schema manual en dashboard.

**Contexto:** Reproducibilidad; CI; documentación.

**Estado:** Aprobado

---

## Preguntas abiertas

Solo incluidas si **bloquean** desarrollo. Las demás se resuelven durante implementación con defaults razonables.

### Bloqueantes (requieren input del product owner)

| ID | Pregunta | Impacto | Default propuesto si no hay respuesta |
|----|----------|---------|--------------------------------------|
| Q-001 | **¿Cuál es el catálogo inicial?** ¿Existe CSV/listado de códigos, secciones y stock real? | Bloquea seed y FASE 3 | Crear seed de ejemplo (~50 láminas ficticias) para desarrollo; reemplazar con import real en FASE 6 |
| Q-002 | **Región/comuna de retiro** — ¿Cuál es la comuna/ciudad exacta para retiro presencial? | Bloquea copy legal y checkout | Placeholder «Región Metropolitana» configurable en `settings` |
| Q-003 | **Datos bancarios reales** — ¿Cuenta RUT, banco, titular para instrucciones de pago? | Bloquea checkout productivo (no dev) | Placeholder en seed; admin configura antes de go-live |

### No bloqueantes (defaults definidos)

| ID | Tema | Default |
|----|------|---------|
| N-001 | Nombre de marca | «Láminas 2026» provisional |
| N-002 | WhatsApp vendedor | Variable `SETTINGS.vendor_whatsapp`; placeholder +56900000000 |
| N-003 | Imágenes de láminas | Sin imagen MVP; campo `image_url` nullable |
| N-004 | Adaptador Cloudflare | Evaluar en FASE 1 según versión Next.js |
| N-005 | Rate limit storage | Memoria en dev; Cloudflare KV en prod |
| N-006 | Cobertura despacho | Todo Chile; costo único configurable |
| N-007 | Horario retiro | Texto configurable en settings; sin validación horaria MVP |

---

## Decisiones pendientes (resolver en fase indicada)

| Tema | Fase | Opciones |
|------|------|----------|
| Adaptador Next.js → Cloudflare | FASE 1 | `@cloudflare/next-on-pages` vs OpenNext |
| Pruebas SQL | FASE 2 | pgTAP vs scripts Node paralelos |
| Sincronización carrito BD | FASE 3 | Debounced Server Action vs solo localStorage |
| Anti-bot | FASE 4 | honeypot + rate limit vs Turnstile |
| pg_cron vs Cloudflare Cron | FASE 4 | Preferir Cloudflare Cron (menos deps Supabase) |

---

## Historial de cambios

| Fecha | Cambio |
|-------|--------|
| 2026-07-17 | Creación inicial — FASE 0 |
