# 11 — Architectural Decisions

## Globales

### DEC-G-001 — Monorepo
Un solo repositorio Git en la raíz.

### DEC-G-002 — Frontend/Backend
Separación por carpetas raíz.

### DEC-G-003 — Web/Android
Aplicaciones separadas dentro de `frontend/`.

### DEC-G-004 — Figma V3
Fuente visual/funcional.

### DEC-G-005 — Domain semantics
Compartidas conceptualmente cross-app.

### DEC-G-006 — Property scope
Explícito.

### DEC-G-007 — Guest/Staff
Sesiones separadas.

### DEC-G-008 — Reservation/Stay
Entidades distintas.

### DEC-G-009 — Availability
Separada de physical inventory.

### DEC-G-010 — Payments
No PAN/CVV.

### DEC-G-011 — Financial/Audit history
Append-only/compensatory.

### DEC-G-012 — Integrations
Idempotentes y trazables.

## Web — Sprint 0 aprobadas

### DEC-W-001 — Framework
Next.js con App Router y TypeScript strict.

### DEC-W-002 — Package manager
`npm` con `package-lock.json`. No pnpm, Yarn ni Node workspace por ahora.

### DEC-W-003 — Route Groups
`src/app/(public)` y `src/app/(private)` son obligatorios. `(public)/page.tsx` resuelve `/`; el inicio privado será `/dashboard` para evitar colisión de pathname.

### DEC-W-004 — Arquitectura de datos
`Service -> DTO -> Mapper -> Domain Model -> Hook/State -> UI`.

### DEC-W-005 — HTTP
`fetch` nativo mediante cliente técnico común en `src/lib/http`.

### DEC-W-006 — Server state
TanStack Query aprobado.

### DEC-W-007 — Mocking
MSW aprobado como mock HTTP. UI no importa mocks directamente.

### DEC-W-008 — Testing Sprint 0
Vitest + Testing Library + jsdom. Playwright se difiere hasta `IMP-WEB-1001`.

### DEC-W-009 — Boundaries
ESLint flat config debe aplicar `frontend/pms-hotel-web/docs/04_MODULE_BOUNDARIES.md`.

### DEC-W-010 — Design tokens
CSS Custom Properties basadas exclusivamente en `frontend/pms-hotel-web/docs/31_DESIGN_TOKEN_FOUNDATION.md`. No inventar dark mode.

### DEC-W-011 — Mapping errors
Campo DTO obligatorio inválido produce `DomainMappingError`; no se inventan defaults de negocio.

### DEC-W-012 — Auth Sprint 0
Autenticación real diferida. No usar `localStorage` como estrategia predeterminada de tokens.

### DEC-W-013 — Backlog operativo
Fuente canónica: `docs/Backlog_Implementacion_PMS_V1.xlsx`.

### DEC-W-014 — Figma Node IDs
Node IDs son solo trazabilidad. Solo registrar IDs verificados; celda vacía significa usar nombre de sección/pantalla, no inventar un ID.

### DEC-W-015 — Sprint 0 baseline
La infraestructura aprobada se materializa con tokens CSS, fonts mediante `next/font`, transporte fetch técnico, `DomainMappingError`, TanStack Query, MSW, Vitest/Testing Library, ESLint flat boundaries y CI Web. No implementa endpoints ni features de negocio. Los module shells del Structure Freeze permanecen sin capas internas hasta una tarea READY.

## Nueva decisión futura
Registrar ID, fecha, status, contexto, problema, decisión, alternativas, consecuencias y responsables. No borrar historia; usar `SUPERSEDED`.
