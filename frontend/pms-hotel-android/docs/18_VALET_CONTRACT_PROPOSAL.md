# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0105

## Transporte / Valet

**Tarea:** `IMP-AND-0105 — Valet/Parking`  
**Estado del contrato:** `APPROVED`  
**Autoridad visual base:** Figma `239:197 — MOB-11 — Transporte / Valet` y `244:132 — MOB-11 — Vehículo solicitado`
**Navegación:** `/valet` dentro de Guest Navigation V3  
**Reviewer:** `WEB-3`  
**Dependencia funcional:** `IMP-AND-0102` completada  
**DoR objetivo:** `Valet frontend/mock contract approved`

**Extensión QA aprobada (2026-09-11):** El traslado se generaliza a `Traslado` para una simulación frontend/mock. Esta extensión sustituye la presentación fija de “Traslado al aeropuerto” y `Q 220`; no aprueba ni anticipa una API Backend, proveedor de rutas/datos de mapas ni integración de tarifas. `Ver ruta en Maps` queda aprobado exclusivamente como visualización externa.

---

## 1. Propósito y límites

Definir los datos y comportamientos mínimos para implementar Transporte / Valet con dummy/local data, bajo el flujo:

```text
src/data/mocks/valet/
→ mock boundary
→ fixture DTO
→ mapper puro
→ Domain
→ TanStack Query / Mutation
→ UI
```

No define HTTP, endpoints, persistencia, IDs de servidor, pagos, Folio real, estados operativos del hotel, geolocalización real, Google Maps SDK, Places API ni Routes API.

---

## 2. Alcance funcional aprobado

`IMP-AND-0105` incluye:

1. vehículo dummy, detalle/lista local y vehículo activo seleccionable;
2. solicitud mock de vehículo con pending, success, error, offline y retry manual;
3. configuración local de `Traslado`: destino, recogida condicional, fecha, hora y 1–3 pasajeros;
4. selección nativa local de lugares mediante el control accesible `📍`;
5. cálculo determinista de ruta y tarifa mock antes de reservar;
6. mutation mock de reserva con pending, success, error, offline y retry manual;
7. mostrar en success el traslado configurado, sin prometer su procesamiento real;
8. Guest Navigation V3 reutilizada con `/valet` activo;
9. `Ver ruta en Maps` como visualización externa secundaria de una ruta ya válida.
10. selección nativa de fecha/calendario y hora/reloj para programar el traslado.

No incluye API key, Google Maps SDK, Places/Routes API, GPS, geocoding, autocomplete, cola offline, sync en background, cargos al Folio, pagos ni persistencia.

---

## 3. Contrato fixture/mock

```ts
export type TransferDestinationType = 'HOTEL' | 'PLACE';

export interface TransferPlaceFixtureDto {
  fixtureKey: string;
  displayText: string;
  latitude: number;
  longitude: number;
  type: TransferDestinationType;
}

export interface TransferFixtureDto {
  title: string;
  defaultDestinationFixtureKey: string;
  defaultDateText: string;
  defaultTimeText: string;
  defaultPassengers: number;
}

export interface TransferRouteEstimateFixtureDto {
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
}

export interface TransferFareEstimateFixtureDto {
  estimatedPrice: number;
  estimatedPriceText: string;
}

export interface ReserveTransferFixtureInput {
  destinationType: TransferDestinationType;
  destinationPlaceFixtureKey: string;
  pickupPlaceFixtureKey?: string;
  dateText: string;
  timeText: string;
  passengers: number;
  routeEstimate: TransferRouteEstimateFixtureDto;
  fareEstimate: TransferFareEstimateFixtureDto;
}

export interface ReserveTransferFixtureResult {
  confirmationText: string;
  referenceText: string;
}
```

`fixtureKey` es identidad técnica local para fixtures, mutations y tests; nunca un ID Backend.

---

## 4. Semántica de Traslado

### Lugares locales

El dataset determinista incluye:

```text
Hotel
Aeropuerto Internacional La Aurora
Oakland Place
Centro Histórico
Cayalá
```

Cada lugar conserva `fixtureKey`, `displayText`, coordenadas dummy (`latitude`/`longitude`) y tipo semántico controlado `HOTEL | PLACE`. El tipo se compara como dato de dominio; la UI no deduce la regla comparando textos.

### Destino y punto de recogida

- Si el destino es `PLACE`, el origen simulado es Hotel y no se muestra ni se envía punto de recogida.
- Si el destino es `HOTEL`, el punto de recogida es obligatorio y debe ser un lugar `PLACE`, nunca Hotel.
- Cambiar destino a `HOTEL` limpia una recogida anterior; cambiarlo a `PLACE` elimina la recogida del input de reserva.

### Ruta y tarifa mock

`TransferRouteService` es una frontera reutilizable y local. Calcula una ruta determinista únicamente con las coordenadas fixture y puede simular loading, error u offline mediante `NetworkError`. No llama servicios externos.

`TransferFareCalculator` es un servicio puro de dominio. La regla frontend/mock aprobada es:

```text
Q 40 + Q 8/km
```

Produce `estimatedPrice` numérico para la capa Domain y `estimatedPriceText` para presentación. No representa precio real, impuesto, moneda contractual, precio final ni cargo de Folio.

### Success

La confirmación mock muestra destino, punto de recogida únicamente cuando aplica, fecha, hora, pasajeros, distancia, duración, tarifa estimada y referencia dummy. No muestra status Backend, pago, cargo, promesa de disponibilidad ni de procesamiento hotelero.

### Ver ruta en Maps

Cuando existe una ruta válida, una acción secundaria construye una URL de direcciones Google Maps con `api=1`, `origin` y `destination` codificados desde las coordenadas del `TransferPlace` seleccionado. No usa API key. Un boundary de `Linking` verifica `canOpenURL` y abre la URL; si falla, la UI muestra feedback discreto y conserva íntegros el destino, pickup, ruta y tarifa.

Maps solo visualiza externamente la ruta ya seleccionada. No selecciona lugares, no devuelve datos al PMS, no calcula distancia/precio y no es source of truth. La fuente de verdad sigue siendo:

```text
selector mock → TransferPlace → MockTransferRouteService → TransferFareCalculator
```

### Programación del traslado

La UI conserva internamente un `Date` combinado y deriva `dateText`/`timeText` solo para presentación y el contrato mock. No usa strings editables como fuente de verdad. Fecha usa calendario nativo; hora usa el `TimeWheelPicker` compartido en modo libre `00:00`–`23:59`, sin horarios operativos, disponibilidad ni slots comerciales. El valor fixture por defecto sigue siendo `08:00`.

La regla frontend/mock aprobada es `MIN_TRANSFER_LEAD_TIME_MINUTES = 30`:

```text
scheduledDateTime >= deviceClock.now + 30 minutes
```

La validación pura combina fecha y hora reales, cubre el cambio de día y se ejecuta al seleccionar y de nuevo inmediatamente antes de la mutation, incluido retry. Una selección inválida conserva destino, pickup, pasajeros, ruta y tarifa, muestra feedback accesible y bloquea la reserva. Cambiar programación no recalcula ruta ni tarifa.

Esta validación frontend es UX/simulación. Cuando exista Backend, este deberá aplicar la misma regla de forma autoritativa con reloj del servidor y rechazar reservas con menos de 30 minutos; no se define todavía ningún endpoint ni contrato Backend.

---

## 5. Domain y Mapper

El mapper transforma fixture DTO a modelos Domain (`ValetVehicle`, `TransferPlace`, `TransferInfo`, `TransferRouteEstimate`, `TransferFareEstimate` y `ReserveTransferInput`). Valida los campos obligatorios y produce `DomainMappingError` ante datos inválidos.

Debe:

```text
fixtureKey → key
activeVehicleFixtureKey → activeVehicleKey
TransferPlaceFixtureDto → TransferPlace
TransferFixtureDto → TransferInfo
```

No debe:

- inferir el tipo de destino desde `displayText`;
- usar coordenadas como GPS real;
- inventar `stayId`, `reservationId`, `propertyId`, request ID Backend o status;
- convertir la tarifa en pago, tax, currency contract o cargo de Folio;
- inventar endpoints o datos de proveedores de rutas/Places.

UI consume exclusivamente Domain y hooks; no consume DTOs, fixtures ni llama `fetch`.

---

## 6. Query, Mutation y estados

TanStack Query es la fuente de verdad de server/mock state.

```text
useValetScreen
useTransferRouteEstimate
useRequestValetVehicle
useReserveTransfer
```

La ruta se consulta solamente cuando los lugares requeridos están disponibles y son válidos. La reserva se habilita solo con ruta/tarifa disponibles y, para destino Hotel, con una recogida `PLACE` válida.

Pending deshabilita el CTA y bloquea doble submit. Success no es optimista. Error y offline conservan el draft y ofrecen retry manual. Offline es únicamente `NetworkError` simulado: no usa NetInfo, cola, sincronización ni retry automático.

---

## 7. Datos deliberadamente excluidos

```text
vehicleId
guestId
stayId
reservationId
propertyId
requestId Backend
status enum Backend
requestedAt
readyAt
deliveredAt
etaMinutes real
provider route ID
GPS location
amount/currency/tax contract
folioId
paymentId
```

Tampoco se implementa creación persistente de vehículos, cancelación, tracking en tiempo real, notificaciones push, mapas embebidos, pagos o folio.

---

## 8. Navegación y Folio

En `/valet`, `GuestNavigationShell` usa la regla V3:

```text
Servicios enabled
Chat      enabled
Valet     selected
Cuenta    disabled
```

El copy de Folio del frame puede mostrarse solo como texto informativo. Esta tarea no crea charges, payments, tax, invoices, accounting ni mutaciones de Folio.

---

## 9. Pruebas obligatorias

1. mapper fixture DTO → Domain y rechazo de campos inválidos;
2. UI sin DTOs, fixtures, fetch directo ni aritmética de tarifa;
3. lugares locales y tipo `HOTEL | PLACE`;
4. salida Hotel → lugar sin recogida;
5. regreso lugar → Hotel con recogida `PLACE` obligatoria;
6. ruta/tarifa deterministas y regla `Q 40 + Q 8/km`;
7. loading, error, offline y retry manual de la ruta;
8. pending, double submit, success, error/offline y retry manual de ambas mutations;
9. Guest Navigation V3 y regresión Stay/Services/Chat/navigation;
10. URL Maps codificada, `Linking` seguro, fallo no destructivo y Maps sin modificar selector/ruta/tarifa;
11. calendario/reloj nativos, Clock fijo en test, 30 minutos exactos, fecha futura, cruce de medianoche, revalidación pre-mutation/retry y conservación de formulario;
12. ninguna API de mapas, API Backend, pago o Folio.

---

## 10. Futuro Backend

En una etapa posterior, un servicio API podrá sustituir los mock services detrás de DTOs y mappers. Este contrato frontend/mock no obliga su forma: los campos, identificadores, cálculo de ruta/tarifa, reglas de disponibilidad y semántica de reserva deberán aprobarse entonces por separado.
