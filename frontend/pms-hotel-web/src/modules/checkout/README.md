# checkout

## Owner

WEB-1

## Reviewer(s)

WEB-4 / WEB-2

## Scope

Guest checkout composition, booking-guest data, guarantee, and confirmation composition.

### Initial guest data UI — 2026-10-05

The user-authorized selection review now links to `/reserva/checkout`.
`PublicGuestDataPage` consumes Booking's public review hook, requires a current
selection, and reviews contact fields locally without creating an account,
profile, reservation or payment. Fields remain in component memory only.
The original Structure Freeze below describes the baseline shell; this limited
UI delivery is documented in `docs/41_PUBLIC_BOOKING_SELECTION_REVIEW.md`.
Payment, occupants per stay, final admission and confirmation remain pending.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

May consume intentional public APIs from: booking, payments, reservations, auth.

## MUST

- Respect global domain rules, explicit property scope when applicable, and the approved layered architecture.
- Expose cross-module capabilities only deliberately through `index.ts`.
- Follow the module owner and reviewer requirements in the implementation backlog.

## MUST NOT

- Implement a feature, API contract, DTO, mapper, service, hook, or UI in this Structure Freeze.
- Deep-import another module's internals.
- Redefine business semantics owned by another module.

## Expected internal structure

When a READY task requires it, this module may grow to:

```text
dtos/
mappers/
model/
service/
hooks/
components/
index.ts
```

Do not create these folders before then.

## Public API

Cross-module dependencies use `@/modules/checkout`, never paths such as `@/modules/checkout/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` governs WEB-1's future tasks for this module. This shell does not mark any task completed.

## Figma / Documentation

Public 04 Checkout and confirmation. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.
