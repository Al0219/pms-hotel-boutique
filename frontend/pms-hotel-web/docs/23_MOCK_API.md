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


## Staff Admin — Fase 2B (2026-10-22), EN_QA

El wrapper excluye también únicamente GET same-origin /api/staff/admin/roles,
/users y /users/{id}, con slash final y cualquier query. Parámetros inválidos
deben llegar al BFF para su validación. No amplía la exclusión a mutaciones,
sesiones futuras, otro origen ni Private 07; worker generado intacto. Pruebas
del boundary, flags, builds y runtime se distinguen de QA manual en
[64_STAFF_ADMIN_BFF_QA.md](64_STAFF_ADMIN_BFF_QA.md). El historial de Reservas
que sigue conserva su alcance y su estado propios.

## Staff Admin — Fase 3C (2026-10-22), EN_QA

Adenda al alcance histórico2B: el mismo listener previo al worker generado excluye
ahora también PATCH same-origin /api/staff/admin/users/{id}, PATCH de su /status
y PUT de /membership. Solo esos métodos/rutas; no reset, sesiones, DELETE ni
orígenes externos. No respondWith ni mocks runtime de escritura; validación y
persistencia siguen en BFF/Backend real con ambos flags. Handlers nuevos solo en
tests, con éxito/no-op/errores y resultado incierto; sin fallback silencioso.
Firefox automatizado con worker activo confirmó escritura y lectura persistida
sobre PostgreSQL aislado. Evidencia, límites y QA manual pendiente en
[66_STAFF_ADMIN_MUTATIONS_BFF_QA.md](66_STAFF_ADMIN_MUTATIONS_BFF_QA.md).
No cambia el estado independiente de2B ni el historial de Reservas siguiente.

## STAFF-RESERVATIONS-READ-01 — exclusión real antes de MSW

Los GET same-origin de `/api/staff/reservations` y su detalle no entran en MSW,
con ambos valores de NEXT_PUBLIC_USE_MOCK_API. `onUnhandledRequest: bypass`
actúa después de la intercepción del worker y no proporciona esta separación.
`enableMocking` registra `/pmsMockServiceWorker.js`: su primer listener deja esas
lecturas a la red nativa, sin `respondWith`, y después importa el worker generado
`/mockServiceWorker.js` sin modificarlo. Las demás rutas/métodos/origins conservan
sus mocks y el guard de preview existentes. Regenerar el worker MSW base no elimina
la exclusión. Tras actualizar Web, recargar para activar el nuevo registro.

Regresiones: `worker-boundary.test.ts` ejecuta ambos scripts reales; service y
workspace verifican los dos flags. Smoke Firefox mocks=true confirma PostgreSQL
real y cero mensajes MSW para esas lecturas, preservando health/contrato provisional.
Esta cobertura con mocks=true es evidencia técnica de boundaries. Por decisión
de cierre aprobada, el QA manual/E2E obligatorio de esta tarea se ejecuta
únicamente con `NEXT_PUBLIC_USE_MOCK_API=false`; mocks=true no es gate manual ni
modo de integración real, y su comportamiento no constituye FAIL manual.
Se conservan los tests técnicos existentes. Estado COMPLETADA: aceptación/DoD
PASS y QA manual aplicable con mocks=false confirmado por Alan el 2026-10-08 según
el [contrato49](../../../backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md), que
conserva el caso sin RESERVATION_MANAGE como NO EJECUTABLE por falta de fixture,
sin atribuirle PASS manual.
