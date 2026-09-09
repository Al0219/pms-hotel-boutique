# 03 — Frontend Architecture

## Stack aprobado
- Next.js
- React
- App Router
- TypeScript strict
- npm
- fetch nativo
- TanStack Query
- MSW
- Vitest + Testing Library
- ESLint flat config

Playwright queda diferido hasta `IMP-WEB-1001`.

## Estructura objetivo

```text
src/
├── app/
│   ├── (public)/
│   ├── (private)/
│   ├── providers.tsx
│   └── globals.css
├── modules/
├── shared/
├── data/
└── lib/
```

No crear módulos de negocio vacíos por estética.

## Módulo cuando exista uso real

```text
modules/<domain>/
├── dtos/
├── mappers/
├── model/
├── service/
├── hooks/
├── components/
└── index.ts
```

`index.ts` es la API pública cross-module.

## Dependency direction
`app -> modules -> shared/lib`.

Reglas exactas: `04_MODULE_BOUNDARIES.md`.

## Structure Freeze

El Structure Freeze autorizado crea los módulos oficiales como shells no vacíos con solo `README.md` e `index.ts`. Esta excepción organizativa no implementa una feature ni autoriza las carpetas `dtos`, `mappers`, `model`, `service`, `hooks` o `components`; cada una nace únicamente con una tarea READY.

## Infraestructura Sprint 0 implementada

- `src/app/providers.tsx` compone TanStack Query con defaults conservadores.
- `src/lib/http` contiene transporte técnico con `fetch`, sin endpoints de negocio ni auth real.
- `src/data/mocks` prepara MSW para simular red y DTOs; UI no consume mocks.
- `src/shared/styles/tokens.css` contiene la fundación de tokens PMS.
