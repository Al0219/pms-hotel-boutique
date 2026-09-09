# PMS Hotel Boutique — Backend AGENTS

Backend todavía no debe asumir que los DTO provisionales del Frontend son contratos definitivos.

Leer AGENTS/docs globales.

Antes de crear API:
- definir arquitectura Backend;
- confirmar dominios;
- confirmar auth;
- confirmar property scope;
- confirmar persistence;
- definir contratos;
- publicar contract docs.

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
