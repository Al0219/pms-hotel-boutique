# BD2-004 — API Staff de disponibilidad

Alcance autorizado: Fase 4, consulta Staff privada; reutilizar la seguridad BD1
disponible. No publica búsqueda Guest ni modifica reservas.

`GET /api/v1/properties/{propertyId}/availability`

Parámetros obligatorios: `propertyId` y `roomTypeId` UUID; `arrival` y `departure`
fechas ISO `YYYY-MM-DD`, locales a la propiedad, con arrival < departure.
`roomTypeId`, `arrival` y `departure` se envían en query string.

Respuesta 200:

```json
{
  "propertyId": "3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d",
  "roomTypeId": "11111111-1111-4111-8111-111111111111",
  "arrival": "2026-11-01",
  "departure": "2026-11-03",
  "availableUnits": 2
}
```

`availableUnits` es el mínimo ATS de las noches `[arrival, departure)`, siempre
no negativo. Cero es una respuesta válida, no una reserva rechazada. No incluye
precios, no bloquea stock y no garantiza admisión concurrente. Las fechas locales
no son timestamps UTC; futuros timestamps de eventos siguen la regla UTC.

Autorización: JWT Staff válido y sesión activa; `RESERVATION_MANAGE` o
`COMMERCIAL_MANAGE` del catálogo C2. Los permisos se resuelven desde BD, no del
JWT. `PropertyScopeResolver.resolveProperty` comprueba la propiedad antes de
invocar ATS. Tokens Guest no habilitan acceso. No se añaden roles ni permisos.

La cadena de seguridad BD2 cubre únicamente esta ruta y reutiliza el filtro,
parser JWT y servicio de sesión BD1. El guard de método usa los servicios C2;
no depende de authorities granulares que BD1 todavía no publica en el filtro.
Las cadenas globales BD1 y las rutas Guest permanecen separadas.

Estados: 400 para parámetros/fechas inválidos, 401 para autenticación inválida,
403 para permiso o propiedad no autorizados, 404 para RoomType inexistente en
la propiedad autorizada. Los errores de dominio usan ProblemDetail sin SQL.

Esta ruta siempre consulta una sola propiedad. No interpreta `ALL_PROPERTIES`
como acceso global ni publica agregaciones de portfolio. La búsqueda privada
puede consultar cada propiedad autorizada usando su ID explícito; un endpoint
agregado requiere contrato propio y `resolveAllProperties` con C2.

Swagger: `/v3/api-docs` y `/swagger-ui/index.html`, esquema `bearerAuth` existente.
Web consume vía BFF Staff; Android usa su transporte autorizado. No se cambian
clientes ni se envían tokens Staff al JavaScript del navegador desde esta tarea.

Dependencia runtime: las tablas reales Reservation/ReservationStay de BD3 deben
estar integradas. Esta rama depende de Fase 3; no copia ni corrige fuentes BD3.
