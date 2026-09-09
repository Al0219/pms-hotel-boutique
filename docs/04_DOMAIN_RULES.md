# 04 — Domain Rules Globales

## Reservations

### MUST
- Reservation puede tener N ReservationStay.
- Occupants se asignan por stay.
- Booking guest puede ser distinto de occupants.
- Mantener historial de cambios.

### MUST NOT
- No crear una Reservation por habitación en multi-room.
- No calcular rooms sold contando Reservation.

---

## Cancellation

Pipeline:
`Policy -> Penalty/Refund -> Reservation/Stay status -> Inventory release -> Audit`

La penalización no se inventa en UI.

---

## No-show

Pipeline:
`Policy/cutoff -> allowed charge -> ReservationStay NO_SHOW -> inventory release -> Folio/Payment -> Night Audit`

---

## Waitlist

Disponibilidad encontrada ≠ reserva.

Al convertir:
1. revalidar availability;
2. revalidar rate;
3. crear Reservation;
4. marcar waitlist convertida.

---

## Room Move

Debe:
- conservar ReservationStay;
- cambiar room assignment;
- conservar Folio;
- no duplicar cargos;
- actualizar HK del origen/destino;
- registrar AuditTrail.

---

## Stay Extension

Antes:
- availability revalidated;
- rate revalidated.

Después:
- departure updated;
- inventory extended;
- calendar updated;
- folio impact coherent.

---

## Availability

ATS depende de:
- physical inventory;
- sold;
- OOO/OOS;
- restricciones;
- reglas de overbooking cuando existan.

No borrar Room.

---

## OOO/OOS

Deben conservar:
- reason;
- dates;
- status;
- actor;
- audit.

Liberar OOO/OOS requiere condición válida.

---

## Folio

Historial financiero:
append-only/compensatory.

No hard delete.

---

## Payment

No PAN/CVV.

Lifecycle preserva referencias:
AUTH -> CAPTURE -> REFUND/VOID según caso.

Partial refund no puede exceder captured amount.

---

## Promotions

Resolver stacking determinísticamente.

Si una promo pierde:
- rejected;
- reason;
- priority/conflict.

---

## Rewards

No contar CANCELLED/NO_SHOW como completed stays elegibles.

Ledger:
EARN / REDEEM / EXPIRE / REVERSE

Append-only.

---

## B2B

Guest, Occupant, Company, Agency y Payer pueden ser distintos.

Commission Agency no reduce guest price.

Direct Bill:
- acuerdo;
- property;
- crédito;
- aprobación.

---

## Groups

No saltos inválidos del lifecycle.

Cutoff/release no elimina habitaciones físicas.

Pickup de block != ATS total de property.

---

## Messaging

Solo Recepción responde externamente al huésped.

Operaciones:
- recibe task;
- trabaja;
- actualiza a Recepción.

---

## Integrations

Idempotency:
same key + same payload -> dedupe.

same key + different payload -> conflict.

Retry:
no duplicate entity;
no duplicate side effect.

---

## Night Audit

No cerrar si existen blockers requeridos.

Al cerrar:
- business date avanza;
- audit preserva fecha cerrada;
- validaciones quedan trazables.

---

## Multi-property

PROPERTY(propertyId) = una property autorizada.

ALL_PROPERTIES(authorizedPropertyIds) = set autorizado explícito.

Nunca fallback global.
