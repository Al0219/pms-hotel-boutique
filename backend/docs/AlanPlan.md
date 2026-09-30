# AlanPlan — Backend Dev 1

## Propósito

Este archivo controla el trabajo de Backend para Alan (BD1). Sustituye el uso
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
| 002 | ServiceManagement | Alan / BD1 | `002-management-001` implementado en BE-003 |
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

- **Estado:** PENDIENTE
- **Owner:** Alan / BD1
- **Dependencias:** BE-002 y BE-003.
- **Alcance:** contratos confirmados de identidad, sesión y propiedades
  autorizadas; integración mediante DTO/Mapper.

## Entorno de validación

El host local tiene Java Runtime 25 sin `javac`. La validación reproducible de
BE-001 se ejecuta con `maven:3.9.11-eclipse-temurin-21` y PostgreSQL 17 en
Docker; el workflow Backend CI usa Temurin 21.
