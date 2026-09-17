# 05 — Domain and Contract Rules

Android comparte semántica global:
- Reservation;
- Stay;
- GuestAccount;
- Payment;
- Folio;
- Reward;
- Promotion;
- Consent;
- Property scope.

DTO Android puede diferir en implementación, no en significado.

No inventar enum distinto sin DEC.

## IMP-AND-0101 — Stay contracts locales

`ReservationStay` conserva `reservationId`, room type, room nullable, arrival, departure y status. El DTO de Sprint 1 existe exclusivamente como forma de mock y pasa por un mapper puro antes de alcanzar el modelo de dominio.

No hay endpoint ni contrato API confirmado en esta tarea. `StayStatus` se mantiene opaco: no se declaran valores de negocio hasta que exista un contrato cross-app aprobado.
