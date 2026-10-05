# PMS Hotel Boutique — Android

Aplica `../../AGENTS.md`. Flujo: `Remote/API -> DTO -> Mapper -> Domain -> State Holder/ViewModel -> UI`. UI sin red directa ni DTO crudo. No inventar contratos/estados incompatibles con Web o Backend; distinguir mock frontend de API Backend confirmada.

Tarea nueva: buscar **solo su fila** `IMP-AND-*` en `../../docs/Backlog_Implementacion_PMS_V1.xlsx`; verificar autorización/READY, dependencias, owner/reviewer, DoR, aceptación y DoD. Trabajar solo esa tarea. Corrección localizada: partir de código/tests afectados.

## Router Android (`docs/`)

| Tema | Archivo |
| --- | --- |
| Figma; arquitectura/capas; navegación | `01_FIGMA_SCREEN_CATALOG.md`; `02_ANDROID_ARCHITECTURE.md`, `03_LAYERED_DATA_FLOW.md`; `04_NAVIGATION.md` |
| dominio/contratos; mocks; offline | `05_DOMAIN_AND_CONTRACT_RULES.md`; `07_MOCK_AND_DATA_POLICY.md`; `08_STATE_OFFLINE_POLICY.md` |
| diseño/tokens; ownership; QA/DoR/DoD | `06_DESIGN_SYSTEM.md`, `15_DESIGN_TOKEN_FOUNDATION.md`; `09_TEAM_OWNERSHIP.md`; `10_TESTING_STRATEGY.md`, `11_DEFINITION_OF_READY.md`, `12_DEFINITION_OF_DONE.md` |

Buscar contrato/QA del ID o módulo solo cuando aplique. `docs/00_START_HERE.md` orienta tareas nuevas; `docs/14_IMPLEMENTATION_HANDOFF.md` aporta continuidad si hace falta.
