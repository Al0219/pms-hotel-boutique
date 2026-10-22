# Limpieza visible para Recepción y preparación de entrega

Estado: APPROVED, implementación COMPLETADA; validación técnica y QA manual
propio PASS, confirmado expresamente por José. José aprobó separar preasignación
de entrega/check-in el 2026-10-21. Incremento posterior a Housekeeping51; owner
José frontend/backend, coordinación Juan Reservas y Alan seguridad/BFF.

## Decisión y límites

- Asignar Room a una stay RESERVED sigue siendo una preasignación, no entrega
  ni check-in. Puede hacerse para una reserva futura aunque hoy esté DIRTY,
  CLEAN o sin seguimiento, con advertencia. No se pronostica limpieza futura.
- Entregar mediante el servicio checkIn exige Room asignada y seguimiento
  INSPECTED actual de esa misma propiedad. DIRTY, CLEAN y ausencia de seguimiento
  rechazan la transición sin cambiar la stay. DND no sustituye la limpieza.
- La UI actual no ofrece check-in real; se protege el servicio interno existente,
  sin inventar una API ni un botón de entrega. Preasignar hoy tampoco hace check-in.
- Ocupación, limpieza y ACTIVE/OOO/OOS siguen independientes. No altera ATS,
  tarifas, reservas públicas ni genera limpieza automática tras check-out.

## Lectura y contratos extendidos

GET colección/detalle de contrato51 admite OPERATIONS_MANAGE **o**
RESERVATION_MANAGE con sesión vigente y PROPERTY autorizada antes de SQL.
Esto permite mostrar limpieza en Habitaciones a Recepción. El menú/página de
gestión HK y todos los POST/PUT conservan OPERATIONS_MANAGE; no se cambia C2
globalmente ni se otorga permiso de escritura a Recepción.

La preview de contrato50 agrega a cada candidata `housekeeping_status`
(DIRTY/CLEAN/INSPECTED/null), `ready_for_check_in` (true solo INSPECTED) y
`warning` (texto si no está lista, null si inspeccionada). La selección permanece
regida por tipo, scope, conflictos y OOO/OOS existentes. Ninguna preview autoriza
un check-in posterior: siempre se relee la limpieza al ejecutar checkIn.

Tablero: columna/filtro de limpieza actual, sin seguimiento distinto de lectura
desconocida, sin proyectar ese dato al día de ocupación elegido. Refresh manual,
al recuperar foco y periódico visible; no tratar caché o fallos como autorización.
La preview y el BFF validan/proyectan los nuevos campos; errores saneados/no-store.

## Consistencia y QA

Check-in bloquea stay y Room antes de leer la condición; los escritores HK usan
el mismo bloqueo Room. Se valida el estado vigente después de esperar el lock,
incluido cuando el contexto JPA había leído antes. Sin migraciones ni dependencias.

Probar Recepción GET200/POST-PUT403, scope/permisos vigentes, tablero/filtros,
error/refetch sin verde falso, candidata DIRTY preasignable con aviso,
checkIn sin Room/sin seguimiento/DIRTY/CLEAN rechazado, INSPECTED permitido,
relectura y concurrencia con limpieza. Regresión HK, Reservas, Comercial y
OpenAPI; typecheck/lint/build Web. QA manual PASS de José confirmado para este incremento.
