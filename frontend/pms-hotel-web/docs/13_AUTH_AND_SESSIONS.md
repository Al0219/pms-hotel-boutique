# 13 — Auth and Sessions

## Guest Session
Separada de Staff.
Guest puede usar guest checkout, Google opcional, email access y account link.

## Staff Session
Separada y sujeta a role/permission/property membership.

## Sprint 0
Autenticación real no se implementa todavía.
No usar `localStorage` como estrategia predeterminada de tokens.
Si la arquitectura Backend futura lo permite, favorecer sesión/cookies seguras HttpOnly/Secure/SameSite para Web.

## MFA
Puede requerirse en roles/acciones sensibles.

## Accessibility
Password manager, autocomplete, paste permitido, keyboard y MFA accesible.

## Prohibido
- password persistente en client state/storage;
- mezclar Guest token y Staff token;
- asumir role por route;
- exponer token raw en UI/logs.
