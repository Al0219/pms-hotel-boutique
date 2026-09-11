# 04 — Navigation

Seguir journeys Figma.

Expo Router es el mecanismo de navegación aprobado. Sprint 0 contiene solamente `app/_layout.tsx`, `app/index.tsx`, `app/(guest)/_layout.tsx` y `app/(guest)/index.tsx`. La ruta Guest es una pantalla técnica Foundation, no una pantalla funcional ni una reproducción de Figma.

La navegación y back stack de Foundation se prueban con `expo-router/testing-library`, `renderRouter` y un filesystem de rutas in-memory. Las rutas funcionales nacen únicamente con sus tareas READY.

## Autoridad de navegación Guest para nuevas features

La fuente visual canónica `238:132 — Implementation Ready — Android V2 + V3` confirma la footbar `Servicios · Chat · Valet · Cuenta` en Chat (`238:192`), Servicios (`239:132`), Valet (`239:197`) y Cuenta (`240:132`). Las nuevas features derivadas de esa sección deben usar esa referencia visual.

No existe todavía un shell V3 compartido implementado. La normalización corresponde a `IMP-AND-0100 — Android Guest Navigation Shell V3`, que permanece `PENDIENTE` y no está `READY`. Hasta que el shell esté implementado, ningún módulo debe copiar una footbar privada.

## Excepción de navegación — IMP-AND-0102

La Home Guest (`/(guest)`) implementa `31:154 — MOB-02 — Inicio / Mi estadía`. Sus cuatro acciones navegan a `/services` únicamente como destino técnico para validar el back stack exigido por `IMP-AND-0102`. Esa ruta no contiene catálogo, solicitud, estados de negocio, DTO, endpoint ni funcionalidad de `IMP-AND-0103`.

La footbar V2 `Inicio · Solicitudes · Explorar · Hotel` de esa pantalla es parte de la excepción aprobada. No convierte V2 en navegación global ni reabre `IMP-AND-0102`; una migración eventual de Home corresponde al futuro trabajo transversal de shell.

## MUST
- back stack coherente;
- deep links solo aprobados;
- auth guards coherentes;
- offline recovery.

Guest y Staff conservan contextos de navegación y sesión separados.

## MUST NOT
- saltar estados críticos;
- crear rutas paralelas inconsistentes con Web/account semantics.
