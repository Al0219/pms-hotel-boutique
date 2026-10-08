# permissions

## Owner

WEB-2

## Reviewer(s)

WEB-3

## Scope

Permission presentation and role capability boundaries.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

May consume intentional public APIs from: security, staff, properties.

## MUST

- Respect global domain rules, explicit property scope when applicable, and the approved layered architecture.
- Expose cross-module capabilities only deliberately through `index.ts`.
- Follow the module owner and reviewer requirements in the implementation backlog.

## MUST NOT

- Extend beyond the approved frontend/mock scope without authorization.
- Deep-import another module's internals.
- Redefine business semantics owned by another module.

## Expected internal structure

Implemented layers for the explicitly authorized task IMP-WEB-0901:

```text
dtos/
mappers/
model/
service/
hooks/
components/
index.ts
```

These layers implement the Private 07 mock contract approved by the user on 2026-09-24.

## Public API

Cross-module dependencies use `@/modules/permissions`, never paths such as `@/modules/permissions/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` retains its recorded states; this implementation does not modify the workbook.

## Private 07 implementation

- Routes: /seguridad/roles.
- Public UI API: RolesPage.
- Contract: `../../../docs/32_PRIVATE_07_MOCK_CONTRACT_PROPOSAL.md`.
- Flow: Service / DTO / Mapper / Domain / TanStack Query / UI; MSW owns fixture persistence.
- Only fictitious data is stored under versioned `pms:private-07:*` keys, separate from Guest Auth.
- No Backend authentication, permission enforcement, real MFA or actual DSR processing.
- Tests: mapper cases and `src/test/private-07.test.tsx` journeys.

## Figma / Documentation

Private 07 Security / Privacy / Access. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.
