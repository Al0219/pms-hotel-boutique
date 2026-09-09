# 10 — Testing Strategy Android

- mapper tests;
- remote/repository tests;
- state holder/ViewModel tests;
- UI tests;
- navigation;
- offline;
- E2E críticos.

Base aprobada: Jest + React Native Testing Library. Las pruebas de transporte usan una frontera de `fetch` controlable y fixtures DTO. El framework E2E se decide cuando exista el primer journey Android estable.

Prioridad:
mappers + offline/recovery + auth/account journeys.
