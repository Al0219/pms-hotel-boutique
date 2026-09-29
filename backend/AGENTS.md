# PMS Hotel Boutique — Backend AGENTS

Backend no debe asumir que los DTO provisionales del Frontend son contratos definitivos.

Leer AGENTS/docs globales.

Antes de crear API:
- definir arquitectura Backend;
- confirmar dominios;
- confirmar auth;
- confirmar property scope;
- confirmar persistence;
- definir contratos;
- publicar contract docs.

## Seguimiento Backend

El control operativo de Backend usa `docs/AlanPlan.md` y
`docs/AlanHandoff.md`. No se agregan ni se actualizan tareas Backend en
`docs/Backlog_Implementacion_PMS_V1.xlsx`.

Antes de iniciar una tarea Backend:
- verificar su dependencia y DoR en `AlanPlan.md`;
- marcar el estado en el mismo archivo;
- registrar rama, evidencia y siguiente paso en `AlanHandoff.md`.

## MUST
- validar permisos backend;
- validar property scope backend;
- no confiar en UI;
- idempotency en operaciones que lo requieran;
- audit;
- no almacenar PAN/CVV.

## MUST NOT
- copiar modelos de UI como entidades persistence sin análisis;
- tratar GuestAccount=GuestProfile;
- tratar Reservation=Stay.
