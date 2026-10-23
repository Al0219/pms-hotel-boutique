# staff

## Owner

WEB-2

## Reviewer(s)

WEB-3

## Scope

Staff and personnel administration presentation.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

Consumes intentional public APIs from auth and properties; effective permission codes come from Backend. Shared EntityDataGrid/EntityListSurface own the presentation primitives.

## MUST

- Respect global domain rules, explicit property scope when applicable, and the approved layered architecture.
- Expose cross-module capabilities only deliberately through `index.ts`.
- Follow the module owner and reviewer requirements in the implementation backlog.

## MUST NOT

- Implement administrative mutations before their Backend contracts and endpoints exist.
- Deep-import another module's internals.
- Redefine business semantics owned by another module.

## Expected internal structure

Fase 2C established the authorized read workspace. Fase 3D-1 adds real inline email, role and property editing within its three grouped columns. Fase 3D-2 adds suspension and logical disable through contextual Access actions or a touch swipe, followed by explicit confirmation:

```text
dtos/
mappers/
model/
service/
hooks/
components/
index.ts
```

Reads and commands consume only the existing same-origin Staff BFF. Command DTO,
mapper, service and useStaffInlineEdit remain internal to this module. Commands
perform one fetch without the read helper's refresh/retry. One group per user is
edited at a time, with full membership replacement and one canonical version.
409 preserves drafts until explicit GET; uncertain writes remain blocked through
remount using an in-memory staff-admin lock cleared by centralized session cleanup.
No credential mutations, reactivation, physical deletion or fourth column. Status commands reuse the same coordinator, version and in-memory lock; a swipe only reveals actions and every status write requires explicit confirmation. Property names/options come from
the real authenticated Staff memberships. The opt-in PropertyProvider guard
confirms draft discard before voluntary scope changes and does not delay forced
identity/permission changes. Implementation and QA: docs/67_STAFF_ADMIN_INLINE_EDIT_QA.md and docs/68_STAFF_ADMIN_STATUS_UI_QA.md.

## Public API

Cross-module dependencies use `@/modules/staff`, never paths such as `@/modules/staff/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` governs WEB-2's future tasks for this module. 3D-1 is COMPLETADA with user QA acceptance; 3D-2 is COMPLETADA with manual QA PASS for suspension, disable, confirmations, desktop swipe and icons; unexecuted manual scenarios remain explicit in QA68. No XLSX state is changed. See QA65, QA67 and QA68 for their independent evidence and limits.

## Figma / Documentation

Private staff and personnel areas. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.
