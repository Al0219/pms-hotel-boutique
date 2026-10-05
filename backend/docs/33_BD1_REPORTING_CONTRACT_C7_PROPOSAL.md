# BE-010A — C7: reportes, exportaciones y revenue KPIs

**Estado:** APPROVED_PARTIAL, 2026-10-04. El usuario aprobó D01, D02, D07 y
D09; aprobó D04 condicionado a D03 y D08 como acceso inicial; D06 conserva una
decisión pendiente de BD2/BD3, D05 queda posterior y D03 sigue pendiente de
contrato Backend. La autorización de este contrato permite preparar **On-books
diario**. No aprueba rutas HTTP, módulo nuevo, ingresos ni KPIs financieros.
BD2 revisa inventario/finanzas; BD3 reservas/night audit/comercial; el consumidor
Revenue revisa la integración del reporte.

## Problema y límites actuales

La UI espera reportes y revenue KPIs, pero una respuesta numérica del Backend
debe poder reproducirse desde datos persistidos y una política de fechas. El
modelo actual permite contar inventario físico y estancias vigentes por noche;
no permite deducir ingresos de habitación ni un histórico de pickup sin
decisiones y datos adicionales. Una pantalla o fixture Web no constituye
evidencia financiera.

La regla global exige contar `ReservationStay`, no `Reservation`, para noches
vendidas; `ALL_PROPERTIES` es el conjunto autorizado de la sesión y cada
property se calcula antes de agregar. No sumar importes de monedas distintas.
Fuentes: [modelo global](../../docs/03_DOMAIN_MODEL.md),
[reglas](../../docs/04_DOMAIN_RULES.md) y
[property scope](../../docs/05_PROPERTY_SCOPE.md).

## Inventario de fuentes verificadas

| Fuente actual | Dato disponible | Límite para reporting |
| --- | --- | --- |
| `properties`, `room_types`, `rooms` | Property, timezone, moneda, tipo y habitaciones físicas | No hay vigencia histórica de room/type ni snapshot diario de capacidad. |
| `out_of_order_records` | OOO/OOS con rango y liberación | La consulta ATS usa OOO **no liberados**; no reconstruye por sí sola el denominador de una fecha histórica tras liberación/cambios. OOS no resta ATS en MVP. |
| `reservations` | Property, estado, moneda, canal, `created_at` | Una reserva puede tener N stays; no contiene room revenue ni price snapshot. |
| `reservation_stays` | Una unidad por stay, `[arrival, departure)`, estado, room type | Estado actual no identifica todas las noches efectivamente ocupadas ni conserva una serie histórica de cambios. |
| `folios`, `folio_movements` | Moneda, cargo/pago/ajuste append-only, importe menor, `created_at` | `PAYMENT` es asiento contable y **no** prueba capture externo. Un `CHARGE` no tiene categoría habitación/impuesto/servicio ni noche de prestación/business date. |
| `business_days`, `night_audit_runs` | Fecha de negocio por property y cierre | No existe FK de movement/reservation a business date ni snapshot de métricas al cerrar. |
| `rate_plans` | Tarifa base vigente por tipo/property | No es precio contratado de una reserva, no posee inventario y no acredita ingreso. |

Evidencia concreta: [ATS SQL](../src/main/java/com/pms/hotelboutique/backend/modules/inventory/infrastructure/persistence/AvailabilityQueryRepository.java),
[estancias](../src/main/resources/db/changelog/004ServiceReservations/003-reservation-stay.yaml),
[folios](../src/main/resources/db/changelog/004ServiceReservations/004-folio.yaml),
[Night Audit](../src/main/resources/db/changelog/005ServiceOperations/003-night-audit.yaml),
[FolioService](../src/main/java/com/pms/hotelboutique/backend/modules/reservations/application/FolioServiceImpl.java).

## Decisiones C7 registradas

| ID | Estado y decisión | Revisión de integración pendiente |
| --- | --- | --- |
| C7-D01 — Granularidad | **APROBADO.** Primer reporte on-books por `propertyId` y noche local de estancia `[arrival, departure)`, calculado desde el compromiso **actual** al consultar. Cada `ReservationStay` multi-room suma una unidad por noche. Ocupación realizada es un indicador separado. | BD3 y consumidor Revenue |
| C7-D02 — Capacidad y ocupación | **APROBADO.** Disponibles = habitaciones físicas − habitaciones OOO únicas por noche; OOS no descuenta. On-books = stays `RESERVED`/`IN_HOUSE` con padre no `CANCELLED`, como ATS actual. Porcentaje = on-books / disponibles × 100 si disponibles > 0; en cero, valor `null` con motivo. No presentar este porcentaje como ocupación realizada. | BD2 inventario y BD3 reservas |
| C7-D03 — Ingreso de habitación | **PENDIENTE DE CONTRATO BACKEND.** BD2/BD3 deben designar owner de contrato y persistencia/origen del importe de habitación **por noche**, separado al menos de impuestos, servicios adicionales, descuentos y reembolsos. `folio_movements`, total de reserva y `PAYMENT` contable no sustituyen esa fuente. Sin D03, no publicar revenue/ADR/RevPAR. | BD2 + BD3 + Producto |
| C7-D04 — ADR/RevPAR | **APROBADO CONDICIONADO A D03.** ADR = ingreso **neto** de habitación / noches vendidas elegibles. RevPAR = ese ingreso / noches disponibles. Neto excluye impuestos y servicios adicionales; descuentos y reembolsos que afecten alojamiento ajustan el numerador según D03. Sumar importes y denominadores por property/moneda antes de dividir; denominador cero devuelve `null` con motivo. | BD2 y Revenue al cerrar D03 |
| C7-D05 — Pickup/pace | **POSTERIOR.** Requiere snapshots por fecha de corte para comparar el mismo horizonte de estancia. `created_at` y estado actual no reconstruyen el on-books histórico. | Producto + BD3 |
| C7-D06 — Fechas | **APROBADO PARCIALMENTE.** On-books usa la noche de estancia en zona horaria local de cada property; ingresos futuros se contabilizan por `business_date`. BD2/BD3 deben definir corrección/reapertura para un día cerrado. UTC del servidor no reemplaza business date. | BD2 + BD3 para correcciones históricas |
| C7-D07 — Moneda y ALL_PROPERTIES | **APROBADO.** Varias properties pueden verse juntas, manteniendo importe por moneda. Solo sumar importes de igual moneda; sin FX automática. Filtrar en SQL por IDs autorizados antes de agregar y conservar `propertyId` en filas por propiedad. | BD1 + consumidor Revenue |
| C7-D08 — Acceso | **APROBADO COMO PROPUESTA INICIAL.** `COMMERCIAL_MANAGE` para revenue y reporte comercial on-books; `MULTI_PROPERTY_READ` adicional si el scope incluye varias properties. Ni `AUDIT_READ` ni `FOLIO_PAYMENT_OPERATE` conceden acceso implícito. Revisar contrato HTTP/BFF en BE-010B sin crear permiso nuevo. | BD1 + consumidor Web/Revenue |
| C7-D09 — Exportaciones | **APROBADO.** CSV UTF-8, máximo 366 días y 50 000 filas por exportación; mismos filtros y permisos que la consulta. Sin nombre, correo, teléfono, documento ni otra PII de huésped. Escapar CSV y neutralizar campos de texto con prefijos de fórmula; importes siguen numéricos. Export asíncrono/lotes se estudia solo si una necesidad futura supera límites. | Producto + seguridad/privacidad + Web |

Para On-books diario, la fecha de la fila es **stay date/noche local**, no el
`business_date` financiero. Las llegadas y salidas on-books son candidatas
opcionales porque `reservation_stays.arrival/departure` existen; BE-010B debe
confirmar su semántica exacta antes de exponerlas. La capacidad histórica
después de liberar OOO sigue siendo una limitación: la primera consulta se
define como estado actual de noches consultadas, no como fotografía de cómo
estaba el hotel en una fecha anterior.

## Secuencia recomendada para BE-010B

1. **Primer incremento — On-books diario:** presentar por propiedad y stay
   date local habitaciones físicas, OOO, disponibles, stays/noches on-books y
   porcentaje on-books. Llegadas/salidas pueden agregarse tras confirmar si
   cuentan el primer/último día de stays `RESERVED`/`IN_HOUSE`. Probar multi-room,
   cancelación, no-show, OOO superpuesto/liberado, scope y denominador cero.
   Documentar que se consulta el estado actual; no etiquetarlo como producción
   histórica. El contrato HTTP y el tratamiento de fechas pasadas quedan para
   BE-010B antes de exponer la ruta.
2. **Revenue/ADR/RevPAR:** tras D03/D04 y fuente financiera verificable,
   separar cargos de habitación, impuestos, otros servicios, descuentos,
   compensaciones y reembolsos. Probar importes menores exactos, moneda,
   reversiones append-only y cambio de business date. Si falta fuente, el KPI
   queda no disponible; no retornar cero como si fuera real.
3. **CSV del reporte inicial:** D09 permite preparar la exportación con el mismo
   filtro/scope, 366 días y 50 000 filas; probar autorización, límite y seguridad
   de celdas. **Pickup/pace** queda en un incremento posterior tras snapshots
   D05 y pruebas de dos cortes/cambios de estado.

## Contrato HTTP pendiente

No se fijan URL, DTO, filtros concretos, formato de error ni BFF en C7-A.
Antes de crear API, documentar arquitectura, auth Staff, property scope,
persistencia/índices y contrato aprobado. La lectura debe rechazar sesión
ausente o Guest y resolver membership/permiso **antes** del query; SQL debe
recibir el conjunto autorizado, sin lectura global seguida de filtro Java.
Los exportes requieren auditoría de actor, scope y parámetros no sensibles.
Cada ruta nueva de BD1 se añadirá a
[Postman BD1](../postman/BD1-Backend-APIs.postman_collection.json).

## QA y decisiones pendientes

Esta entrega es documental: contrastar cada fila del inventario con las
migraciones/servicios enlazados y verificar que ningún KPI se declara
implementado. La aprobación del usuario está registrada por ID; BD2/BD3 y
consumidores revisan integración de sus fuentes. BE-010B necesita dataset
PostgreSQL controlado con cálculo manual,
tests cross-property, moneda, DST, multi-room, reversiones y export seguro.

Permanecen abiertos: D03 (owner/fuente de ingreso por noche), D05 (snapshots),
D06 (corrección de business date cerrado), tratamiento de capacidad histórica,
semántica opcional de llegadas/salidas y contrato HTTP/BFF del primer reporte.
