# BE-010B — Contrato HTTP aprobado para On-books diario

**Estado:** APPROVED para Backend por el usuario (2026-10-04), con las
precisiones incorporadas abajo. La revisión de semántica con BD2/BD3 y la
validación del BFF por el owner Web siguen pendientes antes de integración.

## Ruta Backend

```text
GET /api/v1/reports/on-books/daily?from=2035-01-01&to=2035-01-03&propertyId=<UUID>
GET /api/v1/reports/on-books/daily?from=2035-01-01&to=2035-01-03&scope=ALL_PROPERTIES
```

`from` y `to` son **noches de estancia locales**, ambas inclusivas. Se exige
exactamente uno de `propertyId` o `scope=ALL_PROPERTIES`; no hay scope global
implícito. Rango máximo: 366 noches. Máximo de filas solicitadas:
50 000 (`número de properties autorizadas × noches inclusivas`). El segundo modo requiere
`MULTI_PROPERTY_READ` además de `COMMERCIAL_MANAGE`; ambos exigen sesión Staff
activa. Una propiedad fuera de la sesión recibe 403 indistinguible de un UUID
inexistente no autorizado. Guest o ausencia/token inválido reciben 401. Filtros
inválidos o rango excesivo reciben 400 antes de ejecutar SQL del reporte.
La autenticación y resolución de permisos/scope pueden ocurrir antes. Se
rechazan ambos filtros juntos o ausentes, scopes desconocidos, UUID/date
malformados, `from > to`, parámetros duplicados/desconocidos, `organizationId`
y listas de propiedades. `ALL_PROPERTIES` significa solo las propiedades
autorizadas en la sesión Staff activa; no amplía el alcance por input cliente.

## Respuesta

```json
{
  "calculatedAt": "2035-01-01T12:00:00Z",
  "rows": [
    {
      "propertyId": "00000000-0000-4000-8000-000000000001",
      "timezone": "America/Guatemala",
      "currency": "GTQ",
      "stayDate": "2035-01-01",
      "physicalRooms": 3,
      "outOfOrderRooms": 1,
      "availableRooms": 2,
      "onBooksRooms": 2,
      "onBooksPercent": 100.00,
      "unavailableReason": null
    }
  ]
}
```

Las filas van ordenadas por `propertyId ASC`, `stayDate ASC` por Backend; una property autorizada
sin habitaciones sigue devolviendo filas con ceros. Si `availableRooms = 0`,
`onBooksPercent = null` y `unavailableReason = "NO_AVAILABLE_ROOMS"`. El
porcentaje es `(onBooksRooms / availableRooms) × 100`, redondeado a dos
decimales, y puede superar 100 si hay sobreventa real; no se trunca. JSON no
garantiza ceros finales. `availableRooms = physicalRooms - outOfOrderRooms`;
OOS no descuenta. Esta es una
**fotografía del estado actual**, no ocupación realizada ni reconstrucción del
pasado ni capacidad histórica. La consulta de fechas pasadas no reconstruye
qué estaba on-books en aquella fecha de corte. `calculatedAt` es un `Instant`
UTC de generación/cálculo de la respuesta, sin garantía transaccional as-of
de toda la base. `from` y `to` son stay dates locales inclusivas, estancias
usan `[arrival, departure)` y `business_date` no interviene. No incluye
identidad de huéspedes, precios ni ingresos. Llegadas y
salidas quedan fuera de la primera ruta mientras BD3 confirma su semántica.
Respuesta: `Cache-Control: private, no-store`.

## BFF Web propuesto

El consumidor Web privado expondría, sujeto a validación del owner Web,
`GET /api/v1/private/reports/on-books/daily` con los mismos filtros y cookies
Staff `HttpOnly`. El BFF transforma la sesión Staff a Bearer interno, nunca
serializa tokens al navegador y conserva la semántica HTTP del Backend
(`400/401/403/200`) con errores públicos estables, sin detalles internos.
Debe usar `Cache-Control: private, no-store` y lectura dinámica sin caché de
Next.js. Su dueño Web debe aprobar naming/DTO/Mapper; esta tarea solo crea
la ruta Backend. Android requiere contrato de transporte propio si consume el
reporte; no se copia la cookie Web.

## Persistencia, scope y pruebas exigidas

El servicio interno resuelve sesión, permiso y `PROPERTY`/`ALL_PROPERTIES`
antes de SQL. La consulta filtra `properties.organization_id` e IDs autorizados,
agrega habitaciones, OOO únicos activos y `ReservationStay` elegibles
(`RESERVED`/`IN_HOUSE`, padre no `CANCELLED`) por noche `[arrival, departure)`.
OOS no descuenta. La fecha de fila procede de la estancia, no del cierre
`business_date`. No se crean nuevas tablas ni se modifican migraciones
aplicadas. Véanse [C7](33_BD1_REPORTING_CONTRACT_C7_PROPOSAL.md) y
[property scope](../../docs/05_PROPERTY_SCOPE.md).

Antes de integrar HTTP: pruebas 401/403/400 y rol Gerencia positivo, Guest
negativo, scope fabricado, dos properties, sesión revocada, rango 366/367,
denominador cero, multi-room, OOO duplicado/OOS, padre cancelado y comparación
ATS. Cada ruta implementada se agregará a
[Postman BD1](../postman/BD1-Backend-APIs.postman_collection.json).

## Revisión pendiente

1. Confirmar con BD2/BD3 que la semántica de OOO/stays coincide exactamente con ATS y que
   este primer reporte no promete capacidad histórica.
2. Validar con Web la ruta BFF y el mapeo de sesión/errores.

El CSV autorizado por C7-D09 queda para otro incremento después de estabilizar
la lectura HTTP; no se publica exportación en esta rama.
