# 07 — Cross App Contracts

## Objetivo
Web, Android y Backend mantienen semántica compatible.

## No significa
Compartir literalmente las mismas clases.

## Conceptos comunes
- Property
- GuestAccount
- GuestProfile
- Reservation
- ReservationStay
- ReservationGuest
- Room
- Availability
- RatePlan
- Folio
- Payment
- Reward
- Promotion
- Consent
- AuditEvent

## Estados críticos
No inventar strings distintos sin decisión para:
- ReservationStatus
- StayStatus
- PaymentStatus
- FolioStatus
- HousekeepingStatus
- MaintenanceStatus
- GroupStatus
- IntegrationHealth

## Cambio API
1. actualizar contract doc;
2. backend;
3. DTO Web;
4. Mapper Web;
5. DTO Android;
6. Mapper Android;
7. tests.

## Regla
Un cambio de naming externo que no cambia semántica debe absorberse en DTO/Mapper, no propagarse innecesariamente a UI.
