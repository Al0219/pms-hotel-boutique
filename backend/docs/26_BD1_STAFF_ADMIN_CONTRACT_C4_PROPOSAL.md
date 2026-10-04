# BE-006A — Contrato C4: administración Staff

**Estado:** APPROVED para C4-D01 a D07 por el usuario (2026-10-04);
revisión de integración Web/BD2/BD3 pendiente.
**Base:** `main` `fdc2ed3` (PR #95), 2026-10-04.
**Rama:** `feature/bd1-staff-admin-contract-c4`. **Owner:** Alan / BD1.
**Reviewers de integración:** owner Web Staff/seguridad; BD2/BD3 por acceso a
sus dominios. Este documento no crea APIs, migraciones, roles ni permisos.

Fuentes: [C1 Staff](08_AUTH_SESSION_CONTRACT_PROPOSAL.md),
[C2 autorización y scope](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md),
[C6 AuditTrail](25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md),
[política de API Backend](02_API_CONTRACT_POLICY.md),
[seguridad global](../../docs/08_SECURITY_PRIVACY.md) y
[Change Control](../../docs/10_CHANGE_CONTROL.md). C1/C2/C6 y las decisiones
conceptuales C4 están aprobados; paths/DTO BFF y mecanismo concreto de entrega
de credenciales requieren contrato y revisión específicos antes de BE-006B/C.

## Inventario y discrepancias que C4 debe resolver

| Evidencia actual | Hecho comprobado | Efecto para el CRUD |
| --- | --- | --- |
| `003ServiceSecurityAuth/001-staff-auth-schema.yaml`, `StaffUser` | `staff_users` tiene username y workEmail únicos, passwordHash, roleCode y estados ACTIVE/SUSPENDED/DISABLED. La entidad Java solo permite creación activa y getters. | Falta operación administrativa, versión de concurrencia y activación/suspensión; el único de workEmail SQL distingue mayúsculas. No tratar el DTO de sesión como DTO de edición. |
| `003ServiceSecurityAuth/002-rbac-memberships.yaml` | Roles C2 `system_managed`; `organization_memberships` tiene PK `(staff_user_id, organization_id)` y roleCode propio; `membership_properties` es la asignación por property. | El PK permite varias organizaciones por Staff, aunque C2 fija una sola membership V1. Dos roleCode pueden divergir. No hay constraint que verifique que cada property pertenece a la organización de su membership. |
| `StaffAuthorizationRepository` / `StaffAuthorizationService` | El rol **efectivo** se lee de membership activa; permisos se calculan desde `role_permissions`. SUPER_ADMIN recibe todas las properties activas de su organización. | Cambios de StaffUser.roleCode sin actualizar membership no cambian facultades. El CRUD debe escribir ambos consistentemente y cerrar duplicidad de membership antes de exponer administración. |
| `StaffAuthServiceImpl`, `auth_sessions`, `refresh_tokens` | Login/refresh/logout Staff existen. `getActivePrincipal` comprueba sesión y usuario activos y recalcula autorización; refresh rota token opaco. | No hay revocación administrativa masiva ni lock/versión coordinados con cambios de usuario/membership; BE-006B/C deben cerrar carreras refresh-revocación. Guest usa tablas/sesiones distintas. |
| BFF Web `src/app/api/auth/staff/{session,refresh}/route.ts` | Solo fachada de login, sesión, refresh y logout Staff. | No existen Route Handlers de administración Staff; sus DTO/Mapper y protección de mutaciones requieren coordinación Web. |
| C6 y `auth_audit_events` | C6 exige actor y sujeto distintos, organización inmutable y detalle seguro; auth_audit_events hoy no guarda esos campos ni tiene trigger append-only. | BE-006B no debe presentar esos eventos como C6 completos sin extensión/migración aprobada. Probar emisión atómica con cambio local y no duplicar historia. |

## Modelo de acceso C4

- Solo sesión **Staff** vigente, snapshot de PostgreSQL y `STAFF_MANAGE` antes
  de cargar/listar un objetivo. JWT Guest, UI y roleCode enviado por el cliente
  no autorizan. No crear cuentas Staff desde checkout ni GuestAccount.
- Organización fija de la sesión C2. SUPER_ADMIN opera sobre todas sus
  properties activas; GERENCIA solo sobre las que tiene membership activa.
  GERENCIA no crea, asigna ni administra un SUPER_ADMIN. Tampoco puede ampliar
  el conjunto de properties de otro Staff fuera de su propio conjunto.
- Para que GERENCIA consulte o edite un Staff, la **totalidad** de properties
  activas del objetivo debe ser subconjunto de las autorizadas al actor. Un
  solapamiento parcial no basta. Listado y detalle aplican esta regla en SQL;
  ID de otra organización o fuera de scope resulta indistinguible de inexistente.
  Se prohíbe filtrar filas en memoria después de una consulta global.
- Un administrador no cambia su propio rol, estado, credencial ni membership
  mediante esta API. El bootstrap SUPER_ADMIN no puede quedar sin capacidad
  administrativa por suspensión/baja accidental. La política de reemplazo y
  recuperación de ese administrador requiere C4-D03/C4-D05.
- `roles` se listan como catálogo fijo consultable para `STAFF_MANAGE`.
  V1 no crea/edita/borra roles ni asigna permisos individualmente. El rol
  efectivo es el de la única membership; `staff_users.role_code` se mantiene
  consistente como columna heredada hasta acordar su eliminación futura.

## Ciclo de vida Staff y membership

| Operación conceptual | Entrada mínima propuesta | Invariante y resultado |
| --- | --- | --- |
| Alta | username, workEmail, roleCode, organizationId de sesión y propertyIds. | Username inmutable, workEmail normalizado para unicidad sin distinguir mayúsculas; rol fijo activo. Crear usuario **SUSPENDED** hasta entrega segura de credencial y activación. GERENCIA no asigna SUPER_ADMIN. Sin alta parcial. |
| Lista/detalle | Scope explícito PROPERTY o ALL_PROPERTIES si tiene MULTI_PROPERTY_READ; filtros por estado/rol/username. | Solo Staff cuya asignación completa cabe en el alcance del actor. Respuesta sin passwordHash, tokens, secretos ni detalle de auditoría crudo; paginación estable. |
| Edición de contacto | workEmail y versión esperada. | Username no cambia por esta API. Correo validado y único tras normalización; cambio revoca sesiones del objetivo porque puede afectar entrega de credenciales. |
| Cambio de rol/properties | roleCode y **reemplazo completo** de propertyIds en una transacción. | Una membership activa como máximo y propertyIds de la misma organización. Rol efectivo y columna heredada sincronizados. GERENCIA no promueve ni administra SUPER_ADMIN ni otorga properties externas. Revocar sesiones/refresh del objetivo. |
| Suspensión/reactivación/baja | estado ACTIVE, SUSPENDED o DISABLED y versión esperada. | SUSPENDED es reversible; DISABLED representa baja lógica y no se reactiva por esta API. Nunca hard delete Staff o su historia. Activación exige credencial preparada, membership activa y property válida. Revocar sesiones al cambiar estado. |
| Reset administrativo | objetivo y motivo; canal seguro pendiente C4-D05. | Sin recuperación autónoma Staff. Admin no recibe ni ve contraseña, token o enlace en navegador. Reset revoca todas las sesiones/refresh; no activar cuenta hasta completar entrega/uso del mecanismo aprobado. |

La propuesta separa BE-006B en incrementos revisables si hace falta:
**B1** alta/lista/detalle/estado/rol/membership/contacto y revocación;
**B2** reset administrativo tras aprobar mecanismo de entrega. Esto no marca
BE-006B completo antes de B2 ni cambia la aceptación original. BE-006C conserva
consulta/revocación administrativa de sesiones y la reparación de auditoría de
fallos C6-D06.

## Candidatos de contrato HTTP para revisión Web, no rutas existentes

Los métodos/paths siguientes son **candidatos** internos Spring; no se generan
OpenAPI ni controllers hasta aprobar C4 y el contrato final con Web. La fachada
BFF usaría paths de administración del mismo origen por definir con owner Web,
cookies Staff HttpOnly, protección de origen/CSRF para mutaciones y DTO/Mapper
propios. Ningún token se serializa al cliente.

| Método y candidato de path Spring | Permiso/scope | Request/response conceptual | Efecto/audit |
| --- | --- | --- | --- |
| `GET /api/v1/staff-admin/roles` | Staff + STAFF_MANAGE, organización de sesión | Roles activos fijos: code, name; sin mapa editable de permisos. | Solo lectura. |
| `GET /api/v1/staff-admin/users` | Staff + STAFF_MANAGE, PROPERTY/ALL_PROPERTIES C2 | scope explícito, filtros exactos y cursor; página de StaffView con membership scoped. | Solo lectura; no exportación masiva. |
| `GET /api/v1/staff-admin/users/{id}` | Igual y objetivo íntegramente visible | StaffView y versión; 404 para objetivo ajeno. | Solo lectura. |
| `POST /api/v1/staff-admin/users` | Staff + STAFF_MANAGE, propertyIds subconjunto del actor | Alta SUSPENDED; 201 y StaffView, sin credencial. | `STAFF_CREATED`, actor/sujeto y org C6. |
| `PATCH /api/v1/staff-admin/users/{id}` | Igual y objetivo visible | workEmail, expectedVersion; StaffView. | `STAFF_CONTACT_UPDATED`, revocación si cambió. |
| `PUT /api/v1/staff-admin/users/{id}/membership` | Igual, todas las properties propuestas autorizadas | roleCode, propertyIds, expectedVersion; StaffView. | `STAFF_MEMBERSHIP_REPLACED`, revocación. |
| `PATCH /api/v1/staff-admin/users/{id}/status` | Igual; protección admin | status, expectedVersion; StaffView. | `STAFF_STATUS_CHANGED`, revocación. |
| `POST /api/v1/staff-admin/users/{id}/credential-reset` | STAFF_MANAGE + facultad exacta C4-D05 | motivo/expectedVersion; respuesta sin secreto. | `STAFF_CREDENTIAL_RESET_REQUESTED`, revocación y entrega aprobada. |

`StaffView` conceptual: `id`, `username`, `workEmail`, `status`, `roleCode`,
`organizationId`, `propertyIds`, `createdAt`, `updatedAt`, `version`. Datos
de otras properties/organizaciones no se incluyen. `GET` no requiere
Idempotency-Key; mutaciones sobre usuario existente usan `expectedVersion` para prevenir sobrescritura
y deben acordar una clave de idempotencia donde reintentos puedan repetir
alta/reset/entrega. Nunca deduplicar un resultado antes de revalidar Staff y
scope. Páginas propuestas: 50 por defecto, máximo 100, orden `username,id`;
cursor ligado a filtros y scope. Contrato HTTP final documentará query/body,
errores, ejemplos, OpenAPI y BFF antes de código.

Errores propuestos: 400 formato/filtro/estado inválido; 401 token Staff o sesión
inválidos; 403 falta permiso o property solicitada no autorizada; 404 objetivo
ajeno/inexistente sin diferenciación; 409 username/workEmail duplicado o
versión desactualizada. Un conflicto no deja usuario, membership, sesiones y
auditoría a medias. No exponer hashes, existencia de otro tenant ni trazas SQL.

## Persistencia, revocación y auditoría requeridas en BE-006B/C

1. Migración nueva de 003, sin editar changesets existentes: unicidad real de
   una organización por Staff en V1; propertyId debe pertenecer a la org de
   membership; workEmail normalizado único; versión de concurrencia. Revisar
   datos existentes antes de agregar constraints y fallar sin perder registros.
2. `organization_memberships.role_code` es fuente del rol efectivo C2. En una
   misma transacción, escribir rol/membership/properties y sincronizar
   `staff_users.role_code`, hasta eliminar esa duplicidad mediante decisión
   posterior. No dejar dos memberships activas ni permisos efectivos ambiguos.
3. Serializar cambio sensible frente a refresh: bloquear usuario/membership,
   sesiones y familias de refresh en orden estable; verificar versión; guardar
   cambio, revocaciones y evento C6 en la transacción local. Una petición JWT
   ya emitida debe fallar en la siguiente validación de sesión. No tocar tablas
   Guest. Un rollback revierte cambio, revocaciones y auditoría juntos.
4. C6 aporta actor Staff autenticado, sujeto objetivo, organización inmutable,
   property de cada assignment cuando aplique, motivo seguro y correlationId.
   AuthAuditEvent actual carece de estos campos; no atribuir al actor un
   `staff_user_id` que identifica al sujeto. Corregir el flujo de fallo de
   autenticación descrito en C6-D06 antes de prometer auditoría completa.
5. BE-006C define listado scoped de sesiones y revocación individual/masiva
   con la misma protección de actor/objetivo, paginación y auditoría. No
   publica repositorios crudos de sesión o auth_audit_events.

## Decisiones C4 aprobadas por el usuario

| ID | Decisión conceptual aprobada | Consecuencia/reviewer |
| --- | --- | --- |
| C4-D01 — alcance de GERENCIA | Gestiona solo objetivos cuyo conjunto completo de properties esté dentro del suyo; sin administración por solapamiento parcial ni acceso entre organizaciones. | Producto/BD1 y Web; BD2/BD3 por roles operativos. |
| C4-D02 — rol y esquema | Membership única V1, roleCode efectivo en membership y espejo transaccional en StaffUser; constraint de org/property y correo normalizado único. | BD1 y BD2 por migración; bloquear B1 hasta reparar datos/constraint. |
| C4-D03 — SUPER_ADMIN | Solo bootstrap crea SUPER_ADMIN en V1; CRUD Web no crea/promueve a este rol ni permite suspender/deshabilitar el único bootstrap. Recuperación excepcional fuera de API pendiente de procedimiento operativo. | Producto/BD1/owner Web; impide escalamiento y pérdida de último admin. |
| C4-D04 — estados | Alta SUSPENDED, activación tras credencial lista; suspensión reversible, DISABLED baja lógica terminal. Username inmutable; workEmail editable y sensible. | Producto/BD1 y owner Web. |
| C4-D05 — reset | Invitación/reset **iniciado por admin** y entregado mediante canal seguro aprobado al workEmail; secreto de un uso, expiración y revocación. B2 pendiente de contrato de canal/plantilla y entrega, sin contraseña visible en navegador. | Producto/BD1, owner Web y BE-015/016 para correo. No asumir que Resend Guest OTP aprueba este uso Staff. |
| C4-D06 — concurrencia/reintentos | `expectedVersion` obligatorio en mutaciones sobre usuario existente; error 409 por versión; idempotencia para alta/reset según contrato final. Cambios y revocaciones atómicos; carrera refresh/revocación probada. | BD1; BD2 por dedupe si se reutiliza infraestructura. |
| C4-D07 — HTTP/BFF | Candidatos Spring de la tabla; BFF mismo origen con sesión Staff/cookies protegidas, DTO/Mapper y CSRF/origen antes de publicarlo. | Owner Web y BD1; aprobar rutas finales antes de controller. |

La aprobación de C4 no implementa BE-006B/C ni autoriza por sí sola una nueva
dependencia de correo, un permiso o rol nuevo, un cambio a C1 MFA o un módulo
Audit 008. Esas decisiones siguen sus contratos/Change Control.

## Aceptación prevista y QA manual de BE-006A

| Caso de implementación posterior | Resultado esperado |
| --- | --- |
| RECEPCION/AUDITOR/Guest llama administración | 403 Staff sin permiso; 401 Guest/token o sesión inválida. |
| GERENCIA crea/lee usuario de otra property o con asignación parcialmente ajena | Rechazo sin revelar objetivo; ningún side effect. |
| GERENCIA intenta SUPER_ADMIN, o cambiarse a sí mismo | Rechazo antes de escritura; último administrador protegido. |
| Dos altas con mismo username/workEmail normalizado o dos updates de misma versión | Un resultado válido; conflicto para el otro, sin fila parcial. |
| Cambio de role/status/property/workEmail o reset | Todas las sesiones y refresh del objetivo dejan de funcionar tras commit; Guest no cambia. |
| Refresh concurrente con suspensión | No queda un token Staff activo después del commit; rollback preserva estado previo. |
| Consulta de roles, usuarios y sesiones | Roles fijos; propiedad SQL scoped, sin passwordHash/token ni datos de otras properties. |
| Evento C6 | Actor, sujeto, org y acción correctos; commit/rollback junto al cambio, sin secret/PII cruda. |

Para revisar **este documento** desde `backend/`: `git branch --show-current`,
`git status --short`, `git diff --check`. C4-D01 a D07 fueron aprobadas por el
usuario; contrastar su integración con C1/C2/C6 y fijar canal/plantilla de reset
con sus owners. No hay prueba HTTP o Maven nueva en
BE-006A: todavía no cambia Java, SQL ni el BFF. BE-006B/C solo arrancan con
sus dependencias, contratos finales y owners revisados.
