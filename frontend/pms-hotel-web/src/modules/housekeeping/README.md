# housekeeping

## Housekeeping funcional COMPLETADA / PASS; UX Staff EN_QA visual (2026-10-26)

La solicitud del usuario autoriza una consulta de solo lectura que reutiliza
DataTable, Modal y el scope Staff de la página existente. La tarjeta superior
«Limpiezas solicitadas» cuenta OPEN/IN_PROGRESS del endpoint real; su modal
«Solicitudes de limpieza» muestra todos los estados, con Actualizar solicitudes.
Reemplaza la tabla fija inferior y mantiene una sola query por sesión/propiedad.
Abrir/cerrar no genera lecturas adicionales; actualizar refresca tabla y contador.
El modal conserva Escape, trampa de foco, retorno a la tarjeta y scroll propio.
Grid responsive: seis columnas desktop, tres tablet y dos móvil. El contador es
independiente de los estados físicos de limpieza de habitaciones. Contrato Backend58;
BFF GET /api/staff/housekeeping/requests con cookie Staff, DTO/mapper/hook propios,
sin polling nuevo ni transiciones sobre solicitudes o habitaciones. La query
vive fuera del refresco del tablero físico y cambia con sesión/propiedad.
El usuario confirmó el recorrido funcional Android → Firefox y persistencia
al reabrir Expo Go sin duplicados. QA visual de este ajuste pendiente en Firefox. Tests focales de tarjeta/modal/
tabla y composición21 PASS; typecheck Web, ESLint focal y diff-check PASS. La guía
Android41 describe el recorrido de datos compartido, cuyo contrato no cambia.

## Integración real — 2026-10-21

José implementa frontend y backend de la primera entrega autorizada de
Housekeeping. `/housekeeping` usa el BFF Staff y PROPERTY de sesión con
OPERATIONS_MANAGE: tablero, seguimiento explícito, limpieza/inspección/rechazo
con motivo y DND. No usa pms.test ni exige activar mocks para ese recorrido.
Contrato aprobado: `backend/docs/51_STAFF_HOUSEKEEPING_CONTRACT.md` en la raíz.
Estado y QA: `frontend/pms-hotel-web/docs/64_STAFF_HOUSEKEEPING_REAL_QA.md`.

Contrato52 agrega el export deliberado useStaffHousekeepingRooms, solo lectura,
para la composición app del tablero Habitaciones. GET admite RESERVATION_MANAGE
además de OPERATIONS_MANAGE; el módulo de gestión y POST/PUT no amplían permisos.
La limpieza actual no certifica preasignaciones futuras ni sustituye check-in.

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
