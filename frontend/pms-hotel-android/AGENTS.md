# PMS Hotel Boutique — Android AGENTS

Leer primero AGENTS/docs globales.

Luego:
- `docs/00_START_HERE.md`
- `docs/01_FIGMA_SCREEN_CATALOG.md`
- `docs/02_ANDROID_ARCHITECTURE.md`
- `docs/03_LAYERED_DATA_FLOW.md`
- `docs/04_NAVIGATION.md`
- `docs/05_DOMAIN_AND_CONTRACT_RULES.md`
- `docs/06_DESIGN_SYSTEM.md`
- `docs/07_MOCK_AND_DATA_POLICY.md`
- `docs/08_STATE_OFFLINE_POLICY.md`
- `docs/09_TEAM_OWNERSHIP.md`
- `docs/10_TESTING_STRATEGY.md`
- `docs/11_DEFINITION_OF_READY.md`
- `docs/12_DEFINITION_OF_DONE.md`

## Arquitectura
Remote/API -> DTO -> Mapper -> Domain -> UI.

UI no consume DTO crudo.

## Cross-app
No inventar statuses/contracts incompatibles con Web/Backend.

## Owner
ANDROID-1 es owner principal del repo lógico Android.
