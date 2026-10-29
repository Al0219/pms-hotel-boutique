# BE-010B-ARRDEP-01 — QA de llegadas y salidas pendientes

Contrato: [ARRDEP](REPORTING_ARRIVALS_DEPARTURES_CONTRACT.md). Fecha: 2026-10-21.
Owner Backend Alan / BD1 + Juan / BD3; consumidor WEB-3. Estado: EN_QA hasta
cumplir los gates y recibir confirmación de QA manual del usuario según
`backend/AGENTS.md`. Este reporte muestra **pendientes actuales** por fecha
programada, nunca check-ins/check-outs efectivamente realizados.

## Gate técnico

- Backend: `mvn -B --no-transfer-progress verify` con Java 21/PostgreSQL 17
  aislado y sin exclusiones; además pruebas Servlet HTTP y OpenAPI.
- Web: `VITEST_MAX_WORKERS=4 npm run check` desde `frontend/pms-hotel-web`:
  lint, typecheck, suite Vitest y build. Imagen Docker QA adicional construida
  explícitamente con `NEXT_PUBLIC_USE_MOCK_API=false`.
- Docker: base aislada `pms-reports-csv-qa-postgres-1`, runtime ARRDEP en
  `127.0.0.1:18087`, Web ARRDEP en `127.0.0.1:13001`. La base del Compose
  principal y la base QA de tests no se modifican; fixtures sintéticos solo en
  `pms_csv_runtime` del contenedor aislado. No usar sus cifras como datos del hotel.
- Evidencia local no versionada: `backend/target/arrdep-qa/` contiene logs de
  gates, script/resultados HTTP y OpenAPI vivo. No registrar cookies/tokens.

## Evidencia técnica ejecutada

- Docker Backend y Web con `NEXT_PUBLIC_USE_MOCK_API=false`: builds PASS;
  Backend QA en 18087 y Web QA en 13001. Fixture sintética insertada solo en
  `pms_csv_runtime`; base del Compose principal intacta.
- Smoke HTTP en ambos niveles: RECEPCIÓN y GERENCIA Staff reales, paridad de
  conteos con SQL persistido, reserva multi-room, estados y padres excluidos,
  fecha de salida inclusiva, ceros reales, dos properties GTQ/USD con zona
  America/New_York y tercera excluida: PASS.
- Anónimo/Guest 401; propiedad ajena y ALL de RECEPCIÓN 403; fecha, rango y
  filtro desconocido 400; respuestas `private, no-store`: PASS. Máximo real
  250 properties × 200 días = 50 000 filas PASS; 50 250 filas devuelve 400.
  BFF y Backend devuelven filas idénticas. CSV on-books conserva descarga HTTP
  UTF-8/BOM, attachment y no-store: PASS de regresión.
- OpenAPI servido por Backend: 48 operaciones, 37 paths, 58 schemas y 13 tags;
  ruta ARRDEP con audiencia Staff y DTO/límite de 50 000 filas: PASS.
- Compose principal reconstruido y healthy (PostgreSQL/Backend/Web). `/reportes`
  HTTP 200; sesión Staff demo → BFF → Backend ARRDEP en dos días locales devuelve
  dos filas de su property y `private, no-store`: PASS. Los datos de esta base
  demo se mantienen separados de las fixtures QA y no se reportan como cifras
  de producción.
- Pruebas enfocadas Backend: 27 PASS. Web BFF/mapper/UI: 46 PASS. Suite Web
  completa: 311 archivos/1936 pruebas PASS con `VITEST_MAX_WORKERS=4` y
  TEMP/TMP dentro del workspace; lint y typecheck PASS, build de producción
  Docker PASS con mocks desactivados.
- El primer build local de Next falló con `EPERM mkdir` en `.next/server/app/`
  durante generación estática bajo el sandbox Windows. La limpieza recursiva
  de `.next` ignorado fue rechazada por revisión automática por límite de uso
  y no se ejecutó. Un reintento sin borrar archivos y sin carga Maven terminó
  **PASS**; el build Docker de la misma fuente también terminó PASS.
- El reintento de `npm run check` como comando compuesto se detuvo después de
  ~10 minutos sin avanzar de `eslint .` bajo el sandbox Windows. No emitió
  error de lint, pero tampoco completó y no se registra PASS del comando.
  Lint, typecheck, suite Web completa y build tienen ejecuciones individuales
  PASS; esa es la evidencia de los cuatro componentes del gate.
- En una imagen Docker de QA, el mismo comando compuesto completó lint y
  typecheck, pero Vitest sufrió timeouts en pruebas Guest preexistentes bajo
  carga del contenedor; se detuvo esa ejecución. Tampoco se atribuye PASS al
  comando compuesto en Docker. La suite Web completa sí pasó por separado en
  Windows (311 archivos/1936 pruebas), sin cambiar ni excluir esos tests.
- Otro reintento local del compuesto, ya sin Maven ni procesos Node de prueba,
  permaneció en ESLint sin error ni avance durante ~2.5 minutos y se detuvo.
  Se conserva la evidencia individual PASS; el comando compuesto sigue sin PASS.
- Primera corrida completa Backend: 895 pruebas, una excepción de timeout en
  la solicitud fría a `/v3/api-docs` de `PublicBookingHttpIntegrationTests`:
  SpringDoc tardó 31 s frente a 20 s del test. La clase aislada reprodujo el
  caso con SpringDoc en 28 s. Se ajustó **solo** el timeout de esa solicitud
  de contrato a 60 s; la clase aislada volvió a pasar 62/62, SpringDoc 27 s.
  La repetición completa `mvn -o -B --no-transfer-progress verify` con
  Java 21/PostgreSQL 17 aislado cerró **BUILD SUCCESS**, 895 pruebas,
  0 fallos, 0 errores, 0 omitidas, sin exclusiones (2026-10-22).
- Navegador de automatización no inicializa (`failed to write kernel assets`,
  os error 3) en intentos iniciales. Un reintento posterior sí abrió el Compose
  principal en `localhost:3001`: sesión RECEPCIÓN, vista ARRDEP con 2026-10-20
  = 3/0 y 2026-10-21 = 0/3, labels de pendientes/timezone/currency y tabla
  visible. Rango invertido mostró validación y retiró las filas anteriores;
  volver al rango válido las restauró desde la consulta. Smoke visual técnico
  PASS, **sin** atribuir QA manual de aceptación ni paridad Figma V3.

## Dataset sintético persistido para QA

En Hotel Boutique Demo, para 2035-03-10/12:

| Día local | Llegadas pendientes | Salidas pendientes | Razón |
| --- | ---: | ---: | --- |
| 2035-03-10 | 2 | 1 | Dos stays RESERVED de una reserva multi-room; una salida RESERVED cuya llegada fue el día anterior. |
| 2035-03-11 | 0 | 1 | Un stay IN_HOUSE con salida programada. |
| 2035-03-12 | 0 | 2 | Salida de los dos stays multi-room. |

Stays CHECKED_OUT/CANCELLED/NO_SHOW y reserva padre CANCELLED adicionales deben
quedar excluidos. Otra property autorizada a la GERENCIA QA está en
America/New_York/USD: 1/0, 0/0 y 0/1 para los mismos tres días, incluidos ceros
reales y día local a través del cambio DST. Una tercera property EUR queda fuera
del scope. El CSV on-books usa otra fecha de estancia y tiene su propia guía.

## Recorrido manual pendiente

El runtime QA aislado de `localhost:13001` debe iniciarse de nuevo antes de
este recorrido: al inspeccionar el Compose principal el 2026-10-22 solo estaban
activos sus tres servicios en `localhost:3001`; la fixture sintética 2035 no
pertenece a la base principal. No usar cifras de uno para validar el otro.

1. En `http://localhost:13001/acceso`, iniciar sesión Staff con la fixture
   desechable `staff.demo@example.test` y la contraseña pública del seed demo
   `PmsDemoLocal2026!`. Abrir `/reportes` → **Ver llegadas y salidas pendientes**.
2. Consultar 2035-03-10 a 2035-03-12 y contrastar la tabla con las tres filas
   anteriores; verificar el nombre de property, zona horaria, leyenda
   «pendientes» y el aviso de realizados/histórico no disponibles. La tabla no
   debe ofrecer ADR/RevPAR/ingresos ni exportar estos datos.
3. Consultar un rango válido sin movimientos y comprobar ceros por día, no un
   vacío ambiguo. Introducir un rango invertido y otro de 367 días: mostrar
   validación sin usar el resultado anterior como si fuera del nuevo rango.
4. Cerrar sesión: el reporte deja de verse. Iniciar sesión GERENCIA QA con
   `csv.manager@example.test`, seleccionar ALL_PROPERTIES y comprobar solo dos
   properties, GTQ/USD y las filas de Nueva York indicadas arriba. Volver a una
   propiedad y verificar que no permanecen filas de la otra.
5. QA de seguridad automatizada/HTTP cubre Guest 401, property ajena y ALL de
   RECEPCIÓN 403, filtros inválidos 400 y revocación. Reportar cualquier
   discrepancia visual o funcional con fecha/scope usado y resultado esperado.

Este recorrido debe confirmarlo el usuario con PASS/FAIL. El smoke HTTP del
agente y las pruebas RTL no constituyen confirmación manual ni verificación
visual Figma si el navegador de automatización no está disponible.
