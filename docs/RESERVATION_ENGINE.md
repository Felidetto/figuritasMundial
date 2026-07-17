# Motor de Reservas — Láminas 2026

> **Estado:** FASE 0 — Especificación de diseño  
> **Última actualización:** 2026-07-17

---

## 1. Propósito

Garantizar que la venta de unidades físicas de láminas **nunca produzca overselling**, incluso bajo concurrencia alta. El motor coordina inventario, reservas temporales y conversión a pedidos mediante **transacciones atómicas en PostgreSQL**.

---

## 2. Conceptos clave

### 2.1 Unidad física vs representación

| Concepto | Descripción |
|----------|-------------|
| `physical_qty` | Unidades reales en bodega |
| `reserved_qty` | Unidades bloqueadas por reservas activas |
| `available_qty` | `physical_qty - reserved_qty` (reservas no vencidas) |

Una lámina (`sticker`) tiene una fila en `inventory`. Puede tener `physical_qty` de 0, 1 o N.

### 2.2 Carrito vs reserva

| | Carrito anónimo | Reserva |
|--|-----------------|---------|
| Bloquea stock | **No** | **Sí** |
| Persistencia | localStorage + BD opcional | BD |
| Expira | No (usuario puede abandonar) | Sí (20 min / 5 h) |
| Visible para otros | No | Sí (estado `reserved`) |

---

## 3. Máquina de estados

```
                    create_reservation()
                           │
                           ▼
┌─────────┐         ┌───────────┐    complete_checkout()    ┌───────────────────┐
│  draft  │────────▶│  reserved │──────────────────────────▶│ awaiting_payment  │
└─────────┘         └─────┬─────┘                             └─────────┬─────────┘
                          │                                             │
              expire()    │                              report_payment()│
                          ▼                                             ▼
                    ┌──────────┐                              ┌──────────────────┐
                    │ expired  │                              │ payment_reported │
                    └──────────┘                              └────────┬─────────┘
                          ▲                                              │
              cancel()    │                              confirm_payment()│ (admin)
                          │                                              ▼
                    ┌──────────┐                                    ┌────────┐
                    │cancelled │                                    │  paid  │
                    └──────────┘                                    └───┬────┘
                                                                        │
                                        preparing → ready_for_pickup / shipped → delivered
```

### Duraciones (configurables en `settings`)

| Transición | Timer | Campo |
|------------|-------|-------|
| → `reserved` | 20 min | `reservation_ttl_minutes` |
| → `awaiting_payment` | 5 h | `payment_ttl_hours` |

**Regla:** al expirar, `expire_reservations()` libera stock y marca `expired`. Una reserva expirada **no puede reactivarse** sin intervención admin explícita (nueva reserva).

---

## 4. Funciones RPC (especificación)

### 4.1 `expire_reservations()`

**Propiedades:** idempotente, safe to call concurrently.

```sql
-- Pseudocódigo
FOR each reservation WHERE status IN ('reserved', 'awaiting_payment')
                       AND expires_at < now()
LOOP
  -- Por cada reservation_item
  UPDATE inventory SET reserved_qty = reserved_qty - item.qty
  INSERT inventory_movement (type='release', ...)
  UPDATE reservation SET status = 'expired', expired_at = now()
END LOOP
RETURN count_expired;
```

**Invocación:**

- Al inicio de `create_reservation` (lazy cleanup)
- Cron cada 1–5 minutos
- Admin manual

### 4.2 `create_reservation(p_items jsonb, p_cart_token uuid, p_client_fingerprint text)`

**Entrada:** `[{ sticker_id, qty }, ...]`

**Algoritmo:**

```
BEGIN (isolation: READ COMMITTED o SERIALIZABLE según benchmarks)

1. PERFORM expire_reservations()

2. Validar cantidad mínima (desde pricing_rules/settings)

3. Ordenar sticker_ids ASC (prevención deadlock)

4. FOR EACH item:
     SELECT * FROM inventory
     WHERE sticker_id = item.sticker_id
     FOR UPDATE

5. Calcular available_qty para cada item
   IF any available_qty < requested_qty:
     ROLLBACK
     RETURN { success: false, error: 'STOCK_CONFLICT', sold_out: [...] }

6. INSERT reservation (status='reserved', expires_at=now()+ttl)

7. INSERT reservation_items

8. UPDATE inventory SET reserved_qty = reserved_qty + qty

9. INSERT inventory_movements (type='reserve')

10. Generar public_code (único, no secuencial)
    Generar access_token_hash (para URL pública)

COMMIT

RETURN { success: true, reservation_id, public_code, expires_at, access_token }
```

**Códigos de error estructurados:**

| Código | HTTP | Descripción |
|--------|------|-------------|
| `STOCK_CONFLICT` | 409 | Una o más láminas agotadas |
| `MIN_QUANTITY` | 400 | No alcanza mínimo de retiro |
| `INVALID_ITEMS` | 400 | Sticker inactivo o qty inválida |
| `RATE_LIMITED` | 429 | Demasiadas solicitudes |

### 4.3 `complete_checkout(p_reservation_id, p_access_token, p_customer_data jsonb)`

**Precondiciones:**

- Reserva en `reserved`
- `expires_at > now()`
- Datos validados (Zod en app + checks en RPC)

**Acciones:**

```
BEGIN
1. SELECT reservation FOR UPDATE WHERE id = ... AND token hash match
2. IF expired OR wrong status → ROLLBACK error EXPIRED
3. Calcular pricing final (server-side)
4. Calcular shipping según rules
5. INSERT/UPDATE customer
6. INSERT order + order_items (copia de reservation_items)
7. UPDATE reservation SET status='awaiting_payment',
                          expires_at=now()+payment_ttl
COMMIT
RETURN { order_id, public_code, total, expires_at }
```

### 4.4 `confirm_payment(p_order_id, p_admin_id)`

```
BEGIN
1. SELECT order FOR UPDATE
2. IF reservation/order expired → error (requiere admin override flag)
3. UPDATE order status = 'paid'
4. UPDATE reservation status = 'paid' (si aplica)
5. FOR EACH item:
     UPDATE inventory SET physical_qty = physical_qty - qty,
                          reserved_qty = reserved_qty - qty
     INSERT inventory_movement (type='sale')
6. INSERT payment record
7. INSERT audit_log
COMMIT
```

### 4.5 `cancel_reservation(p_id, p_reason, p_admin_id nullable)`

Libera stock reservado si status permite. Idempotente si ya cancelada/expirada.

---

## 5. Prevención de overselling

| Mecanismo | Detalle |
|-----------|---------|
| Row-level locks | `SELECT FOR UPDATE` en filas de inventario |
| Orden determinista | Sort sticker_id ASC evita deadlocks |
| Transacción única | Todo o nada; sin reservas parciales |
| Check constraints | `physical_qty >= 0`, `reserved_qty >= 0`, `reserved_qty <= physical_qty` |
| Expiración eager | Cleanup antes de cada reserva |
| Validación doble | RPC valida stock; frontend solo muestra estimación |

---

## 6. Concurrencia — escenario crítico

**Dado:** Sticker X tiene `physical_qty=1`, `reserved_qty=0`.

**Cuando:** Usuario A y Usuario B llaman `create_reservation` simultáneamente con `{ X, qty: 1 }`.

**Entonces:**

1. Una transacción obtiene lock primero → reserva exitosa → `reserved_qty=1`
2. La otra espera lock → ve `available_qty=0` → ROLLBACK → `STOCK_CONFLICT` con `[X.code]`
3. Inventario final: `physical_qty=1`, `reserved_qty=1` (correcto)

**Prueba automatizada (FASE 2/4):**

```typescript
// Pseudocódigo Vitest
await Promise.all([
  createReservation([stickerX]),
  createReservation([stickerX]),
])
// Assert: exactamente 1 success, 1 STOCK_CONFLICT
// Assert: inventory.reserved_qty <= physical_qty
```

---

## 7. Conflictos en UI (FASE 4)

Cuando `create_reservation` retorna `STOCK_CONFLICT`:

1. Mostrar mensaje: «Una o más láminas acaban de agotarse mientras preparabas tu pedido.»
2. Listar códigos afectados
3. Remover del carrito local automáticamente
4. Recalcular total
5. Si qty restante < mínimo → bloquear continuar; sugerir agregar más
6. **Nunca** crear reserva parcial sin acción explícita del usuario

---

## 8. Countdown sincronizado

| Fuente | Uso |
|--------|-----|
| `expires_at` (timestamptz) | Verdad en BD |
| Server Action `getServerTime()` | Offset cliente-servidor |
| Cliente | `expires_at - (Date.now() + offset)` |

Actualizar cada segundo en UI; al llegar a 0, polling o Realtime para confirmar expiración.

---

## 9. Realtime

**Canal:** `inventory:sticker_id=eq.{id}` o broadcast por sección.

**Eventos:**

- `reserved_qty` cambió → recalcular disponibilidad en selector
- Reserva expirada → lámina vuelve a disponible

**Cliente:** debounce 300ms para evitar thrashing en picos.

---

## 10. Movimientos de inventario

Cada mutación genera fila en `inventory_movements`:

| type | Cuándo |
|------|--------|
| `reserve` | create_reservation |
| `release` | expire / cancel |
| `sale` | confirm_payment |
| `adjustment` | admin manual (+/-) |
| `restock` | admin import CSV |

Campos: `sticker_id`, `qty_delta`, `reason`, `reference_type`, `reference_id`, `admin_id`, `created_at`.

---

## 11. Generación de códigos públicos

**Formato:** `LAM-` + 5 caracteres alfanuméricos uppercase (sin O/0/I/1 ambiguos).

**Generación:**

```sql
-- Loop hasta unique constraint success
code := 'LAM-' || random_base32(5)
```

Separado de UUID interno. No secuencial para evitar enumeración.

**Access token:** 32 bytes random → SHA-256 hash en BD; token raw solo en URL/email.

---

## 12. Rate limiting

| Endpoint/Action | Límite MVP |
|-----------------|------------|
| create_reservation | 5 / IP / 10 min |
| complete_checkout | 10 / token / hora |
| report_payment | 3 / order / hora |

Implementación FASE 4: middleware o wrapper en Server Action.

---

## 13. Cron de expiración

**Route:** `POST /api/cron/expire-reservations`

**Auth:** Header `Authorization: Bearer ${CRON_SECRET}`

**Frecuencia:** Cada 2 minutos (Cloudflare Cron Trigger o Supabase pg_cron si disponible).

**Fallback:** Lazy expiration en cada `create_reservation` y lectura de catálogo.

---

## 14. Casos límite

| Caso | Comportamiento |
|------|----------------|
| Admin reduce stock bajo reserva activa | RPC admin valida; si conflict, forzar cancelación o override auditado |
| Usuario refresca durante checkout | Token en URL recupera estado |
| Pago reportado tras expiración | Rechazar; mostrar mensaje; admin puede reabrir manualmente |
| Duplicate submit checkout | Idempotency key por reservation_id |
| Sticker desactivado mid-flight | RPC rechaza en paso 5 |

---

## 15. Métricas operativas (admin)

- Reservas activas por estado
- Tiempo medio reserva → pago
- Tasa de expiración
- Conflictos STOCK_CONFLICT / hora

---

## 16. Checklist de implementación

- [ ] Migraciones: tablas + constraints
- [ ] RPC `expire_reservations`
- [ ] RPC `create_reservation`
- [ ] RPC `complete_checkout`
- [ ] RPC `confirm_payment`
- [ ] RPC `cancel_reservation`
- [ ] Prueba concurrencia última unidad
- [ ] Prueba expiración + re-disponibilidad
- [ ] Realtime subscription
- [ ] Cron route
- [ ] UI conflictos
- [ ] Countdown server-sync
