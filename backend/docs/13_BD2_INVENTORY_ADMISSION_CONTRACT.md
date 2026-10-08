# BD2-005 — Admisión transaccional de inventario

Este contrato interno implementa la parte BD2 de Fase 5. No cambia
`AvailabilityPort`, el GET de disponibilidad ni los contratos de Auth.

## Puerto

```java
<T> T InventoryAdmissionPort.admit(
    UUID propertyId, List<InventoryDemand> demand, Supplier<T> persistence);
```

`InventoryDemand(roomTypeId, dates, units)` solicita unidades positivas por cada
noche local `[arrival, departure)`. Demandas solapadas del mismo tipo se suman;
estancias adyacentes no se suman en una misma noche. Cada stay de booking aporta
una demanda de una unidad; no se cuenta Reservation como inventario vendido.

El llamante debe validar sesión, permisos y propiedad antes de invocar el puerto.
BD2 bloquea las filas existentes de RoomType dentro de esa propiedad mediante
`SELECT ... FOR UPDATE`, en orden estable `UUID.compareTo` para bookings multi-room.
Comprueba después físico - OOO - stays consumidores contra toda la demanda.
OOS no resta; el RatePlan no tiene stock. Si falta capacidad, lanza
`InventoryExhaustedException` sin ejecutar el callback.

El callback escribe exactamente las estancias solicitadas en la misma
transacción. No debe publicar efectos externos ni usar otra transacción,
`REQUIRES_NEW`, ejecución asíncrona o una conexión independiente. No es un hold
persistente: si el callback no escribe consumo, no se reserva capacidad.

## Transacción y límites

Se requiere una transacción writable `READ_COMMITTED`. El servicio la inicia si
no existe o participa en la del llamante. Rechaza transacciones read-only o con
aislamiento explícito distinto. Antes de consultar ATS hace flush de JPA para
observar consumo previo pendiente dentro de la misma transacción. Los locks se
liberan al commit/rollback de la transacción exterior, no al retornar el puerto.
Un fallo de persistencia revierte la admisión y sus escrituras.

El bloqueo es por propiedad/tipo y serializa incluso rangos de noches disjuntos
del mismo tipo: compromiso simple para el MVP. No agrega tablas, contadores de
stock, nuevas dependencias ni cambia migraciones aplicadas.

**La garantía aplica únicamente a escritores que participen en el protocolo.**
El booking BD3 usa este protocolo desde `faa7876`, integrado en main `345481b`.
`addStay` fuera de booking, extensiones, reactivaciones, cambios de tipo,
retiro de Rooms o alta OOO no quedan protegidos por el mero hecho de existir
este bean. Cada escritor que pueda aumentar demanda o reducir capacidad debe
coordinar el mismo bloqueo y su validación. No se declara sobreventa cero para
todo el sistema mientras existan rutas que lo evadan.

## Conexión BD3 implementada

`ReservationBookingServiceImpl.createBooking` construye una demanda por stay y
llama a `InventoryAdmissionPort.admit` dentro de su transacción. El callback
`persistBooking` crea perfil, Reservation, stays, ocupantes y AuditTrail en esa
misma transacción. El rechazo de admisión se traduce a `ReservationBookingException`
con `InventoryExhaustedException` como causa. El precheck se conserva, pero la
suma de demandas y la comprobación protegida por locks las realiza la admisión.

En el backend completo se inyecta el motor real. BD3 mantiene sus fixtures
controlables únicamente en tests y prueba el contrato opcional sin puerto en
una prueba unitaria separada, sin cargar el contexto completo.

## Validación

`InventoryAdmissionIntegrationTests` verifica ATS real, locks PostgreSQL y
transacciones: una unidad consumida, agotamiento sin escrituras, multi-room,
noches adyacentes, rollback/reintento, cancelación, OOO/OOS y scope/aislamiento.
La concurrencia se prueba con dos conexiones y comprobación del lock en
`pg_stat_activity`, incluyendo una transacción exterior que todavía no confirma.

Las tablas de contrato de BD3 usadas por esta suite viven en un schema aleatorio
exclusivo del test. No sustituyen las tablas productivas ni equivalen a ejecutar
el servicio de booking BD3. La integración real se valida separadamente contra
una copia que conserva sus fuentes y migraciones de `origin/main`.

`InventoryBookingIntegrationTests` completa la validación con el servicio de
booking BD3 real y todo el changelog productivo, en un schema exclusivo de la
suite. Verifica consumo de una unidad, cancelación del padre, demanda solapada,
noches adyacentes, rollback tras fallo de ocupante, OOO/OOS y dos bookings reales
por la última unidad. Comprueba en PostgreSQL que el segundo espera el lock hasta
el commit exterior del primero y luego se rechaza sin escrituras parciales.
