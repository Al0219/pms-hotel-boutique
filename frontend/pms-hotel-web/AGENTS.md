# PMS Hotel Boutique — Web

Aplica también `../../AGENTS.md`. Route Groups: `src/app/(public)` y `src/app/(private)`. Flujo obligatorio: `Service -> DTO -> Mapper -> Domain Model -> Hook/State -> UI`. Dependencias: `app -> modules -> shared/lib`; prohibidos `shared/lib -> modules` y deep imports entre módulos.

La UI no hace fetch directo, consume DTO crudo ni normaliza respuestas API. Service usa la infraestructura aprobada y devuelve DTO; Mapper es puro, convierte a Domain y produce `DomainMappingError` ante un dato obligatorio inválido.

Para una tarea nueva, localizar **solo su fila** en `../../docs/Backlog_Implementacion_PMS_V1.xlsx`: autorización/READY, dependencias, owner/reviewer, Figma/fuente, DoR, aceptación y DoD. Trabajar únicamente esa tarea; no editar el XLSX sin instrucción explícita. Para una corrección localizada, inspeccionar código/tests y abrir solo documentos relacionados.

## Router Web (`docs/` de esta área)

| Tema | Documento |
| --- | --- |
| rutas; arquitectura/capas; límites de módulos | `02_ROUTE_ARCHITECTURE.md`; `03_FRONTEND_ARCHITECTURE.md`, `04_LAYERED_DATA_FLOW.md`; `04_MODULE_BOUNDARIES.md` |
| DTO; mapper; dominio; service; hooks/state | `06_DTO_RULES.md`; `07_MAPPER_RULES.md`; `08_DOMAIN_MODEL_RULES.md`; `09_SERVICE_RULES.md`; `10_HOOK_AND_STATE_RULES.md` |
| auth/sesión; mocks; pruebas; tokens | `13_AUTH_AND_SESSIONS.md`; `23_MOCK_API.md`; `26_TESTING.md`; `31_DESIGN_TOKEN_FOUNDATION.md` |
| ownership; DoR/DoD; Git | `27_TEAM_OWNERSHIP.md`; `29_DEFINITION_OF_READY.md`, `30_DEFINITION_OF_DONE.md`; `28_GIT_AND_PR_RULES.md` |

Para un dominio, pantalla o feature concreta, buscar por tema/ID en `docs/` y abrir solo su documento y contrato aplicable; `docs/00_START_HERE.md` sirve de índice operativo. Verificar aprobación antes de tratar una propuesta frontend/mock como contrato Backend.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
