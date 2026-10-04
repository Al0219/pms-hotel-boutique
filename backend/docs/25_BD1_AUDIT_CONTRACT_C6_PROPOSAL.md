# BE-008A — Contrato C6: AuditTrail consultable

**Estado:** APPROVED para C6-D01 a C6-D06 por el usuario (2026-10-04);
revisión de integración BD2/BD3 pendiente.
**Base:** `main` `ea50726` (PR #93), 2026-10-04.
**Rama:** `feature/bd1-audit-contract-c6`. **Owner:** Alan / BD1.

Esta entrega fija las decisiones C6 aprobadas que preceden a BE-008B. No crea
endpoint, migración, módulo, permiso ni una consulta administrativa funcional.
Los nombres del sobre y límites siguientes son decisiones de contrato conceptual;
el método/path/DTO HTTP sigue pendiente de contrato específico y revisión de
owners. Aplican C2, la [regla global de property scope](../../docs/05_PROPERTY_SCOPE.md),
la [política de seguridad](../../docs/08_SECURITY_PRIVACY.md),
[Change Control](../../docs/10_CHANGE_CONTROL.md) y la
[política de contratos Backend](02_API_CONTRACT_POLICY.md).

## Inventario real y brechas

| Fuente actual | Datos y comportamiento comprobados | Brecha para consulta común |
| --- | --- | --- |
| `reservation_audit_events`, `AuditService` y changelog `004ServiceReservations/005-audit-trail.yaml` | ActorType STAFF/GUEST/SYSTEM, actorId, action, entity, propertyId nullable, before/after, reason, correlation, occurredAt/createdAt. Trigger PostgreSQL bloquea UPDATE/DELETE. Ya recibe eventos de Reservations, Folio, Inventory, Operations y Commercial. | `get`, `findByEntity` y `findByCorrelation` consultan sin Staff, permiso, scope ni paginación. `property_id` nullable no expresa por sí solo un evento de organización. before/after y reason son texto libre. |
| `auth_audit_events`, `AuthAuditEvent` y changelog `003ServiceSecurityAuth/001-staff-auth-schema.yaml` | El código **intenta** registrar login fallido/exitoso, refresh, revocación y bootstrap Staff; eventType, staffUserId, sessionId, detail, occurredAt. | No guarda organización/property, actor administrativo separado del Staff afectado, correlación ni trigger append-only. `staff_user_id` es sujeto/usuario afectado, no prueba quién realizó una operación administrativa. Las ramas que guardan evento y luego lanzan `StaffAuthenticationException` están en un servicio `@Transactional`: el rollback puede descartar ese evento y la revocación intentada; requiere prueba y corrección separada. |
| `guest_auth_audit_events`, changelog `003ServiceSecurityAuth/004-guest-auth-schema.yaml` | Tabla con guestAccountId, sessionId, eventType, detail y tiempo. | No hay emisor Java localizado en este checkout; no atribuir ni exponer eventos Guest que todavía no se registran. GuestAccount no es GuestProfile. |
| Catálogo C2, `003ServiceSecurityAuth/002-rbac-memberships.yaml` | `AUDIT_READ` existe para SUPER_ADMIN, GERENCIA y AUDITOR; `MULTI_PROPERTY_READ` solo para SUPER_ADMIN/GERENCIA. | El permiso no convierte una fila sin property/organización en globalmente visible ni concede lectura financiera de negocio. |

Los datos anteriores son fuentes separadas. Un identificador de correlación,
entidad o sesión nunca es prueba de autorización. Ninguna consulta cruda actual
de `AuditService` debe publicarse como API administrativa.

## Contrato C6 para preparar BE-008B

### Sobre canónico de evento

El contrato conceptual define los siguientes **metadatos**. Los emisores
mantienen su tabla original; una proyección de lectura los normaliza, con
`source` y `sourceEventId` para evitar duplicar la historia o contar dos veces un
evento. Si un flujo genera dos hechos distintos, conserva dos eventos con sus
identidades y acciones propias.

| Campo conceptual | Regla C6 |
| --- | --- |
| `source`, `sourceEventId`, `occurredAt` | Fuente estable (`RESERVATION_AUDIT` o `STAFF_AUTH`) e ID original; tiempo UTC de ocurrencia. `createdAt`/ingestión se conserva aparte si difiere. |
| `organizationId`, `propertyId`, `scopeKind` | Organización inmutable al emitir. Evento PROPERTY exige propertyId válido de esa organización; evento ORGANIZATION exige clasificación explícita. `propertyId = null` legado no se convierte automáticamente en ORGANIZATION. |
| `actorContext`, `actorId`, `subjectType`, `subjectId` | STAFF/GUEST/SYSTEM y actor confiable de sesión/proceso; sujeto afectado separado. Actor desconocido de filas heredadas queda `UNKNOWN`, nunca se deduce de `staffUserId` ni de un actorId aportado en body. |
| `action`, `entityType`, `entityId`, `correlationId` | Códigos estables; referencia de recurso y correlación sin facultad implícita. `sessionId` Staff se trata como referencia sensible, no como campo público libre. |
| `reasonCode`, `safeSummary` | Solo valores permitidos por tipo de evento. `detail`, `beforeState`, `afterState` y `reason` originales no pasan directamente al resultado. |

La taxonomía inicial reutiliza los códigos **ya emitidos**. Familias observadas:
`STAFF_LOGIN_*`, `STAFF_REFRESH_ROTATED`, `STAFF_SESSION_REVOKED`,
`STAFF_BOOTSTRAP_CREATED`; `RESERVATION_*`, `FOLIO_*`, `ROOM_*`,
`RATE_PLAN_*`, `HK_*`, `OUT_OF_ORDER`, `MAINTENANCE_ORDER`,
`SERVICE_REQUEST`, `SERVICE_MESSAGE`, `BUSINESS_DAY`, `COMPANY`, `AGENCY`,
`EVENT_GROUP`, `ROOM_BLOCK`, `PROMOTION` y `REWARD_LEDGER` como entityType/action
según cada emisor. No reinterpretar cadenas legadas como si siempre fueran el
mismo código; BE-008B debe registrar mapeos por emisor y pruebas de cada uno.
Eventos nuevos de administración Staff e Integrations necesitan catálogo de
acciones y actor/sujeto explícitos al implementar sus productores.

### Autorización y alcance de lectura

1. Solo sesión **Staff** vigente con `AUDIT_READ`, snapshot C2 recalculado y
   organización validada. JWT Guest no entra en esta consulta. Auditoría de
   accesos Guest es un evento, no concede acceso a Guest al AuditTrail Staff.
2. `PROPERTY(propertyId)` requiere membership activa. `ALL_PROPERTIES` exige
   `MULTI_PROPERTY_READ` y usa exclusivamente las propiedades activas de esa
   sesión. Ambas restricciones entran en el predicado SQL **antes** de cargar
   filas o calcular count, incluso para get, entity y correlation.
3. Los eventos clasificados ORGANIZATION requieren `SUPER_ADMIN` de la
   misma organización **y** `AUDIT_READ`. GERENCIA/AUDITOR con acceso a alguna
   property no ven por ello acciones globales de toda la organización. Esta
   regla es la decisión aprobada C6-D02.
4. Filas legadas cuyo `organizationId` o `scopeKind` no se pueda reconstruir de
   forma inequívoca quedan fuera del resultado administrativo; siguen intactas
   en su fuente. No resolver propiedad histórica con membership actual de un
   usuario o con texto libre. Atribución/backfill exige regla y prueba aparte.
5. Un ID de evento/entidad/correlación de otra property responde igual que uno
   inexistente dentro del scope. El resultado nunca enumera propiedades ajenas.

### Consulta, filtros y paginación

Se define una capacidad interna `search` y `get` de solo lectura, sin fijar
todavía método/path HTTP o BFF. Antes de publicar la API, completar en ella
method, path, DTO, ejemplos, errores, OpenAPI, sesión/actor y filtros de acuerdo
con `02_API_CONTRACT_POLICY.md`.

- Filtros C6: rango de `occurredAt`, `source`, action exacta,
  entityType/entityId, actorContext/actorId, subjectType/subjectId y
  correlationId. Ningún filtro amplía el scope resuelto. No buscar en texto
  libre de `detail`, `reason` o snapshots.
- Orden total C6: `occurredAt DESC`, `source ASC`, `sourceEventId DESC`.
  Cursor opaco ligado a filtros y scope; keyset sobre esa tupla para evitar
  omisiones/duplicados en empates. Una nueva fila puede aparecer en una nueva
  consulta; no se promete snapshot histórico sin mecanismo adicional.
- Límites C6: 50 registros por página por defecto,
  máximo 100 y ventana temporal máxima de 90 días por consulta. Periodos mayores
  se recorren por ventanas autorizadas; exportación masiva no nace de esta API.
  La implementación debe justificar índices/plan SQL y fijar timeout.
- No devolver `totalCount` de todo el tenant; si se ofrece conteo, debe usar el
  mismo predicado de autorización y aceptar su coste. Rechazar filtros/cursor
  inválidos sin revelar existencia de otro recurso.

### Detalle seguro, escritura y retención

- La respuesta inicial expone solo el sobre canónico y resúmenes de una
  **allowlist** por acción. No expone JSON crudo de before/after, `detail` Staff,
  correos, tokens, OTP, hashes, secretos, datos de pago, PAN ni CVV. Campos de
  identidad personal y motivo libre requieren política de redacción aprobada.
- El evento se inserta en la misma transacción que la mutación local que
  documenta; rollback local elimina ambos. Para efectos externos no se inventa
  atomicidad con proveedor: intención, confirmación e incertidumbre son hechos
  distintos y recuperables según C5/BE-007. Correcciones son nuevos eventos.
- Un intento de autenticación fallido debe poder quedar registrado aunque la
  solicitud termine en 401. No guardar el evento dentro de una transacción que
  se revierte por la misma excepción. La estrategia transaccional y la
  atribución segura del intento se fijan con BE-006C, sin filtrar si existe un
  username ni almacenar contraseñas/tokens.
- `reservation_audit_events` ya tiene trigger append-only. BE-008B debe decidir
  y probar protección equivalente para `auth_audit_events` y cualquier nueva
  fuente que integre; la ausencia actual no se describe como garantía lograda.
- Regla de retención V1 aprobada: sin purga automática ni hard delete; acceso mínimo
  y revisión periódica de la política. Plazo legal, archivo, anonimización y
  eliminación autorizada siguen sin definir. No borrar AuditTrail por DSR sin
  resolver conservación obligatoria y corrección compensatoria (C6-D04).

## Decisiones C6 aprobadas por el usuario

| ID | Decisión aprobada | Impacto/reviewers |
| --- | --- | --- |
| C6-D01 — fuentes y proyección | Unificar **lectura** de fuentes existentes mediante sobre con `source/sourceEventId`; extender la fuente de auth para atribución futura, sin copiar eventos a una segunda tabla histórica. Legacy no atribuible queda oculto. | BD1 seguridad; BD3 audit de reservas; BD2 finanzas/inventario. Definir mapeo y migración sin editar historia. |
| C6-D02 — eventos de organización | `AUDIT_READ` + rol SUPER_ADMIN y coincidencia de organización. Property-scoped conserva C2; nunca hacer fallback de `propertyId=null` a global. | Producto/BD1; BD2/BD3 por emisores globales. |
| C6-D03 — payload y actor | Sobre mínimo/redactado, actor y sujeto separados; catálogo allowlist por acción antes de detalle. `staffUserId` legado no equivale a actor. | BD1 privacidad/seguridad, BD2/BD3 emisores. |
| C6-D04 — retención | No purga automática en V1; plazo/archivo/DSR se decidirán con producto y política de retención antes de prometer eliminación. | Producto/privacidad; BD1. |
| C6-D05 — consulta | Keyset, filtros exactos, ventana de 90 días, página 50/máximo 100. Sin export en BE-008B inicial. | BD1 y consumidores administrativos; revisar rendimiento SQL con BD2/BD3. |
| C6-D06 — fallos de autenticación | Registrar intento fallido sin depender de la transacción que lanza 401; probar rollback y revocación de refresh inválido antes de exponerlo como evidencia administrativa. | BD1 seguridad; enlazar BE-006C. |

Estas decisiones permiten detallar API/persistencia de BE-008B. C6 no autoriza
por sí solo un nuevo módulo `008`, ni modifica
permisos, retención legal o rutas BFF existentes. Si se aprueba un módulo nuevo,
registrar la decisión arquitectónica antes de crear su changelog.

## Pruebas de aceptación previstas para BE-008B

| Escenario | Resultado exigido |
| --- | --- |
| Sin sesión, JWT Guest, Staff revocado o sin AUDIT_READ | 401 para identidad/sesión inválida; 403 para permiso insuficiente, sin consulta de eventos. |
| Staff con una property solicita ID/correlation/entity ajena | 404 o lista vacía indistinguible de inexistente; SQL acotado antes de lectura. |
| GERENCIA usa ALL_PROPERTIES | Solo IDs activos de su sesión; no ve property de otra organización ni evento ORGANIZATION sin C6-D02. |
| AUDITOR con AUDIT_READ pero sin MULTI_PROPERTY_READ | PROPERTY autorizado funciona; ALL_PROPERTIES responde 403. |
| Dos eventos con mismo tiempo y nuevo evento concurrente | Cursor avanza sin repetir ni saltar filas de la secuencia previa; orden estable y filtros ligados al cursor. |
| Evento contiene correo/token/estado libre sensible | Respuesta y logs no devuelven payload crudo; allowlist/redacción probada. |
| Mutación local revierte; intento UPDATE/DELETE de evento | No queda evento de la mutación revertida; historia confirmada es append-only en cada fuente integrada. |
| Auth legado sin organización/actor probables | Permanece almacenado, no se expone mediante inferencia o lookup no scoped. |

## Revisión manual del contrato

Desde `backend/`, confirmar rama y ausencia de cambios funcionales con
`git branch --show-current`, `git status --short` y `git diff --check`.
Las decisiones C6-D01 a C6-D06 fueron aprobadas por el usuario. Revisar sus
efectos con BD2/BD3 al preparar los emisores y consumidores de BE-008B.
`./mvnw verify` no valida este contrato Markdown: BE-008A no cambia Java, SQL ni
endpoints. BE-008B continúa PENDIENTE por BE-014A y la decisión de persistencia/
módulo y contratos HTTP específicos.
