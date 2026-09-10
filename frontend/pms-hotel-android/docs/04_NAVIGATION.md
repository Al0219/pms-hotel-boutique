# 04 — Navigation

Seguir journeys Figma.

Expo Router es el mecanismo de navegación aprobado. Sprint 0 contiene solamente `app/_layout.tsx`, `app/index.tsx`, `app/(guest)/_layout.tsx` y `app/(guest)/index.tsx`. La ruta Guest es una pantalla técnica Foundation, no una pantalla funcional ni una reproducción de Figma.

La navegación y back stack de Foundation se prueban con `expo-router/testing-library`, `renderRouter` y un filesystem de rutas in-memory. Las rutas funcionales nacen únicamente con sus tareas READY.

## Excepción de navegación — IMP-AND-0102

La Home Guest (`/(guest)`) implementa `31:154 — MOB-02 — Inicio / Mi estadía`. Sus cuatro acciones navegan a `/services` únicamente como destino técnico para validar el back stack exigido por `IMP-AND-0102`. Esa ruta no contiene catálogo, solicitud, estados de negocio, DTO, endpoint ni funcionalidad de `IMP-AND-0103`.

## MUST
- back stack coherente;
- deep links solo aprobados;
- auth guards coherentes;
- offline recovery.

Guest y Staff conservan contextos de navegación y sesión separados.

## MUST NOT
- saltar estados críticos;
- crear rutas paralelas inconsistentes con Web/account semantics.
