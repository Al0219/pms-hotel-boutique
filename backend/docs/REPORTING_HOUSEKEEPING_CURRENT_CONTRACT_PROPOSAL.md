# BE-010A-HKCUR-01 — Propuesta de situación actual de housekeeping

Fecha: 2026-10-22. Estado: **APPROVED por delegación del usuario; implementación
Backend/BFF/Web en validación, QA manual pendiente**. Owner de la
fuente: Juan / BD3; contrato HTTP/acceso: Alan / BD1; consumidor: WEB-3;
revisión de sesión/scope: WEB-2. La autorización general del usuario permite
decidir el contrato a partir de fuentes verificadas. Figma fue inspeccionado
directamente el 2026-10-22: el centro `PRI-24 — Reportes y Analytics / Centro`
(node `233:1756`) nombra housekeeping dentro de Operación. El grupo
`V3 — 08 Reporting` (node `1753:13262`) solo contiene un resumen A/P; la
búsqueda de marcos `PRI-24 — Reportes /` encontró ocupación diaria
(`233:1883`), resumen financiero, cumplimiento y exportaciones de ocupación,
sin un detalle propio de housekeeping. Por ello, esta vista nueva usará el
shell y componentes de Reportes existentes; no se declara paridad de un marco
HK inexistente ni se trasladan cifras de ejemplo de Figma. El alcance de datos
y transporte de esta ficha queda aprobado bajo la delegación, sin atribuir
aprobación docente ni QA manual. No cambia permisos ni migraciones aplicadas.

## Fuentes verificadas y límite de la métrica

- `rooms` contiene habitaciones físicas por property, incluidas las que tengan
  OOO/OOS. No hay marca de habitación inactiva en esa tabla.
- `hk_room_states` tiene como máximo una fila por `(property_id, room_id)` y
  estados `DIRTY`, `CLEAN`, `INSPECTED`. `dnd` es un indicador independiente;
  la FK compuesta impide que la fila apunte a una habitación de otra property.
- La lectura existente `HousekeepingService.listByScope` devuelve únicamente
  habitaciones **seguidas**. Por ello, usar su tamaño como total físico o
  considerar `rooms` sin fila como DIRTY sería incorrecto.
- `updated_at` refleja la última transición del estado actual, incluido DND;
  no permite contar limpiezas, inspecciones, rechazos ni tiempos de resolución
  de un periodo. El AuditTrail puede servir a otro contrato de actividad, con
  revisión de cobertura/retención y autorización propia.
- La consulta será una fotografía del estado **actual** al ejecutarse. No
  representa limpieza histórica, disponibilidad vendible, preparación para
  llegada ni cumplimiento de SLA. No mezcla housekeeping con mantenimiento.

## Diccionario de datos propuesto

Una fila por property autorizada, incluso si no tiene habitaciones. Todos los
contadores son enteros no negativos; `calculatedAt` es el instante UTC de la
consulta y no un business date. `timezone` identifica la property, pero la
fotografía no lleva filtro de fecha. No hay importes ni agregación de monedas.

| Campo | Fuente y regla |
| --- | --- |
| `physicalRooms` | Cantidad de filas de `rooms` de la property. Incluye OOO/OOS; no equivale a inventario vendible. |
| `trackedRooms` | Habitaciones de `rooms` con fila en `hk_room_states`. |
| `untrackedRooms` | `physicalRooms - trackedRooms`; estado housekeeping desconocido, nunca DIRTY implícito. |
| `dirtyRooms` | Filas seguidas con `status=DIRTY`. |
| `cleanRooms` | Filas seguidas con `status=CLEAN`. |
| `inspectedRooms` | Filas seguidas con `status=INSPECTED`. |
| `dndRooms` | Filas seguidas con `dnd=true`, subconjunto transversal de los tres estados; no sumar a los demás. |

Invariantes: `physicalRooms = trackedRooms + untrackedRooms` y
`trackedRooms = dirtyRooms + cleanRooms + inspectedRooms`.
Una property sin habitaciones devuelve todos los contadores en cero. Una con
habitaciones sin seguimiento devuelve `untrackedRooms > 0`; no devuelve null.
No se exponen habitación, huésped, staff, motivo de rechazo ni PII.

## Transporte aprobado para BE-010B-HKCUR-01

- Backend: `GET /api/v1/reports/housekeeping/current`.
- BFF Staff: `GET /api/v1/private/reports/housekeeping/current`.
- Query estricta: exactamente `propertyId=<UUID>` o
  `scope=ALL_PROPERTIES`; rechazar parámetros faltantes, vacíos, duplicados o
  desconocidos. Sin `from`/`to`, paginación, CSV o programación en este slice.
- Staff con `OPERATIONS_MANAGE` y membership activa de la property. ALL requiere
  además `MULTI_PROPERTY_READ`; solo se incluyen properties autorizadas a la
  sesión. RECEPCIÓN no obtiene esta lectura por su permiso de reservas.
- El BFF usa únicamente sesión Staff HttpOnly y Bearer interno; Backend valida
  acceso antes de consultar. SQL filtra organization/property IDs autorizados
  antes de agregar; no filtra un resultado global posteriormente.
- Respuesta JSON 200, filas ordenadas por UUID de property, `calculatedAt` UTC.
  La property autorizada sin habitaciones produce una fila de ceros. C2 no
  permite un scope autorizado sin properties activas; no se ofrece un resultado
  vacío como fallback para una sesión inválida. Todos los resultados y errores
  llevan `Cache-Control: private, no-store`.
- 400 para query inválida; 401 para sesión ausente/revocada o Guest; 403 para
  permiso/property/ALL no autorizado; 503 para fuente no disponible. Errores
  sanitizados, sin SQL, JWT ni datos privados. GET sin efectos secundarios;
  este contrato no crea evento de exportación.

Ejemplo **sintético**, no dato real del hotel:

```json
{
  "calculatedAt": "2035-01-01T12:00:00Z",
  "rows": [{
    "propertyId": "22222222-2222-4222-8222-222222222222",
    "timezone": "America/Guatemala",
    "physicalRooms": 4,
    "trackedRooms": 3,
    "untrackedRooms": 1,
    "dirtyRooms": 1,
    "cleanRooms": 1,
    "inspectedRooms": 1,
    "dndRooms": 1
  }]
}
```

## DoR, implementación y aceptación

**DoR cumplido para este slice:** fuente persistida y C2 verificados; Figma
centro consultado y ausencia de detalle HK comprobada. La decisión delegada
publica una **fotografía actual** bajo Operación, sin fecha ni porcentajes de
ocupación. No se extrapolan los controles de ocupación al nuevo reporte.

Una vez verificado el DoR: consulta en módulo operations en **una** sentencia
scoped sobre `rooms LEFT JOIN hk_room_states`; seguridad/OpenAPI/Postman;
BFF con allowlist y no-store; Service → DTO → Mapper → Domain → Hook → UI.
La vista debe nombrar explícitamente `untracked` y explicar que DND se solapa
con los estados. No simular filas ni contar OOO/OOS como estado HK.

QA: property con cero habitaciones, sin seguimiento, con los tres estados y
DND; OOO/OOS; dos properties autorizadas y una ajena; OPERACIONES propio,
GERENCIA ALL y RECEPCIÓN denegada; sesión Guest/revocada; query estricta;
consulta que cambia tras una transición; fallo de fuente y property sin rooms;
paridad SQL/Backend/BFF/UI y OpenAPI. Cerrar solo tras pruebas Backend/Web,
Docker real y QA manual PASS del usuario conforme a `backend/AGENTS.md`.
