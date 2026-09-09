# concierge

## Owner

WEB-3

## Reviewer(s)

WEB-2

## Scope

Internal concierge operations and reception coordination.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

May consume intentional public APIs from: messaging, reservations, guests.

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

Cross-module dependencies use `@/modules/concierge`, never paths such as `@/modules/concierge/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` governs WEB-3's future tasks for this module. This shell does not mark any task completed.

## Figma / Documentation

Private 03 Operations. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.
