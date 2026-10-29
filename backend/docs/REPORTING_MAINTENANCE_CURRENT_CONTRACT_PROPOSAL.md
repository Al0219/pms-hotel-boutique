# BE-010A-MTCUR-01 — Situación actual de mantenimiento

Fecha: 2026-10-22. Estado: **APPROVED por delegación del usuario para el
alcance actual; implementación EN_PROGRESO**. Owner de la fuente: Juan / BD3;
contrato HTTP y acceso: Alan / BD1; consumidor: WEB-3; revisión de sesión y
scope: WEB-2. La aprobación delegada no sustituye QA manual ni atribuye una
decisión al docente.

## Fuentes y semántica

El centro PRI-24 de Figma V3 nombra mantenimiento en Operación. Una búsqueda
global de `PRI-24 — Reportes / Mantenimiento` no encontró un marco de detalle.
Esta nueva vista usa el shell de
Reportes y no copia cifras de ejemplo ni inventa paridad visual.

`maintenance_orders` persiste una orden por fila con `property_id`, estado
`OPEN`, `IN_PROGRESS`, `RESOLVED` o `CANCELLED`, prioridad `LOW`, `MEDIUM`,
`HIGH` o `URGENT`, `room_id` opcional y `assigned_to` opcional. `created_at`,
`updated_at` y `resolved_at` describen la fila actual; una reapertura borra
`resolved_at`. Por ello, este reporte es una **fotografía de órdenes sin
resolver** al consultar, sin filtro de fecha. No mide actividad histórica,
tiempo de resolución, SLA, habitaciones OOO/OOS ni disponibilidad vendible.
Una orden URGENT sin resolver coincide con la condición que usa el bloqueador
de Night Audit, pero la lectura no ejecuta ni cierra ese proceso.

## Diccionario

Una fila por property activa autorizada, también si no tiene órdenes. Todos
los contadores son enteros no negativos. `calculatedAt` es UTC y `timezone`
identifica la property; no hay business date ni moneda.

| Campo | Regla |
| --- | --- |
| `openOrders` | Órdenes cuyo estado actual es `OPEN`. |
| `inProgressOrders` | Órdenes cuyo estado actual es `IN_PROGRESS`. |
| `unresolvedOrders` | `openOrders + inProgressOrders`. |
| `urgentUnresolvedOrders` | Subconjunto sin resolver con prioridad `URGENT`. |
| `unassignedUnresolvedOrders` | Subconjunto sin resolver con `assigned_to IS NULL`. |
| `roomLinkedUnresolvedOrders` | Subconjunto sin resolver con `room_id IS NOT NULL`. |
| `commonAreaUnresolvedOrders` | Subconjunto sin resolver con `room_id IS NULL`. |

Los subconjuntos urgente y sin asignar se pueden solapar; no se suman al
total. `roomLinkedUnresolvedOrders + commonAreaUnresolvedOrders =
unresolvedOrders`. RESOLVED/CANCELLED no aparecen en estos contadores, pero
permanecen en la fuente. Ningún campo expone título, descripción, room ID,
actor, asignado ni datos de huésped.

## Transporte de BE-010B-MTCUR-01

- Backend: `GET /api/v1/reports/maintenance/current`.
- BFF Staff: `GET /api/v1/private/reports/maintenance/current`.
- Query estricta: exactamente `propertyId=<UUID>` o `scope=ALL_PROPERTIES`.
  Rechazar faltantes, vacíos, duplicados y desconocidos. Sin fechas,
  paginación, CSV o programación en este slice.
- Requiere sesión Staff con `OPERATIONS_MANAGE` y membership activa.
  `ALL_PROPERTIES` requiere además `MULTI_PROPERTY_READ` y comprende solo
  las properties autorizadas a esa sesión. RECEPCIÓN sin permiso de
  operaciones no accede. Backend decide finalmente el acceso y limita el SQL
  a organization/property IDs autorizados antes de agregar.
- Respuesta JSON 200, filas ordenadas por UUID de property y
  `calculatedAt` UTC. Una property sin órdenes produce una fila de ceros.
  Respuesta y errores: `Cache-Control: private, no-store`.
- 400 query inválida; 401 sesión ausente/revocada o Guest; 403 permiso/scope
  denegado; 503 fuente no disponible. Errores sanitizados. GET sin efectos
  secundarios ni evento de exportación. El BFF remite solo Bearer interno
  obtenido de cookie Staff HttpOnly; no publica tokens al navegador.

Ejemplo **sintético**, no dato real del hotel:

```json
{
  "calculatedAt": "2035-01-01T12:00:00Z",
  "rows": [{
    "propertyId": "22222222-2222-4222-8222-222222222222",
    "timezone": "America/Guatemala",
    "openOrders": 2,
    "inProgressOrders": 1,
    "unresolvedOrders": 3,
    "urgentUnresolvedOrders": 1,
    "unassignedUnresolvedOrders": 2,
    "roomLinkedUnresolvedOrders": 2,
    "commonAreaUnresolvedOrders": 1
  }]
}
```

## Implementación y aceptación

El incremento HTTP requiere consulta scoped en operations, seguridad,
OpenAPI vivo y Postman, BFF privado con allowlist y capas Web
Service → DTO → Mapper → Domain → Hook → UI. La UI debe nombrar los
subconjuntos y la semántica actual; no mostrará RESOLVED/CANCELLED como
actividad del periodo ni cifras simuladas.

QA: cero órdenes, cada estado y prioridad, orden reabierta, asignada/sin
asignar, con/sin room, dos properties autorizadas y una ajena; OPERACIONES,
GERENCIA ALL y RECEPCIÓN denegada; Guest/sesión revocada; filtro estricto,
error de fuente y refresh tras transición; respuesta vacía/cero,
Backend/BFF/mapper/UI y OpenAPI. Cierre: suites aplicables, Docker con datos
persistidos y QA manual PASS del usuario según `backend/AGENTS.md`.
