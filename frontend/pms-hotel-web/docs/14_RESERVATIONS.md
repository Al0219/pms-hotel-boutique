# 14 — Reservations

Owner: WEB-3.
Dependencias: WEB-4 Availability/Folio; WEB-2 account history.

## Estructura
Reservation -> ReservationStay[] -> ReservationGuest[].

## Flujos

### Create/booking
Una reserva puede ser guest/auth/multi-room.

### Cancellation
Policy -> penalty/refund -> cancel -> release -> audit.

### No-show
Cutoff/policy -> allowed charge -> NO_SHOW -> release -> Night Audit.

### Waitlist
Availability found -> revalidate -> confirm -> waitlist converted.

### Room Move
Preserve Stay/Folio.
Room assignment changes.
HK updates.

### Extension
Revalidate availability/rate.
Update departure/calendar/inventory.

### Cross-property rebooking
Preview:
- rate confirmation;
- policy confirmation;
- destination availability revalidated.

Apply only when all gates PASS.
Source preserved if destination commit fails.

## UI
No inventar estado final antes de respuesta real.

## E2E ownership
E2E 06–10 y rebooking-related flows.
