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
for authorized Staff. Daily on-books and pending arrivals/departures execute
against Backend. `RESERVATION_MANAGE` or `COMMERCIAL_MANAGE` grants these reads; other
categories and scheduling remain explicitly pending. No sample financial
metrics are presented as live data.

Daily on-books CSV uses the approved BE-010A-CSV-01 contract, implemented in
BE-010B-CSV-01 through the Staff binary BFF. The download uses applied dates,
Backend metrics and transactional generation audit per authorized property.
Its technical and manual QA are tracked separately in
[`REPORTING_ON_BOOKS_CSV_QA.md`](../../../../../backend/docs/REPORTING_ON_BOOKS_CSV_QA.md).
Other CSVs and accounting exports still need their own contracts.

Current housekeeping uses the delegated approved BE-010A-HKCUR-01 contract.
It reads `rooms` and optional `hk_room_states` through Backend and Staff BFF,
separates untracked rooms from DIRTY, and labels DND as an overlapping flag.
Only OPERATIONS_MANAGE sessions see the action; ALL also requires
MULTI_PROPERTY_READ. No dates, financial metrics, historical activity or CSV.
The technical and manual QA gate is tracked separately in AlanPlan/Handoff.

Current maintenance is in QA under BE-010A-MTCUR-01. The deployed
Backend/BFF/Web path counts only OPEN and IN_PROGRESS orders with urgent,
unassigned, room-linked and common-area subsets. Backend focal tests,
live OpenAPI, Docker build and Staff OPERACIONES/GERENCIA smoke passed;
full suites and user manual QA remain open before task completion;
no historical maintenance or SLA is inferred from the current row.

Pending arrivals/departures use the delegated approved BE-010A-ARRDEP-01 contract
and a dedicated Staff BFF. Counts come from current Stay status and scheduled
local dates, with real zeros per property/day; they are not actual movement
timestamps or historical snapshots. No PII, financial numbers or CSV in this
report. Session, authorized property IDs and explicit dates partition the query;
membership changes cancel previous reads and prevent stale results.

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
