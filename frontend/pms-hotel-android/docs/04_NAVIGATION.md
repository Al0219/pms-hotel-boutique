# 04 — Navigation

Seguir journeys Figma.

Expo Router es el mecanismo de navegación aprobado. La estructura concreta de rutas se define en `IMP-AND-0007`; no debe crear rutas funcionales antes de esa tarea.

## MUST
- back stack coherente;
- deep links solo aprobados;
- auth guards coherentes;
- offline recovery.

Guest y Staff conservan contextos de navegación y sesión separados.

## MUST NOT
- saltar estados críticos;
- crear rutas paralelas inconsistentes con Web/account semantics.
