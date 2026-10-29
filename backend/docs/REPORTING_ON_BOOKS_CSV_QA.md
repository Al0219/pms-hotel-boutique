# BE-010B-CSV-01 — QA CSV on-books diario

Contrato [BE-010A-CSV-01 aprobado](REPORTING_ON_BOOKS_CSV_CONTRACT_PROPOSAL.md)
por el usuario el 2026-10-21. Owner Backend Alan / BD1; consumidor WEB-3.
Trabajo continuado en `codex/reporting-arrivals-departures`, base `67ef77d`;
sin commit ni merge de este incremento.

Estado: **EN_QA — validación técnica y smoke HTTP PASS; QA manual del usuario pendiente.**
La aprobación del contrato y el QA JSON del 2026-10-20 no cierran este incremento.

## Validaciones automatizadas

- Backend Java 21/PostgreSQL 17: serialización UTF-8/BOM/CRLF, escape y
  neutralización de fórmulas, 50 000/50 001 filas, rango inclusivo 366/367,
  sesión/permisos/scope, multi-room/OOO/OOS y sobreventa.
- Audit real por actor/property, metadatos de allowlist y correlación de
  generación; prueba sin transacción de test que inserta en PostgreSQL el
  primer evento y falla en el segundo: rollback total y HTTP 503 sin attachment.
- Servlet HTTP real: 406 no redispatch a `/error`, filtros 400, fallo 503 y
  métodos no permitidos sin generar archivos. OpenAPI binario, parámetros,
  errores, Bearer Staff, headers y paridad de mappings.
- Web: BFF preserva bytes/BOM, valida MIME/nombre y elimina headers internos;
  transporte binario, un refresh Staff tras 401, sin retry de red/5xx;
  mapper obligatorio, filtros explícitos, doble clic, abort por sesión/scope,
  liberación del object URL y estados UI.

Gate Backend: `mvn -B --no-transfer-progress verify` en contenedor Maven/Java 21,
PostgreSQL 17 aislado. Equivalente reproducible desde raíz:
`docker compose -p pms-reports-csv-qa -f backend/compose.bd2-test.yaml run --rm verify`.
Gate Web desde `frontend/pms-hotel-web`: `npm run check`.
Además build Docker Web con `NEXT_PUBLIC_USE_MOCK_API=false`.

Logs/reportes/OpenAPI/JAR y resultados sanitizados se conservan localmente en
`backend/target/csv-qa/` ignorado. Los comandos de prueba no modifican el volumen
`pms-hotel-boutique_pms-hotel-postgres`, migraciones aplicadas ni secretos del hotel.

## Dataset de integración HTTP

Entorno exclusivo de esta tarea: red `pms-reports-csv-qa_default`, PostgreSQL
tmpfs y base `pms_csv_runtime` separada de la base de tests. Backend empaquetado
y Web con mocks desactivados. El dataset siguiente es **QA sintético persistido**,
no producción ni números inventados por UI:

- Hotel Boutique Demo con 24 Rooms; una reserva multi-room con tres Stay RESERVED
  para `[2035-01-01, 2035-01-03)`. Dos OOO solapados sobre la misma Room y un OOS
  sobre otra: cada noche da 1 OOO único, 23 disponibles, 3 on-books y 13.04%.
- Segunda property autorizada de GERENCIA en America/New_York/USD sin Rooms:
  capacidad cero, porcentaje null y `NO_AVAILABLE_ROOMS`.
- Tercera property EUR ajena al scope de los dos usuarios, excluida del CSV.
- RECEPCIÓN demo solo autoriza la property Demo; GERENCIA QA tiene exactamente
  Demo y la segunda property. Una generación PROPERTY produce un evento;
  ALL_PROPERTIES produce dos con correlación común. Cada generación nueva tiene
  otro UUID; no se acredita entrega de archivo.

Smoke comprueba login/session Staff HttpOnly, comparación JSON/CSV, dos noches,
scope denegado, Guest separado, filtros inválidos, 406 Backend/BFF, dos monedas,
capacidad cero y cinco eventos nuevos de tres generaciones. Consulta OpenAPI vivo y
HTTP `/reportes`; esto no sustituye ver la UI en un navegador.

## QA manual del usuario

Con el runtime QA aislado de Reportes activo en `http://localhost:13001`
(incluye el CSV y llegadas/salidas; el Compose principal usa 3001):

1. Iniciar Staff con `staff.demo@example.test` y la contraseña pública del seed
   demo `PmsDemoLocal2026!` (solo este entorno desechable).
2. Abrir Reportes → on-books; consultar del 2035-01-01 al 2035-01-02. Verificar
   property Demo, dos filas, 24 físicas / 1 OOO / 23 disponibles / 3 on-books /
   13.04%. Las tarjetas de una sola noche solo aparecen al consultar una noche.
3. Pulsar Exportar CSV. Comprobar archivo
   `on-books-daily_2035-01-01_2035-01-02.csv`, cabecera de 11 columnas,
   dos filas y valores coincidentes en fuentes sin cambios. El porcentaje CSV
   no lleva símbolo %. La UI dice archivo preparado, sin afirmar guardado.
4. Editar una fecha sin consultar: exportación deshabilitada. Aplicar fechas
   válidas y volver a descargar. Durante generación no se permiten doble envío
   ni cambios de fecha; salir/cambiar scope cancela la solicitud pendiente.
5. Verificar acceso por teclado, foco visible, texto de estado y ausencia de
   desbordamiento accidental en escritorio y móvil; la tabla conserva scroll
   horizontal. Contrastar el control con Figma V3 — 08 Reporting.
6. Salir de RECEPCIÓN e iniciar `csv.manager@example.test`, misma contraseña
   pública de QA. Seleccionar ALL_PROPERTIES y consultar las mismas dos noches:
   cuatro filas, dos properties autorizadas, GTQ/USD separados y capacidad cero
   explícita. La tercera property ajena no se enumera.
7. Confirmar PASS o registrar el fallo concreto. Backend permanece EN_QA hasta
   confirmación manual PASS, según `backend/AGENTS.md`.

La automatización visual falló al inicializar en los primeros intentos
(`failed to write kernel assets`). Un reintento posterior abrió el Compose
principal en `localhost:3001`: RECEPCIÓN consultó 2026-10-20 y vio 24 físicas,
0 OOO, 24 disponibles, 3 on-books y 12.50%; el botón Exportar CSV se habilitó
solo tras aplicar el rango y mostró «Archivo preparado para descargar» al
pulsarlo. Esto es smoke visual técnico del entorno demo principal, no cotejo
del contenido guardado ni QA manual PASS de la fixture aislada 2035. El entorno
QA aislado en `localhost:13001` no estaba activo al repetir esa inspección;
el Compose principal sí tenía PostgreSQL/Backend/Web healthy.
Las categorías financieras, cumplimiento, programación, vistas guardadas y otros
CSV continúan pendientes de sus contratos e incrementos respectivos.

## Evidencia de ejecución

- Backend final: `mvn -B --no-transfer-progress verify`, **883 pruebas PASS**,
  cero failures/errors/skipped y BUILD SUCCESS. Incluye tres regresiones Servlet
  HTTP real. JAR verificado ejecutado en el runtime Docker.
- Web final: `VITEST_MAX_WORKERS=4 npm run check`, **306 archivos / 1881 pruebas
  PASS**, lint/typecheck/build PASS. La primera ejecución sin límite de workers,
  concurrente con compilaciones y Backend, mostró timeouts de 5 s en pruebas
  previas de cuenta/reservas/habitaciones/booking y se interrumpió para repetirla
  con recursos acotados. No se modificaron sus tests, límites ni exclusiones.
- Imagen Web Docker con mocks false: build PASS. Login/sesión Staff y Guest
  reales, BFF CSV/JSON y controles de scope/errores: smoke PASS. La primera
  invocación del helper QA usó erróneamente POST Guest session (405); se corrigió
  el helper al login unificado vigente. No fue un fallo de producto ni motivó
  cambios de Auth.
- RECEPCIÓN: dos noches, 24 físicas, 1 OOO único, 23 disponibles, 3 on-books,
  13.04%, paridad JSON/CSV; ALL_PROPERTIES y property ajena 403. GERENCIA:
  exactamente dos properties autorizadas, GTQ/USD sin sumar y null explícito
  por capacidad cero. Evento por property y generación, sin PII ni evento global.
- Máximo HTTP real: usuario QA de límite con **250 properties × 200 noches =
  50 000 filas**, 5 800 146 bytes y **3.742 s**, 250 eventos de una generación.
  50 250 filas solicitadas devuelven 400 sin más eventos. Se usó otro Staff con
  memberships separadas; GERENCIA manual conserva solo sus dos properties.
- Memoria observada en el máximo, cgroup del contenedor: Backend actual
  528 535 552 → 551 870 464 bytes; pico acumulado 562 282 496 bytes. Web actual
  55 369 728 → 68 849 664 bytes; pico acumulado 92 061 696 bytes. Incluye JVM,
  Node y arranque; no es un delta de asignación aislado ni un SLA de producción.
- OpenAPI HTTP vivo: paths/components iguales al generado; 47 operaciones,
  36 paths, 56 schemas y 13 tags, sin exclusiones. BFF HEAD responde 405/no-store.
  Colección Postman actualizada y JSON válido; requests equivalentes ejecutadas
  por el smoke HTTP, sin atribuir una corrida Newman.
- `git diff --check` y enlaces nuevos PASS. Logs, métricas y reportes ignorados
  en `backend/target/csv-qa/`. SHA-256 del JAR final:
  `7afe8c87ed77da3a378f807dfa57149c0b5f19aee66b74216e22c76631d42108`.

La evidencia técnica inicial usó Web localhost:3001 y Backend localhost:18086.
El runtime QA actualizado de Reportes se sirve en Web localhost:13001 y Backend
localhost:18087 con la misma red y base aisladas; confirmar que ambos están
activos antes del recorrido manual. Docker Desktop se recuperó apartando su directorio temporal de sockets
en `run.csv-qa-backup`, sin reset de fábrica ni cambios a volúmenes del hotel.
Las herramientas visuales no inicializaron; la revisión visual/manual permanece
pendiente y el incremento no se declara COMPLETADA.
