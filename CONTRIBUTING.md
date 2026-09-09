# Contributing

## Regla base
Todo cambio funcional entra por Pull Request.

## Flujo
1. actualizar `main`;
2. verificar Definition of Ready;
3. crear rama;
4. implementar una tarea cohesiva;
5. ejecutar checks;
6. abrir PR;
7. solicitar reviewer;
8. merge solo con DoD PASS.

## Branch naming
- `feature/<nombre>`
- `fix/<nombre>`
- `refactor/<nombre>`
- `docs/<nombre>`
- `test/<nombre>`
- `chore/<nombre>`

## No usar
- ramas personales permanentes;
- cambios directos a `main`;
- PRs gigantes que mezclan múltiples features.

## Commits sugeridos
- `feat: add guest booking search`
- `fix: preserve property scope on dashboard`
- `test: cover reservation mapper null handling`
- `docs: document payment lifecycle`
- `refactor: expose payments public module API`

## Shared/cross-app
Cambios que afecten:
- `frontend/pms-hotel-web/src/shared`
- contratos API
- Domain semantics
- docs globales
requieren reviewer adicional.

## Reglas de arquitectura
No aceptar:
- fetch directo en UI Web;
- UI Android consumiendo DTO crudo;
- DTO usado como Domain;
- Mapper haciendo red;
- Service decidiendo presentación;
- import cross-module a archivos internos;
- secretos en repo.
