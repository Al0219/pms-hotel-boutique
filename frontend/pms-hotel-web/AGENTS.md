# PMS Hotel Boutique — Web AGENTS

## Lectura obligatoria

Primero:
- `../../AGENTS.md`
- `../../docs/*`

Luego leer según tarea:
- rutas -> `docs/02_ROUTE_ARCHITECTURE.md`
- arquitectura -> `docs/03_FRONTEND_ARCHITECTURE.md`
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

## Requisito del docente

Dentro de `src/app` DEBEN existir:

```text
(public)
(private)
```

No eliminarlos.

## Arquitectura por capas obligatoria

`Service -> DTO -> Mapper -> Domain Model -> UI`

### UI MUST NOT
- fetch directo;
- consumir DTO;
- normalizar API;
- importar archivos internos de otro módulo.

### Service MUST
- disparar request;
- retornar DTO;
- manejar transporte.

### Mapper MUST
- ser puro;
- DTO -> Domain.

### Domain Model MUST
- ser limpio para UI.

## Dependencias
`app -> modules -> shared/lib`

No:
`shared -> modules`
`lib -> modules`

## Codex
Antes de modificar Web:
- revisar DoR;
- indicar owner;
- indicar Figma;
- indicar módulos;
- indicar archivos;
- no instalar dependencias sin decisión.
