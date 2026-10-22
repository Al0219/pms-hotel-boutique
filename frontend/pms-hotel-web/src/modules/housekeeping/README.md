# housekeeping

## Integración real — 2026-10-21

José implementa frontend y backend de la primera entrega autorizada de
Housekeeping. `/housekeeping` usa el BFF Staff y PROPERTY de sesión con
OPERATIONS_MANAGE: tablero, seguimiento explícito, limpieza/inspección/rechazo
con motivo y DND. No usa pms.test ni exige activar mocks para ese recorrido.
Contrato aprobado: `backend/docs/51_STAFF_HOUSEKEEPING_CONTRACT.md` en la raíz.
Estado y QA: `frontend/pms-hotel-web/docs/64_STAFF_HOUSEKEEPING_REAL_QA.md`.

Se conservan componentes/modelos provisionales previos para escenarios aislados;
no confirman otros endpoints. Discrepancias FO/HK y Turndown/Pickup quedan fuera
de esta primera integración. Los exports de mapeo real son una API deliberada
para la proyección segura del BFF; los DTOs/transporte permanecen internos.
Las reglas de Structure Freeze que siguen describen la creación histórica del
shell; no sustituyen la autorización y contrato de este incremento.

## Owner

WEB-3

## Reviewer(s)

WEB-4

## Scope

Housekeeping lifecycle presentation and readiness status.

## Does not own

Related domain internals owned by other modules. This module does not own another module's DTOs, mappers, services, hooks, components, or business rules.

## Dependencies

May consume intentional public APIs from: rooms, maintenance.

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

Cross-module dependencies use `@/modules/housekeeping`, never paths such as `@/modules/housekeeping/service/*`, `dtos/*`, `mappers/*`, `hooks/*`, or `components/*`.

## Backlog

The canonical `docs/Backlog_Implementacion_PMS_V1.xlsx` governs WEB-3's future tasks for this module. This shell does not mark any task completed.

## Figma / Documentation

Private 03 Operations. Consult relevant global domain documents, Web architecture, module boundaries, ownership, and domain-specific Web documentation. No Figma Node ID is invented here.
