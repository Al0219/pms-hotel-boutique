# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0105

## Transporte / Valet

**Tarea:** `IMP-AND-0105 — Valet/Parking`  
**Estado del contrato:** `APPROVED`  
**Autoridad visual:** Figma `239:197 — MOB-11 — Transporte / Valet` y `244:132 — MOB-11 — Vehículo solicitado`  
**Navegación:** `/valet` dentro de Guest Navigation V3  
**Reviewer:** `WEB-3`  
**Dependencia funcional:** `IMP-AND-0102` completada  
**DoR objetivo:** `Valet frontend/mock contract approved`

---

## 1. Propósito

Definir el contrato frontend/mock mínimo para implementar Transporte / Valet completamente sin Backend, utilizando dummy/local data.

Flujo:

```text
src/data/mocks/valet/
→ mock boundary
→ fixture DTO
→ mapper
→ domain
→ TanStack Query / Mutation
→ UI
```

Este contrato no es API Backend y no define HTTP, persistencia, IDs de servidor, pagos, Folio real ni estados operativos del hotel.

---

## 2. Autoridad Figma confirmada

### Estado base

`239:197 — MOB-11 — Transporte / Valet`

Copy y datos visibles:

```text
Transporte y valet
Movilidad durante tu estadía

Mi vehículo
Toyota Corolla · Gris
Placa registrada
Espacio P03 · Llave Valet #14

Solicitar mi vehículo
Tiempo estimado de entrega: 8–12 min
Solicitar ahora

Traslado al aeropuerto
Salida sugerida · 31 ago · 08:00
Vehículo privado · hasta 3 pasajeros
Q 220

Los cargos aprobados se agregan automáticamente a tu folio.
```

### Solicitud exitosa

`244:132 — MOB-11 — Vehículo solicitado`

Copy visible:

```text
✓ Solicitud enviada
Tu vehículo está siendo preparado.
Tiempo estimado · 8–12 min
Solicitud VAL-0148
```

La referencia `VAL-0148` se trata como texto de presentación dummy y no como `requestId` Backend.

---

## 3. Alcance funcional

`IMP-AND-0105` incluye:

1. mostrar el vehículo dummy asociado a la experiencia;
2. mostrar información visual de estacionamiento/llave valet;
3. mostrar tiempo estimado de entrega como texto;
4. permitir `Solicitar ahora`;
5. ejecutar una mutation mock;
6. impedir double submit mientras esté pending;
7. mostrar estado exitoso según `244:132`;
8. permitir error/offline/retry mediante mock scenarios;
9. mostrar la tarjeta informativa de traslado al aeropuerto.

### El traslado al aeropuerto es informativo en esta tarea

En `239:197`, el botón `Reservar` existe pero está oculto.

Por tanto:

- el contrato incluye los textos visibles de la tarjeta;
- `IMP-AND-0105` **no crea una mutation de reserva de traslado**;
- no se habilita el botón oculto;
- no se crean cantidad de pasajeros, fecha editable, payment ni booking.

Una tarea futura puede ampliar esa capacidad si existe autoridad explícita.

---

## 4. Contrato frontend/mock propuesto

```ts
export interface ValetVehicleFixtureDto {
  fixtureKey: string;
  vehicleDisplayText: string;
  registrationText: string;
  parkingDetailText: string;
  estimatedDeliveryText: string;
}

export interface AirportTransferFixtureDto {
  title: string;
  departureText: string;
  vehicleDetailText: string;
  priceText: string;
}

export interface ValetScreenFixtureDto {
  vehicle: ValetVehicleFixtureDto;
  airportTransfer: AirportTransferFixtureDto;
  folioNoticeText: string;
}

export interface RequestValetVehicleFixtureInput {
  vehicleFixtureKey: string;
}

export interface RequestValetVehicleFixtureResult {
  vehicleFixtureKey: string;
  requestReferenceText: string;
}
```

---

## 5. Semántica

### `fixtureKey`

Identidad técnica local para fixture, mutation y tests.

No es ID Backend.

### `vehicleDisplayText`

Texto visual completo:

```text
Toyota Corolla · Gris
```

No obliga a separar `make`, `model`, `color` mientras el frontend no lo necesite.

### `registrationText`

Texto visual:

```text
Placa registrada
```

No es enum ni status Backend.

### `parkingDetailText`

Texto visual:

```text
Espacio P03 · Llave Valet #14
```

No se divide en `parkingSpace`, `valetKeyId` ni campos Backend.

### `estimatedDeliveryText`

Texto de presentación:

```text
8–12 min
```

No representa SLA contractual ni cálculo de tiempo real.

### `priceText`

Texto de presentación:

```text
Q 220
```

No se transforma en amount/currency/tax.

### `folioNoticeText`

Copy informativo de Figma.

No significa que el frontend haya escrito realmente un cargo en Folio.

### `requestReferenceText`

Texto visual de success:

```text
VAL-0148
```

No es un ID Backend.

---

## 6. Domain mínimo

```ts
export interface ValetVehicle {
  key: string;
  displayText: string;
  registrationText: string;
  parkingDetailText: string;
  estimatedDeliveryText: string;
}

export interface AirportTransferInfo {
  title: string;
  departureText: string;
  vehicleDetailText: string;
  priceText: string;
}

export interface ValetScreen {
  vehicle: ValetVehicle;
  airportTransfer: AirportTransferInfo;
  folioNoticeText: string;
}

export interface ValetRequestResult {
  vehicleKey: string;
  requestReferenceText: string;
}
```

UI consume Domain, no DTO.

---

## 7. Mapper

Debe:

```text
fixtureKey → key
vehicleDisplayText → displayText
resto de textos → preservar
```

No debe:

- parsear marca/modelo/color;
- parsear P03;
- parsear #14;
- convertir precio;
- convertir ETA a minutos;
- crear status de operación;
- inventar reservation/stay/property IDs.

---

## 8. Dummy dataset

Ubicación:

```text
src/data/mocks/valet/
```

Fixture conceptual:

```ts
{
  vehicle: {
    fixtureKey: "valet-vehicle-primary",
    vehicleDisplayText: "Toyota Corolla · Gris",
    registrationText: "Placa registrada",
    parkingDetailText: "Espacio P03 · Llave Valet #14",
    estimatedDeliveryText: "8–12 min"
  },
  airportTransfer: {
    title: "Traslado al aeropuerto",
    departureText: "Salida sugerida · 31 ago · 08:00",
    vehicleDetailText: "Vehículo privado · hasta 3 pasajeros",
    priceText: "Q 220"
  },
  folioNoticeText:
    "Los cargos aprobados se agregan automáticamente a tu folio."
}
```

Mutation success conceptual:

```ts
{
  vehicleFixtureKey: "valet-vehicle-primary",
  requestReferenceText: "VAL-0148"
}
```

---

## 9. Query

La lectura mock debe poder representar:

- loading;
- data;
- generic error;
- offline (`NetworkError`).

No:

- NetInfo;
- polling real;
- persistencia local;
- WebSocket;
- background sync.

---

## 10. Mutation de solicitud

Input:

```ts
RequestValetVehicleFixtureInput
```

Result:

```ts
RequestValetVehicleFixtureResult
```

Flujo:

```text
Solicitar ahora
→ pending
→ mock boundary
→ success/error/offline
```

### Pending

- botón disabled funcionalmente;
- no segundo submit;
- no success optimista.

### Success

Usar `244:132`:

```text
✓ Solicitud enviada
Tu vehículo está siendo preparado.
Tiempo estimado · 8–12 min
Solicitud VAL-0148
```

`Tu vehículo está siendo preparado.` es copy de presentación de la simulación frontend.

No debe interpretarse como confirmación operativa real del hotel mientras no exista Backend.

### Error

Retry manual para la misma selección/vehículo.

### Offline

`NetworkError` → mensaje offline + retry manual.

No cola, sync ni reenvío automático.

---

## 11. Navegación

Route:

```text
/valet
```

Debe reutilizar `GuestNavigationShell`.

Cuando `IMP-AND-0105` se implemente después de Chat:

```text
Servicios enabled
Chat      enabled
Valet     enabled
Cuenta    disabled
```

En `/valet`:

```text
Valet = selected
```

No copiar el active-tab visual incorrecto que pueda aparecer en el frame Figma.

---

## 12. Folio

El copy:

```text
Los cargos aprobados se agregan automáticamente a tu folio.
```

puede mostrarse porque es autoridad visual.

Pero `IMP-AND-0105` no implementa:

- Folio real;
- charge creation;
- payment;
- tax;
- approval Backend;
- accounting;
- invoice.

No debe existir una mutation adicional de Folio.

---

## 13. Campos deliberadamente excluidos

```text
vehicleId
guestId
stayId
reservationId
propertyId
parkingSpaceId
valetKeyId
requestId Backend
status enum
requestedAt
readyAt
deliveredAt
etaMinutes
make
model
color
plateNumber
amount
currency
tax
folioId
paymentId
airportTransferBookingId
passengerCount
```

También fuera:

- múltiples vehículos;
- edición de vehículo;
- registro de placa;
- cancelación;
- tracking en tiempo real;
- push notifications;
- geolocalización;
- reserva de traslado;
- pagos.

---

## 14. Pruebas obligatorias

1. Vehículo dummy visible.
2. Copy `Toyota Corolla · Gris`.
3. `Placa registrada`.
4. parking detail.
5. ETA.
6. tarjeta traslado.
7. `Q 220` permanece texto.
8. mapper DTO → Domain.
9. UI sin DTO.
10. UI sin fixtures.
11. query loading.
12. query generic error.
13. query NetworkError → offline.
14. `Solicitar ahora`.
15. pending.
16. CTA disabled pending.
17. double submit bloqueado.
18. no optimistic success.
19. success según `244:132`.
20. requestReferenceText visible.
21. generic mutation error.
22. retry error.
23. mutation NetworkError → offline.
24. retry offline.
25. no mutation de traslado.
26. GuestNavigationShell reutilizado.
27. `/valet` → Valet activo.
28. Services/Chat enabled.
29. Cuenta disabled.
30. regresión Stay/Services/Chat/navigation.

---

## 15. Futuro Backend

Posteriormente:

```text
ValetMockService
→ ValetApiService
```

Los DTO Backend podrán diferir.

Los textos dummy no deben fijar:

- IDs;
- statuses;
- ETA model;
- parking schema;
- payment/Folio contract.

---

## 16. Decisiones aprobadas para este contrato

La aprobación cubre:

1. vehículo como bloque de textos de presentación;
2. `priceText` sin estructura financiera;
3. traslado al aeropuerto informativo, no reservable en 0105;
4. mutation solo para solicitar vehículo;
5. `VAL-0148` como texto dummy, no Backend ID;
6. success `244:132`;
7. error/offline con retry manual;
8. `/valet` activa Valet y no duplica shell.

Como resultado de esta aprobación:

```text
IMP-AND-0105
PENDIENTE → READY
```
