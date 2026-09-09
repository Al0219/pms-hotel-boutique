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
