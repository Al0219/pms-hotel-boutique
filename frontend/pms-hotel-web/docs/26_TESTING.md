# 26 — Testing

## Sprint 0 aprobado
- Vitest
- Testing Library
- jsdom
- MSW en tests cuando corresponda

## Mappers
Prioridad alta: happy path, null permitido, campo obligatorio inválido, enum desconocido y nested data cuando aplique.

## Services
Request, status/error técnico y DTO.

## Hooks
Service + Mapper + states + retry/refetch.

## Components
Reciben Domain Models, nunca DTO.

## E2E
Playwright NO se instala en Sprint 0. Se incorpora en `IMP-WEB-1001`, cuando existan journeys estables.

## Regresión final
Public, Private, roles/sidebar, routes, accessibility, mocks/contracts y arquitectura.
