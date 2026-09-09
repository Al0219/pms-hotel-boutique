# 13 — Auth and Sessions

## Guest Session
Separada.

Guest puede:
- guest checkout;
- Google optional;
- email access;
- account link.

## Staff Session
Separada.

## MFA
Puede requerirse en roles/acciones sensibles.

## Session UI
Debe respetar diseño de sesiones/revocación.

## Auth accessibility
- password manager;
- autocomplete;
- paste permitido;
- keyboard;
- MFA accesible.

## No hacer
- guardar password en client state persistente;
- mezclar guest token/staff token;
- asumir role por route.
