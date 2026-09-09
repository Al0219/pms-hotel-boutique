# PMS Hotel Boutique — Web AGENTS

## Lectura obligatoria

Primero:
- `../../AGENTS.md`
- `../../docs/*`
- `../../docs/Backlog_Implementacion_PMS_V1.xlsx`

Luego según tarea:
- inicio -> `docs/00_START_HERE.md`
- Figma -> `docs/01_FIGMA_SCREEN_CATALOG.md`
- rutas -> `docs/02_ROUTE_ARCHITECTURE.md`
- arquitectura -> `docs/03_FRONTEND_ARCHITECTURE.md`
- flujo de datos -> `docs/04_LAYERED_DATA_FLOW.md`
- boundaries/imports -> `docs/04_MODULE_BOUNDARIES.md`
- módulos -> `docs/05_MODULE_CATALOG.md`
- DTO -> `docs/06_DTO_RULES.md`
- mapper -> `docs/07_MAPPER_RULES.md`
- model -> `docs/08_DOMAIN_MODEL_RULES.md`
- service -> `docs/09_SERVICE_RULES.md`
- hooks/state -> `docs/10_HOOK_AND_STATE_RULES.md`
- public -> `docs/11_PUBLIC_WEB.md`
- private -> `docs/12_PRIVATE_WEB.md`
- auth -> `docs/13_AUTH_AND_SESSIONS.md`
- reservations -> `docs/14_RESERVATIONS.md`
- availability/rates -> `docs/15_AVAILABILITY_AND_RATES.md`
- folio/payments -> `docs/16_FOLIO_AND_PAYMENTS.md`
- operations -> `docs/17_OPERATIONS.md`
- B2B/groups -> `docs/18_B2B_AND_GROUPS.md`
- integrations -> `docs/19_INTEGRATIONS.md`
- reporting -> `docs/20_REPORTING.md`
- multi-property -> `docs/21_MULTI_PROPERTY.md`
- shared -> `docs/22_SHARED_COMPONENTS.md`
- mocks -> `docs/23_MOCK_API.md`
- errors -> `docs/24_ERROR_LOADING_OFFLINE.md`
- a11y -> `docs/25_ACCESSIBILITY.md`
- testing -> `docs/26_TESTING.md`
- ownership -> `docs/27_TEAM_OWNERSHIP.md`
- git -> `docs/28_GIT_AND_PR_RULES.md`
- ready -> `docs/29_DEFINITION_OF_READY.md`
- done -> `docs/30_DEFINITION_OF_DONE.md`
- tokens -> `docs/31_DESIGN_TOKEN_FOUNDATION.md`

## Route Groups obligatorios
`src/app/(public)` y `src/app/(private)`.

## Arquitectura obligatoria
`Service -> DTO -> Mapper -> Domain Model -> Hook/State -> UI`.

### UI MUST NOT
- hacer fetch directo;
- consumir DTO;
- normalizar API;
- importar internals de otro módulo.

### Service MUST
- disparar request mediante la infraestructura aprobada;
- retornar DTO;
- manejar transporte, no presentación.

### Mapper MUST
- ser puro;
- convertir DTO -> Domain;
- producir `DomainMappingError` ante dato obligatorio inválido.

## Dependencias
`app -> modules -> shared/lib`.

Prohibido:
- `shared -> modules`
- `lib -> modules`
- deep imports cross-module.

## Backlog
Codex trabaja únicamente la siguiente tarea `READY` autorizada. No modifica el XLSX salvo instrucción explícita.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
