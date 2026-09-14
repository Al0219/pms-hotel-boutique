# Android Module Catalog

All future Android modules are owned by ANDROID-1.

| Module | Cross-app Web domain to review |
| --- | --- |
| navigation | Shell Guest V3 transversal; WEB-3 es reviewer principal. Consultar WEB-2 cuando afecte semántica o navegación futura de Cuenta. |
| auth | auth, account, profile |
| stay | stays, reservations, rooms |
| services | concierge, housekeeping |
| messaging | messaging, concierge |
| valet | parking-valet |
| account | account, profile, guests |
| checkout | folio, payments |
| invoice | folio, receivables |
| rewards | rewards |
| promotions | promotions |
| profile | profile, guests |
| shared-ui | shared |
| offline | data and remote-state policy |

These conceptual modules do not authorize Android project code, contracts, or screens before the stack and relevant backlog task are approved.

## Services / Housekeeping — IMP-AND-0110

Submódulo aislado `src/modules/services/housekeeping`, ruta `/services/housekeeping`. Boundary/mock propio y TanStack Mutation; reutiliza la query pública existente de Stay y el shell V3. IMP-AND-0110 COMPLETADA con QA manual y revisión WEB-3 PASS. Ver `26_HOUSEKEEPING_CONTRACT.md` para el contrato mínimo confirmado y los valores frontend/mock provisionales.
