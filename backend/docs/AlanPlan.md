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

Fases siguientes: motor ATS con integración BD3; APIs y scope;
integración y concurrencia. Sus contratos y DoR se concretarán antes de implementarlas.

## Entorno de validación

En la validación original, el host tenía Java Runtime 25 sin `javac`. La validación reproducible de
BE-001 se ejecuta con `maven:3.9.11-eclipse-temurin-21` y PostgreSQL 17 en
Docker; el workflow Backend CI usa Temurin 21.
