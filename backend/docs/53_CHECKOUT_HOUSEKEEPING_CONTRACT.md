# Checkout interno → habitación pendiente de limpieza

Ampliación posterior: [contrato54](54_STAFF_STAY_LIFECYCLE_CONTRACT.md) expone la
operación Staff con guard financiero y auditoría del actor de sesión. La entrada
interna histórica descrita aquí conserva SYSTEM y su compatibilidad; no confundir
esa primitiva con la nueva frontera HTTP autorizada.

Estado: APPROVED para integrar el servicio existente, implementación EN_QA. José aprobó
continuar el 2026-10-22 tras la recomendación de conectar checkout real con DIRTY,
reflejarlo en Housekeeping/Habitaciones y conservar auditoría. Incremento posterior
a contratos51/52; no cambia retroactivamente sus límites históricos.

Owner José; coordinación de dominio Juan y seguridad Alan. Rama
`feature/staff-checkout-housekeeping`, base `0d4affd` (árbol igual a origin/main
`1c0eccd` al iniciar). No se reasignan otros módulos.

## Capacidad confirmada y límites

Existe ReservationStayService.checkOut(UUID): IN_HOUSE → CHECKED_OUT.
No existe checkout HTTP/BFF/UI Staff confirmado en el repositorio. Este incremento
integra el servicio interno; no inventa endpoints, botones ni un flujo de cierre
financiero. Una futura exposición Staff requiere contrato propio, sesión vigente,
RESERVATION_MANAGE y scope explícito según la matriz21.

## Comportamiento

- Bloquear stay y después Room, en el mismo orden que check-in. La salida válida,
  el estado HK y su auditoría se confirman en una única transacción.
- Para la Room asignada, cambiar el seguimiento existente a DIRTY. Si aún no
  existe seguimiento (datos previos), crearlo DIRTY al confirmar la salida, con
  el mismo vínculo property/room; ninguna lectura crea seguimiento.
- Solo tocar la habitación física de esa stay. Conservar tipo, asignación, fechas,
  propiedad, otras stays/reservas, OOO/OOS y DND. El motivo visible es
  «Salida del huésped: habitación pendiente de limpieza.»; no muestra UUIDs.
- Preservar compatibilidad del servicio previo para una stay IN_HOUSE histórica
  sin Room: puede finalizar, sin crear ni ensuciar una habitación inventada.
  El check-in actual sigue exigiendo Room asignada e INSPECTED.
- RESERVED/CANCELLED/NO_SHOW/CHECKED_OUT no admiten checkout. Repetir o ejecutar
  concurrentemente no crea una segunda transición ni duplica sus side effects.
- HK no agrega un descuento ATS. CHECKED_OUT deja de consumir según la consulta
  vigente; nuevas reservas y sus preasignaciones siguen intactas. Para entregar
  la habitación de nuevo continúa siendo necesaria una inspección vigente.

## Auditoría y autoridad

El punto interno no recibe identidad autenticada: registrar actor SYSTEM, nunca
inventar Staff. Evento STAY_CHECKED_OUT sobre RESERVATION_STAY y HK_SOILED sobre
HK_ROOM_STATE, con before/after y correlationId de la stay. Si el seguimiento se
crea, before de HK es null. El motivo se conserva en auditoría append-only y en
la proyección cleaningReason existente; DND no reemplaza ese motivo.
Si falla la limpieza o cualquier evento auditado, revertir toda la salida.
No editar/borrar movimientos, eventos ni migraciones; sin dependencias nuevas.

## Aceptación / DoD

PostgreSQL real: ciclo por cada condición HK, creación de seguimiento, DND,
caso histórico sin Room, rechazo de estados inválidos, rollback ante fallo de
auditoría, doble checkout y concurrencia con escritor HK/caché JPA. Verificar
estancia futura preasignada y ATS, motivo disponible al releer mediante el
contrato51. ./mvnw -B verify Java21/PostgreSQL17, diff revisado y documentación
coherente. No cambia OpenAPI porque no cambia HTTP. EN_QA hasta QA manual PASS
de José; no atribuir un botón/API de checkout ni una prueba visual inexistentes.

## Evidencia técnica — 2026-10-22

Java21/PostgreSQL17 aislados, ./mvnw -B verify:905 PASS,0 failures/errors/skipped,
BUILD SUCCESS/JAR,17:13 min. Incluye16 casos nuevos de CheckoutHousekeepingIntegrationTests.
Primera ejecución905:904 PASS/1 HttpTimeoutException en Swagger del test existente
PublicBookingHttpIntegrationTests:153; generación19,95s contra límite20s.
La repetición íntegra con PostgreSQL nuevo pasó, incluido ese archivo62 PASS
(Swagger9,84s). Sin editar pruebas, timeout, configuración, exclusiones ni CI.
Se reutilizaron clases compiladas en target para la repetición, sin cambios de fuente.
Informes separados en backend/target/checkout-hk-* ignorado. QA manual propio
pendiente. José autoriza commit/push el 2026-10-22; no se atribuyen checks remotos
ni merge. Entorno habitual3001 sin cambios. Siguiente alcance autorizado:
preparar y acordar el contrato Staff, sin implementar APIs/BFF/UI antes del acuerdo.
