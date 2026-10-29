# BE-010A-ARRDEP-01 — Llegadas y salidas pendientes por día

Fecha: 2026-10-21. Estado: **APPROVED por delegación explícita del usuario**.
Implementación: BE-010B-ARRDEP-01. Owner: Alan / BD1 y Juan / BD3;
consumidor WEB-3, revisión colaborativa WEB-2. No cambia estados ni permisos.

## Autoridad y decisiones

El usuario autorizó decidir reglas y contratos según el contexto del proyecto
y después indicó «te doy toda la autorizacion para que empieces a trabajar ya».
Esta decisión habilita los detalles siguientes; no es una aprobación atribuida
al docente ni un PASS manual. Fuentes verificadas: C2, C7-D01/D06/D08,
STAFF-RESERVATIONS-READ-01, ReservationStay y sus transiciones persistidas.
Referencia visual: `V3 — 08 Reporting`, catálogo Web; se reutilizan catálogo,
filtros, tabla y tokens existentes. No hay Node ID de detalle verificado.

| Decisión | Regla aprobada bajo la delegación |
| --- | --- |
| Unidad | Una ReservationStay suma una unidad, aunque comparta Reservation. No contar huéspedes ni reservas padre. |
| Llegadas pendientes | Stays actualmente RESERVED, padre PENDING o CONFIRMED, con arrival igual al día de la fila. |
| Salidas pendientes | Stays actualmente RESERVED o IN_HOUSE, padre PENDING o CONFIRMED, con departure igual al día de la fila. Incluye salidas programadas de stays aún sin check-in. |
| Exclusiones | Padre CANCELLED y stays CANCELLED, NO_SHOW o CHECKED_OUT no aportan pendientes. Un IN_HOUSE ya no aporta llegada pendiente. |
| Tiempo | Fechas LocalDate guardadas en la estancia, locales a su property; from/to inclusivos. departure cuenta como día de salida, no noche ocupada. Sin conversión desde UTC ni uso del reloj del navegador. |
| Estado actual | Consulta pendientes al calcular. Cambiar fechas/estado cambia el resultado incluso de fechas pasadas. No reconstruye una previsión antigua ni acredita movimientos efectivos. |
| Realizados | No disponibles: no existe checkInAt/checkOutAt independiente; updated_at puede cambiar por asignación o fechas. No inferir realizados desde estado actual o updated_at. Contrato de eventos y captura en origen será otro incremento. |
| Agregación | Una fila por property/día, incluso cero; se conserva timezone y currency como metadatos. Sin dinero, porcentajes, ocupación ni suma entre properties. |
| Lectura | RESERVATION_MANAGE o COMMERCIAL_MANAGE; el permiso comercial accede solo a agregados sin PII. ALL_PROPERTIES requiere además MULTI_PROPERTY_READ. |

## Transporte confirmado

- Backend: GET `/api/v1/reports/arrivals-departures/daily`.
- BFF: GET `/api/v1/private/reports/arrivals-departures/daily`.
- Sesión Staff vigente, acceso HttpOnly en BFF, Bearer interno hacia Backend.
  Guest, Bearer del navegador y filtros no amplían la autorización.
- Query: `from`, `to` en YYYY-MM-DD; exactamente `propertyId` UUID o
  `scope=ALL_PROPERTIES`. Rechazar faltantes, vacíos, repetidos y desconocidos.
- Máximo 366 días inclusivos y 50 000 filas (días × properties autorizadas),
  validado antes del query. Sin paginación, exportación ni programación aquí.
- Backend revalida sesión, permisos y C2 membership; SQL recibe únicamente
  organizationId y propertyIds autorizados antes de contar. No fallback global.
- Orden ascendente propertyId canónico/día. Respuesta 200 JSON:

```json
{
  "calculatedAt": "2035-01-01T12:00:00Z",
  "rows": [{
    "propertyId": "22222222-2222-4222-8222-222222222222",
    "timezone": "America/Guatemala",
    "currency": "GTQ",
    "date": "2035-01-01",
    "pendingArrivals": 2,
    "pendingDepartures": 1
  }]
}
```

Ejemplo sintético de contrato, no datos reales del hotel. Campos obligatorios,
contadores int64 no negativos; calculado en UTC; rows puede ser [] si no hay
properties resultantes. Una property autorizada existente sin stays genera
filas con ceros reales. El conjunto autorizado no es vacío según C2.

Errores: 400 filtros/límites; 401 sesión ausente/inválida/revocada o Guest;
403 permiso/property/scope; 503 fallo de fuente o transporte/DTO inválido.
400/503 Backend usan ProblemDetail genérico sin SQL/PII; 401/403 sin detalle
privado. BFF conserva 400/401/403 y sanitiza el resto a 503. Todas las respuestas
de esta ruta son `Cache-Control: private, no-store`, incluidos errores de auth.
GET es lectura sin side effects, clave idempotente ni evento de exportación.
Swagger documenta filtros, DTO, límites, audiencia Staff y respuestas.

## Arquitectura y persistencia

Lectura en módulo reservations, propietario de ReservationStay; repositorio JDBC
scoped con fechas generadas y agregación de entradas/salidas por property/día.
No usa el listado Staff con PII, ni consulta global para filtrar después.
No requiere tablas ni migraciones. BFF proyecta allowlist; DTO → mapper puro →
dominio → hook con sesión/scope/rango → UI. Cambio de scope/sesión no conserva
datos de la consulta anterior; AbortSignal y error/empty/reintento explícito.

## Aceptación / DoR / DoD

DoR: fuentes y semántica anteriores verificadas; decisión delegada registrada;
C2 y lectura Stay disponibles; IMP-WEB-0908 conserva WEB-3/WEB-2, dependencias
IMP-WEB-0017/0905 y su XLSX sin modificación. La entrega on-books existente
acredita el transporte/shell usado; no acredita esta nueva métrica.

QA obligatorio: multi-room, RESERVED/IN_HOUSE y estados excluidos, padre cancelado,
límites inclusivos arrival/departure, cambio de fechas/estado, cero real,
propiedades GTQ/USD y DST, property ajena, ALL con/sin permiso, permiso comercial
solo lectura, revocación de membership/sesión, filtros estrictos, 366/367 y
50 000/50 001 filas, error de fuente, DTO inválido, orden y OpenAPI real.

DoD: tests SQL/HTTP/contrato, BFF/mapper/service/hook/UI PASS; Backend verify y
Web check PASS; Docker Backend activo sin mocks, RECEPCIÓN y ALL autorizado;
documentación y Postman coherentes. Mantener EN_QA mientras no se cumpla el QA
manual exigido por Backend AGENTS; distinguir smoke técnico de aceptación manual.
