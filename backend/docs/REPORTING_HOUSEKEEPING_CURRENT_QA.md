# BE-010B-HKCUR-01 — QA de housekeeping actual

Contrato: [BE-010A-HKCUR-01](REPORTING_HOUSEKEEPING_CURRENT_CONTRACT_PROPOSAL.md).
Fecha: 2026-10-22. Owner Juan / BD3 (fuente), Alan / BD1 (HTTP/acceso),
WEB-3 (consumidor); WEB-2 revisa sesión/scope. Estado **EN_QA** hasta el
resultado de `mvn verify` integral. La repetición fue interrumpida al caer
Docker Desktop, sin resultado PASS/FAIL; requiere otra ejecución. El usuario confirmó **QA manual PASS** en
la vista QA de housekeeping tras revisar el enlace Reportes, la vista y la
actualización. El smoke autorizado de UI también pasó.

## Matriz y evidencia técnica

| Caso | Resultado |
| --- | --- |
| Fuente `rooms LEFT JOIN hk_room_states`, DIRTY/CLEAN/INSPECTED, DND transversal, sin seguimiento y OOO/OOS | PASS en prueba Backend focalizada contra PostgreSQL 17 aislado. |
| Property sin habitaciones, dos properties autorizadas, otra ajena y ALL | PASS en pruebas Backend focalizadas. |
| OPERACIONES, GERENCIA, RECEPCIÓN, Guest, sesión/membership revocadas | PASS en pruebas Backend focalizadas; RECEPCIÓN denegada también por HTTP en Compose real. |
| Filtro estricto, 400/401/403/503, no-store, errores sin datos privados | PASS en pruebas Servlet/BFF focalizadas; 400/401/403 en Compose real. |
| Respuesta con allowlist, invariantes de contadores, errores, filas duplicadas/ajenas | PASS en pruebas BFF/mapper/hook. |
| UI de carga/error/vacío, refresh y semántica actual | PASS en pruebas RTL. |
| OpenAPI: path, esquema, audiencia, seguridad y parámetros | PASS en prueba Backend focalizada y OpenAPI vivo del Compose: 49 operaciones, 38 paths, 60 schemas, 13 tags. |

Backend focalizado: `CurrentHousekeepingReportIntegrationTests` y
`CurrentHousekeepingReportServletTests`, **8 pruebas PASS** con Maven Java 21 y
PostgreSQL 17 aislado; 28 changesets existentes aplicados en la base QA, sin
migración nueva ni cambio a la base principal. Web focalizado: 7 archivos,
**58 pruebas PASS** fuera del sandbox Windows tras un `EPERM` temporal de
Vitest antes de cargar tests. `npm run lint` y `npm run typecheck` PASS.
`docker compose up --build -d` construyó Backend/Web con
`NEXT_PUBLIC_USE_MOCK_API=false`; PostgreSQL, Backend y Web healthy.

Smoke HTTP real en Compose principal: login Staff RECEPCIÓN 201;
`GET /api/v1/private/reports/housekeeping/current` 403 para su property,
query desconocida 400 y petición sin sesión 401, con respuesta privada sin
caché. PowerShell no adjuntó automáticamente cookies `Secure` por HTTP local;
el smoke posterior remitió solo la cookie emitida dentro del mismo proceso,
sin imprimir ni guardar tokens. Esta prueba no acredita el flujo autorizado
OPERACIONES/GERENCIA ni sustituye QA manual.

Smoke autorizado adicional en **runtime aislado** `localhost:13001`, con
PostgreSQL QA desechable y fixtures **sintéticas** separadas de la base principal:

- OPERACIONES: UI y BFF/Backend 200 para su property. 24 rooms físicas,
  3 seguidas, 21 sin seguimiento; DIRTY/CLEAN/INSPECTED = 1/1/1 y DND = 1.
  Su catálogo muestra solo housekeeping; ALL devuelve 403. El smoke visual
  descubrió que faltaba «Reportes» en el menú Staff para OPERACIONES; se
  añadió `OPERATIONS_MANAGE` al gating del enlace y su prueba RTL pasó.
  Tras reconstruir Web, la sesión OPERACIONES mostró el enlace «Reportes»;
  abrió el catálogo y el reporte con Backend QA real. La vista mostró
  DIRTY/CLEAN/INSPECTED = 0/2/1 y DND = 1 tras el cambio persistido, con
  `calculatedAt` etiquetado en UTC.
- Tras `UPDATE` de una fila HK sintética de DIRTY a CLEAN en PostgreSQL QA,
  «Actualizar estado actual» cambió en UI a 0/2/1 y mantuvo DND=1; el instante
  `calculatedAt` avanzó. Sin fallback de mock.
- GERENCIA: UI y BFF/Backend ALL 200 con **dos** properties autorizadas y zonas
  `America/Guatemala` y `America/New_York`. Segunda fila: 2 rooms físicas,
  1 seguida, 1 sin seguimiento. La tercera property fuera de membership no
  aparece y su consulta directa devuelve 403. El catálogo mostró tres reportes
  según sus permisos.
- RECEPCIÓN en Compose principal: UI oculta housekeeping; BFF con su cookie
  Staff devuelve 403. Los importes y actividad histórica siguen sin aparecer.

Estos números pertenecen exclusivamente a fixtures de QA, no al hotel. El
runtime QA queda disponible para la revisión manual del usuario mientras
permanezca activo; su PostgreSQL usa `tmpfs` y pierde las fixtures al reiniciar.
La suite Web completa inicial: 316 archivos, 1985/1987 pruebas PASS, con dos
timeouts de 5 s en Account y ReservationList bajo carga concurrente de Maven/
Docker; ambas clases aisladas **15/15 PASS** sin modificar sus tests. La
repetición sin carga Docker concurrente terminó **316 archivos, 1988/1988
PASS**; `npm run lint` y `npm run typecheck` también PASS en el código final.
Backend `verify` completo
ejecutó 903 pruebas: 0 fallos de aserción y 8 errores en una clase de auditoría
al agotar las 100 conexiones de la base QA aislada (`too many clients already`).
Tras ampliar solo esa instancia QA a 250 conexiones, la clase afectada pasó
**8/8** sin cambios de código. Falta repetir `verify` completo; el resultado
anterior no acredita un PASS integral.

## QA manual — PASS confirmado por el usuario

Con Backend/Web reales y Staff OPERACIONES con membership activa:

1. Abrir `/reportes`; debe aparecer «Ver housekeeping actual» y no acciones de
   reservaciones si esa sesión carece de sus permisos.
2. Abrir el reporte; comparar físicos, seguidos, sin seguimiento, los tres
   estados y DND con la fuente persistida. DND se solapa con estados; OOO/OOS
   continúan como rooms físicas.
3. Actualizar tras un cambio HK y comprobar `calculatedAt` y nuevos contadores.
4. Con GERENCIA y `MULTI_PROPERTY_READ`, elegir ALL: únicamente properties
   autorizadas, cada una en su fila/zona horaria. Intentar property ajena.
5. Verificar carga, vacío/cero, error de conexión, regreso al catálogo y que
   RECEPCIÓN no ve la acción y recibe 403 si llama la ruta directamente.

El usuario respondió «PASS: coincide con lo esperado» a la solicitud de
revisión manual de la vista QA. Los números anteriores son fixtures
sintéticas, no datos reales del hotel. El cierre técnico espera únicamente el
resultado de una nueva ejecución de `mvn verify` integral.
