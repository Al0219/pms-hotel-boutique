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

## Android — Sprint 0 aprobada

### DEC-A-001 — Stack técnico Android

**Fecha:** 2026-09-09
**Status:** APPROVED
**Responsable:** Equipo PMS Hotel Boutique / ANDROID-1

**Contexto:** La aplicación Android inicia su Sprint 0 sin proyecto ejecutable y requiere una base coherente con los contratos, el modelo de dominio y el Figma canónico.

**Decisión:** Android se implementará con React Native, Expo, TypeScript y Expo Router. Usará TanStack Query para server state, `fetch` nativo como transporte HTTP, Jest con React Native Testing Library para pruebas y `StyleSheet` con design tokens para estilos. Android Studio se limita a emulación y depuración.

**Seguridad y conectividad:** Expo SecureStore se incorporará solamente junto con autenticación real. NetInfo se incorporará solamente al implementar offline/recovery. Guest y Staff continúan siendo contextos separados.

**Decisiones negativas:** No se incorporan Redux, Zustand, framework de DI, Compose, XML ni una arquitectura UI Android nativa paralela en Sprint 0.

**Consecuencias:** Los datos siguen `Remote/API -> DTO -> Mapper -> Domain -> State Holder/ViewModel -> UI`; la UI no hace red directa ni consume DTOs. La versión de Expo elegida en `IMP-AND-0002` determinará las versiones compatibles de Gradle y mínimo SDK.

### DEC-A-002 — Fuente Figma Android

**Fecha:** 2026-09-09
**Status:** APPROVED
**Responsable:** Equipo PMS Hotel Boutique / ANDROID-1

La fuente visual y funcional canónica para Android es `238:132 — Implementation Ready — Android V2 + V3`. `31:132 — Reference — Android Early Journey` es referencia histórica y no autoriza pantallas ni rutas nuevas. Los Node IDs se usan solo para trazabilidad, nunca como IDs runtime.

### DEC-A-003 — Expo Continuous Native Generation

**Fecha:** 2026-09-09
**Status:** APPROVED
**Responsable:** Equipo PMS Hotel Boutique / ANDROID-1

**Decisión:** Android utiliza Expo con Continuous Native Generation (CNG), equivalente al workflow gestionado de Expo. Los directorios generados `android/` e `ios/` no se versionan ni son fuente de verdad.

**Validación de Foundation:** `npm ci`, `npx expo-doctor`, `npx tsc --noEmit`, `npx expo export` y un smoke de navegación/app técnica. La exigencia anterior de `Gradle build/assemble` queda sustituida.

**Uso nativo local:** Android Studio se puede usar para emulador, debugging y compilación local. Cuando sea necesario, `npx expo prebuild` o `npx expo run:android` generan el proyecto nativo efímero sin autorizar su versionado.

## Nueva decisión futura
Registrar ID, fecha, status, contexto, problema, decisión, alternativas, consecuencias y responsables. No borrar historia; usar `SUPERSEDED`.
