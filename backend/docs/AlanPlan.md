# AlanPlan — Seguimiento Backend

## Propósito

Este archivo conserva el trabajo de Alan (BD1) y el seguimiento de BD2. Sustituye el uso
del XLSX para tareas Backend. Los mocks y DTOs de Web o Android no son contratos
Backend confirmados.

## Estado de tareas

```text
PENDIENTE -> READY -> EN_PROGRESO -> EN_QA -> COMPLETADA
```

Una tarea solo pasa a `COMPLETADA` con aceptación, DoD y revisión registrados
en `AlanHandoff.md`.

## Decisiones vigentes

| Área | Decisión |
| --- | --- |
| Arquitectura | Monolito modular Spring Boot, por capas dentro de cada módulo. |
| Persistencia | PostgreSQL y Liquibase; Hibernate valida, no crea tablas. |
| Seguridad | Spring Security, JWT interno, OAuth2/OIDC y refresh tokens. |
| Web | Next.js funciona como BFF; tokens no se exponen al navegador. |
| Runtime local | `docker compose up --build` desde raíz levanta Web, Backend y PostgreSQL. |
| Sesiones | Guest y Staff son contextos separados. |
| Scope | `ALL_PROPERTIES` es el conjunto autorizado de la sesión. |

## Registro Liquibase por módulo

| Prefijo | Módulo | Dueño | Estado |
| --- | --- | --- | --- |
| 001 | ServicePagos | Por asignar | Reservado |
| 002 | ServiceManagement | BD1 (base) / BD2 (core) | Organization/Property, inventario, catálogo y disponibilidad implementados. |
| 003 | ServiceSecurityAuth | Alan / BD1 | Auth Staff/Guest, RBAC y sesiones implementados. |
| 004 | ServiceReservations | BD3 | GuestProfile, Reservations, Stays, Folio y AuditTrail de reservas implementados. |
| 005 | ServiceOperations | BD3 | Housekeeping, mantenimiento, solicitudes y Night Audit implementados. |
| 006 | ServiceCommercial | BD3 | B2B, grupos, promociones y rewards implementados. |
| 007 | ServiceIntegrations | Alan | Reservado para BE-007; no hay changesets creados. |
| 008 | ServiceAudit | Alan | Reservado para BE-008; no hay changesets creados. |

Cada módulo agrega versiones internas consecutivas. Una migración aplicada no
se renombra ni modifica. El changelog completo incluye módulos según sus
dependencias; un perfil parcial incluye solo su módulo y sus dependencias.

## Tareas

### BE-HANDOFF-001 — Traspaso de pendientes BD2 a BD1/BD3

- **Estado:** COMPLETADA — preparación del traspaso documental y revisión local PASS.
  Autor José / BD2; receptores Alan / BD1 y Juan / BD3; revisión local Codex.
- **Rama/base:** chore/backend-demo, sobre f5fc545.
- **DoR:** usuario confirma cambio de foco a Frontend y solicita publicar todo
  lo pendiente y una lista clara para los responsables restantes de Backend.
- **Alcance/archivos:** documento 23, actualización de ownership/decisión global
  y AlanPlan/AlanHandoff. Conservar historia, distinguir publicación de integración.
- **Aceptación:** entregas existentes identificadas, ramas/commits y estado remoto
  verificados; pendientes completos, límites y reparto detallado marcado propuesto.
- **DoD:** enlaces/localización, revisión documental, diff --check, commit/push;
  sin cambios Java, SQL, API, frontend, infraestructura o funcionalidades.
- **Evidencia:** cinco documentos, siete enlaces locales válidos y 12 tareas
  cubiertas; estados/ramas/commits verificados tras fetch. Diff --check PASS.
  La integración y los acuerdos de los receptores permanecen pendientes.

### BE-DEMO-001 — Presentación Backend con un comando

- **Estado:** EN_QA — aceptación/DoD local PASS; revisión BD1 y CI de PR pendientes.
  Owner José / BD2; reviewer Alan / BD1 (runtime compartido).
- **Rama/base:** chore/backend-demo, sobre e5421f9 de BD2 financial foundation.
- **DoR:** usuario solicita Docker Compose y cuenta de muestra sin configuración
  manual; BE-001/002/003 y catálogos BD2 integrados. No requiere nuevos contratos.
- **Alcance/archivos:** compose.demo.yaml reutiliza servicios existentes, base/volumen
  propios, puerto localhost y bootstrap Staff existente; colección Postman única,
  guía de presentación, README y seguimiento. Credenciales públicas solo de muestra.
- **Aceptación:** un comando arranca PostgreSQL/backend saludables; login demo,
  catálogos y ATS reales mediante colección sin environment/copiar IDs/tokens;
  reinicio conserva datos y no duplica Staff; base habitual no se toca.
- **DoD:** validar Compose, arranque/reinicio/health/Swagger y colección completa;
  verify Java 21/PostgreSQL 17, diff revisado, evidencia y commit/push.
- **Evidencia:** arranque y reinicio saludables; un Staff demo y propiedad previa
  preservados. Newman dos ejecuciones de 53 requests/81 assertions sin fallos.
  Verify BUILD SUCCESS, 281 tests, 0 failures/errors/skipped. Diff --check PASS.
- **Límites:** contiene todos los módulos Backend de esa versión. No añade REST
  de reservas/folios, frontend, Google externo ni funcionalidades financieras.

### BE-001 — Foundation y control Backend

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1
- **Reviewer:** Codex — revisión local registrada
- **Alcance:** bootstrap Spring Boot, PostgreSQL local, Liquibase modular,
  perímetro de seguridad, OpenAPI técnico, Docker raíz, documentación y CI.
- **DoR:** decisiones de arquitectura y seguridad aprobadas.
- **Aceptación:** estructura Backend sin repositorio anidado; Liquibase es el
  único creador de esquema; health accesible; rutas no declaradas denegadas;
  OpenAPI disponible sin endpoints de negocio; la pila raíz se levanta con un
  único comando y solo Web publica un puerto del host.
- **DoD:** compilación, pruebas y validación de migraciones en PostgreSQL;
  handoff actualizado y revisión local reproducible registrada.

### BE-002 — Identidad, sesiones y JWT internos

- **Estado:** COMPLETADO
- **Owner:** Alan / BD1
- **Dependencias:** BE-001; C1 aprobado en `08_AUTH_SESSION_CONTRACT_PROPOSAL.md`.
- **Alcance:** Staff Auth para usuarios provisionados por el hotel, un rol
  por usuario, `SUPER_ADMIN` global, hash de credenciales, JWT/refresh separado
  por contexto, logout y revocación. Guest Auth se activa exclusivamente con
  Google en BE-004.
- **Aceptación:** Staff no se autorregistra; tokens inválidos, expirados o
  revocados se rechazan; no se exponen tokens ni contraseñas; SUPER_ADMIN se
  provisiona solo con secretos de despliegue. Validado con Liquibase/PostgreSQL,
  login, JWT, refresh rotativo y logout.

### BE-003 — Property scope y autorización Staff

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1
- **Dependencias:** BE-002; modelo de membership y permisos confirmado.
- **Alcance:** permisos, memberships activas y resolución explícita de
  `PROPERTY` / `ALL_PROPERTIES` antes de consultas operativas.
- **Aceptación:** `ALL_PROPERTIES` exige `MULTI_PROPERTY_READ`; no hay query
  global seguida de filtro ni fallback de scope. C2 aprobado en
  `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`; roles fijos y una membership/rol Staff.
- **DoD:** migraciones validadas desde una PostgreSQL vacía, tests y smoke de
  sesión Staff completados; evidencia en `AlanHandoff.md`.

### BE-004 — OAuth2/OIDC Google y BFF

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1 con responsable Web.
- **Dependencias:** BE-002/BE-003; C3 aprobado en `10_GUEST_AUTH_CONTRACT_C3.md`.
- **Alcance:** intercambio OAuth2/OIDC, identidad Guest local y JWT propios;
  refresh transparente desde Next.js; el OTP histórico espera el módulo Reservations.
- **Aceptación:** Google OIDC real, sesión `GUEST`, refresh rotativo y logout
  fueron verificados localmente mediante Docker. El callback/dominio productivo,
  remitente Resend y vínculo OTP dependiente de Reservations quedan como
  seguimiento de despliegue e integración.

### BE-005 — Contratos OpenAPI e integración inicial

- **Estado:** COMPLETADA
- **Owner:** Alan / BD1
- **Dependencias:** BE-002 y BE-003.
- **Alcance:** contratos confirmados de identidad, sesión y propiedades
  autorizadas; integración Staff mediante BFF, DTO/Mapper y navegación privada
  derivada de permisos C2.
- **Aceptación:** el BFF Staff no expone tokens al navegador, mantiene cookies
  aisladas de Guest, devuelve C2 recalculado y soporta refresh/logout; el modo
  no-mock consume DTO/Mapper C2 y el modo mock conserva la fixture Private-09.
- **DoD:** contrato C2 y OpenAPI documentados; pruebas Backend/Web, build Docker
  y smoke completo login/sesión/refresh/logout registrados en `AlanHandoff.md`.

## BD2 — Core PMS

Los estados actuales incorporan el cierre BD2-010 sobre main `345481b`.
Las cifras de las entregas anteriores se conservan como evidencia histórica;
los errores de fixtures y la conexión de booking BD3 ya están resueltos.
El alcance de catálogos aprobado es C/R/U: no incluye bajas ni reclasificación.

### BD2-001 — Fase 1: cimientos y contratos

- **Estado:** COMPLETADA
- **Owner:** BD2
- **Reviewer:** Codex — revisión local; PR/revisión del equipo pendiente.
- **Rama:** `feature/bd2-foundation-contracts`
- **Dependencias:** BE-001 y BE-003 COMPLETADAS; reutiliza Organization/Property y scope.
- **DoR:** plan de fases autorizado por el usuario; Fase 1 autorizada explícitamente.
- **Alcance:** esquema mínimo de inventario/tarifas, dinero exacto y puerto interno ATS con fixture de pruebas.
- **Contrato:** `11_BD2_CORE_FOUNDATION_CONTRACT.md`.
- **Aceptación:** migración sobre esquema existente y vacío; relaciones no cruzan propiedades;
  OOO/OOS conserva motivo/período/actor; importe BIGINT con moneda; rango de noches explícito;
  stub ATS=5 solo en pruebas, nunca en el artefacto productivo.
- **DoD:** suite Backend en PostgreSQL, pruebas de restricciones y dinero, build del artefacto;
  evidencia y límites en AlanHandoff.
- **Fuera de alcance:** entidades operativas, CRUD, cálculo real, endpoints y reservas.

### BD2-002 — Fase 2: entidades y repositorios

- **Estado:** COMPLETADA
- **Owner:** BD2
- **Rama:** `feature/bd2-entities-repositories`, desde `origin/main` en `a59a235`.
- **Dependencia:** BD2-001 COMPLETADA e integrada en PR #60.
- **DoR:** Fase 2 autorizada por el usuario; esquema y reglas OOO/OOS definidos en
  `11_BD2_CORE_FOUNDATION_CONTRACT.md`; autorización C2 disponible.
- **Alcance:** entidades Property, RoomType, Room, RatePlan y OutOfOrderRecord;
  repositorios JPA, lecturas con scope y conteo OOO por noche.
- **Aceptación:** Hibernate valida el esquema sin migraciones nuevas; roundtrip JPA
  exacto de dinero/fechas; lecturas restringidas a organización y properties del scope;
  OOS/liberados excluidos, OOO duplicados contados una vez por Room/noche.
- **DoD:** suite completa PostgreSQL + build PASS, pruebas de persistencia y límites
  temporales/scope, revisión local y evidencia en AlanHandoff.
- **Fuera de alcance:** servicios CRUD, endpoints, disponibilidad ATS real, reservas,
  cambios de permisos y flujo de liberación/auditoría OOO/OOS.

### BD2-003 — Fase 3: motor ATS MVP

- **Estado:** COMPLETADA — implementación, acceptance y DoD local PASS.
- **Owner:** BD2.
- **Rama:** `feature/bd2-availability-engine`, desde `origin/main` en `8e67b7d`.
- **Commit/push:** `ec8c68f` publicado en `origin/feature/bd2-availability-engine`.
- **Dependencias:** BD2-002 integrada en PR #61; contrato y ciclo de vida de
  `ReservationStay` revisados en `origin/feature/bd3-foundation` (aún no integrada).
- **DoR:** Fase 3 autorizada por el usuario. El contrato BD2 existente define
  mínimo de ATS por noche, `[arrival, departure)`, OOO descuenta y OOS no;
  el ciclo de vida de ReservationStay fue verificado en la rama BD3.
- **Entregado:** `AvailabilityService` devuelve el mínimo nocturno de físico -
  OOO - ReservationStay consumidor; `[arrival, departure)` local; fechas
  convertibles a límites UTC con `ZoneId`.
- **Estados de consumo:** `RESERVED`/`IN_HOUSE` consumen; `CANCELLED`,
  `NO_SHOW` y `CHECKED_OUT` liberan. El query excluye además el padre
  `Reservation` en estado `CANCELLED`, pues BD3 deliberadamente no propaga la
  cancelación a las estancias.
- **Scope:** el query de ATS siempre filtra por el `propertyId` solicitado y el
  puerto exige que el llamante haya autorizado previamente la propiedad. La
  capa HTTP debe resolver y comprobar `PROPERTY`/`ALL_PROPERTIES` antes de
  invocarlo; no se ejecutan consultas globales ni filtrado posterior.
- **DoD:** suite completa PostgreSQL + build PASS, test del query SQL y
  límites UTC/DST, diff revisado. El runtime necesita las tablas de BD3 al
  invocar el cálculo; éstas están en la rama BD3 aún no integrada. El precheck
  ATS no hace admisión atómica y no garantiza por sí solo cero sobreventa concurrente.

Fases siguientes: exponer ATS por API solo después de confirmar el contrato
externo y autorización; integración y concurrencia tras acordar la admisión atómica.

### BD2-CI-001 — Corrección del test de upgrade de inventario

- **Estado:** COMPLETADA — integrada en main y revalidada en BD2-010.
- **Owner:** BD2.
- **Rama:** `feature/bd2-availability-engine`; corrección publicada en `277390d`.
- **DoR:** investigación y corrección de CI autorizadas por el usuario;
  mantener rama, sin merge/rebase y sin deshabilitar tests.
- **Alcance:** comparar upgrade con instalación limpia vigente, verificar el
  changeset de inventario y conservar validaciones de idempotencia/Property.
- **DoD:** `./mvnw -B verify` con Java 21/PostgreSQL 17, revisión de diff y
  seguimiento de la dependencia de integración en `AlanHandoff.md`.

### BD2-004 — API Staff de disponibilidad (Fase 4)

- **Estado:** COMPLETADA — API integrada en main; regresión global BD2-010. Owner BD2.
- **Rama:** `feature/bd2-availability-api`, dependiente de BD2 Fase 3 en `277390d`.
- **DoR:** Fase 4 y uso de servicios BD1 disponibles autorizados; contrato en
  `12_BD2_AVAILABILITY_API_CONTRACT.md`; permisos existentes C2 y scope explícito.
- **Alcance:** controlador/DTO, cadena Staff limitada a disponibilidad, guard de
  método con sesión/permiso/property scope, errores y OpenAPI. Sin cambios BD3.
- **DoD:** verify completo y pruebas HTTP de JWT Staff/Guest, sesión revocada,
  permisos, aislamiento de propiedad, validación de fechas, ATS y documentación.
- **Validación:** `./mvnw -B verify` PASS en Java 21/PostgreSQL 17;
  36 pruebas, cero fallos/errores/omitidas en la entrega original; integración cerrada en BD2-010.

### BD2-005 — Admisión e integración de disponibilidad (Fase 5)

- **Estado:** COMPLETADA — booking real conectado por BD3; aceptación y QA global en BD2-010.
- **Owner:** BD2; revisión cross-domain requerida de BD3.
- **Rama:** `feature/bd2-inventory-admission`, dependiente de Fase 4 en `0dbaa74`.
- **Entrega:** publicación autorizada; PR hacia `main`, que ya contiene Fase 4
  mediante PR #64 (`a4dc6b0`). Admisión y conexión BD3 integradas en main `345481b`.
- **DoR:** Fase 5 autorizada; motor ATS y API publicados. Tablas BD3 disponibles
  en `origin/main`; no modificar su booking ni sus fixtures sin autorización.
- **Alcance BD2:** puerto de admisión transaccional, demanda conjunta por noche,
  bloqueo por property/room type y excepción de inventario agotado; pruebas
  PostgreSQL de concurrencia/rollback y guía de pruebas API/Postman. QA HTTP
  corrige en la cadena BD2 el 403 que se convertía en 401 por error dispatch.
- **Aceptación:** una unidad consumida reduce ATS exactamente uno; demanda
  superior a ATS no ejecuta la escritura; dos admisiones para la última unidad
  no pueden confirmar ambas; rollback libera capacidad y bloqueos.
- **DoD:** verify completo, evidencia de integración aislada contra `origin/main`,
  límites y conexión con BD3 registrados, diff revisado.
- **Límite:** implementar el puerto no protege escrituras que no lo utilicen;
  BD3 conectó createBooking en `faa7876`; otros escritores deben adoptar el protocolo.
- **Validación BD2:** `./mvnw -B verify` BUILD SUCCESS, 46 pruebas sin
  fallos/errores/omitidas; colección Postman ejecutada con Newman: 8 solicitudes
  y 13 assertions PASS. Booking real validado en copia aislada (4 pruebas PASS).

### BD2-006A — Preparación del contrato de propiedades

- **Estado:** COMPLETADA — propuesta preparada y revisada localmente; no implica aprobación API.
- **Owner:** BD2; reviewer de seguridad/scope previsto: BD1.
- **Rama:** `feature/bd2-properties-crud`, desde `origin/main` `9552325`.
- **DoR:** CRUD pendientes autorizados; base de inventario/Auth integrada.
- **Alcance:** propuesta de rutas, campos y permisos; auditoría, límites de
  baja/reactivación y secuencia pendiente; sin cambios funcionales.
- **Aceptación/DoD:** distinguir reglas confirmadas de propuestas; no añadir
  roles/permisos ni ampliar scope; revisión de referencias y diff; publicación
  de la propuesta y evidencia en AlanHandoff.

### BD2-006B — Properties: altas, consultas y edición descriptiva

- **Estado:** COMPLETADA — alcance C/R/U integrado en main; QA global en BD2-010.
- **Owner:** BD2.
- **Dependencias:** BD2-006A; autorización C2 y AuditService existentes.
- **DoR:** contrato `15_BD2_PROPERTIES_CRUD_CONTRACT_PROPOSAL.md` aprobado;
  rutas/permisos confirmados, sin baja/reactivación ni cambios de timezone/moneda.
- **Alcance:** servicios/DTO/REST/OpenAPI, guard Staff por método,
  repositorios scoped, auditoría transaccional y extensión de Postman.
- **Aceptación/DoD:** definidos en el contrato aprobado; pruebas PostgreSQL/HTTP real,
  verify completo, diff revisado, commit/push y handoff.
- **Evidencia:** QA enfocada BUILD SUCCESS (13 tests); Postman 14 requests/20
  assertions PASS. Verify completo final: 190 tests, 0 failures, 8 errors BD3,
  0 skipped; las pruebas Properties pasan. El workflow permanece íntegro.

### BD2-007A — Contrato de administración de RoomTypes

- **Estado:** COMPLETADA — propuesta RoomTypes aprobada e implementada en BD2-007B.
- **Owner:** BD2; reviewer de seguridad/scope: BD1.
- **Rama:** `feature/bd2-room-types-crud`, desde `origin/main` `c2699ff`.
- **Dependencias/DoR:** BD2-002 completada (entidad/esquema/repositorio), C2 y
  AuditService existentes; CRUD BD2 pendientes autorizados por el usuario.
  La integración pendiente de booking BD3 no interviene en esta preparación.
- **Alcance:** publicar una propuesta de contrato C/R/U descriptivo, permisos,
  aislamiento, auditoría, límites de baja y criterios verificables.
- **Aceptación/DoD:** conservar el modelo, distinguir propuesta de API aprobada,
  confirmar unicidad y referencias, revisar diff y publicar commit/push.
- **Evidencia:** contrato 16 contrastado con dominio, SQL, scope C2 y admisión;
  diff/check revisados. Entrega documental, sin nueva ejecución Maven ni cambios BD3.

### BD2-007B — RoomTypes: altas, consultas y edición descriptiva

- **Estado:** COMPLETADA — C/R/U RoomTypes integrado en main; QA global en BD2-010.
- **Owner:** BD2; reviewer BD1 para permisos/scope.
- **Dependencias/DoR:** BD2-007A completada y contrato operativo aprobado;
  esquema/fundación BD2-002, C2 y auditoría existentes. No depende de que BD3
  conecte su booking al puerto de admisión: no modifica capacidad física.
- **Alcance propuesto:** servicio/DTO/REST/OpenAPI, scope antes de SQL,
  bloqueo de fila, auditoría transaccional y colección Postman.
- **Aceptación/DoD:** definidos en el contrato propuesto 16; PostgreSQL/HTTP,
  verify completo con errores ajenos visibles, diff revisado, commit/push/handoff.

- **Evidencia BD2-007B:** verify enfocado BUILD SUCCESS, 9 tests (API, rollback y HTTP real). Verify completo: 198 tests, 0 failures, 8 errors BD3, 0 skipped; ejecutado antes de añadir la prueba HTTP final. Newman RoomTypes: 8 solicitudes/11 assertions PASS en la validación final de catálogos.

### BD2-008 — Rooms C/R/U

- **Estado:** COMPLETADA — C/R/U integrado en main; QA global en BD2-010. Owner BD2; rama `feature/bd2-rooms-crud`.
- **DoR:** RoomTypes `1c0ed07`, esquema Room, C2 y auditoría existentes;
  continuación de CRUD autorizada por el usuario. Contrato 17 publicado.
- **Alcance:** alta física, consultas y edición exclusiva de código; no baja,
  reclasificación ni cambios BD3. Aceptación/DoD según contrato 17.
- **QA enfocada:** BUILD SUCCESS, 15 tests (9 Rooms y 6 de regresión RoomTypes).
  Incluye capacidad +1, locks reales, scope, validación, auditoría, rollback y HTTP.
- **Verify completo:** BUILD FAILURE, 208 tests, 0 failures, 8 errors solo BD3, 0 skipped.

### BD2-009 — RatePlans C/R/U

- **Estado:** COMPLETADA — C/R/U integrado en main; QA global en BD2-010. Owner BD2; `feature/bd2-rate-plans-crud`.
- **DoR:** Rooms `4cea3db`, esquema/MonetaryAmount/C2/AuditService existentes;
  continuación CRUD autorizada. Contrato 18 publicado antes de crear API.
- **Alcance:** catálogo de tarifas y precios exactos; sin inventario, baja ni
  reescritura de reservas/folios. Aceptación/DoD: contrato 18.
- **QA enfocada:** BUILD SUCCESS, 21 tests; 9 RatePlans y 12 regresiones Rooms/RoomTypes.
- **Verify completo final:** BUILD FAILURE, 217 tests, 0 failures, 8 errors solo BD3, 0 skipped.
  Las 40 pruebas de los cuatro catálogos BD2 pasan. Sin exclusiones ni cambios BD3.
- **Newman:** los cuatro catálogos suman 40 solicitudes/58 assertions PASS.
  SQL confirmó unicidad, audit real/no-op y precio exacto; ATS de tarifas permanece 1.
- **Fuera del alcance aprobado:** políticas de baja/retención/reclasificación aún
  no definidas. Fixtures/admisión BD3 resueltos; evidencia global en BD2-010.

### BD2-010 — Cierre de integración con BD3

- **Estado:** COMPLETADA — integrada mediante PR #72 en main `9eb2380`;
  revisión y checks exitosos confirmados por el usuario.
- **Owner/rama:** BD2; `feature/bd2-integration-closeout`.
- **DoR:** main `345481b` integra catálogos BD2, correcciones de fixtures BD3
  y admisión transaccional (`faa7876`). Usuario autoriza revisar y cerrar tareas.
- **Alcance:** pruebas BD2 contra booking/migraciones reales, consumo exacto,
  demanda conjunta, rollback y concurrencia; verify sin exclusiones y contratos
  actualizados. No modificar implementación ni fixtures de otros módulos.
- **DoD:** suite completa verde, regresiones reales de admisión, diff revisado,
  evidencia/handoff y commit/push de cierre. Bajas fuera del contrato C/R/U.
- **Evidencia:** verify Java 21/PostgreSQL 17 BUILD SUCCESS; main base 248 tests,
  rama final 254 tests, cero failures/errors/skipped. Seis regresiones reales nuevas.
  Detalle, límites y revisión en AlanHandoff BD2-010.

## BD2 — Folio/Payments y lifecycle de reservas

### BD2-FP-000 — Fase 0: revisión y contratos

- **Estado:** COMPLETADA — preparación documental, aceptación y revisión local PASS.
- **Owner:** José / BD2. Los contratos nuevos continúan PROPOSED.
- **Rama/base:** `feature/bd2-finance-lifecycle-contracts`, origin/main `9eb2380`.
- **Dependencias:** BD2-010 integrada mediante PR #72; servicios base Reservations,
  Folio, Audit, dinero, C2 y admisión disponibles.
- **DoR:** usuario autoriza nuevo reparto, plan modular e inicio de fase 0.
- **Alcance:** inventario de capacidades/brechas, contrato propuesto, decisiones
  pendientes y coordinación con BD1/BD3. Registro del reparto; entrega documental.
- **Aceptación:** fuentes y capacidades contrastadas; todos los flujos del nuevo
  alcance mapeados; decisiones aprobadas diferenciadas de propuestas; dependencias
  y criterios de aceptación verificables; siguiente entrega identificada.
- **DoD:** revisión local de documentos, referencias y diff; seguimiento/handoff,
  commit/push por entrega. No aprobar automáticamente contratos de fases siguientes.
- **Evidencia:** documentos 19/20; 11 referencias locales verificadas, 12 entregas
  mapeadas, fuentes/código contrastados y diff --check limpio. Sin cambios de
  runtime; no nueva ejecución Maven en esta entrega documental.
- **Siguiente paso:** revisar SH-D01 (idempotencia, fase 1) y FP-D02 (lectura folio).
  Proveedor, políticas y contratos de otras interfaces siguen pendientes.

### BD2-FP-001A — Preparación Fase 1: detalle de folio scoped

- **Estado:** EN_QA — aceptación y verify local PASS; revisión BD1 pendiente.
- **Owner:** José / BD2; revisión de scope compartido: BD1.
- **Rama/base:** `feature/bd2-financial-foundation`, origin/main `5419606`.
- **Dependencias/DoR:** FP-000 COMPLETADA, C2 APPROVED, folio y repositorios
  existentes. Usuario autoriza retomar BD2 e iniciar Fase 1. Este prerrequisito
  aplica la regla C2 vigente; no necesita decidir proveedor ni idempotencia.
- **Alcance:** detalle de folio con IDs autorizados en SQL; validar scope antes
  de query, no cargar datos de otra property ni revelar existencia por errores.
  No cambia consultas de reservas, escrituras, APIs ni políticas financieras.
- **Aceptación:** lectura autorizada PROPERTY/ALL_PROPERTIES; folio ajeno no se
  materializa en JPA; scope ausente rechazado antes de carga; mismo resultado
  para folio inexistente y fuera de scope; regresión PostgreSQL y verify completo.
- **DoD:** pruebas, diff/check y evidencia en AlanHandoff.
- **Evidencia local:** regresión original con 3 fallos de 5; corrección con
  verify completo BUILD SUCCESS, 259 tests, 0 failures/errors/skipped.
- **Límite histórico:** SH-D01 estaba pendiente en esta entrega; el usuario
  aprobó después la base local. Implementación en BD2-FP-001.

### BD2-FP-001 — Fase 1: idempotencia transaccional local

- **Estado:** EN_QA — aceptación y verify local PASS; revisión pendiente.
  Owner José / BD2; reviewers BD1 (base compartida) y BD3 (test de upgrade).
- **Rama:** `feature/bd2-financial-foundation`; incremento sobre `be09de4`.
- **DoR:** FP-000 integrada; SH-D01 local aprobado explícitamente por el usuario.
  Reutilizar Reservations/Folio, C2, AuditService y PostgreSQL. No nace módulo.
- **Alcance:** recibo persistente append-only; clave 8–128 caracteres; identidad
  Staff/property/operación/clave; payload canonicalizado sin secretos; dedupe,
  conflicto, efecto/recibo/audit atómicos y bloqueos entre transacciones/JVMs.
- **Aceptación:** reintentos y concurrencia no duplican efecto; autorización
  vigente antes de recuperar resultado; aislamiento por actor/property/operación;
  payload/version/política distinta generan conflicto; rollback no deja recibo;
  upgrade/idempotencia/append-only PostgreSQL y verify sin exclusiones.
- **Archivos:** LocalOperationService/Request/Receipt y repositorio JDBC,
  nuevo changeset en 004ServiceReservations, contrato 21 y pruebas.
- **DoD/evidencia:** Java 21/PostgreSQL 17, `./mvnw -B verify` BUILD SUCCESS;
  281 tests, 0 failures/errors/skipped, incluidos 22 tests nuevos.
  Upgrade/reaplicación y diff revisados; detalles en AlanHandoff.
- **Límites:** sin caducidad automática, HTTP, proveedor ni nuevos permisos.
  Pagos externos y APIs financieras mantienen sus decisiones pendientes.

### Próximas entregas financieras y lifecycle

Desde el traspaso de 2026-10-03, Alan / BD1 y Juan / BD3 asumen conjuntamente
estas entregas pendientes; José pasa al Frontend. El reparto específico de cada
tarea queda por acordar entre ellos: propuesta y contexto en documento 23.
La autoría de entregas anteriores se conserva; EN_QA no significa integrada.
Reviewers del dominio afectado según contrato. Fuente de
aceptación, archivos previstos y dependencias por tarea:
`19_BD2_FINANCE_LIFECYCLE_PHASE0.md`, sección Entregas. DoR siempre exige el
contrato aplicable aprobado y dependencias COMPLETADAS; no implementar desde mocks.

| ID / módulo | Estado | Dependencias y decisión que falta |
| --- | --- | --- |
| BD2-FP-001 / 1 base transaccional | EN_QA | SH-D01 local aprobado; verify PASS, revisión pendiente; no requiere SH-D03 |
| BD2-FP-002 / 2A lectura folio | PENDIENTE | FP-000; FP-D02 (propuesta en documento 20) |
| BD2-FP-003 / 2B escritura folio | PENDIENTE | FP-001; FP-D04/contrato de escritura |
| BD2-FP-004 / 3 pagos/garantía | PENDIENTE | FP-001/003; FP-D01/03 y SPI BD1 |
| BD2-FP-005 / 4A distribución | PENDIENTE | FP-003/004; FP-D05 y master/direct bill |
| BD2-FP-006 / 4B invoices | PENDIENTE | FP-003/004; FP-D06 |
| BD2-LC-001 / 5A cancelación | PENDIENTE | FP-003/004; LC-D01 |
| BD2-LC-002 / 5B no-show | PENDIENTE | FP-003/004; LC-D02/night audit |
| BD2-LC-003 / 6 waitlist | PENDIENTE | FP-001; LC-D03/cotización/admisión |
| BD2-LC-004 / 7A room move | PENDIENTE | FP-001/003; LC-D04/SH-D02/HK |
| BD2-LC-005 / 7B extensión | PENDIENTE | FP-001/003; LC-D05/SH-D02/cotización |
| BD2-FP-LC-QA / 8 integración | PENDIENTE | Entregas incluidas y SPIs reales COMPLETADAS |

## Alan / BD1 — Plan de implementación integral

**Actualización:** 2026-10-04. **Base inspeccionada:** main `ea50726` (PR #93).
**Owner:** Alan / BD1. **Estado del programa:** EN_PROGRESO — AD-01 aprobado;
BE-014B-COM-01/02 integrados en main; otros incrementos pendientes.
El usuario solicita planificar sus once responsabilidades y usar AlanPlan/AlanHandoff
para control. La planificación y el inicio de BE-014A están autorizados; no confirman por sí solos
los contratos API, permisos nuevos, proveedores ni reglas pendientes.
Se conserva el seguimiento anterior BE-001 a BE-005 y BD2.

### Punto de partida verificado

- BE-001 a BE-005 completadas según handoff: Foundation, Staff/Guest Auth, C2 y BFF.
- Inventario/ATS/admisión y catálogos C/R/U integrados. Booking usa admisión
  transaccional en el contexto completo; otros escritores deben coordinar sus locks.
- Reservations/Folio, Operations y Commercial tienen servicios y migraciones.
  La inspección de controllers encuentra HTTP de Auth e Inventory; no una API
  completa de reservas, operaciones, comercial o finanzas.
- Los seis servicios Commercial ya exigen COMMERCIAL_MANAGE y validan property
  scope contra el snapshot Staff; los contratos HTTP y el actor de sesión siguen
  pendientes.
- GuestProfile y ReservationLinkService ya existen. Este último resuelve referencia
  y correo; ReservationLinkVerificationPort es una interfaz vacía. Falta contrato
  invocable, desafío OTP y asociación autorizada; no esperar la creación del módulo.
- GoogleOidcClientImpl y ResendEmailSender existen. Esta planificación no prueba
  Google ni entrega de correo en vivo. Su disponibilidad externa queda SIN VERIFICAR.
- C1/C2/C3 vigentes: Guest/Staff separados, un rol Staff fijo, permisos desde BD,
  scope explícito; MFA Staff excluido hasta modificar C1. Roles no personalizables.
- Último verify documentado: 300 tests PASS en BE-014B-COM-02 (Java 21,
  PostgreSQL 17); el usuario confirmó su QA y PR #93 lo integró en main.

### Cobertura de los once requisitos del usuario

| # | Responsabilidad | Tareas de entrega |
| --- | --- | --- |
| 1 | Protección APIs de reservas, operaciones, comercial y finanzas | BE-014A/B |
| 2 | Permisos comerciales/financieros y sustitución de SUPER_ADMIN provisional | BE-014A/B con BD2/BD3 |
| 3 | Centro de integraciones, channels, error queue, retries y recuperación | BE-007A/B, BE-009, BE-015A/B |
| 4 | Reportes, exportaciones y revenue KPIs desde datos reales | BE-010A/B |
| 5 | CRUD Staff, roles y memberships según contratos | BE-006A/B |
| 6 | Revocación administrativa y por cambios sensibles | BE-006B/C |
| 7 | MFA Staff, privacidad y consentimientos | BE-011A/B, BE-012A/B |
| 8 | AuditTrail consultable, filtros, scope y paginación | BE-008A/B |
| 9 | Vínculo OTP de reservas históricas | BE-013A/B |
| 10 | Google y Resend en presentación | BE-016A/B |
| 11 | Adapters de pagos y mensajería coordinados | BE-015A/B |

Los sufijos A son contratos/preparación; B son implementación/validación y C,
cuando existe, cierre específico. No se marca completada la tarea padre hasta
cerrar todos sus incrementos incluidos. Cada incremento nace PENDIENTE y pasa
READY solo al cumplir su DoR; una dependencia contractual exige A COMPLETADA,
una dependencia funcional exige B/C COMPLETADA según la entrega.

### Orden de entrega y dependencias

| Fase | Entregas | Condición de entrada / salida |
| --- | --- | --- |
| 0 — acuerdos | BE-014A, BE-008A, BE-006A, BE-007A, BE-015A, BE-013A, BE-016A | Inventario real y revisores; salida: contratos aplicables aprobados, decisiones abiertas explícitas y entorno de presentación identificado |
| 1 — acceso y administración | BE-014B por dominio, BE-008B, BE-006B/C | Acuerdos A; auditoría inicial reutiliza auth_audit_events/AuditService y se integra al contrato común sin duplicar historia |
| 2 — Guest verificable | BE-013B, BE-016B | C3 + SPI/contrato OTP; Google/Resend configurados y evidencia de entrega real para cierre externo |
| 3 — integraciones | BE-007B, BE-015B, BE-009 | Idempotencia compartida y adapters aprobados; cada proveedor se cierra con sandbox y consumidores reales |
| 4 — analítica | BE-010A/B | Fórmulas/fuentes confirmadas; ingresos financieros reales disponibles para ADR/RevPAR y filtros por business date |
| 5 — MFA y privacidad | BE-011A/B, BE-012A/B | Cambio de C1/C8 y C9 aprobados; contratos pueden prepararse desde fase 0 |
| 6 — cierre | BE-017 | Entregas incluidas completas, integración BD2/BD3, aceptación y presentación verificadas |

Este orden es de prioridad, no una dependencia artificial entre todas las fases.
Contratos independientes y preparación de Google/Resend pueden avanzar sin esperar
pagos; reportes independientes pueden entregarse cuando sus propias fuentes estén
listas. No declarar KPIs completos si faltan ingresos, fórmulas o business date.
Sin estimaciones de fechas hasta conocer contratos, disponibilidad BD2/BD3 y sandbox.

### Reglas de coordinación y decisiones pendientes

| Decisión | Autoridad / revisión | Qué debe quedar confirmado |
| --- | --- | --- |
| Acceso por operación | BD1 + BD2/BD3; consumidores Web/Android afectados | Matriz contexto/ruta/permiso/rol/scope/actor, acceso público y Guest, errores y BFF; reutilizar C2 antes de proponer permisos nuevos |
| C4 administración | BD1 + producto | Campos, unicidad, alcance GERENCIA, protección administrativa, baja/retención y cambio de membership; roles fijos consultables/asignables |
| Roles personalizables | Producto, Change Control C2 | Solo si se solicita/aprueba cambiar el catálogo fijo; no forma parte automática de BE-006 |
| C5 integraciones | BD1 + BD2/BD3 | Categorías/proveedores, secret references, callbacks, retry/backoff, estados inciertos, recuperación e idempotencia |
| C6 auditoría | BD1 + owners emisores | Taxonomía, eventos existentes, retención, detalle seguro, filtros/paginación y acceso org/property |
| C7 analítica | Producto + BD1/BD2/BD3 | Fórmulas, numeradores/denominadores, descuentos/reembolsos, moneda, timezone, business date y fuentes SQL |
| C8 MFA / cambio C1 | Producto + BD1 | Factor, usuarios obligados, enrolamiento, desafío, recuperación, revocación, límites y auditoría |
| C9 privacidad | Producto + BD1/BD3 | Propósitos/canales, evidencia, titularidad GuestProfile, retenciones y DSR |
| C3 extensión OTP | BD1 + BD3 + consumidor Guest | Firma del puerto, endpoints/DTO/BFF, vínculo persistente y carreras; mantener reglas OTP ya aprobadas |
| SH-D01 de BD2 | BD1 + BD2 | Servicio/persistencia compartidos de dedupe, namespace, payload canónico, retención y recuperación; no dos motores incompatibles |
| SPIs externos | BD1 + BD2 pagos / BD3 mensajería | Dueño del efecto, proveedor/sandbox, moneda/métodos, callback auténtico, delivery/status y recuperación |

Alan coordina la protección y contratos compartidos. BD2/BD3 mantienen las reglas
de negocio y aprueban cambios a sus servicios; Alan no crea un segundo booking,
folio, night audit ni motor comercial. En cada PR queda claro quién incorpora
controllers/BFF y quién asegura autorización en entradas internas. Una fachada
segura no sustituye scope/permiso en el servicio y predicados SQL en repositorios.

### BE-014 — Protección transversal de APIs y permisos

- **Estado:** BE-014A EN_QA — propuesta y revisión local PASS; aprobación
  por dominio pendiente. BE-014B EN_PROGRESO — incremento COM-01 en QA;
  otros dominios pendientes. Prioridad inicial.
- **Entrega:** `21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md` PROPOSED: catálogo SQL C2,
  matrices de acceso, brechas de scope/actor/filtros, decisiones AD-01 a AD-06 y
  acceptance por dominio. Nueve enlaces y referencias/guards contrastados;
  diff --check PASS. Sin Java/SQL ni nueva ejecución Maven.
- **Decisión inmediata:** AD-01 propone COMMERCIAL_MANAGE para los seis servicios
  comerciales; AD-02 concreta permisos financieros y AUDITOR. Revisar con owners
  antes de BE-014B. AD-04 bloquea envío externo por contradicción Reception/SUPER_ADMIN.
- **Rama:** `feature/bd1-api-access-contracts`, creada desde main `9003567` antes
  de editar esta entrega; conserva cambios documentales previos.
- **Inicio autorizado:** 2026-10-04; inventario de interfaces, SQL C2 y cadenas
  revisado. Contratos HTTP operativos aún no disponibles: se documentan como
  pendientes sin inventar rutas, y se prepara propuesta para revisión BD2/BD3.
- **Dependencias:** BE-002/003/005; A requiere inventario BD2/BD3, B requiere A
  COMPLETADA y contrato del endpoint disponible. Entrega B separada por dominio.
- **DoR A:** identificar entradas HTTP y de servicio existentes/propuestas;
  reunir C2, documento 20 y contratos de operaciones/comercial con sus owners.
- **Entrega A:** matriz por operación de reservas/stays/folios/pagos/HK/OOO/OOS/
  night audit/B2B/grupos/promos/rewards; contexto Staff/Guest/público, permiso,
  PROPERTY/ALL_PROPERTIES, actor, pertenencia de recurso y errores. Confirmar
  operaciones financieras que exigen devolución/anulación y acceso del AUDITOR.
  No copiar permisos de mocks ni autorizar recursos por UUID o correo.
- **DoR B:** matriz y nuevos permisos, si hacen falta, aprobados mediante Change
  Control; servicio y rutas aplicables confirmados. B no inventa APIs ajenas.
- **Entrega B:** guards de servicio, chains de seguridad y repositorios scoped;
  actores desde sesión; reemplazar SUPER_ADMIN provisional solo donde el contrato
  lo indique; BFF/OpenAPI coordinados. No query global + filtro posterior.
- **Aceptación:** ausencia/token inválido/Guest cruzado/sesión revocada -> 401;
  Staff sin permiso o property -> 403; recurso ajeno no revela datos ni existencia;
  cada rol autorizado tiene casos positivos y negativos por operación. Cambio de
  permiso/membership se aplica sin esperar exp JWT; acceso Guest prueba titularidad.
- **Archivos previstos:** contrato de acceso nuevo en backend/docs; securityauth,
  chains/guards/repos de cada dominio, tests HTTP/SQL, Liquibase RBAC solo si aprobado;
  consumidores BFF/DTO/Mapper afectados bajo coordinación de owner.
- **Reviewers:** BD2/BD3 para su dominio; consumidores Web/Android si cambia API.

#### BE-014B-COM-01 — Reutilización del permiso comercial

- **Estado:** COMPLETADA — implementación y revisión local PASS; el usuario
  ejecutó las cuatro suites comerciales sin errores y confirmó el cierre.
  Commit/push autorizados en `feature/bd1-commercial-permissions`; revisión BD3
  corresponde a la integración posterior. 2026-10-04.
- **Evidencia:** guard compartido COMMERCIAL_MANAGE en los seis servicios;
  45 tests comerciales PASS en la versión final, flujos GERENCIA/SUPER_ADMIN
  y denegaciones sin permiso. Verify completo con wrapper Maven 3.9.16, Java 21/
  PostgreSQL 17: 270 tests, 0 failures/errors/skipped, BUILD SUCCESS y JAR.
  git diff --check PASS; sin cambios SQL/permisos/roles/endpoints.
  Detalle y comandos en AlanHandoff BE-014B-COM-01.
- **Rama/base:** `feature/bd1-commercial-permissions`, nueva desde `9003567`
  con documentación previa local conservada.
- **DoR:** AD-01 aprobado explícitamente por el usuario: reutilizar
  COMMERCIAL_MANAGE en empresas/agencias/grupos/blocks/promociones/rewards.
  Catálogo y asignaciones C2 existentes; no exige migración de permisos.
- **Alcance de este incremento:** sustituir guard provisional SUPER_ADMIN por
  permiso efectivo, conservar contratos internos/scope/lifecycle/audit existentes,
  actualizar documentación y probar flujos GERENCIA/SUPER_ADMIN y denegaciones.
- **Límites:** AD-02 a AD-06 pendientes; no aprobar otras filas de documento 21.
  No crear REST/BFF ni declarar terminada la protección transversal BE-014B.
  Sesión/actor confiables y hardening de recursos relacionados se entregan en
  incrementos posteriores coordinados con BD3 antes de exposición HTTP.
- **Archivos:** seis implementaciones/interfaces Commercial, helper de permiso,
  suites comerciales, documento 21 y seguimiento.
- **Aceptación/DoD:** permiso obligatorio incluso para snapshot SUPER_ADMIN;
  GERENCIA con permiso opera los seis servicios, roles sin permiso rechazados;
  regresión de aislamiento/lifecycle, verify completo PostgreSQL/Java 21 y diff.
  QA manual del usuario PASS conforme a `22_BD1_COMMERCIAL_MANUAL_QA.md`;
  confirmación de cierre recibida. Este incremento no crea rutas HTTP: los seis
  servicios son internos y no hay contrato HTTP comercial aprobado.

#### BE-014B-COM-02 — Property scope en servicios comerciales internos

- **Estado:** COMPLETADA (2026-10-04). Implementación y pruebas locales PASS;
  el usuario ejecutó los tests sin fallos y confirmó el cierre.
- **Rama/base:** `feature/bd1-commercial-scope` desde `main` actualizado `d08383e`.
- **Dependencias/DoR:** BE-014B-COM-01 cerrado; C2 y regla global de property scope
  confirmados; seis servicios internos y repositorios scoped existentes. No requiere
  nueva ruta HTTP ni decisión de permisos AD-02 a AD-06.
- **Alcance/archivos:** validar que el scope recibido pertenece al snapshot Staff,
  su organización, memberships y permiso MULTI_PROPERTY_READ; limitar mutaciones
  a PROPERTY; llevar a predicados SQL la búsqueda de vínculos Company/Agency,
  Reservation, Stay y Reward original en Commercial. Cambios en helper/servicios
  Commercial, repositorios dependientes, tests y seguimiento.
- **Aceptación/DoD:** rechazar scope fabricado/ajeno antes del lookup; recursos
  vinculados ajenos son indistinguibles de inexistentes; listados multi-property
  limitados a properties de la sesión; regresión Commercial y verify completo con
  PostgreSQL/Java 21, diff --check. Entregar QA manual al usuario y esperar su
  confirmación antes de COMPLETADA, commit y push.
- **Evidencia:** 48 pruebas comerciales PASS (incluye aserciones SQL de scope),
  verify completo 300 PASS, cero failures/errors/skipped, JAR y diff --check
  PASS en PostgreSQL 17/Java 21. QA manual del usuario PASS según
  `24_BD1_COMMERCIAL_SCOPE_MANUAL_QA.md`; commit/push autorizados en la rama.
- **Límites:** contratos HTTP, actor derivado de sesión, finanzas/operaciones y
  cambios de permisos fuera de este incremento; revisar con BD3 al integrar.

### BE-008 — AuditTrail común y consulta administrativa

- **Estado:** BE-008A COMPLETADA; C6-D01 a D06 aprobadas por el usuario.
  BE-008B PENDIENTE por BE-014A, decisión de persistencia/módulo y contrato HTTP.
- **Dependencias:** A inventaría AuditService/auth_audit_events; B requiere C6
  aprobado, BE-014A y decisiones de persistencia/módulo aprobadas.
- **Entrega A / DoR B:** fijar taxonomía, actor, property u organización,
  entity/action/reason/time/correlation, detalle permitido, retención y consulta;
  acordar reutilización/proyección de eventos existentes sin duplicación.
- **Entrega B:** contrato común append-only, emisores iniciales Auth Admin e
  Integrations, query con AUDIT_READ y scope previo, filtros y paginación estable.
- **Aceptación:** evento acompaña commit y rollback según semántica acordada;
  no UPDATE/DELETE de historia; filtros/páginas sin fuga de properties y sin
  secretos/PAN/CVV/PII innecesaria. Evento global nunca da acceso global implícito.
- **Archivos previstos:** contrato C6, módulos/emisores existentes, módulo audit
  si aprobado, migrations 008, DTO/query/API y pruebas PostgreSQL/HTTP/upgrade.
- **Reviewer:** BD2/BD3 por emisores y consumidores administrativos afectados.

#### BE-008A — Propuesta de contrato C6

- **Estado:** COMPLETADA (2026-10-04). Contrato conceptual C6-D01 a D06
  aprobado por el usuario tras revisión; revisión de integración BD2/BD3 pendiente.
- **Rama/base:** `feature/bd1-audit-contract-c6` desde `main` actualizado
  `ea50726` (PR #93); COM-02 ya integrado.
- **DoR:** BE-003/C2 disponible y AuditService, reservation_audit_events,
  auth_audit_events y guest_auth_audit_events inventariados. BE-008B requiere
  C6 aprobado; este incremento A prepara una propuesta para esa decisión.
- **Alcance/archivos:** `docs/25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md`, AlanPlan y
  AlanHandoff. Taxonomía y fuentes, actor/contexto, organización/property,
  filtros/paginación, detalle seguro, retención y decisiones de persistencia.
  Sin Java, SQL, endpoints ni permiso nuevo.
- **Aceptación/DoD:** propuesta trazable a esquemas y emisores reales, matriz
  de decisiones/reviewers y casos QA de alcance/append-only; revisión documental,
  enlaces y diff --check PASS. El usuario revisa la propuesta antes del cierre,
  commit y push; BE-008B queda pendiente de C6 aprobado.
- **Evidencia:** inventario de tres tablas y sus emisores/ausencias verificado,
  cuatro enlaces locales válidos y `git diff --check` PASS; aprobación explícita
  del usuario. No se ejecuta Maven: solo cambia Markdown y no existe nueva
  superficie HTTP/SQL que probar. Commit/push autorizados en esta rama.

### BE-006 — Staff, roles fijos, memberships y sesiones administrativas

- **Estado:** BE-006A PENDIENTE; BE-006B PENDIENTE; BE-006C PENDIENTE.
- **Dependencias:** BE-002/003/005 completas; B requiere C4/BE-006A y BE-014A;
  definir en A auditoría con esquema vigente y contrato BE-008A. C depende de B.
- **Entrega A / DoR B:** aprobar C4: altas/consultas/edición/activación/suspensión,
  baja según retención, reset administrativo, roles fijos consultables/asignables,
  membership única, propiedades autorizadas y endpoints BFF. Confirmar protección
  de administradores, concurrencia y que GERENCIA no otorgue acceso fuera de su scope.
- **Entrega B:** CRUD auditado Staff y membership; único rol C2; GERENCIA no crea
  ni asigna SUPER_ADMIN. Cambio de contraseña/rol/estado/membership revoca todas
  las sesiones y refresh tokens afectados en la transacción acordada.
- **Entrega C:** listado scoped/paginado de sesiones, revocación administrativa
  individual/masiva auditada y consulta de auth_audit_events; verificar carreras
  refresh/revocación. Cambios a asignaciones de permisos, si aprobados, invalidan
  acceso y revocan sesiones afectadas conforme al contrato.
- **Aceptación:** duplicados rechazados sin alta parcial; sin escalamiento de rol
  ni properties; JWT ya emitido y refresh dejan de funcionar tras cambio sensible;
  logout Guest aislado; reset no filtra credenciales; rollback no deja usuario y
  sesiones inconsistentes. No autorregistro ni recuperación autónoma Staff.
- **Archivos previstos:** contrato C4, securityauth api/application/persistence,
  changesets nuevos 003 consecutivos, audit y tests; BFF/DTO/Mapper coordinados.
- **Reviewer:** owner Web de Staff/seguridad y BD2/BD3 por efectos de acceso.

### BE-013 — OTP y vínculo de reservas históricas

- **Estado:** BE-013A PENDIENTE; BE-013B PENDIENTE.
- **Dependencias:** BE-004 completa; GuestProfile/ReservationLinkService existen.
  B requiere A aprobada y contrato invocable del puerto con BD3; delivery externo
  y aceptación de presentación se cierran con BE-016B.
- **Entrega A / DoR B:** fijar firma/resultado mínimo de ReservationLinkVerificationPort,
  lookup seguro, endpoints/BFF y relación GuestAccount-reserva; acordar unicidad,
  asociación previa, concurrencia, rate limits y fallo de envío sin inventar reglas.
- **Entrega B:** emitir OTP hasheado al correo de reserva, verificar referencia y
  correo Google verificado; 10 minutos, 5 intentos, reenvío mínimo 60 segundos y
  un solo uso según C3. Vincular solo tras desafío válido y sesión Guest vigente.
- **Aceptación:** genéricas para inexistente/correo erróneo; expiración, bloqueo,
  replay, dos verificaciones concurrentes y reenvío probados; sesión/cuenta distinta
  no usa el desafío; ni OTP ni datos privados en logs; error Resend recuperable
  conforme al contrato. Coincidencia de correo sola no vincula.
- **Archivos previstos:** extensión C3, guestauth services/api/persistence, SPI y
  adaptador Reservations con BD3, nuevos changesets, Resend y tests/BFF.
- **Reviewer:** BD3 y consumidor Guest Web/Android aplicable.

### BE-007 — Centro de integraciones, error queue e idempotencia

- **Estado:** BE-007A PENDIENTE; BE-007B PENDIENTE.
- **Dependencias:** A requiere BE-003 y acuerdo SH-D01/BE-015A con BD2;
  B requiere C5/A, BE-014A, contrato audit BE-008A y persistencia confirmada.
- **Entrega A / DoR B:** registro property/category/provider/capabilities/config,
  secret references, health, contrato API/BFF y permisos; estados de queue,
  reintentos/límites/backoff, concurrencia, recuperación tras caída y operación incierta.
- **Entrega B:** configuración validada, health verificable, error queue con
  historial append-only, retry manual/recuperación autorizados y auditados;
  dedupe persistente compartido con BD2. No almacenar secretos en texto plano.
- **Aceptación:** misma key/payload retorna resultado original; payload distinto
  genera conflicto; retries simultáneos no duplican side effects; rollback,
  caída tras envío/antes de confirmación y timeout quedan recuperables. Cuando
  el proveedor no ofrece dedupe, acordar conciliación antes de prometer un solo efecto.
- **Archivos previstos:** C5, integrations si módulo aprobado, 007 registry/queue/
  idempotency, shared SPI acordado, API/DTO, PostgreSQL/HTTP/tests de fallos.
- **Reviewer:** BD2 por dedupe/pagos y BD3 por mensajería/channels operativos.

### BE-015 — Adapters externos de pagos y mensajería

- **Estado:** BE-015A PENDIENTE; BE-015B PENDIENTE por proveedor.
- **Dependencias:** A con BD2/BD3 y propuestas FP-D01/03/SH-D01;
  B requiere A, BE-007B o base de dedupe equivalente compartida aprobada,
  secretos/sandbox y flujos consumidores disponibles para integración final.
- **Entrega A / DoR B:** contratos de provider y SPI: BD2 posee ledger/lifecycle/
  folio; BD3 reglas y destinatarios de mensajería; BD1 transporte, secretos,
  callbacks auténticos, retry y recuperación. Aprobar canales, mensajes,
  consentimiento cuando aplique y propiedad del estado incierto.
- **Entrega B:** adapters aprobados con timeouts/errores seguros, verificación
  callback, dedupe y conciliación. Resend OTP no implica proveedor comercial
  confirmado para toda la mensajería. Nunca recibir/persistir PAN/CVV en PMS.
- **Aceptación:** authorize/capture/void/refund parciales según contrato BD2,
  callbacks duplicados/desordenados y timeouts; sin segundo movimiento contable;
  mensajería sin envío duplicado y estado de entrega según evidencia del proveedor.
  Sandbox + consumidor real + cross-property antes de COMPLETADA por proveedor.
- **Archivos previstos:** contrato SPI/provider, adapters integrations/guestauth
  según responsabilidad, consumers BD2/BD3, callback/API, tests de contrato y sandbox.
- **Reviewer:** BD2 pagos y BD3 mensajería; consumidores públicos afectados.

### BE-009 — Channels reales

- **Estado:** PENDIENTE; contrato y adapter se entregan por channel.
- **Dependencias / DoR:** ATS/RatePlans existen; completar C5, provider/channel y
  mappings aprobados; BE-007B/014A y contrato con booking/admisión BD2/BD3.
- **Entrega:** sincronizar inventario/tarifas y recibir eventos autorizados;
  health, errores/retry/recuperación en el centro; conciliar diferencias sin
  duplicar reservas. Confirmar semántica de reservas nuevas/cambios/cancelación.
- **Aceptación:** payload/callback auténtico, duplicados/desorden/timeout/reconexión,
  mappings por property, tarifa exacta, ATS respetado y ausencia de sobreventa
  para los escritores participantes; prueba sandbox de ida/vuelta con evidencia.
- **Archivos previstos:** contrato channel/mapping, adapters, consumers booking/
  inventory, queue/audit y pruebas. No diseñar reglas del channel desde fixtures.
- **Reviewer:** BD2 inventario/finanzas y BD3 consumidor operativo/comercial.

### BE-010 — Reportes, exportaciones y revenue KPIs

- **Estado:** BE-010A PENDIENTE; BE-010B PENDIENTE por reporte/KPI.
- **Dependencias:** A inventaría tablas y fórmulas con BD2/BD3; B requiere C7/A,
  BE-014A y fuentes reales de cada indicador. Folio PAYMENT no prueba capture.
- **Entrega A / DoR B:** definir occupancy/rooms sold/available, ADR/RevPAR/revenue,
  pickup/pace, fechas/timezone/business date, cancelación/no-show/OOO, moneda,
  snapshots históricos, filtros y permisos. Definir formato/límites/exportación.
- **Entrega B:** consultas scoped y resultados verificables por property antes
  de agregar ALL_PROPERTIES; exportar solo campos y properties autorizados;
  no sumar monedas distintas ni promediar ratios sin fórmula aprobada.
- **Aceptación:** dataset controlado persistido con resultado manual exacto,
  noches/límites/DST, multi-room contado por stay, cancelaciones/reembolsos según C7,
  denominador cero y monedas según contrato; filtros/paginación/exportación seguros
  y sin fórmulas ejecutables en formatos de hoja de cálculo; presupuesto de consulta
  y límites de export acordados/probados. Sin cifras derivadas de mocks Web.
- **Archivos previstos:** C7, reporting solo si aprobado, SQL/query/DTO/API,
  migrations/índices nuevos justificados, tests y consumidores de reportes.
- **Reviewer:** BD2 finanzas/inventario, BD3 business date/comercial y owner Revenue.

### BE-011 — MFA local Staff

- **Estado:** BE-011A PENDIENTE; BE-011B PENDIENTE.
- **Dependencias / DoR B:** cambio explícito aprobado de C1 + C8/A; BE-006C y
  contrato audit/access disponibles. Guest conserva MFA delegado a Google.
- **Entrega A:** decidir factor, obligatoriedad por rol, enrolamiento/confirmación,
  desafío previo a sesión completa, recuperación, revocación, límites y secretos.
- **Entrega B:** factor y recuperación acordados, protección de secretos,
  auditoría segura y revocación al cambiar factor/recuperación según C8.
- **Aceptación:** contraseña sola no concede sesión completa cuando MFA requerido;
  replay/expiración/intentos/concurrencia y recuperación probados; no semillas,
  códigos o recovery codes en logs/respuestas indebidas; no bypass vía refresh.
- **Archivos previstos:** C1 superseded/extendido y C8, securityauth/BFF,
  changesets y tests; dependencia criptográfica nueva solo si aprobada.
- **Reviewer:** producto y owner Web seguridad.

### BE-012 — Privacidad y consentimientos

- **Estado:** BE-012A PENDIENTE; BE-012B PENDIENTE por consentimiento/DSR.
- **Dependencias / DoR B:** GuestProfile existe; C9/A, BE-014A, auditoría y
  fuentes/retención legales confirmadas. No inferir jurisdicción ni plazos.
- **Entrega A:** propósitos/canales, source/version/evidence/time, identidad del
  titular, representación Staff, exportación/anonimización y retención financiera.
- **Entrega B:** historial versionado y revocable, exportación autorizada y
  anonimización conforme al contrato; GuestAccount no sustituye GuestProfile.
- **Aceptación:** revocar SMS no revoca Email; Guest solo accede a su vínculo
  autorizado; Staff requiere permiso/scope; export no filtra terceros; anonimizar
  no elimina historia financiera/audit retenida y reintento no duplica operación.
- **Archivos previstos:** C9, servicio/módulo aprobado, persistence/profile/link,
  migrations nuevas, audit/API/BFF y pruebas DSR/aislamiento.
- **Reviewer:** producto/retención, BD3 GuestProfile y consumidores Guest.

### BE-016 — Google y Resend en entorno de presentación

- **Estado:** BE-016A PENDIENTE; BE-016B PENDIENTE; externo SIN VERIFICAR.
- **Dependencias:** A puede iniciar desde ahora; B requiere acceso/configuración
  del entorno, cuenta de prueba/remitente y BE-013B para OTP E2E completo.
- **Entrega A:** checklist reproducible del host/HTTPS/callback Google, BFF y
  cookies, secretos mediante entorno, remitente/dominio Resend y destinatario de
  prueba autorizado. Registrar solo presencia/configuración pública, nunca valores secretos.
- **Entrega B:** Google real login/session/refresh/logout; desafío OTP vía Resend
  y recepción real en buzón, verificación/vínculo; errores de provider y correlación.
- **Aceptación:** evidencia fechada de entorno/commit, Network browser solo BFF,
  tokens fuera de JS, Guest/Staff aislados; recepción del correo comprobada.
  Respuesta HTTP del proveedor no sustituye entrega externa. Sin acceso externo,
  registrar impedimento/evidencia faltante y mantener validación pendiente.
- **Archivos previstos:** guía de presentación/smoke y evidencia sanitizada;
  cambios de configuración/código solo ante defecto concreto autorizado.
- **Reviewer:** responsable despliegue y consumidor Guest; BD3 vínculo.

### BE-017 — Cierre integrado BD1

- **Estado:** PENDIENTE.
- **Dependencias / DoR:** incrementos incluidos en los once puntos completos;
  decisiones aplicables aprobadas, providers y consumidores reales disponibles.
- **Entrega:** acceptance por requisito, suite PostgreSQL completa, HTTP/OpenAPI/
  BFF, migraciones upgrade/instalación, replay/concurrencia/recuperación, seguridad
  cross-property/Guest/Staff y smoke del entorno de presentación. Reviewers BD2/BD3.
- **Aceptación:** ninguna responsabilidad cerrada solo por documentación, mocks,
  tests omitidos o evidencia externa no ejecutada; limitaciones reales explícitas.
  Handoff enlaza commit/PR, comandos/resultados y siguiente paso por requisito.
- **Archivos previstos:** regresiones de integración y evidencia/handoff/plan;
  no ampliar dominio para cerrar la tarea.

### Persistencia y prefijos

| Prefijo | Responsabilidad | Regla |
| --- | --- | --- |
| 003 | Security/Auth/Staff/MFA/OTP según diseño aprobado | Próximo changeset nuevo; no editar aplicados ni fijar numeración sin revisar rama vigente |
| 007 | Integrations | Reservado; registry/queue/retry solo tras C5 y aprobación módulo |
| 008 | Audit | Reservado; crear solo tras C6 y decisión de reutilización |
| 009 o siguiente libre | Reporting/otros módulos nuevos | Reservar al confirmar arquitectura; no asignar dos módulos al mismo prefijo |
| 001 | Payments | Reservado para owner Payments; uso y SPI requieren acuerdo BD1/BD2 |

Folios existentes permanecen en 004 ServiceReservations. No mover migraciones por
cambio de ownership. El changelog maestro incluye solo módulos implementados y
respeta dependencias; perfiles parciales no alteran el contrato de integración.

### Control operativo, DoR y DoD comunes

Antes de cada incremento:

1. Revisar estado local/base actual sin sobreescribir cambios previos. Por
   instrucción explícita del usuario (2026-10-04), crear una rama nueva antes
   de modificar archivos al iniciar cada tarea de implementación; nunca trabajar
   directamente en main. Registrar rama y base en AlanHandoff.
2. Confirmar contratos/DEC, dependencias COMPLETADAS, owner/reviewers, acceptance,
   archivos previstos y configuración de prueba. Contrato pendiente = PENDIENTE,
   no READY; registrar la decisión faltante.
3. Marcar READY/EN_PROGRESO en este archivo y agregar entrada en AlanHandoff con
   rama/base/alcance/siguiente paso. Actualizar ambos al cambiar de estado.
4. Entregar contrato y código en incrementos revisables por dominio/proveedor.
   No ampliar permisos/roles/scope por conveniencia de implementación.

DoD de código: aceptación específica PASS, pruebas de dominio/SQL/HTTP/contrato
según impacto, `./mvnw -B verify` Java 21/PostgreSQL 17 sin exclusiones, migraciones
vacío/upgrade/idempotencia cuando existan, diff revisado y `git diff --check`;
OpenAPI/BFF/DTO/Mapper y documentación coherentes, evidencia sanitizada, revisión
de owners afectados. Providers requieren además sandbox; presentación requiere
validación en vivo. Al terminar cada tarea, entregar al usuario pasos manuales
con resultado esperado y límites de la superficie disponible. La tarea permanece
EN_QA hasta que el usuario informe su resultado y confirme la implementación;
solo entonces marcarla COMPLETADA y realizar commit/push. La publicación y el
review de owners afectados continúan sujetos al workflow Git vigente. La
autorización general para trabajar no sustituye esta confirmación por tarea.

DoD de contrato: referencias/capacidades comprobadas, propuesta y aprobación
separadas, campos/métodos/rutas/errores/permiso/scope/idempotencia/audit documentados,
reviewers y decisiones registradas. Documento preparado no significa aprobado.

Cada entrada de AlanHandoff registra: ID/incremento y estado; rama/base/commit/PR;
contrato/decisión y reviewers; alcance entregado; comandos, entorno y resultados;
evidencia HTTP/SQL/externa y límites; impedimentos/decisiones pendientes; siguiente
paso concreto. Mantener historial append-only y anteponer la actualización nueva.
No llevar tareas Backend al XLSX. No actualizar memorias externas como parte del plan.

**Próximo paso concreto:** publicar BE-008A/C6 en su rama. BE-008B permanece
pendiente de BE-014A y de la arquitectura/API específica. Preparar BE-006A/C4
para administración Staff. Coordinar guards de sesión/actor y AD-02 financiero
con los owners antes de nuevas APIs; no crear endpoints ni permisos desde una
propuesta no aprobada.

## Entorno de validación

En la validación original, el host tenía Java Runtime 25 sin `javac`. La validación reproducible de
BE-001 se ejecuta con `maven:3.9.11-eclipse-temurin-21` y PostgreSQL 17 en
Docker; el workflow Backend CI usa Temurin 21.
