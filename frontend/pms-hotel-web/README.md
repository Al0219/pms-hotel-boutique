# PMS Hotel Boutique — Web

Una aplicación Next.js con App Router para Web Pública y Web Privada.

## Sprint 0

- npm y `package-lock.json`
- TypeScript strict y alias `@/* -> src/*`
- Route Groups `(public)` y `(private)`
- CSS Custom Properties desde el handoff de tokens Figma
- `fetch` técnico, TanStack Query, MSW, Vitest, Testing Library y ESLint boundaries
- Playwright diferido hasta `IMP-WEB-1001`

## Comandos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```

## Rutas técnicas

- `/` usa el shell público.
- `/dashboard` usa el shell privado.

No son pantallas funcionales ni sustituyen el handoff Figma.

## Arquitectura

Las features deberán respetar `Service -> DTO -> Mapper -> Domain -> Hook/State -> UI`. Solo Services realizan requests; UI no recibe DTOs ni importa mocks directamente.

Los module shells son ownership y API pública futura. No contienen feature code ni autorizan imports internos cross-module.

## Entorno

```dotenv
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_API_BASE_URL=
```

No agregar secretos ni tokens de sesión al frontend.

## Backlog y reglas

El backlog canónico es `../../docs/Backlog_Implementacion_PMS_V1.xlsx`. Antes de una tarea, leer `AGENTS.md`, la fila del backlog y los documentos indicados.
