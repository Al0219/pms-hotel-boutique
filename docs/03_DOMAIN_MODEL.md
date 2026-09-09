# 03 — Domain Model Global

## Propósito
Fijar semántica común para Web, Android y Backend.

---

## Organization

Relación:
`Organization 1 -> N Property`

No asumir que Organization = Property.

---

## Property

Campos conceptuales:
- id
- name
- timezone
- currency
- fiscal settings
- business day settings
- operational settings

Muchos agregados operativos llevan property scope.

---

## GuestAccount vs GuestProfile

### GuestAccount
- autenticación;
- sesión;
- identidades externas;
- preferences de cuenta.

### GuestProfile
- identidad/contacto;
- puede existir sin cuenta;
- puede vincularse a Property mediante enlaces permitidos.

No fusionar automáticamente.

---

## Reservation

Campos conceptuales:
- id
- propertyId
- bookingGuestId
- status
- source/channel
- createdAt
- stays[]
- commercial snapshot

Una Reservation puede representar varias unidades.

---

## ReservationStay

Campos conceptuales:
- id
- reservationId
- roomTypeId
- roomId nullable
- arrival
- departure
- status
- occupants[]

No crear una Reservation por cada habitación de una reserva multi-room.

---

## ReservationGuest

Relaciona:
- reservationStayId
- guestProfileId
- role/occupant indicator

---

## Room / RoomType

Room = unidad física.
RoomType = producto/tipo vendible.

---

## Availability

No es una lista de Rooms.
Representa inventario vendible por:
- property;
- room type;
- date;
- restricciones/ajustes.

---

## RatePlan

Define reglas de precio.
No posee inventario físico.

---

## Folio

Puede existir por:
- huésped;
- empresa;
- master group.

Contiene cargos/movimientos.

---

## Payment

Mantiene lifecycle financiero:
- Authorization
- Capture
- Void
- Refund

Con referencias de provider.

---

## Company / Agency

Company:
- acuerdos por property;
- crédito;
- negotiated rates;
- direct bill.

Agency:
- contratos;
- comisión;
- vouchers.

---

## Group

Lifecycle:
INQUIRY -> TENTATIVE -> DEFINITE -> IN_HOUSE -> CLOSED

Relaciona:
- RoomBlock
- Pickup
- RoomingList
- MasterFolio

---

## Housekeeping

Lifecycle base:
DIRTY -> CLEAN -> INSPECTED

Overlays como DND/Turndown/Pickup no reemplazan el estado base.

---

## Maintenance

OT puede poner Room en OOO/OOS.
La resolución de OT no implica necesariamente sellable.

---

## Reward / Promotion

Reward:
beneficio/ledger.

Promotion:
regla de precio/eligibilidad.

No son lo mismo.

---

## Consent

Estructura conceptual:
- purpose
- channel
- status
- source
- timestamp
- version/evidence

---

## Integration

Propiedad/categoría/provider config.
Health, credentials/mappings según property.

---

## AuditEvent

Append-only.
Nunca editar historia para "corregir" el pasado.
