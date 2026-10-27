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

## C2 — Sesión Staff y scope

La sesión Staff integrada por BFF publica identidad, `roleCode`, permisos
vigentes y propiedades autorizadas. El contrato canónico está en
`backend/docs/09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`. Los fixtures de Web o
Android continúan siendo contratos de UI hasta que sus DTO/Mapper BFF se
implementen; no fijan nombres API ni permisos Backend.

## Room Service real — incremento autorizado EN_QA

[Contrato Backend60](../backend/docs/60_ROOM_SERVICE_REAL_MVP.md) y
[QA Android43](../frontend/pms-hotel-android/docs/43_ROOM_SERVICE_REAL_MVP_QA.md):
Room Service reutiliza ServiceRequest con categoría ROOM_SERVICE y estados
OPEN/IN_PROGRESS/DONE/CANCELLED. Guest solo propias OPEN/cutoff25min; Staff
OPERATIONS_MANAGE y propiedad gestiona el ciclo. Catálogo por propiedad y precios
GTQ/snapshots/totales de Backend, sin precios/identidad del cliente, pagos o folio.
Sin equivalencia entre solicitud y estado físico de habitación. Las reglas
frontend/mock previas permanecen disponibles solo en su modo explícito.
