# Requisitos de Producto — Láminas 2026

> **Estado:** FASE 0 — Documento de referencia  
> **Última actualización:** 2026-07-17  
> **Idioma de la plataforma:** Español de Chile (es-CL)  
> **Moneda:** CLP (enteros, sin decimales)

---

## 1. Resumen ejecutivo

Plataforma web **mobile-first** para vender láminas físicas originales sobrantes de una colección FIFA World Cup 2026. La venta es **particular**, sin afiliación ni patrocinio de Panini o FIFA. El comprador elige códigos individuales, arma un pedido con reglas de precio por volumen, y completa una reserva con pago por transferencia bancaria.

**Nombre provisional del producto:** *Láminas 2026* (reemplazable).

---

## 2. Objetivos de negocio

| Objetivo | Métrica de éxito |
|----------|------------------|
| Vender láminas individuales sin overselling | 0 inventario negativo; 0 reservas parciales no consentidas |
| Facilitar compra desde móvil | ≥ 80 % del tráfico usable en viewport 375px |
| Operación administrativa eficiente | CRUD inventario, confirmación de pagos, configuración sin despliegue |
| Confianza del comprador | Countdown de reserva sincronizado con servidor; estados claros |

---

## 3. Alcance MVP

### Incluido

- Landing con propuesta de valor y aviso legal de no afiliación
- Selector de láminas agrupado por sección con buscador y filtros
- Carrito anónimo persistente (sin reserva real)
- Motor de reserva atómica con expiración automática
- Checkout con retiro/despacho
- Pago por transferencia + comprobante opcional + confirmación manual
- Panel administrador protegido con Supabase Auth
- Realtime de disponibilidad
- Pruebas unitarias, integración, concurrencia y E2E
- Documentación completa

### Excluido del MVP (diseñado para extensión)

- Pasarela Mercado Pago (interfaz `PaymentProvider` preparada)
- Imágenes escaneadas por lámina (modelo preparado)
- Cuentas de cliente registradas
- Notificaciones push/email automáticas
- Integración directa con Facebook Marketplace

---

## 4. Reglas de negocio configurables

Todas las reglas deben persistirse en base de datos y editarse desde `/admin`. **No codificar valores fijos en componentes frontend.**

### 4.1 Precios por volumen (valores iniciales)

| Cantidad de láminas | Precio |
|---------------------|--------|
| Mínimo retiro: 15 | — |
| 15 – 24 | $500 / lámina |
| 25 – 39 | $450 / lámina |
| 40 – 49 | $425 / lámina |
| Exactamente 50 | $20.000 fijo (promoción) |
| 51 – 74 | $400 / lámina |
| Exactamente 75 | $28.500 fijo (promoción configurable) |
| Exactamente 100 | $36.000 fijo (promoción configurable) |

### 4.2 Despacho y retiro

| Regla | Valor inicial |
|-------|---------------|
| Retiro | Sin costo; mínimo 15 láminas |
| Despacho | Habilitado desde 50 láminas |
| Costo despacho | Configurable: pagado por comprador **o** promoción con despacho incluido |

### 4.3 Reservas

| Etapa | Duración inicial | Comportamiento |
|-------|------------------|----------------|
| A — Reserva inicial (`reserved`) | 20 minutos | Usuario completa datos; stock bloqueado |
| B — Pendiente de pago (`awaiting_payment`) | 5 horas | Instrucciones transferencia; stock sigue reservado |

Al vencer cualquier etapa: liberar inventario automáticamente; estado `expired`.

---

## 5. Personas y flujos

### 5.1 Comprador anónimo

1. Visita landing → entiende precios y condiciones
2. Elige láminas en selector → carrito local persistente
3. Presiona «Reservar y comprar» → reserva atómica
4. Completa datos → pedido `awaiting_payment`
5. Transfiere → reporta pago (comprobante opcional)
6. Espera confirmación manual del vendedor

### 5.2 Administrador

1. Inicia sesión en `/admin`
2. Gestiona inventario, precios, pedidos
3. Confirma pagos, cambia estados operativos
4. Ajusta stock con motivo auditado

---

## 6. Experiencia pública

### 6.1 Landing (`/`)

**Contenido obligatorio:**

- Propuesta de valor
- Destacado: «50 láminas a elección por $20.000»
- Comparación visual de precio por tramo
- Explicación retiro vs despacho
- CTA: «Elegir mis láminas»
- Indicadores: compra segura, stock actualizado
- Aviso legal: tienda independiente, no afiliada a Panini ni FIFA

### 6.2 Selector (`/elegir` o similar)

| Funcionalidad | Detalle |
|---------------|---------|
| Buscador | Por código, país, sección, nombre |
| Filtros | Sección; solo disponibles; últimas unidades |
| Agrupación | FWC, PAN, países, demás secciones |
| Interacción | Botones por código de lámina |
| Resumen móvil | Sticky inferior: cantidad, total, ahorro, faltante para promo 50 |
| Persistencia | Carrito anónimo con ID seguro en localStorage/cookie |

**Estados visuales de lámina:**

| Estado | Descripción |
|--------|-------------|
| `available` | Stock > 1 |
| `last_unit` | Stock = 1 |
| `selected` | En carrito local del usuario |
| `reserved` | Reservada por otro (stock reservado activo) |
| `sold_out` | Stock físico = 0 |
| `unavailable` | Desactivada por admin |

**Restricciones:**

- No seleccionar más unidades que stock disponible real
- Mostrar cantidad cuando stock > 1
- Carrito local ≠ reserva real

### 6.3 Mensajes de usuario (es-CL)

| Situación | Mensaje |
|-----------|---------|
| Última unidad | «Última unidad disponible» |
| Reservada por otro | «Reservada temporalmente por otra persona» |
| Vuelve disponible | «Esta lámina volvió a estar disponible» |
| Reserva vencida | «Tu reserva venció y las láminas fueron liberadas» |
| Conflicto al reservar | «Una o más láminas acaban de agotarse mientras preparabas tu pedido.» |

---

## 7. Checkout

### 7.1 Campos

| Campo | Obligatorio |
|-------|-------------|
| Nombre completo | Sí |
| WhatsApp | Sí |
| Correo | No |
| Usuario Facebook Marketplace | No |
| Modalidad (retiro/despacho) | Sí |
| Región | Sí |
| Comuna | Sí |
| Dirección | Solo despacho |
| Observaciones | No |
| Aceptación términos | Sí |

### 7.2 Salidas

- Código público no secuencial (ej. `LAM-7K3Q2`)
- URL recuperable con token seguro
- Resumen: códigos, cantidad, precio, despacho, total, expiración, estado
- Botón WhatsApp con mensaje prellenado
- Countdown sincronizado con servidor

### 7.3 WhatsApp (plantilla)

```
Hola, creé el pedido {code}.
Cantidad: {quantity}
Total: {total}
Modalidad: {deliveryMethod}
Usuario Marketplace: {marketplaceUsername}
Láminas: {stickerCodes}
Enlace: {publicOrderUrl}
```

Número del vendedor: configurable en admin o variable de entorno segura.

---

## 8. Pagos (MVP)

| Paso | Acción |
|------|--------|
| 1 | Mostrar instrucciones bancarias configurables |
| 2 | Usuario reporta transferencia |
| 3 | Subida opcional de comprobante (bucket privado) |
| 4 | Estado → `payment_reported` |
| 5 | Admin confirma manualmente → `paid` |

**Regla crítica:** subir comprobante ≠ pago confirmado.

Interfaz `PaymentProvider` para Mercado Pago futuro.

---

## 9. Estados del pedido/reserva

```
draft → reserved → awaiting_payment → payment_reported → paid
                                                      ↓
                              preparing → ready_for_pickup | shipped → delivered

Terminales: expired | cancelled
```

| Estado | Significado |
|--------|-------------|
| `draft` | Carrito convertido, pre-reserva (interno) |
| `reserved` | Reserva Etapa A activa |
| `awaiting_payment` | Datos completos, Etapa B |
| `payment_reported` | Comprador reportó transferencia |
| `paid` | Admin confirmó pago |
| `preparing` | En preparación |
| `ready_for_pickup` | Listo para retiro |
| `shipped` | Enviado |
| `delivered` | Entregado |
| `expired` | Venció plazo |
| `cancelled` | Cancelado (admin o sistema) |

---

## 10. Administración (`/admin`)

### 10.1 Dashboard

- Inventario total / disponible / reservado / vendido
- Pedidos pendientes
- Reservas próximas a vencer
- Ventas acumuladas

### 10.2 CRUD

- Colecciones, secciones, láminas
- Ajuste de stock (con motivo, comentario, admin, fecha)
- Import/export CSV
- Historial de movimientos

### 10.3 Operaciones de pedido

- Ver, confirmar pago, cancelar
- Marcar: preparado, enviado, entregado
- Liberar reserva manualmente

### 10.4 Configuración

- Reglas de precio y promociones
- Mínimos de compra
- Despacho (costo, promociones)
- Duración de reservas
- Datos bancarios
- WhatsApp del vendedor

---

## 11. Modelo de datos (referencia)

Entidades mínimas: `collections`, `sections`, `stickers`, `inventory`, `pricing_rules`, `shipping_rules`, `customers`, `anonymous_carts`, `cart_items`, `reservations`, `reservation_items`, `orders`, `order_items`, `payments`, `payment_proofs`, `inventory_movements`, `admin_profiles`, `settings`, `audit_logs`.

Ver `docs/DATABASE.md` (FASE 2).

---

## 12. Seguridad y cumplimiento

- RLS en todas las tablas expuestas
- Token no adivinable para página pública de pedido
- Rate limiting en creación de reservas
- Validación Zod en servidor
- Comprobantes en bucket privado con URLs firmadas
- Auditoría de acciones admin
- Headers de seguridad
- WCAG AA
- Aviso de no afiliación en footer y páginas legales

---

## 13. SEO y legal

- Metadata, Open Graph, imagen social propia
- `sitemap.xml`, `robots.txt`
- `/terminos`, `/privacidad`, `/reservas`, `/retiro-despacho`
- `/compartir` — texto copiable para Marketplace/redes

---

## 14. Identidad visual

Inspiración: fútbol, coleccionismo, álbum, tarjetas numeradas. Colores vivos y profesionales. **Sin** logotipos ni branding Panini/FIFA.

Placeholders reemplazables. MVP prioriza código, sección, número y disponibilidad sobre imágenes.

---

## 15. Criterios de aceptación por fase

| Fase | Criterio de cierre |
|------|-------------------|
| 0 | Documentación aprobada; arquitectura definida |
| 1 | Proyecto compila; lint + typecheck + test runner OK |
| 2 | Migraciones aplican; RLS activo; RPC reserva probada |
| 3 | Landing + selector + carrito funcionales |
| 4 | Reserva concurrente sin overselling |
| 5 | Checkout completo con WhatsApp |
| 6 | Admin operativo |
| 7 | Suite de pruebas verde; WCAG AA verificado |
| 8 | Desplegado en Cloudflare + Supabase |

---

## 16. Riesgos de producto

| Riesgo | Mitigación |
|--------|------------|
| Overselling en picos | RPC transaccional + pruebas de concurrencia |
| Abandono post-reserva | Expiración automática + Realtime |
| Confusión de precios | Resumen con ahorro y tramos visibles |
| Reclamos por marca | Avisos legales prominentes |
| Fraude en comprobantes | Confirmación manual admin |

---

## 17. Preguntas abiertas

Ver `docs/DECISIONS.md` — solo preguntas que bloquean desarrollo.
