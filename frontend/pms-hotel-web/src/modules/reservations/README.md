# reservations

## Owner

WEB-3

## Reviewer(s)

WEB-4 / WEB-2

## Scope

Reservation Engine and Reservation-to-Stay operational presentation.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

May consume intentional public APIs from: stays, guests, availability, folio, payments,
booking (the exported room photo carousel for the scoped Staff detail presentation).

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

Cross-module dependencies use `@/modules/reservations`, never paths such as `@/modules/reservations/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` governs WEB-3's future tasks for this module. This shell does not mark any task completed.

## Figma / Documentation

Private 01 Reservation Engine. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.

## Authorized Staff detail increment — 2026-10-29

José authorized the IMP-WEB-0302 extension: scoped real contact with masked
documents, explicit stay occupants, notes/references and progressive disclosure.
Reuses the existing assignment, lifecycle and permission-gated folio capabilities.
The room carousel is reference imagery from the current catalogue; no physical
assignment, capacity or purchased rate is inferred from it.

Contract: [Backend64](../../../../../backend/docs/64_STAFF_RESERVATION_DETAILS_CONTRACT.md).
Validation/manual checklist: [Web76](../../../docs/76_STAFF_RESERVATION_DETAILS_QA.md).
Status EN_QA; technical validation passed, owner manual acceptance pending.
