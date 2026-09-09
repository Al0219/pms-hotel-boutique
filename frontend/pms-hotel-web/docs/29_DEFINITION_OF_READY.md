# 29 — Definition of Ready

Una tarea Web está READY si tiene, cuando aplique:
- ID;
- descripción;
- owner/reviewer;
- módulo;
- Figma/fuente;
- route;
- Acceptance Criteria;
- data needs;
- DTO real/provisional;
- permissions/property scope;
- remote states;
- dependencies;
- shared components;
- tests.

## Excepción de infraestructura
Para tareas puramente técnicas de Sprint 0 es válido:

`Route: N/A — infraestructura`

También puede no existir DTO/permission/property scope si la tarea no toca esos conceptos; debe quedar explícito como `N/A`, no asumido.

## Gate
Todas las dependencias deben estar `COMPLETADA` antes de pasar a READY, salvo cambio explícito aprobado en backlog.

Si falta información crítica: `BLOQUEADA / NEEDS CLARIFICATION`.
No implementar suponiendo.
