# properties

## Owner

WEB-2

## Reviewer(s)

WEB-4

## Scope

Property-scope presentation and authorized-property context.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

Consumes the Staff session public API from auth. Future metrics integration requires the intentional public APIs and review of availability/revenue (WEB-4).

## MUST

- Respect global domain rules, explicit property scope when applicable, and the approved layered architecture.
- Expose cross-module capabilities only deliberately through `index.ts`.
- Follow the module owner and reviewer requirements in the implementation backlog.

## MUST NOT

- Treat the mock property preference as Backend authorization.
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

The Private 09 correction now implements only the scope model and context/switcher components. It does not introduce a Backend API.

## Public API

Cross-module dependencies use `@/modules/properties`, never paths such as `@/modules/properties/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

Exports: PropertyProvider, PropertySwitcher, usePropertyScope, resolvePropertyScope and PropertyScope. Consumers must explicitly adopt the context; it does not rewrite requests of other modules.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` governs WEB-2's tasks. The user-authorized Private 09 correction is documented in `../../../docs/34_PRIVATE_09_FRONTEND.md`; the XLSX status is unchanged.

## Figma / Documentation

Private 09 Multi-property. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.
