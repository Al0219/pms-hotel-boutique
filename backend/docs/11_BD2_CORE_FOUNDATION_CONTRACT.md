# BD2-001 — Cimientos y contrato interno de disponibilidad

Fecha: 2026-09-30. Alcance: Fase 1 autorizada en conversación por el usuario.
Las decisiones de esta entrega concretan ese plan; no publican endpoints REST.

## Persistencia

Se reutilizan `organizations` y `properties` de BE-003 sin editar su changeset.
BD2 agrega `002-management-002` en el módulo existente ServiceManagement.
La creación inicial por BD1 no obliga a duplicar Property ni a rehacer Auth.

Tablas nuevas:

- `room_types`: UUID, property, código, nombre, timestamps. Código único por propiedad.
- `rooms`: UUID, property, room type, código, timestamps. Código único por propiedad.
- `out_of_order_records`: UUID, property, room, tipo OOO/OOS, fechas locales
  `[start_date, end_date)`, motivo, actor Staff, creación y liberación opcional
  con actor/motivo. Un registro sin liberación es vigente; el tipo no es su lifecycle.
- `rate_plans`: UUID, property, room type, código, nombre, importe base en unidades
  menores BIGINT, moneda ISO y timestamps. Código único por property y room type.
  Esta base no define precios por fecha, impuestos ni restricciones comerciales.

Las FK compuestas garantizan que un Room, registro operativo o RatePlan no apunte
a otra propiedad. RatePlan referencia RoomType, nunca Room ni un stock propio.
No hay borrado en cascada. No se incluyen repositorios ni API de borrado.
Períodos superpuestos son posibles como historial; el motor deberá contar Rooms
distintos por noche, no sumar filas. Registrar/liberar un estado exigirá auditoría
en la fase de servicio; esta migración no implementa ese flujo.

## Dinero

`MonetaryAmount` es un valor inmutable propio, sin nueva dependencia. Se compone de
`MinorUnits` (long) y `Currency`. Los converters JPA convierten cada componente a
BIGINT y CHAR(3); un solo BIGINT no puede preservar importe y moneda.
La escala procede de la moneda: GTQ/USD usan centavos, JPY unidades y KWD milésimas.
Se rechazan fracciones no representables y overflow, sin redondeo implícito ni double.
La infraestructura admite importes con signo; el precio base de RatePlan exige >= 0.
El mapeo de entidades de Fase 2 utilizará ambos componentes, no descartará la moneda.

## AvailabilityPort para BD3

`int calculateATS(UUID propertyId, UUID roomTypeId, StayDateRange dates)`.

- `StayDateRange` exige arrival < departure y excluye el día de salida.
- Resultado: mínimo de unidades vendibles entre todas las noches del rango para
  ese RoomType/Property; no suma disponibilidad de noches ni cuenta Reservations.
- El resultado real requiere validar existencia y relación property/room type;
  no se define aquí un catálogo de errores API.
- Puerto interno de consulta: no reserva, no bloquea stock ni autoriza al llamante.
  Servicios Staff deben resolver permiso y `AuthorizedPropertyScope` antes de invocarlo.
  Un flujo público tendrá un contrato propio; no puede heredar privilegios Staff.
- No permite crear reservas atómicamente por sí solo. BD3 y BD2 deberán coordinar
  consumo de inventario, bloqueo/transacción e idempotencia antes de prometer cero
  sobreventa concurrente. ATS > 0 seguido de INSERT no ofrece esa garantía.
- El consumo real se acuerda con BD3 por ReservationStay y noche; no se supone que
  únicamente el estado CONFIRMED consume inventario.

`AvailabilityStubConfiguration`, en `src/test/java`, proporciona un bean fijo de 5
para pruebas BD3 con `@Import(AvailabilityStubConfiguration.class)`. Valida nulos
pero no consulta BD, autorización ni stock. No viene en el JAR productivo y no
habilita reservas reales. BD3 debe programar contra la interfaz y sustituirlo en
las pruebas de integración final. No se añade un bean falso al runtime normal.

## Reglas MVP y tiempo

El usuario define overbooking=0 y OOS sin descuento de ATS. OOO sí descuenta.
OOS se conserva como condición operativa; no elimina Room. Restricciones de venta
siguen aplicando cuando sus contratos estén definidos. La Fase 1 no calcula ATS.

Instantes de eventos se almacenan con TIMESTAMPTZ y se transportarán en UTC.
Las noches/períodos hoteleros usan DATE local y timezone de Property. Cuando un
caso requiera límites Instant se convertirán ambos extremos con esa zona, sin
asumir días de 24 horas. La utilidad corresponde a Fase 3.

## Fase 2 — Entidades y repositorios (BD2-002)

Se mapean Property, RoomType, Room, RatePlan y OutOfOrderRecord en
`modules/inventory/domain`, sin cambiar tablas ni changesets aplicados. Las
referencias entre agregados son UUID; las FK existentes garantizan integridad.
No se añaden cascadas JPA ni colecciones que carguen todo el inventario.
Los timestamps son Instant y los períodos son LocalDate. RatePlan usa los dos
converters de Fase 1 y reconstruye MonetaryAmount al leer; no tiene stock.

Los repositorios JpaRepository son infraestructura interna. Sus métodos
`findAllInScope`/`findByIdInScope` reciben AuthorizedPropertyScope y restringen
organización y IDs autorizados en SQL/JPQL antes de devolver datos. Los métodos
heredados sin scope (`findAll`, `findById`, `delete`, etc.) no son operaciones
autorizadas de aplicación ni deben usarse desde futuros servicios operativos.
La autorización de escrituras y la auditoría pertenecen a esos servicios futuros;
no se publica CRUD HTTP ni se implementa borrado/liberación en esta fase.

`RoomRepository.countPhysicalRooms` cuenta Rooms del RoomType/Property autorizado,
sin restar OOO/OOS. `OutOfOrderRepository.countOutOfOrderByNight` devuelve una fila
por noche de `[arrival, departure)` con `night` y `roomCount`. Cuenta Room distintos
con tipo OOO, sin liberación y con start_date <= night < end_date. Excluye OOS,
otros tipos/propiedades y registra cero en noches sin OOO para un tipo existente.
Un tipo inexistente o fuera de scope devuelve lista vacía; no se interpreta como
disponibilidad cero ni como permiso concedido. Un scope nulo falla cerrado.

No se suma el conteo de todo el rango: habitaciones afectadas en noches distintas
no deben descontarse juntas. Esta es una consulta de condiciones vigentes, no
una reconstrucción histórica del inventario anterior a la liberación.

### Validación de Fase 1

Migración completa contra PostgreSQL vacío y existente; FK cruzadas, importe
negativo y períodos inválidos rechazados; roundtrip exacto monetario y rango de
noches. No se declara implementada disponibilidad real ni prevención de sobreventa.

### Fase 3 — límites UTC de una estancia

`PropertyStayTime.toUtc` transforma los dos límites de `StayDateRange` con
`LocalDate.atStartOfDay(propertyZone).toInstant()`. Se usa la zona IANA cargada
desde Property y se conserva el límite de salida exclusivo. La duración UTC puede
ser de 23 o 25 horas durante cambios DST; no se suma una duración fija de 24 horas.
La conversión no reemplaza el cálculo de disponibilidad basado en noches locales.
El cálculo ATS consume `ReservationStay` por noche según los estados del ciclo
de vida confirmados en `origin/feature/bd3-foundation`: `RESERVED` e `IN_HOUSE`
cuentan como ocupación; `CANCELLED`, `NO_SHOW` y `CHECKED_OUT` liberan. Se
excluyen además las estancias cuyo padre Reservation esté `CANCELLED`, dado que
el servicio BD3 no propaga esa cancelación a cada estancia.
