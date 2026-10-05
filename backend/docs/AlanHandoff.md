# AlanHandoff — Seguimiento Backend

## BE-008B-AUTH-01 — Cierre con QA manual PASS (2026-10-05)

- **Estado:** COMPLETADA; QA manual ejecutado y confirmado PASS por el usuario.
  Rama `feature/bd1-staff-auth-audit-append-only`, base `722ce96`;
  sin commit/push/merge ni cambios de código o migraciones en este cierre.
- **Evidencia manual:** changeset `003-staff-auth-007` EXECUTED, trigger presente,
  INSERT permitido, UPDATE/DELETE rechazados con P0001, conservación del
  registro y rollback limpio según `docs/36_BD1_STAFF_AUTH_AUDIT_APPEND_ONLY_QA.md`.
- **Pruebas ya validadas:** focalizados 8 PASS y
  `mvn -B --no-transfer-progress verify` 338 PASS, cero failures/errors/skipped,
  en PostgreSQL 17/Java 21. No se repiten en este cierre documental;
  `git diff --check` PASS. CI remoto no ejecutado: rama sin publicar.
- **Límites/revisiones:** cierre exclusivo de AUTH-01; resto de BE-008B y
  C6-D06 pendientes de sus incrementos. Revisiones BD2/BD3 colaborativas no
  bloqueantes salvo las excepciones del DoD común. Historial previo intacto.
- **Siguiente paso Backend:** acordar y registrar un incremento con DoR completo
  según prioridad de fase 1 (resto de BE-008B, BE-014B por dominio y BE-006B/C),
  confirmando contratos aplicables, dependencias, aceptación, archivos y pruebas.
  No hay otro incremento Backend READY registrado; no se inicia otra tarea
  ni se modifica su estado. Publicación sujeta a autorización explícita.

## BE-008B-AUTH-01 — Entrega en QA (2026-10-05)

- **Estado:** EN_QA; implementación y validación local PASS. QA manual del
  usuario pendiente; no se marca COMPLETADA ni se hizo commit/push/merge.
- **Rama/base:** `feature/bd1-staff-auth-audit-append-only`, desde `722ce96`;
  registro documental previo preservado.
- **Implementado:** changeset aditivo `003-staff-auth-007`, función y trigger
  propios sobre `auth_audit_events`: UPDATE/DELETE generan P0001; INSERT,
  rollback y registros existentes preservados. Sin cambios a emisores Staff,
  HTTP/BFF, roles/permisos ni consultas administrativas; C6-D06 sigue pendiente.
- **QA local:** 8 pruebas focalizadas PASS (7 nuevas y upgrade existente);
  `mvn -B --no-transfer-progress verify`: 338 PASS, cero failures/errors/skipped,
  BUILD SUCCESS con PostgreSQL 17/Java 21 en `compose.bd2-test.yaml`, proyecto
  `pms_bd1_authaudit`. Instalación limpia, master anterior con eventos legados,
  checksums/upgrade/reaplicación, mutaciones individuales/masivas, INSERT/rollback,
  protección Reservations/Guest y login/refresh/logout reales comprobados.
- **Guía:** `docs/36_BD1_STAFF_AUTH_AUDIT_APPEND_ONLY_QA.md`. Bloque SQL comprobado
  localmente: dos errores P0001, detalle/fecha conservados, contadores 1→0 y
  evento confirmado conservado. No sustituye QA manual del usuario.
- **Revisión:** `git diff --check` PASS; no se editaron changesets aplicados.
  CI remoto no ejecutado porque la rama no se publicó. Revisiones BD2/BD3
  colaborativas, bajo las excepciones del DoD común.
- **Siguiente paso:** el usuario ejecuta la guía y confirma QA manual; conservar
  EN_QA hasta entonces. Resto de BE-008B fuera de esta entrega.

## BE-008B-AUTH-01 — Inicio de implementación (2026-10-05)

- **Estado:** EN_PROGRESO; código autorizado por el usuario, sin commit/push/merge.
- **Rama/base:** `feature/bd1-staff-auth-audit-append-only`, desde `main`
  `722ce96`; se conservan los cambios documentales previos de AlanPlan/Handoff.
- **Alcance:** changeset 003 aditivo para impedir UPDATE/DELETE sobre auditoría
  Staff; pruebas PostgreSQL de instalación, upgrade/reaplicación, conservación,
  INSERT/rollback y regresión Staff. Sin HTTP/BFF ni cambios de Auth funcional.
- **Siguiente paso:** ejecutar pruebas relevantes y verify; dejar EN_QA con
  evidencia real y guía para QA manual del usuario.

## BE-008B-AUTH-01 — DoR de protección append-only Staff (2026-10-05)

- **Estado:** READY; planificación autorizada, sin implementación. Owner Alan / BD1;
  reviewers BD2/BD3 colaborativos bajo las excepciones del DoD común.
- **Base del registro:** `main` `722ce96`; árbol limpio al iniciar. Crear una
  rama nueva al autorizarse la implementación; no se creó rama de código.
- **DoR/evidencia:** BE-001/002/003 y BE-008A completas; C6-D01/D04 y su regla
  append-only aplicables. Tabla/emisores Staff inspeccionados: INSERT existentes,
  sin protección PostgreSQL contra UPDATE/DELETE. Patrón equivalente en 004;
  QA/CI Java 21/PostgreSQL 17 configurados. Sin decisión de negocio faltante.
- **Alcance:** changeset aditivo en SecurityAuth/003 para proteger
  `auth_audit_events`, con INSERT/rollback y datos legados preservados. Pruebas
  de persistencia, upgrade/reaplicación y regresión Staff; guía QA. Sin HTTP/BFF,
  módulo 008, lectura administrativa ni corrección C6-D06 en este incremento.
- **Validación del registro:** fuentes C6/BE-014A y esquema/emisores contrastados;
  `git diff --check` PASS; historial previo verificado intacto. Las pruebas de
  implementación aún no se ejecutaron.
- **Siguiente paso:** implementar únicamente AUTH-01 tras autorización; mantener
  EN_QA hasta QA manual ejecutado y confirmado PASS por el usuario. El resto de
  BE-008B sigue pendiente de sus incrementos; sin commit/push en este registro.

## BE-010B-ONBOOKS-01 — Actualización de seguimiento (2026-10-05)

- **Cierre técnico:** BE-010B ya está técnicamente cerrada; se conserva el estado registrado en la entrada histórica.
- **Revisiones:** BD2/BD3 y Web son seguimiento colaborativo no bloqueante. Solo pasan a bloqueo bajo las excepciones del DoD común vigente en AlanPlan.
- **Alcance:** BFF Web queda fuera del alcance Backend y corresponde a un incremento Web posterior.
- **Siguiente paso Backend:** acordar y registrar una nueva tarea con DoR completo. Actualmente no hay otro incremento Backend READY.

## BE-010B-ONBOOKS-01 — On-books diario Backend HTTP (2026-10-05)

- **Estado:** COMPLETADA e integrada en `main` por PR #109 (`7e0bda0`).
  El fix CI de conexiones quedó integrado por PR #110 (`5b2746e`). QA manual
  confirmada por el usuario; `verify-backend` y `verify-stack` de PR #109 PASS.
- **Rama/base:** `feature/bd1-daily-on-books-report` desde `main` actualizado
  `b5d6630` (PR #106 integra C7); árbol limpio al iniciar.
- **DoR:** C7 habilita On-books sin D03; Staff Auth/C2 y ATS SQL disponibles.
  Contrato HTTP Backend aprobado por usuario; BFF Web pendiente de su owner.
- **Plan/archivos:** consulta Inventory con SQL property-scoped, servicio Staff,
  controlador `GET /api/v1/reports/on-books/daily`, respuesta y errores públicos,
  pruebas PostgreSQL/HTTP, contrato doc34 y Postman BD1.
- **Implementado:** `DailyOnBooksRepository` filtra org/IDs antes de agregados
  por stay date; `DailyOnBooksService` valida sesión Staff/COMMERCIAL_MANAGE,
  PROPERTY/ALL_PROPERTIES, 366 noches/50 000 filas y porcentaje sin dividir
  por cero. HTTP exige filtros excluyentes, 400/401/403/200 y no-store;
  Postman contiene los dos modos Staff. Sin BFF Web ni CSV.
- **QA local:** 10 pruebas focalizadas PASS y `verify` completo 331 PASS,
  cero failures/errors/skipped, BUILD SUCCESS en PostgreSQL 17/Java 21.
  El PostgreSQL descartable de `compose.bd2-test.yaml` admite 200 conexiones
  para los contextos Spring y pruebas concurrentes. Guía
  `docs/35_BD1_DAILY_ON_BOOKS_QA.md`; Postman JSON y `git diff --check` PASS.
- **CI:** el primer intento de PR #109 agotó conexiones al iniciar Liquibase.
  La verificación local con PostgreSQL `max_connections=100` pasó con 331
  pruebas. PR #109 pasó `verify-backend` y `verify-stack` con el límite Hikari
  de pruebas (`d2c1a21`); PR #110 integró en `backend-ci.yml` pool máximo 2 y
  mínimo idle 0 para contener el consumo de conexiones de CI.
- **QA manual:** 200 por property y ALL_PROPERTIES; 401 sin Staff; 403 sin
  permiso, property ajena o falta de MULTI_PROPERTY_READ; 400 con scope doble
  o ausente, fechas invertidas y 367 noches. 366 noches válido; no-store, DTO,
  denominador cero y orden PASS, según confirmación del usuario.
- **Siguiente paso:** BD2/BD3 revisan paridad ATS/ReservationStay y el owner Web
  revisa el BFF. Tras esas revisiones, acordar y registrar la siguiente tarea
  Backend con DoR completo; no hay otro incremento Backend READY registrado.

## BE-010A-01 — Propuesta de reporting C7 (2026-10-04)

- **Estado:** COMPLETADA; el usuario revisó D01–D09 y aprobó iniciar On-books
  diario. Commit/push autorizados según flujo acordado.
- **Rama/base:** `feature/bd1-reporting-contract-c7` desde `main` actualizado
  `9ecd208`; PR #105 integra BE-016A y #104 Web público. Árbol limpio al iniciar.
- **DoR:** C2/BE-003 y esquemas Reservations, Inventory, Folio, Night Audit
  existentes; BE-010A puede inventariar datos y proponer fórmulas. BE-016B
  sigue separado: `.env` local carece de Resend/remitente y clave OTP; valores
  secretos no se imprimieron ni registraron.
- **Hallazgo:** stays y ATS permiten on-books por noche actual; FolioMovement
  no identifica ingreso habitación/servicio/impuesto ni business date; los
  cambios históricos y la capacidad OOO liberada no dan pace/denominador
  histórico reproducible. PAYMENT contable no equivale a capture de proveedor.
- **Alcance:** contrato `docs/33_BD1_REPORTING_CONTRACT_C7_PROPOSAL.md` con
  inventario, D01–D09, secuencia por KPI y QA. Sin API/SQL/Java ni nuevas rutas
  para la colección Postman.
- **QA local:** 9 enlaces locales, nueve decisiones D01–D09 y
  `git diff --check` PASS. QA manual de decisiones recibida; Maven no aplica:
  solo Markdown.
- **Decisiones:** D01/D02/D07/D09 aprobadas; D04 condicionada a D03; D05
  posterior; D06 parcialmente aprobada; D08 acceso inicial aprobado. CSV máximo
  366 días/50 000 filas. Primer reporte por property/stay date: físico, OOO,
  disponible, on-books y porcentaje; llegadas/salidas opcionales. No revenue.
- **Siguiente paso:** publicar la rama; tras merge, iniciar BE-010B On-books en
  rama nueva desde main actualizado y concretar contrato HTTP/BFF. D03 exige
  owner/fuente BD2/BD3 antes de métricas financieras.

## BE-016A-01 — Preflight Google/Resend de presentación (2026-10-04)

- **Estado:** COMPLETADA; QA manual confirmada por el usuario. Commit y push
  autorizados según el flujo acordado.
- **Rama/base:** `feature/bd1-presentation-google-resend-preflight` desde
  `main` actualizado `b60f465` (PR #103 integra OTP Backend); árbol limpio al
  iniciar.
- **DoR:** C3/BE-004 y BE-013B Backend integrados; adaptadores externos
  existentes. BE-016A no requiere credenciales reales para preparar el entorno.
- **Hallazgo:** el Compose habitual no pasaba
  `PMS_RESERVATION_LINK_OTP_HMAC_KEY`; la emisión OTP exige al menos 32 bytes.
- **Alcance:** passthrough de la clave OTP en Compose raíz y marcador vacío en
  `.env.example`; guía de preflight y actualización factual C3. No se agregan
  rutas HTTP, por lo que la colección Postman BD1 no cambia.
- **QA local:** `docker compose -f ../compose.yaml config --quiet`, enlaces
  locales, passthrough de clave, comando de longitud OTP con valores sintéticos
  y `git diff --check` PASS. No ejecutar Google o Resend sin
  entorno/credenciales de presentación; código/test de auth no cambia.
- **QA manual:** primera ejecución del usuario desde `backend/` con
  `-f compose.yaml` no encontró el archivo raíz; guía aclarada con los comandos
  válidos desde raíz y desde `backend/`. Repetición con
  `docker compose -f ../compose.yaml config --quiet` terminó sin errores.
- **Límites:** host, cuenta Google y buzón autorizados aún no identificados;
  login externo, cookies y recepción del correo siguen SIN VERIFICAR en BE-016B.
- **Siguiente paso:** publicar la rama; después preparar BE-016B cuando se
  identifiquen host, cuenta Google y buzón autorizados para evidencia real.

## BE-013B-BACKEND-01 — OTP histórico Backend (2026-10-04)

- **Estado:** COMPLETADA; el usuario confirmó las pruebas manuales sin errores
  y autorizó commit/push.
- **Rama/base:** `feature/bd1-historical-reservation-otp` desde `main`
  actualizado `1f6c30e` (PR #102); árbol limpio al iniciar.
- **DoR:** C3 y L-01 a L-07 aprobados; puerto Reservations vacío, lookup
  interno existente, EmailSender disponible; BD3 y Guest Web revisan integración.
- **Alcance:** desafíos/vínculos en 004 (depende de Reservations), emisión/verificación Guest con límites y
  auditoría segura, puerto BD3 y API BFF-only. Web BFF y Resend real fuera de
  esta rama.
- **Implementado:** lookup scoped por código/correo, OTP HMAC y desafío
  ligado a cuenta/sesión, emisión asíncrona, límites, vínculo único por
  Reservation, audit append-only y dos rutas Guest con anotaciones OpenAPI.
- **QA local:** 13 pruebas focalizadas y verify completo 321 PASS, cero
  failures/errors/skipped, BUILD SUCCESS con PostgreSQL 17/Java 21. Primera
  corrida completa detectó fixtures persistentes en tests nuevos; corregidos
  con limpieza y repetición sobre BD fresca PASS. Upgrade separado desde
  changelog pre-OTP: changeset 004-007 aplicado, 10 pruebas OTP PASS. Guía
  `docs/31_BD1_HISTORICAL_RESERVATION_OTP_BACKEND_QA.md`.
- **Límites:** Guest Web BFF, revisión BD3 y Resend de presentación pendientes.
- **Postman:** las dos rutas OTP están en
  `postman/BD1-Backend-APIs.postman_collection.json`; la guía QA explica
  variables, ejecución manual y dependencia del envío real.
- **Siguiente paso:** publicar la rama y solicitar revisión de BD3/Guest Web
  en PR; integrar BFF y verificar Resend en el entorno de presentación después.

## BE-013A-01 — Contrato OTP de reservas históricas (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó L-01 a L-07 y la entrega
  documental; commit y push autorizados.
- **Rama/base:** `feature/bd1-historical-reservation-otp-contract` desde
  `main` actualizado `eb088d7` (PR #101 integra FIN-01); árbol limpio al iniciar.
- **DoR/evidencia:** C3 aprueba referencia + correo Google verificado + OTP de
  10 minutos, cinco intentos, reenvío mínimo de 60 segundos y uso único.
  ReservationLinkService resuelve código/correo; el puerto Guest está vacío;
  GuestProfile tiene FK opcional a cuenta, sin vínculo por reserva.
- **Alcance:** contrato propuesta para puerto, endpoints/BFF, desafío,
  asociación específica de Reservation, concurrencia, idempotencia, privacidad
  y recuperación de entrega. No implementación ni proveedor en vivo.
- **QA local:** código/esquema/C3 y pruebas actuales de lookup contrastados;
  enlaces locales y `git diff --check` PASS. No aplica Maven: solo Markdown.
  QA documental y aprobación del usuario en
  `docs/30_BD1_HISTORICAL_RESERVATION_OTP_CONTRACT_PROPOSAL.md`.
- **Siguiente paso:** publicar la rama y esperar integración en `main`; después
  revisar el puerto con BD3/Guest Web antes de BE-013B. Pruebas externas separadas.

## BE-014B-FIN-01 — Acceso Staff a folio AD-02 (2026-10-04)

- **Estado:** COMPLETADA. El usuario confirmó que todas las pruebas manuales
  terminaron bien; commit y push autorizados.
- **Rama/base:** `feature/bd1-folio-staff-access-ad02` desde `main` actualizado
  `cbb8a51` (PR #100 integra OPS-01); árbol limpio al iniciar.
- **DoR:** AD-02 aprobada; C2, Staff Auth y resolver de PROPERTY existentes.
  FolioService recibe UUID/actorId crudos; FP-D02/04 y HTTP siguen propuestos.
- **Alcance:** puerto Staff interno para lectura y postings ordinarios/reversos,
  con permiso financiero, scope SQL y permiso extra sobre PAYMENT. Conservar
  contratos BD3 y dejar apertura/lifecycle/HTTP/proveedor fuera de esta entrega.
- **Implementado:** StaffFolioService revalida sesión/permisos/PROPERTY; busca
  folio y movimiento original por predicado de propiedad antes de delegar al
  motor contable. Los postings llevan actor de sesión y PAYMENT reversal exige
  PAYMENT_REFUND_VOID.
- **QA local:** 18 pruebas focalizadas y verify completo 310 PASS, cero
  failures/errors/skipped, BUILD SUCCESS con PostgreSQL 17/Java 21. Guía
  `docs/29_BD1_FOLIO_STAFF_ACCESS_QA.md`; QA manual del usuario PASS.
- **Siguiente paso:** publicar la rama y esperar su integración en `main`
  antes de iniciar otra tarea en rama nueva. FP-D02/04, apertura, lifecycle y
  API HTTP pendientes.

## BE-014B-OPS-01 — Inicio RBAC e intake Staff (2026-10-04)

- **Estado:** COMPLETADA. El usuario confirmó que todas las pruebas manuales
  terminaron sin errores; commit y push autorizados.
- **Rama/base:** `feature/bd1-service-request-intake` desde `main` actualizado
  `71911e1` (PR #99 integra AD-03); árbol limpio al iniciar.
- **DoR/evidencia:** AD-03 aprobada. C2 no contiene aún SERVICE_REQUEST_INTAKE;
  ServiceRequestService BD3 no recibe principal ni hace guard, y sus mutaciones
  por UUID permanecen internas. No hay controller de Operations. El modelo tiene
  cinco categorías; list usa scope SQL, get/transition usan findById.
- **Alcance:** nueva migración RBAC, entrada Staff protegida solo para
  open/get/list por PROPERTY y pruebas. Métodos BD3 de transición/assign,
  mensajería externa AD-04 y HTTP quedan pendientes de contratos/revisión.
- **Implementado:** changeset 003-006 asigna SERVICE_REQUEST_INTAKE a RECEPCION
  y SUPER_ADMIN; StaffServiceRequestService valida sesión/permiso/property,
  deriva actor y valida vínculos scoped antes del servicio BD3. Detalle/lista
  consultan SQL por property; no se expone HTTP.
- **QA local:** 9 pruebas focalizadas PASS; verify completo 306 PASS, cero
  failures/errors/skipped, JAR y BUILD SUCCESS en PostgreSQL 17/Java 21.
  Guía `docs/28_BD1_SERVICE_REQUEST_INTAKE_QA.md`; QA manual del usuario PASS.
- **Siguiente paso:** publicar esta rama y esperar su integración en `main`
  antes de crear la rama siguiente. Integración BD3/Web, guard de transiciones
  y contrato HTTP siguen pendientes.

## BE-014A-OPS-01 — Propuesta de acceso Recepción AD-03 (2026-10-04)

- **Estado:** COMPLETADA. AD-03 y QA documental aprobadas por el usuario;
  commit/push autorizados en esta rama. BD3/Web revisan integración después.
- **Rama/base:** `feature/bd1-reception-service-access-ad03` desde `main`
  actualizado `ccf72a2` (PR #98); árbol limpio al iniciar.
- **DoR/evidencia:** C2 da OPERATIONS_MANAGE solo a SUPER_ADMIN/GERENCIA/
  OPERACIONES. ServiceRequestService tiene open/get/list y transiciones/assign;
  get y transiciones cargan por ID, list recibe scope explícito pero sin validar
  sesión. El modelo incluye CONCIERGE, VALET, HOUSEKEEPING, MAINTENANCE y OTHER.
- **Alcance:** proponer acceso limitado de Recepción a ServiceRequests en doc 21;
  AD-04 mensajería externa no se modifica. Sin código/SQL/API en esta fase.
- **QA local:** catálogo/roles C2, servicio, repositorio y categorías contrastados;
  nueve enlaces Markdown válidos y `git diff --check` PASS. Maven no aplica.
- **QA manual:** el usuario aprobó las dos filas y las cinco categorías el
  2026-10-04.
- **Siguiente paso:** publicar la rama; revisar integración con BD3/Web e
  implementar catálogo/guards en otra rama desde `main` actualizado. AD-04
  mensajería externa sigue pendiente.

## BE-014A-FIN-01 — Revisión de acceso financiero AD-02 (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó AD-02 y la QA documental; commit y
  push autorizados en esta rama. Revisión de integración financiera/Web pendiente.
- **Rama/base:** `feature/bd1-api-access-contract-approval` desde `main`
  actualizado `d258d60` (PR #97); árbol limpio al iniciar.
- **DoR/evidencia:** C2 contiene FOLIO_PAYMENT_OPERATE y PAYMENT_REFUND_VOID.
  RECEPCION posee solo el primero; AUDITOR no posee ninguno. FolioServiceImpl
  permite reverso de CHARGE/PAYMENT y rechaza ADJUSTMENT; PAYMENT es contable,
  no acredita devolución del proveedor. LocalOperationServiceImpl valida permiso
  y property desde la sesión Staff para operaciones locales futuras.
- **Alcance:** precisar propuesta AD-02 y corregir matriz documental en doc 21;
  BE-014A/FP-D02 siguen pendientes de aprobación aplicable. Sin código/SQL/HTTP.
- **QA local:** catálogo C2/servicios/propuesta FP-D02 contrastados; nueve
  enlaces Markdown válidos y `git diff --check` PASS. Maven no aplica a esta
  entrega documental.
- **QA manual:** el usuario aprobó las cinco filas de AD-02 el 2026-10-04.
- **Siguiente paso:** publicar la rama; revisar con owner financiero y Web antes
  de integrar implementación/API. AD-03 a AD-06 siguen abiertas y requieren
  incrementos o decisiones propios en ramas nuevas desde `main` actualizado.

## BE-006B-SCHEMA-01 — Invariantes Staff C4 (2026-10-04)

- **Estado:** COMPLETADA. El usuario confirmó QA manual sin errores y autorizó
  el cierre, commit y push según el flujo acordado.
- **Rama/base:** `feature/bd1-staff-admin-schema` desde `main` actualizado
  `5ba93ae`. `../docs/entregables/` preexistente queda intacto.
- **DoR/evidencia:** C4-D02/D06 aprobadas y BE-006A integrada. El changeset
  003 ya impone membership única por Staff. Faltan unicidad case-insensitive de
  workEmail, FK de property/organization y versión de concurrencia.
- **Alcance:** migración aditiva, guía de preflight y pruebas PostgreSQL.
  BE-006B CRUD/HTTP, BE-006C sesiones, auditoría C6 y BE-014A permanecen pendientes.
- **Implementado:** changeset 003-005 con `version` Staff, índice único para
  `lower(btrim(work_email))` y FK compuesta property/organization; `@Version`
  en StaffUser. Fixtures de upgrade fijados a changesets históricos.
- **Pruebas locales:** integración nueva 2 PASS; suite completa 302 PASS,
  cero fallos/errores, BUILD SUCCESS; focalizadas de constraints y upgrade
  histórico 8 PASS (incluye Staff preexistente con versión 0). Guía de preflight
  y QA: `docs/27_BD1_STAFF_SCHEMA_MIGRATION_QA.md`.
- **QA manual:** el usuario ejecutó las pruebas y reportó cero errores.
- **Siguiente paso:** publicar esta rama; después iniciar la siguiente tarea
  en otra rama desde `main` actualizado. Revisar datos reales con preflight
  antes de aplicar la migración fuera del entorno aislado.

## BE-006A — Aprobación y cierre del contrato Staff C4 (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó C4-D01 a D07 tras recibir la guía
  de revisión. BE-006B/C permanecen PENDIENTES de sus dependencias y del contrato
  HTTP/BFF final; revisión Web/BD2/BD3 pendiente para integración.
- **Rama/base:** `feature/bd1-staff-admin-contract-c4` creada desde `main`
  actualizado `fdc2ed3` (PR #95); C6 integrado por PR #94.
  `../docs/entregables/` preexistente queda intacto.
- **DoR/evidencia:** C1/C2 y BE-002/003/005 disponibles; C6 aprobado. Schema
  003 define StaffUser, roles, membership, sessions y refresh; BFF actual solo
  ofrece sesión Staff. No existe CRUD administrativo Staff. El PK compuesto de
  organization_memberships permite varias organizaciones para un usuario pese
  al único rol/membership C2, y `role_code` vive en StaffUser y membership.
- **Alcance/archivos:** contrato C4 propuesto en documento 26 y seguimiento;
  operaciones, scope, protección de administradores, revocación/audit,
  concurrencia y BFF. No modificar Java, SQL ni Web en esta tarea.
- **Hallazgos:** membership PK permite varias organizaciones; StaffUser.roleCode
  duplica el rol efectivo de membership; workEmail SQL es único con distinción de
  mayúsculas; el BFF solo tiene sesión/refresh, no CRUD. C4 propone constraints,
  sincronización y rutas candidatas, sin presentarlas como implementadas.
- **QA local:** seis enlaces Markdown válidos, fuentes C1/C2/C6 y schema/Java
  contrastados, `git diff --check` PASS. Maven no aplica: sin cambio de código.
- **QA manual:** el usuario aprobó documento 26/C4-D01 a D07. No se afirma que
  exista CRUD HTTP ni revocación administrativa funcional. Commit/push autorizados
  en la rama C4; `../docs/entregables/` queda intacto.
- **Siguiente paso:** publicar la rama; preparar BE-014A/contrato API y
  migración/auditoría de BE-006B en otra rama desde `main` actualizado.

## BE-008A — Aprobación y cierre del contrato AuditTrail C6 (2026-10-04)

- **Estado:** COMPLETADA. El usuario aprobó C6-D01 a D06 tras recibir la guía
  de revisión manual. Revisión BD2/BD3 pendiente para integración; BE-008B
  continúa PENDIENTE por BE-014A y arquitectura/API específica.
- **Rama/base:** `feature/bd1-audit-contract-c6` desde `main` actualizado
  `ea50726` (PR #93 que integra COM-02). Sin commit/push de esta tarea;
  `../docs/entregables/` preexistente queda intacto.
- **DoR/evidencia:** C2/AUDIT_READ aprobado. AuditService y tabla
  reservation_audit_events ya ofrecen eventos append-only; Auth Staff usa
  auth_audit_events separado sin property/organización ni trigger append-only.
  Guest auth tiene una tabla separada. Consultas crudas actuales de AuditService
  no reciben scope y no se exponen como API administrativa.
- **Alcance/archivos:** propuesta C6 en documento 25, actualización de
  AlanPlan/Handoff; inventario, taxonomía, scope, consulta/paginación, detalle
  permitido, retención y decisiones/reviewers. No se cambió Java, SQL ni rutas.
- **Hallazgo relevante:** Auth Staff intenta persistir eventos de fallo y luego
  lanza StaffAuthenticationException bajo @Transactional; el rollback puede
  eliminar el evento y la revocación intentada. C6-D06 exige prueba/corrección
  en el incremento de implementación correspondiente; no se declara auditado
  el fallo de login en esta entrega.
- **Revisión local:** fuentes y roles C2 contrastados, cuatro enlaces Markdown
  válidos, sin trailing whitespace, `git diff --check` PASS. No aplica Maven por
  ser propuesta documental sin cambios Java/SQL/HTTP.
- **QA manual:** usuario aprobó la propuesta C6-D01 a D06; guía entregada en
  `25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md`. Commit/push autorizados en esta rama.
  El contrato no prueba un AuditTrail HTTP operativo.
- **Siguiente paso:** publicar rama; preparar BE-006A/C4 o cerrar dependencias
  BE-008B en otra rama desde `main` actualizado.

## BE-014B-COM-02 — Confirmación manual y cierre (2026-10-04)

- **Estado:** COMPLETADA. El usuario ejecutó los tests sin fallos y confirmó
  cerrar esta tarea; commit/push autorizados en su rama.
- **Rama/base:** `feature/bd1-commercial-scope`, creada desde `main` actualizado
  `d08383e`. `../docs/entregables/` ya estaba
  sin seguimiento y queda intacto.
- **DoR/evidencia:** COM-01 cerrado y presente en main; C2 y regla global de
  property scope exigen memberships, organización y SQL scoped. Inventario de los
  seis servicios muestra comprobaciones locales de scope sin vincularlo al snapshot
  y búsquedas por ID previas al filtro en Group, RoomBlock y Reward.
- **Alcance:** validar scope contra snapshot, limitar escrituras a PROPERTY y
  aplicar predicados SQL a vínculos Commercial con repositorios existentes/nuevos.
  No cambia permisos, endpoints, finanzas ni operaciones.
- **Entregado:** guard compartido vincula scope con organización y properties del
  snapshot, exige MULTI_PROPERTY_READ y conjunto completo para ALL_PROPERTIES,
  y PROPERTY para escrituras. Company/Agency de Group, Reservation de RoomBlock,
  Stay de Earn y entrada original de Reverse se cargan con predicado SQL scoped.
  Pickup limita reservas/stays a la propiedad del block. Sin rutas HTTP nuevas.
- **Pruebas locales:** cuatro suites comerciales 48 PASS (13 + 13 + 12 + 10),
  incluidos rechazos de scope fabricado y aserciones sobre repositorios SQL;
  verify completo 300 PASS, cero failures/errors/skipped, BUILD SUCCESS y JAR.
  Docker PostgreSQL 17, Java 21, wrapper Maven. `git diff --check` PASS.
- **Guía:** `24_BD1_COMMERCIAL_SCOPE_MANUAL_QA.md`, con comandos y resultados
  esperados para ejecución por el usuario.
- **Siguiente paso:** commit/push de esta rama; revisión BD3 durante integración.
  Abrir otra rama desde `main` actualizado para la siguiente tarea.

## BE-014B-COM-01 — Confirmación manual y cierre (2026-10-04)

- **Estado:** COMPLETADA para el incremento comercial. El usuario ejecutó los
  comandos de `22_BD1_COMMERCIAL_MANUAL_QA.md` sin errores y confirmó cerrar
  esta tarea. La suite local previa sigue en 270 tests PASS (45 comerciales),
  Java 21/PostgreSQL 17, JAR y `git diff --check` PASS.
- **Rama/base:** `feature/bd1-commercial-permissions` sobre `9003567`.
  Commit y push autorizados por el usuario tras su QA; registrar hash y remoto
  en la respuesta de publicación. `main` no se modifica.
- **Alcance cerrado:** permiso C2 COMMERCIAL_MANAGE en los seis servicios
  internos. No se publican rutas HTTP comerciales en este incremento; el
  contrato HTTP, la sesión/actor en nuevos controllers y el scope SQL adicional
  pertenecen a las entregas BE-014B posteriores.
- **Siguiente paso:** commit/push de la rama; revisión BD3 durante integración.
  Abrir otra rama al iniciar la siguiente tarea de implementación y repetir
  entrega de pruebas manuales antes de su cierre/publicación.

## BE-014B-COM-01 — QA manual solicitada (2026-10-04)

- **Estado:** EN_QA. El usuario definió una regla permanente: presentar pruebas
  manuales al finalizar cada tarea; esperar su resultado y confirmación antes
  de COMPLETADA, commit y push. Esta entrega todavía no tiene confirmación manual.
- **Rama/base:** `feature/bd1-commercial-permissions`, main `9003567`.
  No se ha creado commit, hecho push ni cambiado main.
- **Guía entregada:** `22_BD1_COMMERCIAL_MANUAL_QA.md`. Desde `backend/`, ejecutar
  las cuatro suites comerciales en Compose con PostgreSQL 17 y wrapper Maven;
  comprobar 45 tests PASS (13 + 13 + 12 + 7), cero failures/errors/skipped y
  revisar `target/surefire-reports/`. El comando de limpieza está en la guía.
- **Evidencia automática previa:** verify completo local 270 tests PASS, Java 21,
  PostgreSQL 17 y wrapper Maven 3.9.16; `git diff --check` PASS. No sustituye
  la ejecución/confirmación del usuario.
- **Límite verificable:** estos servicios aún no tienen API HTTP Commercial;
  la guía comprueba servicios internos con Spring/PostgreSQL, no login ni Postman.
- **Siguiente paso:** recibir resultado del usuario; corregir fallos si aparecen.
  Tras confirmación, actualizar AlanPlan/Handoff a COMPLETADA y hacer commit/push
  en esta rama. La revisión BD3 corresponde al flujo de publicación posterior.

## BE-014B-COM-01 — Implementación y QA local PASS (2026-10-04)

- **Estado:** EN_QA — implementación y revisión local PASS. Revisión de owner BD3
  y publicación pendientes; no se marca todo BE-014B como COMPLETADO.
- **Rama/base:** `feature/bd1-commercial-permissions` creada antes del código;
  main `9003567` conserva su commit. Sin commit/push/PR; planificación previa
  local preservada y entregables externos al backend intactos.
- **Decisión:** usuario aprobó explícitamente AD-01/COMMERCIAL_MANAGE.
  AD-02 a AD-06 y contratos HTTP de los otros dominios no están aprobados aquí.
- **Entregado:** CommercialAuthorization.requireManage comprueba permiso efectivo
  y falla ante snapshot ausente o permissions nulo. Company/Agency/EventGroup/
  RoomBlock/Promotion/Reward sustituyen todos sus requireSuperAdmin, incluyendo
  llamadas delegadas de RoomBlock. Interfaces documentan el contrato interno C2.
  SUPER_ADMIN también necesita el permiso en su snapshot; C2 ya lo asigna junto
  a GERENCIA. No se crea B2B_MANAGE ni se modifica catálogo/migraciones/roles.
- **Pruebas:** fixtures SUPER_ADMIN reflejan COMMERCIAL_MANAGE real; ciclos de
  empresa/agencia/grupo/block/promo/rewards parametrizados para GERENCIA y
  SUPER_ADMIN; aislamiento existente probado también como GERENCIA. Nueva suite
  deniega lecturas/escrituras de los seis servicios antes de lookup para roles sin
  permiso, snapshot null y permission set null; incluye rechazo de redeem.
- **QA enfocada inicial:** wrapper Maven 3.9.16 en Java 21/PostgreSQL 17,
  cuatro suites seleccionadas, 42 tests PASS. Se agregaron luego tres variantes
  de aislamiento y una aserción de redeem; la suite completa final incluye todo.
- **QA completa inicial:** compose original con Maven de imagen 3.9.11,
  270 tests PASS. Como el wrapper fija 3.9.16, se revalida el DoD con éste.
- **QA final obligatoria:** `./mvnw -B --no-transfer-progress verify`, wrapper
  Maven 3.9.16, Temurin 21/PostgreSQL 17 desechable; BUILD SUCCESS, 270 tests,
  0 failures, 0 errors, 0 skipped y JAR empaquetado. De éstos, 45 comerciales:
  CommercialService 13, GroupService 13, PromotionReward 12, CommercialPermission 7.
  Auth, Inventory, Reservations y otras regresiones incluidas sin exclusiones.
- **Comando reproducible desde backend:** crear override Compose con
  `services.verify.command: ["./mvnw", "-B", "--no-transfer-progress", "verify"]`;
  ejecutar `docker compose -p pms-bd1-commercial-qa -f compose.bd2-test.yaml
  -f /tmp/pms-bd1-wrapper-verify.yaml up --abort-on-container-exit
  --exit-code-from verify`. Override y log `/tmp/pms-bd1-wrapper-verify.log`
  son artefactos locales efímeros; no hay secretos de aplicación ni puertos host.
- **Revisión:** cambio Java limitado a comprobación de permiso/comentarios;
  scope, lifecycle, dinero y auditoría existentes conservados. Diff --check PASS;
  sin cambios resources/pom/workflows. No prueba Google/Resend/providers en vivo.
- **Límites:** APIs Commercial todavía no existen. Snapshot/scope/actor internos
  mantienen sus firmas; antes de HTTP se requieren sesión activa, actor confiable
  y hardening SQL de recursos relacionados descritos en documento 21.
  Este incremento no declara completa la protección transversal ni acceso Guest.
- **Siguiente paso:** revisión BD3 del incremento y publicación al autorizarse;
  continuar hardening de acceso interno/SQL en rama nueva para la siguiente tarea.
  Acordar AD-02 con BD2 sin asumir aprobación de políticas financieras.

## BE-014B-COM-01 — Inicio del permiso comercial (2026-10-04)

- **Estado:** EN_PROGRESO. AD-01 aprobado por el usuario; otras decisiones pendientes.
- **Rama/base:** `feature/bd1-commercial-permissions` creada antes de editar;
  base commit `9003567`, documentación previa conservada, sin commit/push/PR.
- **DoR:** aprobación explícita COMMERCIAL_MANAGE, permiso C2 existente y
  asignado a GERENCIA/SUPER_ADMIN. Sin nuevos roles/permisos/migraciones.
- **Alcance/archivos:** guard compartido de permiso en seis servicios Commercial,
  contratos internos actualizados y pruebas positivas/negativas de regresión.
- **Límite:** este incremento no publica REST ni completa sesiones/actor/scope
  de nuevas APIs. Los hardenings relacionados del documento 21 siguen pendientes.
- **Validación prevista:** suites Commercial enfocadas, verify completo Java 21/
  PostgreSQL 17 aislado en Docker, diff y handoff. Socket Docker requiere escalación.
- **Siguiente paso:** cambiar guards y fixtures según catálogo real; ejecutar QA.

## BE-014A — Propuesta preparada para revisión (2026-10-04)

- **Estado:** EN_QA; revisión documental local PASS. Documento 21 PROPOSED;
  no aprobado y BE-014B PENDIENTE. No se declara protección funcional implementada.
- **Rama/base:** `feature/bd1-api-access-contracts`, main `9003567`; creada antes
  de editar esta entrega. Sin commit/push/PR. Instrucción de rama nueva por tarea
  registrada en AlanPlan; los cambios anteriores siguen preservados.
- **Entregado:** documento 21: nueve permisos/roles contrastados con SQL C2,
  superficies y brechas reales, matrices Reservations/Finanzas/Operations/
  Commercial/Audit/Guest, contexto/scope/actor/transporte/errores, seis decisiones
  y acceptance para cada incremento BE-014B. No inventa endpoints de dominios
  que aún no tienen controllers ni confirma propuestas financieras de BD2.
- **Hallazgos nuevos:** Staff/Guest filtros restringidos a prefijos Auth; Inventory
  tiene chain dedicada. Seis servicios comerciales tienen guard SUPER_ADMIN,
  incluido RoomBlock que delega en EventGroup. Queries de detalle Reservation/Folio
  y enlaces/rewards requieren scope SQL antes de load. APIs externas siguen pendientes.
- **Propuesta inmediata:** AD-01 reutiliza COMMERCIAL_MANAGE para empresas,
  agencias, grupos/blocks/promociones/rewards; AD-02 reutiliza permisos financieros
  C2, añade condición PAYMENT_REFUND_VOID para reverso PAYMENT y conserva AUDITOR
  sin lectura financiera implícita. Son decisiones propuestas, no cambios al catálogo.
- **Contradicción real AD-04:** regla global solo Recepción responde externamente
  frente a C1 SUPER_ADMIN todas las funciones. No implementar autorización de ese
  flujo hasta decisión registrada; otros dominios pueden avanzar con su propio DoR.
- **Validación:** script documental PASS: 9 enlaces existentes, 10 referencias
  explícitas de clases, 6 guards Commercial (incluye delegación RoomBlock), 9 códigos
  del SQL y AD-01 a AD-06. git diff --check PASS. Inspección de interfaces/servicios,
  chains y queries; sin Maven, sandbox externo o smoke funcional en esta entrega.
- **Pendientes/reviewers:** aprobación AD-01 con BD3/BD1 y AD-02 con BD2/BD1;
  AD-03/04 permisos y regla de mensajería, AD-05 master profile, AD-06 invoices.
  Reviewers previstos, sin contactos externos ni revisión de owners ejecutada.
- **Siguiente paso:** decidir AD-01 y preparar BE-014B Commercial en rama nueva,
  con guards/actor/queries/pruebas según contrato aprobado. Nunca trasladar esta
  propuesta a producción como si todos los contratos ya estuvieran CONFIRMED.

## BE-014A — Inicio de matriz de acceso transversal (2026-10-04)

- **Estado:** EN_PROGRESO — propuesta documental; BE-014B permanece PENDIENTE.
- **Rama/base:** `feature/bd1-api-access-contracts`, creada desde main `9003567`
  antes de modificar esta entrega. Sin commit/push/PR.
- **Autorización:** usuario permite iniciar y exige una rama nueva por tarea.
  Esta regla queda también en AlanPlan; no se trabaja directamente en main.
- **DoR de preparación:** BE-002/003/005 completadas según registro; C1/C2/C3 y
  documento 20 revisados; interfaces y SQL del catálogo real inventariados.
  No hay contratos HTTP publicados para Operations/Commercial/Reservations;
  la matriz no inventa sus rutas y registra revisión pendiente de BD2/BD3.
- **Alcance:** proponer reutilización C2, matriz por operación y brechas de
  autorización/scope/actor; criterios para futura implementación por dominio.
- **Archivos:** nuevo contrato de acceso propuesto, AlanPlan y AlanHandoff.
- **Cambios previos:** planificación local de la sesión anterior conservada;
  entregables en raíz no se modifican. Java/SQL/permisos siguen sin cambios.
- **Siguiente paso:** preparar documento 21 y revisar referencias/cobertura;
  después obtener decisiones aplicables antes de código BE-014B.

## BD1-PLAN-20261004 — Plan de las once responsabilidades de Alan

- **Fecha/base:** 2026-10-04; checkout local main `9003567`, PR #73 integrado.
- **Estado:** planificación documental preparada y revisada; todas las nuevas
  implementaciones PENDIENTES. No aprueba contratos ni declara trabajo funcional completo.
- **Solicitud:** organizar protección de APIs/permisos, integraciones/channels,
  reportes/export/KPIs, Staff/memberships/sesiones, MFA/privacidad, AuditTrail,
  OTP histórico, Google/Resend de presentación y adapters pagos/mensajería.
- **Rama/commit/PR de esta entrega:** sin rama nueva, commit, push ni PR; cambios
  documentales locales en los dos archivos solicitados. No se ha iniciado código.
- **Cambios previos conservados:** AlanPlan tenía actualizaciones locales del
  registro de módulos y tareas BE-006 a BE-013; se integran/amplían sin eliminar
  su alcance. `docs/entregables/` en raíz estaba sin seguimiento y no se modifica.
- **Entregado:** AlanPlan mapea 11 requisitos, orden de fases y coordinación,
  contratos/decisiones pendientes, DoR/aceptación/archivos/reviewers por tarea y
  DoD común. Conserva BE-001 a BE-005 y BD2; desglosa BE-006/007/008/010/011/012/013
  y añade BE-014 acceso, BE-015 adapters, BE-016 presentación y BE-017 cierre.
- **Base técnica comprobada:** controllers actuales Auth/Inventory; servicios y
  esquema Reservations/Operations/Commercial existentes; Promotions/Rewards con
  SUPER_ADMIN provisional. GuestProfile y ReservationLinkService ya existen;
  ReservationLinkVerificationPort sigue vacío. Google/Resend tienen adapters,
  pero no se validaron externamente en esta revisión.
- **Contratos vigentes:** C1/C2/C3. Roles fijos consultables/asignables; CRUD de
  roles personalizables exigiría modificar C2. MFA Staff requiere modificar C1
  y aprobar C8. Documento financiero 20 permanece PROPOSED. C4-C9, matriz nueva
  y SPIs/provider requieren revisión/aprobación; SH-D01 se coordina con BD2.
- **Reviewers previstos:** BD2 por finanzas/inventario/dedupe/providers; BD3 por
  reservas/operaciones/comercial/mensajería/OTP; consumidores y producto cuando
  cambien contratos, fórmulas o política. No se han enviado mensajes externos.
- **Validación de esta entrega:** lectura de docs/AGENTS/XLSX, contratos y código;
  cobertura 1-11, IDs/dependencias/referencias, diff y git diff --check revisados.
  Sin cambios Java/SQL/seguridad/configuración ni ejecución Maven: la evidencia
  histórica de 254 tests PASS no valida las implementaciones pendientes.
- **Pendientes:** acordar matriz de acceso, C4/C6 y SH-D01; proveedores/sandbox,
  fórmulas C7, C8/C9 y entorno de presentación sin confirmación en este plan.
- **Siguiente paso:** preparar BE-014A con owners BD2/BD3; después contratos
  BE-008A/C6 y BE-006A/C4. BE-016A y los otros contratos independientes pueden
  avanzar sin esperar finanzas. Marcar READY solo al completar DoR de cada incremento.
## BE-HANDOFF-001 — Traspaso BD2: entrega (2026-10-03)

- **Estado:** COMPLETADA — preparación documental, aceptación/DoD y revisión local
  Codex PASS; rama chore/backend-demo, sobre f5fc545. No cierra tareas de negocio.
- **Autoridad:** usuario deja implementación Backend y se enfoca en Frontend;
  BD1/BD3 continúan el Backend. Solicita commit/push y lista de entregas/pendientes.
- **Entregado:** documento 23 con inventario, ramas verificadas, tareas y límites;
  ownership global y tracking actualizados sin alterar la autoría histórica.
- **Inspección:** los cuatro worktrees BD2 están limpios y sus entregas publicadas.
  En main solo hay una copia no versionada de Backend-Demo: hash idéntico al JSON
  ya publicado en f5fc545; no requiere otro commit ni se borra la copia del usuario.
- **Validación:** origin/main 54f7dbd; fase 0 a2241d6 y scope be09de4 integrados;
  idempotencia e5421f9 y demo f5fc545 publicados, no integrados.
  Cinco documentos revisados, siete enlaces locales válidos y 12 tareas cubiertas.
  Diff --check PASS. Solo Markdown: no se repite Maven; evidencia anterior de
  verify 281 tests y Postman 53/81 se conserva como histórica, no nueva ejecución.
- **Publicación:** commit/push solicitado explícitamente por el usuario, en
  chore/backend-demo; sin commits a main ni merge/rebase. Revisión/CI de las
  entregas de código sigue pendiente. No se duplican commits ya publicados.
- **Pendiente receptores:** integrar financial-foundation antes de demo/handoff,
  acordar reparto detallado y contratos, y continuar implementación Backend.
  José cambia su foco a Frontend; propuestas de reparto no son aprobación implícita.

## BE-DEMO-001 — Presentación simplificada: entrega (2026-10-02)

- **Estado:** EN_QA — aceptación/DoD local PASS; revisión BD1/CI de PR pendientes.
  Rama chore/backend-demo, base e5421f9;
  checkout principal main intacto. Trabajo financiero siguiente permanece pendiente.
- **Autoridad:** usuario solicita un Compose con todo el backend y usuario de prueba
  listo, evitando pasos manuales. Se reutilizan runtime y bootstrap BD1.
- **Entrega:** compose.demo.yaml independiente con volumen de demostración y puerto
  loopback, una colección Postman con variables locales y datos creados por API;
  instrucciones breves y tracking. Sin nuevas rutas, migraciones ni cambios Java.
- **QA runtime:** build/arranque con un comando PASS; PostgreSQL/backend healthy,
  health UP, Swagger/OpenAPI reales. Bootstrap por servicio BD1, sin bypass de auth.
  Restart/recreate del backend conserva propiedad previa y exactamente un Staff
  demo; Liquibase reaplica cero cambios de los 18 existentes.
- **QA Postman:** colección sin environment externo, 53 requests/81 assertions,
  0 failures; repetición tras restart: 53/81 PASS. IDs/tokens se propagan solos.
  Tipo sin Room ATS=0; con una Room ATS=1; RatePlan conserva ATS. Negativos y
  logout/revocación correctos. No hay SQL manual para crear fixtures comerciales.
- **QA completa:** `./mvnw -B verify` en copia temporal Linux, Java 21/PostgreSQL 17,
  BUILD SUCCESS: 281 tests, 0 failures/errors/skipped. Base de tests separada de demo.
  Sin omitir pruebas, cambiar workflow, Java, migraciones o dependencias.
- **Revisión:** ocho archivos de Compose/colección/docs/tracking; diff --check PASS.
  Config resuelta contiene solo backend/postgres y volumen demo; no modifica el
  Compose habitual ni su base. Reportes/logs y helpers privados fuera del repo.
- **Integración:** origin/main actualizado a 3ff0061; desde 131448e solo cambiaron
  archivos de despliegue Web, no backend/compose.yaml/workflow Backend.
  Rama dependiente de financial-foundation e5421f9 para incluir la última base
  local BD2. PR de demo contra esa rama; si ya se integra, revisar contra main.
- **Publicación:** commit/push por entrega conforme a autorización vigente.
  Reviewer BD1 para runtime compartido; no se afirma aprobación remota localmente.
  Se deja demo encendida en localhost:18080; se retira solo el proyecto de QA.
  Tareas nuevas de Folio/Payments/lifecycle permanecen pendientes como solicitó el usuario.

## BD2-FP-001 — Idempotencia local: entrega (2026-10-02)

- **Estado:** EN_QA — aceptación/verify local PASS; revisión BD1/BD3 pendiente.
  Rama feature/bd2-financial-foundation, sobre be09de4; worktree aislado.
- **Autoridad:** usuario aprueba explícitamente la propuesta SH-D01 local.
  Contrato implementable y límites registrados en documento 21 antes de código.
- **Entrega:** callback local autorizado con actor/scope BD1, fingerprint
  canonicalizado/versionado, recibo append-only y lock transaccional PostgreSQL.
  No crea módulo, API, permiso o flujo de pago; no llama proveedores.
- **Integración necesaria:** ReservationsSchemaUpgradeTests fijaba 17 cambios y
  tres triggers. Nuestra migración rompe ese supuesto: ahora compara con el master
  instalado, incluyendo identidades/checksums y triggers, sin debilitar upgrade,
  reaplicación, tablas o seed. No se corrige Night Audit ni otro trabajo BD3.
- **QA final:** `./mvnw -B verify` completo, Java 21/PostgreSQL 17: BUILD SUCCESS,
  281 tests, 0 failures, 0 errors, 0 skipped; 22 nuevos (5 unitarios y 17 de
  integración). Sin exclusiones ni cambios de workflow/configuración.
  Conexiones independientes verifican espera hasta commit, conflicto concurrente
  y recuperación tras rollback. Fallo de audit durante commit revierte movimiento,
  recibo y evento. Revocación, scope y permisos se recalculan también al reintentar.
  Guardas rechazan read-only/aislamiento incompatible; constraints/append-only
  se prueban en PostgreSQL, no solo mediante mocks.
- **Migración:** master crece a 18 changesets; se agrega 004-reservations-006.
  Upgrade desde baseline de seis, identidades/checksums del master vigente,
  reaplicación, tablas/triggers y seed preservados; no se alteran changesets previos.
- **Integración actual:** origin/main 131448e ya contiene be09de4 (PR #77).
  `git diff HEAD origin/main -- backend .github/workflows/backend-ci.yml` vacío
  antes del nuevo commit; cambios restantes de main son solo despliegue Web.
  El backend/workflow que se verificó coincide con la base de integración actual,
  sin merge/rebase ni modificaciones en el checkout principal main.
- **Revisión local:** 15 archivos previstos; cambios limitados a puerto/repo,
  nueva migración, tests y cinco documentos. Sin artefactos temporales ni secretos.
  git diff --check PASS. Revisión de PR y checks GitHub pendientes de publicación.
- **Entrega/siguiente paso:** commit/push por incremento autorizado; PR hacia main
  con BD1 para base compartida y BD3 para adaptación del test de upgrade.
  Acordar FP-D02 antes de implementar lectura HTTP de folio.
- **Límites posteriores:** contrato HTTP/lectura, escrituras financieras y
  recovery de efectos externos mantienen sus aprobaciones pendientes.

## BD2-FP-001A — Inicio de base financiera (2026-10-02)

- **Rama/base:** `feature/bd2-financial-foundation`, origin/main `5419606`.
  Worktree aislado; main principal intacto.
- **Estado:** EN_QA — aceptación y verify local PASS; revisión BD1 pendiente.
  Prerrequisito de scope, no cierre de Fase 1.
- **Autoridad:** usuario solicita empezar Fase 1; C2 obliga a restringir SQL
  antes de leer. El nuevo ownership asigna folios a BD2, sin duplicar servicios.
- **Archivos previstos:** FolioRepository, getFolio en ReservationQueryServiceImpl,
  pruebas FolioScopeIntegrationTests y seguimiento. Sin endpoints nuevos.
- **Regresión original:** cinco pruebas PostgreSQL, tres fallos demostrados:
  carga de folio ajeno, carga antes de rechazar scope ausente y error diferente
  para folio ajeno/inexistente. Sin errores ni pruebas omitidas.
- **Corrección:** findByIdAndPropertyIdIn en repositorio; getFolio valida scope
  antes de query y devuelve folio no encontrado para ID ajeno/inexistente.
  No se cambian consultas de reservas ni interfaces públicas existentes.
- **Validación final:** `./mvnw -B verify` completo, Java 21/PostgreSQL 17,
  BUILD SUCCESS: 259 tests, 0 failures, 0 errors, 0 skipped. Las cinco pruebas
  nuevas pasan; compilación, migraciones y suites existentes preservadas.
  Sin exclusiones, cambios al workflow ni cambios a módulos BD1/operaciones.
- **Revisión local:** diff limitado a cinco archivos previstos; sin esquema,
  API, dependencia, configuración local o credenciales nuevas. Main intacto.
- **Entrega:** commit/push por incremento autorizado previamente por el usuario;
  rama `feature/bd2-financial-foundation`, revisión propuesta BD1 antes de merge.
- **Decisión pendiente en esa entrega:** SH-D01: clave/payload/alcance/retención y persistencia
  local de idempotencia. Consulta explícita al usuario; no inferir aprobación.
- **Propuesta consultada:** base local en el módulo existente; clave opaca de
  8–128 caracteres; unicidad por Staff/property/operación/clave; payload validado
  y canonicalizado sin secretos; mismo payload recupera resultado y distinto
  genera conflicto; registro y efecto en una transacción; sin caducidad
  automática ni llamadas a proveedores. El usuario la aprobó posteriormente;
  contrato y nueva entrega registrados arriba en BD2-FP-001.
- **Siguiente paso vigente:** revisión del incremento de idempotencia local.

## BD2-FP-000 — Fase 0 financiera y lifecycle (2026-10-02)

- **Rama/base:** `feature/bd2-finance-lifecycle-contracts`, origin/main `9eb2380`.
  Worktree aislado; checkout principal en main, limpio.
- **Estado:** COMPLETADA — preparación documental y revisión local PASS.
  Reparto/plan autorizados; contratos nuevos PROPOSED, sin aprobación implícita.
- **Entregado:** documento 19 (capacidades/brechas, ownership, interfaces entre
  equipos, decisiones pendientes, 12 tareas/dependencias/aceptación) y documento
  20 (propuesta de lectura folio, DTO/errores/permisos, idempotencia y contratos
  semánticos de todos los flujos). DEC-B-008 y Team Structure registran el reparto.
- **Hallazgos:** reutilizar Folio/Query/Booking/Audit existentes; reforzar scope
  en detalle, reversos concurrentes, posting/cierre, asignación física y snapshots
  de tarifa/política. PAYMENT contable no sustituye capture/refund del proveedor.
  Master folio comercial/HK/night audit siguen coordinados con BD3; integración
  provider/Auth/callback con BD1. No se modificaron implementaciones ajenas.
- **Validación:** lectura de docs globales/XLSX/AGENTS, revisión de fuentes actuales,
  11 referencias locales existentes, 12 tareas cruzadas y Markdown/diff revisados.
  git diff --check PASS. Sin cambios Java/SQL/workflow/dependencias; no se ejecutó
  Maven nuevamente: los 254 tests PASS corresponden al cierre anterior integrado.
- **Publicación:** commit/push de esta entrega documental conforme a autorización
  vigente; PR hacia main. Reviewers BD1/BD3 y consumidores según alcance del contrato.
- **Pendientes:** proveedor/sandbox, garantía pública, política de folio, invoices,
  cancelación/no-show/waitlist/move/extensión y SPIs, sin asumir respuestas.
- **Siguiente paso:** acordar SH-D01 para la fase 1 y FP-D02 para lecturas scoped;
  completar DoR correspondiente antes de código. No todas las decisiones pendientes
  deben resolverse para comenzar una entrega independiente.

## BD2-010 — Cierre de integración con BD3 (2026-10-02)

- **Rama/base:** `feature/bd2-integration-closeout`, origin/main `345481b`.
  Worktree aislado; checkout principal en main sin modificaciones.
- **Estado:** COMPLETADA. PR #72 integrado en main `9eb2380`; el usuario confirma
  revisión aprobada y checks GitHub exitosos. Evidencia local registrada abajo.
- **BD3 confirmado:** `faa7876` conecta booking al InventoryAdmissionPort con
  demanda conjunta; su stub ATS es @Primary solo en tests. El contexto completo
  prueba el motor real y el contrato sin puerto se prueba separadamente sin Spring.
  Las dos suites que bloqueaban la integración ahora pasan sin parches ajenos.
- **Regresiones entregadas:** seis pruebas en InventoryBookingIntegrationTests,
  con servicios BD2/BD3 y changelog completos en un schema PostgreSQL exclusivo.
  ATS disminuye exactamente uno; padre cancelado libera; demanda solapada se suma;
  noches adyacentes comparten capacidad; fallo tardío revierte perfil, reserva,
  stays y auditoría; OOO resta y OOS conserva capacidad. Dos bookings concurrentes
  para la última unidad esperan el lock hasta el commit exterior: solo uno confirma.
- **Validación base:** main actualizado, `./mvnw -B verify`: BUILD SUCCESS,
  248 tests, 0 failures, 0 errors, 0 skipped.
- **Validación final:** rama de cierre sobre ese main, mismo comando sin filtros:
  BUILD SUCCESS, 254 tests, 0 failures, 0 errors, 0 skipped; JAR empaquetado.
  Docker Temurin 21/PostgreSQL 17, wrapper Maven del proyecto y variables de CI
  en base desechable. Se incluyen esquema/upgrade/idempotencia, permisos/scope,
  HTTP/OpenAPI, catálogos y todas las suites BD3; workflow intacto.
- **Revisión:** diff limitado a la nueva suite BD2 y documentación; diff --check
  limpio. Sin cambios en producción, migraciones, BD3, credenciales o configuración local.
- **Cierre del alcance aprobado:** fases BD2 1–5 y C/R/U de Properties, RoomTypes,
  Rooms y RatePlans. Las evidencias Newman previas (40 solicitudes/58 assertions)
  se conservan abajo; no se repitieron en este cierre sin cambios de API.
- **Límites conservados:** baja/retención/reactivación/reclasificación requieren
  política y contrato aparte. La garantía concurrente cubre el booking conectado;
  addStay directo y alta OOO, de otros módulos, deben coordinar el mismo protocolo.
  No se declara sobreventa cero para todos los escritores del PMS.
- **Siguiente paso:** nuevo alcance financiero/lifecycle en BD2-FP-000. Para probar
  HTTP, seguir `14_BD2_TESTING_AND_POSTMAN.md`; no existe aún un endpoint REST de booking.

Los registros siguientes son históricos; sus pendientes de fixtures y conexión
BD3 quedan sustituidos por la evidencia de cierre anterior.

## BD2-009 — RatePlans y cierre C/R/U de catálogos BD2

- **Rama/base:** `feature/bd2-rate-plans-crud`, Rooms `4cea3db` ya publicado.
- **Estado:** EN_QA. Implementación C/R/U terminada y validada; CI global pendiente BD3.
- **Entregado:** contrato 18, API/DTO/OpenAPI, dinero exacto BIGINT/ISO, permisos
  y scope C2 vigentes antes de SQL, locks/no-op y auditoría transaccional.
  RatePlan no agrega inventario ni modifica precios históricos de reservas.
- **QA enfocada:** BUILD SUCCESS, 21 tests; 9 RatePlans y 12 regresiones Rooms/RoomTypes.
- **Verify final:** `./mvnw -B verify`, Java 21/PostgreSQL 17: BUILD FAILURE,
  217 tests, 0 failures, 8 errors solo BD3, 0 skipped. Las 40 pruebas de los
  cuatro catálogos BD2 pasan, incluidas las 27 nuevas de estos tres incrementos.
- **Postman real:** Properties 14 requests/20 assertions, RoomTypes 8/11,
  Rooms 8/11, RatePlans 10/16: total 40 requests/58 assertions PASS.
  SQL: una fila por catálogo pese a 409, dos eventos (alta/edición) por entidad,
  actor Staff real y precio final 9999 unidades menores GTQ. ATS de tarifas=1
  antes/después. Swagger real publica precio string y RatePlanView.
- **Limpieza:** runtime QA retirado y credenciales/environments/reportes privados
  eliminados fuera del repositorio. Solo fuentes, tests, contratos y guía en Git.
- **Publicación autorizada:** commit/push de esta entrega. PRs por dependencia:
  RoomTypes `feature/bd2-room-types-crud` → main;
  Rooms `feature/bd2-rooms-crud` → RoomTypes;
  RatePlans `feature/bd2-rate-plans-crud` → Rooms.
  Integrar primero RoomTypes, luego Rooms y finalmente RatePlans; ajustar las bases al incorporar cada entrega.
- **Pendientes reales:** definir política de baja/retención/reclasificación para
  completar D; no hay DELETE ni status nuevo. BD3 debe conectar admisión según
  contrato 13 para garantizar sobreventa cero en escrituras de booking.
- **Errores BD3, sin modificar sus archivos:**
  ReservationBookingServiceIntegrationTests: 7 errores de contexto porque
  ControllableAvailabilityConfiguration y AvailabilityService ofrecen dos
  AvailabilityPort; propuesta BD3: dar prioridad al stub únicamente en su fixture.
  ReservationBookingWithoutAvailabilityTests: el contexto completo ahora carga
  ATS real y rechaza el tipo sin Rooms; propuesta BD3: probar ausencia de puerto
  en contexto mínimo que realmente no cargue el motor/API de inventario.
  Siguen presentes también en la rama remota BD3 revisada, sin incorporarla.
- **Retomar:** cuando BD3 corrija sus fixtures/conecte admisión, actualizar
  referencias y validar integración en copia aislada antes de cerrar CI/PR.
  No hubo merge/rebase sobre nuestras ramas, cambios main ni modificaciones BD3.

## BD2-008 — Rooms

- **Rama/base:** `feature/bd2-rooms-crud`, RoomTypes `1c0ed07` ya publicado.
- **Estado:** EN_QA. Contrato 17 publicado antes de crear las APIs.
- **Dependencias:** C2/AuditService y schema existentes. No requiere cambios BD3.
- **Entregado:** alta física, consultas scoped y PATCH de código, permisos C2,
  bloqueo de RoomType compatible con admisión, row lock de edición y audit.
- **QA enfocada:** BUILD SUCCESS, 15 tests; 9 Rooms y 6 regresiones RoomTypes.
  Capacidad +1, no-op, tipos cruzados, 409, lock NOWAIT, rollback y HTTP real.
- **Postman final:** colección Rooms ejecutada: 8 solicitudes/11 assertions PASS.
- **Verify completo:** BUILD FAILURE, 208 tests, 0 failures, 8 errors solo BD3, 0 skipped.
- **Publicación:** commit/push autorizado. Siguiente entrega RatePlans; sin DELETE/reclasificación.

## BD2-007B — RoomTypes: implementación

- **Rama:** `feature/bd2-room-types-crud`. Contrato 16 autorizado por el usuario.
- **Estado:** EN_QA; C/R/U validado. Scope C2 antes de SQL, permisos vigentes,
  bloqueo de fila, auditoría transaccional y OpenAPI tipado; sin DELETE/status.
- **QA:** verify enfocado BUILD SUCCESS, 9 tests sin fallos/errores/omitidas.
  Incluye PostgreSQL, rollback real de auditoría, referencias, ATS sin Rooms,
  HTTP entre transacciones, JWT Guest/revocación y permisos negativos.
- **Verify completo:** 198 tests, 0 failures, 8 errors BD3, 0 skipped; ejecutado
  antes de añadir la prueba HTTP final. Sin cambios BD3 ni exclusiones de tests.
- **Postman final:** colección RoomTypes ejecutada: 8 solicitudes/11 assertions PASS.
- **Publicación:** commit/push autorizado. Main incorporó solo la propuesta
  documental en PR #68 (`302080b`); no trae correcciones de fixtures BD3.
- **Siguiente paso:** Rooms y RatePlans en ramas dependientes separadas.
  Baja/retención sigue pendiente de política; no se inventan borrados.

## BD2-007A — Preparación de RoomTypes

- **Rama/base:** `feature/bd2-room-types-crud`, `origin/main` `c2699ff`.
  Properties fue incorporado mediante PR #67; su código está conservado.
- **Estado:** preparación COMPLETADA; BD2-007B pendiente de confirmar contrato API.
- **Dependencias:** fundación BD2-002 completada, C2 y AuditService existentes.
  Los fixtures/booking pendientes de BD3 no son dependencia de este incremento.
- **Entregado:** contrato 16 con rutas/permisos propuestos, DTO, scope SQL,
  unicidad por propiedad, auditoría transaccional, UTC y aceptación verificable.
- **Revisión:** contrastado con schema/JPA/C2 y los locks de admisión. Código único
  por propiedad; nombre puede repetirse. No añade Rooms ni modifica ATS.
  Solo documentación; diff/check revisados, sin nueva ejecución Maven.
- **Publicación:** commit/push autorizado de estos tres archivos en esta rama.
- **Siguiente paso:** confirmar contrato y comenzar BD2-007B. No hay DELETE,
  baja/status ni cambio de propiedad; sus políticas requieren otra definición.

## BD2-006B — Properties: contrato aprobado y APIs

- **Rama:** `feature/bd2-properties-crud`; contrato 15 aprobado por el usuario.
- **DoR:** C2, esquema Property y AuditService disponibles; no modificar BD3.
- **Estado:** EN_QA; alcance BD2 validado, CI global pendiente de fixtures BD3.
  Publicación por commit/push autorizada.
- **Entregado:** POST/GET de Properties y GET/PATCH por ID; permisos existentes
  por método, sesión vigente y scope aplicado en SQL; edición de nombre/código
  con bloqueo de fila y auditoría before/after transaccional. No-op sin cambios
  de timestamps/eventos. Validación estricta, 409 por unicidad y OpenAPI.
- **QA enfocada:** wrapper verify con selección explícita de las tres clases
  Properties: BUILD SUCCESS, 13 tests sin fallos/errores/omitidas y JAR empaquetado.
  Incluye PostgreSQL, rollback real de auditoría, bloqueo NOWAIT, aislamiento,
  permisos, JWT Guest/revocación y escrituras HTTP entre transacciones separadas.
- **Postman/Newman:** 14 solicitudes y 20 assertions PASS con login/C2 reales.
  SQL confirmó dos eventos (alta/edición), actor Staff real, property/correlation
  correctos y una sola propiedad pese al intento duplicado.
- **Correcciones QA:** precisión PostgreSQL de microsegundos preserva timestamps
  entre requests; OpenAPI declara 200/201 con DTO y errores con ProblemDetail.
  Live Swagger confirmó los schemas; se conservan pruebas de regresión.
- **Verify completo final:** `./mvnw -B verify`, Java 21/PostgreSQL 17:
  BUILD FAILURE, 190 tests, 0 failures, 8 errors, 0 skipped. Las 13 pruebas
  Properties pasan también en esta ejecución; los errores pertenecen solo a
  ReservationBookingServiceIntegrationTests (7, dos beans AvailabilityPort) y
  ReservationBookingWithoutAvailabilityTests (1, ATS real en supuesto sin puerto).
  No se cambió BD3, el workflow ni la selección de tests del verify completo.
  Logs de evidencia fuera del repositorio: pms-bd2-properties-focused.log y
  pms-bd2-properties-verify-final.log.
- **Base actualizada:** `origin/main` `c05a091` integró PR #66 (propuesta).
  Su árbol es idéntico a `73c6f9f`; el código combinado no añade diferencias
  de ejecución. Esta entrega funcional necesitará un nuevo PR.
- **Siguiente paso:** abrir PR funcional desde esta rama hacia main; resolver
  los fixtures de BD3 en su rama responsable y continuar con contrato RoomTypes.
  Baja/reactivación y cambios de moneda/zona permanecen fuera de esta entrega.

## BD2-006A — Propuesta de administración de propiedades

- **Rama/base:** `feature/bd2-properties-crud`, `origin/main` `9552325`.
  Fase 5 integrada por PR #65; su conexión productiva BD3 continúa pendiente.
- **Estado histórico:** preparación de propuesta COMPLETADA; aprobación e
  implementación posteriores registradas arriba en BD2-006B.
- **Entregado:** `15_BD2_PROPERTIES_CRUD_CONTRACT_PROPOSAL.md`; primera entrega
  C/R/U de Properties y secuencia RoomTypes/Rooms/RatePlans/bajas, con ownership BD2.
- **Decisiones al preparar la propuesta:** rutas/permisos operativos, alta limitada al
  SUPER_ADMIN de su organización y edición solo de nombre/código. Baja y
  reactivación necesitan definición de acceso a properties inactivas bajo C2.
- **Revisión:** coherencia con C2, modelo/schema existentes y reglas de dominio;
  distinguir propuesta de contrato confirmado. Diff/whitespace revisados.
  Solo documentación; no se declara una nueva ejecución Maven ni una API creada.
- **Siguiente paso:** confirmar propuesta, implementar BD2-006B y validar
  PostgreSQL/HTTP/OpenAPI/Postman antes de su commit/push. No modificar fixtures BD3.

## BD2-005 — Admisión e integración (Fase 5)

- **Rama:** `feature/bd2-inventory-admission`, desde Fase 4 publicada en `0dbaa74`.
- **Estado:** EN_QA; entrega BD2 validada, conexión BD3 pendiente. Publicación autorizada.
- **PR objetivo:** `main`; Fase 4 integrada mediante PR #64 en `a4dc6b0`.
  El fetch previo a esta entrega confirma que sus fixtures BD3 no cambiaron.
- **DoR:** motor/API BD2 disponibles y esquema BD3 integrado en `origin/main`.
- **Hallazgo:** booking BD3 comprueba cada stay antes de escribir; no acumula
  demanda multi-room ni serializa dos transacciones que venden la última unidad.
- **Entregado:** `InventoryAdmissionPort`, demanda conjunta, locks PostgreSQL
  por property/RoomType, excepción de agotamiento y rollback. Contrato en
  `13_BD2_INVENTORY_ADMISSION_CONTRACT.md`; guía y colección Postman en
  `14_BD2_TESTING_AND_POSTMAN.md` y `../postman/BD2-Inventory.postman_collection.json`.
- **QA BD2:** `./mvnw -B verify` BUILD SUCCESS, Java 21/PostgreSQL 17;
  46 pruebas, cero fallos/errores/omitidas. Incluye 8 pruebas de admisión real
  y 2 con servidor HTTP real. Log TEMP: `pms-bd2-phase5-verify-http-fix.log`.
- **Corrección HTTP:** `sendError(403)` provocaba error dispatch a `/error`,
  protegido por la cadena global; se reemplaza por `setStatus` solo en BD2.
  No se cambian Auth BD1 ni rutas globales. Regresión cubierta con HTTP real.
- **Postman:** Newman PASS, 8 solicitudes/13 assertions contra runtime combinado
  con login/scope reales; fixture de una habitación, credenciales efímeras.
  Runtime detenido y credenciales/reporte privado eliminados de TEMP.
- **Integración real aislada:** fuentes BD3 de `origin/main` `7c060c9` intactas,
  con cuatro tests temporales que envuelven `ReservationBookingService` en el
  puerto nuevo: ATS disminuye exactamente uno, cancelación libera sin borrar
  stay, demanda multi-room se rechaza antes de crear y consumo JPA pendiente
  se observa en la siguiente admisión. Cuatro PASS, sin mock ATS ni booking.
  Esta envoltura pertenece a la validación; no conecta el booking productivo.
- **Verify combinado:** BUILD FAILURE, 181 pruebas incluyendo las 4 temporales;
  cero failures, 8 errors, cero omitidas. Siete errores en el contexto de
  `ReservationBookingServiceIntegrationTests` por beans `availabilityService`
  y `availabilityPort` competidores; uno en
  `ReservationBookingWithoutAvailabilityTests` por presencia del ATS real.
  Los demás tests, incluidos todos los BD2, pasan. Fuentes/fixtures BD3 intactos.
  Log TEMP: `pms-bd2-phase5-combined-http-fix.log`.
- **Límite:** los escritores que no utilicen el puerto siguen fuera de su
  garantía. No declarar sobreventa cero global ni Fase 5 COMPLETADA todavía.
- **Siguiente paso BD3:** resolver el mock `AvailabilityPort` no primario y el
  contexto que supone que no hay puerto; conectar el booking al callback del
  puerto de admisión, con validación y revisión del owner, antes de cerrar Fase 5.

## BD2-004 — API Staff de disponibilidad (Fase 4)

- **Rama:** `feature/bd2-availability-api`, dependiente de BD2 Fase 3 en `277390d`.
- **Estado:** COMPLETADA para entrega BD2; publicada en `0dbaa74`.
- **Contrato:** `12_BD2_AVAILABILITY_API_CONTRACT.md`; consulta Staff por
  property/room type y fechas locales, mínimo ATS, sin precios ni reserva.
- **Seguridad:** servicios JWT/sesión/permiso/scope C2 reutilizados; cadena BD2
  limitada a la ruta de disponibilidad y autorización por método. No se cambia BD1.
- **Dependencia:** las tablas BD3 ya están en `origin/main` (`7c060c9`), pero
  todavía no forman parte de esta rama dependiente; sus correcciones de tests
  permanecen fuera de esta rama.
- **QA:** `./mvnw -B verify` BUILD SUCCESS con Java 21, PostgreSQL 17 y Maven
  3.9.16 del wrapper; 36 pruebas, cero fallos/errores/omitidas. Incluye 11 pruebas
  HTTP con JWT firmado, separación Guest/Staff, sesión revocada, permisos vivos,
  scope antes de ATS, cero unidades, errores 400/404 y schemas OpenAPI.
  El puerto ATS se sustituye solo en el contexto de pruebas HTTP; el query SQL
  real se mantiene cubierto por las pruebas de Fase 3. No sustituye Fase 5.
- **Siguiente paso:** PR de Fase 4 dependiente de Fase 3; iniciar Fase 5 con
  validación aislada contra `origin/main` y revalidar cuando BD3 ajuste sus tests.

## BD2-CI-001 — Entrega de corrección BD2

- **Rama:** `feature/bd2-availability-engine`; corrección publicada en `277390d`.
  Fase 3 ya publicada en `ec8c68f` y `99fe5a0`.
- **Corrección:** validar upgrade contra el total del master instalado en limpio;
  comprobar el changeset `002-management-002` y conservar idempotencia/Property.
- **Validación:** `./mvnw -B verify` PASS, 25 pruebas, cero fallos/errores/omitidas;
  Java 21, PostgreSQL 17 y Maven 3.9.16 del wrapper. Diff revisado.
- **Dependencia:** BD3 debe ajustar sus contextos de pruebas al motor ATS real;
  la referencia combinada del PR `a7b9b14` falla en sus dos pruebas de booking.
- **Retomar:** cuando BD3 integre sus correcciones, revalidar el PR BD2. Tras
  integrar BD2, iniciar la siguiente tarea desde `origin/main` actualizado.
  Pendientes de BD2: Fase 4 (API/contrato/scope) y Fase 5 (integración transaccional).

## BD2-003 — Fase 3 completada (entrega BD2)

- **Rama:** `feature/bd2-availability-engine`, basada en `origin/main` `8e67b7d`.
- **Commit/push:** `ec8c68f` publicado en `origin/feature/bd2-availability-engine`.
- **Estado:** COMPLETADA para entrega BD2; lista para PR/revisión del equipo.
- **Entregado:** `AvailabilityService` calcula el mínimo de unidades vendibles
  por noche como `max(0, físico - OOO - ReservationStay consumidor)`. El query
  usa IDs explícitos de propiedad/tipo, cuenta habitaciones OOO distintas y
  excluye Reservation padre cancelada.
- **Consumo BD3 verificado en** `origin/feature/bd3-foundation` (`d1cb2b7`):
  `RESERVED`/`IN_HOUSE` consumen; `CANCELLED`/`NO_SHOW`/`CHECKED_OUT` liberan.
  Cancelar Reservation no cascada a stays; el `EXISTS` contra el padre cubre
  deliberadamente ese caso. BD3 ya tiene tests de ciclo de vida para esos estados.
- **Entregado:** `PropertyStayTime` y `UtcStayInstantRange` convierten límites
  locales `[arrival, departure)` a UTC con `ZoneId`, incluyendo cambios DST.
- **Scope:** SQL limitado por `propertyId`; de acuerdo con el contrato existente,
  la capa de aplicación/HTTP debe autorizar la propiedad antes de llamar al puerto.
  No se agrega autenticación al query interno.
- **Validación:** `docker compose -p pms-bd2-phase1 -f
  backend/compose.bd2-test.yaml up --abort-on-container-exit --exit-code-from
  verify` — BUILD SUCCESS en PostgreSQL 17/Temurin 21; 25 pruebas, cero
  fallos/errores/omitidas. Incluye prueba SQL con estados consumidores,
  fechas `[arrival, departure)` y Reservation padre cancelada; ATS por
  mínimo/no negativo; y límites UTC a través de DST.
- **Dependencia de integración:** el query requiere las tablas BD3 `reservations`
  y `reservation_stays`, presentes en `origin/feature/bd3-foundation`, todavía
  no integradas a `main`; el ATS entra en funcionamiento cuando BD3 se integre.
- **Límite:** el precheck no bloquea ni serializa admisiones concurrentes; la
  garantía de sobreventa cero requiere el trabajo transaccional posterior.

## BD2-002 — Fase 2 completada

- **Rama:** `feature/bd2-entities-repositories`.
- **Base:** `origin/main` en `a59a235`; Fase 1 integrada mediante PR #60.
- **Estado:** COMPLETADA — aceptación y DoD local PASS, 2026-10-01.
- **Archivos:** dominio y persistencia de `modules/inventory`, pruebas JPA,
  contrato BD2 y estos documentos de seguimiento.
- **Entregado:** entidades JPA Property, RoomType, Room, RatePlan y
  OutOfOrderRecord; repositorios property-scoped; conteo de habitaciones OOO
  distintas por noche local.
- **Validación:** `docker compose -p pms-bd2-phase1 -f
  backend/compose.bd2-test.yaml run --rm --no-deps verify mvn -B
  --no-transfer-progress verify` — BUILD SUCCESS en PostgreSQL 17/Temurin 21;
  19 pruebas, cero fallos/errores/omitidas. Validó migración, Hibernate,
  roundtrip JPA de monedas/fechas, aislamiento de scope, exclusión de OOS y
  registros liberados, y solapamientos OOO contados una vez por Room/noche.
- **Artefacto:** JAR empaquetado con los cinco tipos de dominio y sus cinco
  repositorios; no se añadieron cambios a Liquibase.
- **Revisión local:** `git diff --check` PASS. Sin PR ni publicación remota.
- **Siguiente paso:** Fase 3 (motor ATS) requiere la coordinación de consumo por
  ReservationStay con BD3 y control atómico antes de habilitar overbooking cero.

## BD2-001 — Fase 1 completada

- **Rama:** `feature/bd2-foundation-contracts`.
- **Owner:** BD2.
- **Autorización:** plan de Fase 1 indicado por el usuario el 2026-09-30.
- **Base:** esquema y seguridad existentes de BD1; no se recrea `properties`.
- **Contrato:** `11_BD2_CORE_FOUNDATION_CONTRACT.md`.
- **Estado:** COMPLETADA — aceptación y DoD local PASS, 2026-09-30.
- **Entregado:** changeset `002-management-002`, valores/converters monetarios,
  AvailabilityPort, rango local de noches y configuración de mock solo para tests.
- **Validación:** PostgreSQL 17 y Maven/Temurin 21 aislados mediante
  `compose.bd2-test.yaml`: `mvn -B verify` terminó con BUILD SUCCESS y código 0.
  18 pruebas, cero fallos/errores/omitidas (7 existentes + 11 nuevas).
- **Migraciones:** instalación vacía con seis changesets; actualización BD1
  (cinco changesets) a BD2 (seis), seguida de reaplicación sin cambios. Property
  inicial preservada; no se modificaron changesets previos.
- **Restricciones verificadas:** referencias cruzadas entre propiedades, precios
  negativos, códigos duplicados, períodos vacíos, liberación incompleta y borrado
  de una Room con historial son rechazados por PostgreSQL.
- **Dinero:** roundtrip de converters, escala de moneda, precisión decimal,
  overflow y mezcla de monedas cubiertos. El mapeo de entidades será Fase 2.
- **Artefacto:** JAR contiene AvailabilityPort, valores/converters y migración;
  no contiene AvailabilityStubConfiguration ni el changelog base de pruebas.
- **Revisión local:** scope y cambios inspeccionados; `git diff --check` PASS.
  No se declara revisión externa, PR ni publicación a GitHub.
- **Siguiente paso:** Fase 2, entidades y repositorios según el contrato de BD2.
  ATS real, autorización de endpoints y consumo atómico con BD3 siguen pendientes.

## Foundation Backend — BE-001

- **Rama:** `feature/backend-foundation`
- **Base:** `main` en `94ee1f0`
- **Tarea:** BE-001 — Foundation y control Backend
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-29

### Entregado

- Bootstrap Spring Boot 4.1.1 con Java 21, Spring MVC, JPA, PostgreSQL,
  Liquibase, Spring Security, Resource Server OAuth2 y OpenAPI.
- Un único `compose.yaml` raíz que construye y levanta PostgreSQL, Backend y
  Web; solo Web publica un puerto al host y Backend queda en la red privada.
- Liquibase como único mecanismo de esquema, con Hibernate en `ddl-auto: validate`
  y changelog modular inicial `003ServiceSecurityAuth` sin tablas de negocio.
- Perímetro `SecurityFilterChain` sin estado: health y documentación técnica
  públicos; cualquier ruta no declarada se deniega.
- OpenAPI técnico disponible; no se publicaron endpoints ni DTOs de negocio no
  confirmados.
- Control de trabajo Backend en `AlanPlan.md` y `AlanHandoff.md`, más workflows
  GitHub Actions para Backend y para la pila Docker completa.

### Evidencia de validación

- `maven:3.9.11-eclipse-temurin-21 mvn -q -DskipTests compile`: exitoso.
- `maven:3.9.11-eclipse-temurin-21 mvn -q test`, con PostgreSQL 17: exitoso;
  Spring inicia, Liquibase registra cero changesets de negocio y MockMvc verifica
  health/OpenAPI públicos y denegación por defecto.
- Ejecución HTTP aislada en el puerto 18080: `/actuator/health` = 200,
  `/v3/api-docs` = 200 y `/not-configured` = 403.
- El host no dispone de `javac`; las validaciones anteriores usan el JDK 21
  reproducible de Docker. CI ejecutará la misma versión con Temurin 21.
- `docker compose up --build --wait`: construyó las imágenes. El puerto 3000
  local estaba ocupado por otro proyecto, por lo que `PMS_WEB_PORT=3001 docker
  compose up --wait` confirmó los tres servicios healthy; Web respondió por HTTP
  y alcanzó al health Backend mediante `http://backend:8080` dentro de Compose.

### Cierre de revisión

- Revisión local completada: `git diff --check`, configuración Compose, build de
  imágenes, healthchecks y conectividad privada Web → Backend.
- Backend CI y Docker Stack CI se ejecutarán automáticamente al crear el pull
  request o integrar cambios a `main`, de acuerdo con sus triggers.

### Siguiente tarea

La propuesta `08_AUTH_SESSION_CONTRACT_PROPOSAL.md` fue derivada de Web y
actualizada con la regla de producto: correo permite reserva puntual sin cuenta;
la cuenta Guest requiere Google y se implementa en BE-004. Staff solo se
provisiona por el hotel con username, contraseña, correo laboral y un rol;
`SUPER_ADMIN` es global. MFA Guest se delega a Google y MFA local Staff queda
diferido. C1 fue aprobado y BE-002 implementa exclusivamente el contexto Staff;
Guest Google continúa en BE-004.

## BE-002 — Inicio

- **Rama:** `feature/be-002-staff-auth`
- **Estado:** COMPLETADO
- **Contrato:** C1 aprobado en `08_AUTH_SESSION_CONTRACT_PROPOSAL.md`.
- **Alcance autorizado:** usuarios Staff provisionados por hotel, username,
  correo laboral, contraseña hasheada, un rol, SUPER_ADMIN, sesiones Staff, JWT,
  refresh rotativo y logout.
- **Fuera de alcance:** Google/Guest (BE-004), property scope efectivo
  (BE-003), UI de provisionamiento y gestión de roles.


### Validación BE-002

- `./mvnw test` se ejecutó en JDK 21 contra PostgreSQL local con el esquema
  validado por Liquibase.
- Smoke en contenedor: login Staff, JWT con audiencia/contexto Staff, refresh
  rotativo, rechazo 401 sin refresh y revocación persistente tras logout.
- El changeset aplicado es `003-staff-auth-001`; no se modifica ni se reutiliza.

### Próximo alcance

BE-003 implementará roles/permisos efectivos, memberships y property scope.
BE-004 incorporará Google OIDC, sesión Guest y los Route Handlers BFF; no debe
reutilizar cookies, tokens ni sesiones Staff.

## BE-003 — Cierre

- **Rama:** `feature/be-003-authorization-scope`
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-29
- **Contrato:** C2 aprobado en `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`.
- **Alcance:** Organization/Property iniciales, roles y permisos Staff,
  memberships activas y resolución `PROPERTY`/`ALL_PROPERTIES` en Backend.
- **Límite:** no publica CRUD de Staff ni conecta los mocks Web. Esas tareas
  requieren su contrato BFF/administrativo y mantienen la regla de revocar
  sesiones al cambiar acceso.


### Entregado

- `002ServiceManagement/001` crea Organization y Property iniciales mediante
  Liquibase; no hay creación manual de tablas.
- `003ServiceSecurityAuth/002` crea roles fijos, catálogo de permisos,
  memberships y propiedades por membership. `003` impone una sola membership y
  rol por usuario Staff en V1.
- La sesión Staff resuelve rol, permisos y propiedades activas desde PostgreSQL
  antes de emitir token, validar una sesión y responder `GET /session`.
- `PropertyScopeResolver` construye scopes explícitos `PROPERTY` o
  `ALL_PROPERTIES`; este último exige `MULTI_PROPERTY_READ` y solo contiene IDs
  autorizados.

### Evidencia de validación

- `./mvnw -B test` con Maven/Temurin 21 y PostgreSQL 17: 6 pruebas exitosas.
- PostgreSQL 17 vacía: Liquibase aplicó, en orden, `002-management-001`,
  `003-staff-auth-001`, `003-staff-auth-002` y `003-staff-auth-003`; después
  la suite completa pasó.
- Smoke Docker aislado: bootstrap temporal de `SUPER_ADMIN`, login Staff y
  `GET /api/v1/staff-auth/session` verificaron `SUPER_ADMIN`,
  `MULTI_PROPERTY_READ` y `HB-GT-001`. Los contenedores y token temporales se
  eliminaron al finalizar.
- `git diff --check`: exitoso.

### Siguiente tarea

BE-004 implementa Google OIDC, identidad Guest y BFF. BE-005 reemplazará la
fixture Web Private-09 por un DTO/Mapper BFF basado en C2. El CRUD auditado de
Staff y memberships queda como tarea administrativa posterior; deberá revocar
sesiones cuando cambie el acceso.

## BE-004 — Cierre

- **Rama:** `feature/be-004-guest-oidc-bff`
- **Estado:** COMPLETADO
- **Contrato:** C3 aprobado en `10_GUEST_AUTH_CONTRACT_C3.md`.
- **Alcance:** Google OIDC, GuestAccount/GuestIdentity, sesión Guest,
  refresh rotativo y Route Handlers BFF con cookies host-only.
- **Dependencia registrada:** el OTP de vinculación histórica se integra una
  vez que Reservations publique la consulta de referencia/correo; BE-004 no
  crea entidades de Reservation, Stay ni GuestProfile.


### Avance BE-004

- C3 está registrado y el Backend implementa la transacción Google OIDC con
  `state`, `nonce`, PKCE, validación de token y `email_verified`.
- GuestAccount, GuestIdentity, sesiones, refresh rotativo y JWT Guest son
  estructuras separadas de Staff. Las rutas BFF Guest manejan cookies host-only
  HttpOnly sin serializar tokens hacia JavaScript.
- Resend se implementa como adaptador de infraestructura. La consulta y OTP de
  reservas históricas esperan el puerto seguro del módulo Reservations.

### Validación realizada

- Maven/Temurin 21 y PostgreSQL 17: 7 pruebas exitosas.
- PostgreSQL vacía aplicó cinco changesets, incluido `003-guest-auth-004`.
- `npm run typecheck`, `npm run lint` y el build de imágenes Docker Backend/Web
  fueron exitosos.
- Prueba local real: Google OIDC con usuario externo de prueba creó sesión y
  `GET /api/auth/guest/session` devolvió el correo validado y `context=GUEST`.
  La redirección BFF usa `PMS_WEB_PUBLIC_URL`, por lo que no filtra la dirección
  interna del contenedor.
- Refresh real por BFF: `POST /api/auth/guest/refresh` devolvió `200` y
  `refreshed=true`; el token de refresh se rotó.
- Logout real por BFF: `DELETE /api/auth/guest/session` devolvió `204` y la
  consulta posterior de sesión devolvió `401`. Se corrigió la respuesta BFF para
  emitir `204 No Content` sin cuerpo.

### Seguimiento de despliegue e integración

- Registrar el callback y dominio definitivos en Google para producción.
- Configurar dominio/remitente y API key de Resend para el OTP futuro.
- Integrar el puerto de vínculo OTP cuando Reservations publique búsqueda segura
  por referencia y correo, sin revelar existencia de reservas.


## BE-005 — Inicio

- **Rama:** `feature/be-005-staff-bff-integration`
- **Estado:** EN_PROGRESO
- **Contrato:** C2 aprobado en `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`; C1 sigue siendo autoridad para cookies y sesiones Staff.
- **Alcance autorizado:** Route Handlers BFF Staff, DTO/Mapper C2 y sustitución de la rama no-mock del provider Private-09.
- **Límite:** no crea CRUD de Staff, roles, memberships ni migraciones; el fixture Private-09 permanece para el modo mock y sus pruebas.


## BE-005 — Cierre

- **Rama:** `feature/be-005-staff-bff-integration`
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-30
- **Contrato:** C1 para el ciclo de sesión Staff y C2 para la sesión/autorización
  efectiva, ambos registrados en los documentos de Backend.

### Entregado

- Route Handlers BFF Staff para login, consulta de sesión C2, refresh y logout,
  con cookies `HttpOnly` host-only separadas de Guest. Ninguna respuesta BFF
  serializa access ni refresh token hacia JavaScript.
- DTO, mapper estricto y servicio de sesión Staff para el flujo no-mock Web.
  El mapper rechaza roles, permisos, propiedades, zonas horarias o monedas
  inválidos y memberships duplicadas.
- Provider Staff que resuelve la sesión C2, intenta refresh ante un `401` y
  conserva la fixture Private-09 únicamente cuando el modo mock está activo.
- Navegación privada basada en el rol C2 y las propiedades/permisos efectivos;
  `SUPER_ADMIN` recibe todos los módulos definidos.
- La descripción OpenAPI de `GET /api/v1/staff-auth/session` y el contrato C2
  especifican que la autorización se recalcula y que los tokens quedan dentro
  del BFF. No se crearon migraciones ni CRUD administrativo.

### Evidencia de validación

- `npm run typecheck`, `npm run lint` y `npm run build`: exitosos.
- `npm run test -- --run`: 182 archivos y 768 pruebas Web exitosas.
- Maven/Temurin 21 contra PostgreSQL 17 en Docker: `./mvnw -B -q test` exitoso,
  con Liquibase actualizado y validación Hibernate activa.
- `docker compose up --build -d`: imágenes Backend/Web construidas y servicios
  healthy.
- Smoke BFF Staff sin exponer secretos: login `201` con acuse limitado, sesión
  C2 `200` con rol `SUPER_ADMIN`, refresh `200`, logout `204` y consulta
  posterior `401`.
- `git diff --check`: exitoso antes del cierre.

### Siguiente tarea

El siguiente módulo operativo puede consumir C2 desde el BFF y debe aplicar
`PROPERTY`/`ALL_PROPERTIES` mediante el scope Backend. El CRUD auditado de
usuarios, roles y memberships continúa fuera de BE-005 y deberá revocar
sesiones al modificar el acceso.
