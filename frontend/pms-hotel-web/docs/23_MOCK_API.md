# 23 — Mock API

## Decisión aprobada
MSW es la estrategia oficial de mock HTTP Web.

## Pipeline

```text
UI -> Hook -> Service -> fetch -> MSW -> DTO -> Mapper -> Domain -> UI
```

## Prohibido
Un componente no puede importar fixtures/mocks directamente.

## Fixtures
Usar IDs de negocio ficticios y coherentes dentro del mismo escenario, por ejemplo:
- `GT-HB-01`
- `RES-2026-0001`
- `STAY-2026-0001-A`

Los Figma Node IDs NUNCA son runtime IDs ni fixture IDs.

## Casos
success, null, empty, error, offline/detección equivalente, delayed y conflict cuando aplique.

## Contrato
Todo mock DTO de negocio debe referenciar un `PROVISIONAL API CONTRACT` hasta confirmación Backend.

Sprint 0 prepara infraestructura; no crea fixtures de dominio fuera de una tarea posterior.

## Implementación Sprint 0

La infraestructura está en `src/data/mocks`. `enableMocking` solo inicia el worker en navegador cuando `NEXT_PUBLIC_USE_MOCK_API=true`. El handler técnico de health valida MSW sin representar un endpoint de negocio ni una fixture de dominio.
