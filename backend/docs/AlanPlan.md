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
| 002 | ServiceManagement | BD1 (base) / BD2 (core) | `002-management-001` en BE-003; `002-management-002` en BD2-001 |
| 003 | ServiceSecurityAuth | Alan / BD1 | `003-staff-auth-001` (BE-002) y `002`/`003` de RBAC (BE-003) |

Cada módulo agrega versiones internas consecutivas. Una migración aplicada no
se renombra ni modifica. El changelog completo incluye módulos según sus
dependencias; un perfil parcial incluye solo su módulo y sus dependencias.

## Tareas

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

- **Estado:** EN_QA; corrección BD2 lista para revisión, integración pendiente de BD3.
- **Owner:** BD2.
- **Rama:** `feature/bd2-availability-engine`; corrección publicada en `277390d`.
- **DoR:** investigación y corrección de CI autorizadas por el usuario;
  mantener rama, sin merge/rebase y sin deshabilitar tests.
- **Alcance:** comparar upgrade con instalación limpia vigente, verificar el
  changeset de inventario y conservar validaciones de idempotencia/Property.
- **DoD:** `./mvnw -B verify` con Java 21/PostgreSQL 17, revisión de diff y
  seguimiento de la dependencia de integración en `AlanHandoff.md`.

### BD2-004 — API Staff de disponibilidad (Fase 4)

- **Estado:** COMPLETADA para entrega BD2; publicada en `0dbaa74`, revisión del PR pendiente. Owner BD2.
- **Rama:** `feature/bd2-availability-api`, dependiente de BD2 Fase 3 en `277390d`.
- **DoR:** Fase 4 y uso de servicios BD1 disponibles autorizados; contrato en
  `12_BD2_AVAILABILITY_API_CONTRACT.md`; permisos existentes C2 y scope explícito.
- **Alcance:** controlador/DTO, cadena Staff limitada a disponibilidad, guard de
  método con sesión/permiso/property scope, errores y OpenAPI. Sin cambios BD3.
- **DoD:** verify completo y pruebas HTTP de JWT Staff/Guest, sesión revocada,
  permisos, aislamiento de propiedad, validación de fechas, ATS y documentación.
- **Validación:** `./mvnw -B verify` PASS en Java 21/PostgreSQL 17;
  36 pruebas, cero fallos/errores/omitidas. Integración final dependiente de BD3.

### BD2-005 — Admisión e integración de disponibilidad (Fase 5)

- **Estado:** EN_QA — alcance BD2 validado; conexión y CI combinada pendientes de BD3.
- **Owner:** BD2; revisión cross-domain requerida de BD3.
- **Rama:** `feature/bd2-inventory-admission`, dependiente de Fase 4 en `0dbaa74`.
- **Entrega:** publicación autorizada; PR hacia `main`, que ya contiene Fase 4
  mediante PR #64 (`a4dc6b0`). Mantener EN_QA hasta cerrar integración BD3.
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
  límites y conexión pendiente con BD3 registrados, diff revisado.
- **Límite:** implementar el puerto no protege escrituras que no lo utilicen;
  la conexión mínima de BD3 requiere autorización por su ownership.
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

- **Estado:** PENDIENTE — contrato operativo por confirmar.
- **Owner:** BD2.
- **Dependencias:** BD2-006A; autorización C2 y AuditService existentes.
- **DoR:** confirmar `15_BD2_PROPERTIES_CRUD_CONTRACT_PROPOSAL.md`, especialmente
  rutas/permisos y alcance sin baja/reactivación ni cambios de timezone/moneda.
- **Alcance propuesto:** servicios/DTO/REST/OpenAPI, guard Staff por método,
  repositorios scoped, auditoría transaccional y extensión de Postman.
- **Aceptación/DoD:** definidos en la propuesta; pruebas PostgreSQL/HTTP real,
  verify completo, diff revisado, commit/push y handoff.

## Entorno de validación

En la validación original, el host tenía Java Runtime 25 sin `javac`. La validación reproducible de
BE-001 se ejecuta con `maven:3.9.11-eclipse-temurin-21` y PostgreSQL 17 en
Docker; el workflow Backend CI usa Temurin 21.
