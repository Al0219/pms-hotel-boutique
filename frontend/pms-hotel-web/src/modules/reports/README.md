# reports

## Owner

WEB-3

## Reviewer(s)

WEB-4 / WEB-2

## Scope

Reporting presentation without redefining source metrics.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

May consume intentional public APIs from: revenue, availability, properties, permissions.

## MUST

- Respect global domain rules, explicit property scope when applicable, and the approved layered architecture.
- Expose cross-module capabilities only deliberately through `index.ts`.
- Follow the module owner and reviewer requirements in the implementation backlog.

## MUST NOT

- Deep-import another module's internals.
- Redefine business semantics owned by another module.

## Current integration

`IMP-WEB-0908` uses the approved BE-010B daily on-books report through the
same-origin Staff BFF. `/reportes` accepts explicit dates and authorized
property scope. The former property KPI dashboard remains a provisional mock
and is not exported as the module's public UI.

The V3 Reporting catalog lists Operation, Finance, Compliance and Commercial
for authorized Staff. Only the daily on-books operation report executes against
Backend. `RESERVATION_MANAGE` or `COMMERCIAL_MANAGE` grants this read; other
categories and export/scheduling remain explicitly pending. No sample financial
metrics are presented as live data.

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

Cross-module dependencies use `@/modules/reports`, never paths such as `@/modules/reports/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` governs WEB-3's future tasks for this module. This shell does not mark any task completed.

## Figma / Documentation

Private 08 Reporting. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.
