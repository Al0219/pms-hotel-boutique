# Staff Admin — contrato HTTP/BFF y plan del incremento de lectura

**Estado: PENDIENTE DE APROBACIÓN.** Fecha: 2026-10-22.
Base inspeccionada: `main`, `a0f62d0`; árbol inicialmente limpio.
Alcance autorizado ahora: documentación de propuesta. No implementa endpoints,
no confirma decisiones nuevas ni cambia estados de implementación/backlog.
Owners propuestos: Alan/BD1 (Backend), WEB-2 (Web); reviewer Web: WEB-3.
Coordinación BD2/BD3 únicamente por efectos concretos en contratos compartidos.

### Ejecución Backend autorizada — Fase 2A, 2026-10-22

El usuario solicitó explícitamente implementar exclusivamente los tres GET Backend
de este contrato, conservar las restricciones C1/C2/C4/C6 y limitar los objetivos
sin propiedades a SUPER_ADMIN + ALL_PROPERTIES de su organización. Se contrastó
el texto literal R01–R07 con esa instrucción: sin conflicto normativo en la
lectura. Esto registra autorización del incremento Backend, **no** aprobación
global de las secciones BFF/UI ni cambio de este documento a APPROVED.

Precisión técnica comprobada: AuthorizedPropertyScope compartido exige conjunto
no vacío; la afirmación inicial de soporte de ALL vacío en el resolver omitía
esa validación del constructor. La implementación conserva ese tipo global y
representa el caso SUPER_ADMIN ALL vacío en StaffAdminScope local administrativo.
Reutiliza PropertyScopeResolver para los demás casos; no modifica contratos de
otros módulos. No se atribuye el cambio a una nueva política global.

R01/R05 se implementan solo en Spring; R02/R03/R04 conservan sus restricciones;
R06 solo aporta organizationId en el catálogo Backend; R07 habilita este
subconjunto autorizado sin completar BE-006B/C. BFF, cache/MSW y React pendientes.
Implementación/QA de Fase 2A y límites operativos:
[52_STAFF_ADMIN_READ_QA.md](52_STAFF_ADMIN_READ_QA.md). DTO implementado en
application/StaffAdminReadModels.java; parser propio en StaffAdminReadQuery.java.
El manejo 405 usa StaffAdminMethodExceptionResolver, limitado al nuevo namespace,
para evitar un dispatch a /error; no publica mappings de mutación.

## 1. Fuentes, alcance y aprobación

### Seguimiento Fase 2B autorizada — 2026-10-22

El usuario autorizó implementar únicamente el BFF de los tres GET, conservando
el Backend EN_QA y sin UI/mutaciones. La fachada se entrega EN_QA con los DTO
implementados, sin alterar endpoints ni decisiones de Fase 2A. Validaciones,
métodos 405, errores sanitizados, timeout, MSW, pruebas y procedimientos en
[Web 64](../../frontend/pms-hotel-web/docs/64_STAFF_ADMIN_BFF_QA.md). Las referencias
a BFF pendiente en el plan inicial son el historial de propuesta; UI/cache/hooks
siguen fuera de alcance. No se marca este documento globalmente APPROVED.

- [C1: identidad y sesión Staff](08_AUTH_SESSION_CONTRACT_PROPOSAL.md).
- [C2: permisos y scope](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md).
- [C4: administración Staff](26_BD1_STAFF_ADMIN_CONTRACT_C4_PROPOSAL.md).
- [C6: auditoría](25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md).
- [Persistencia Staff ya integrada](27_BD1_STAFF_SCHEMA_MIGRATION_QA.md).
- [Política HTTP/OpenAPI](02_API_CONTRACT_POLICY.md).
- [Property Scope global](../../docs/05_PROPERTY_SCOPE.md).
- [Change Control](../../docs/10_CHANGE_CONTROL.md).
- [Simulación Private 07](../../frontend/pms-hotel-web/docs/32_PRIVATE_07_MOCK_CONTRACT_PROPOSAL.md).
- [Seguimiento Backend](AlanPlan.md), sección BE-006 y control operativo común.

La dirección arquitectónica de Fase 0 está aceptada. Las decisiones C4-D01 a D07
ya aprobadas se conservan. **Todas las precisiones HTTP y las resoluciones nuevas
de este documento se proponen para aprobación conjunta**, no se declaran vigentes.
Tras aprobación, registrar la decisión conforme Change Control y vincularla al
incremento de lectura de BE-006; no marcar BE-006B/C completos por esta entrega.

Primer incremento funcional: catálogo fijo, listado y detalle administrativos
reales. No alta, edición, cambio de estado, reset, revocación administrativa,
MFA, consulta AuditTrail, exportación ni administración GuestAccount.
La ruta `/seguridad/usuarios/nuevo` queda reservada para una entrega posterior:
no crear página ni CTA habilitado en este incremento.

## 2. Autorización y semántica exacta del scope

### 2.1 Actor, organización y asignaciones

Cada petición revalida JWT **Staff**, sesión vigente, usuario ACTIVE, membership
ACTIVE y snapshot de PostgreSQL mediante los servicios C1/C2 existentes. Exigir
`STAFF_MANAGE` antes de consultar catálogo u objetivos. Organización exclusivamente
del snapshot autenticado; no aceptar organizationId, actorId, permissions ni una
lista de propiedades autorizadas aportados por el cliente.

Definiciones del predicado de lectura:

- `O`: organización autenticada.
- `A`: todas las properties activas autorizadas al actor según C2, no solo la
  seleccionada. SUPER_ADMIN obtiene las activas de O; GERENCIA su membership.
- `M(t)`: única membership organizativa persistida del objetivo en O; puede
  estar ACTIVE o INACTIVE. Su role_code es el rol asignado mostrado; no leer
  el espejo StaffUser.roleCode como autoridad. Con membership INACTIVE la UI
  no debe describir ese rol como acceso efectivo ni conceder permisos.
- `P(t)`: conjunto de asignaciones administrativas activas del objetivo:
  membership_properties.status=ACTIVE y properties.status=ACTIVE, ambas de O.
  Se calcula sin vaciarlo por staff_users.status ni M(t).status. Así, suspender
  una cuenta o inactivar su membership no hace desaparecer asignaciones ajenas
  ni elude la comprobación de conjunto completo. No equivale a acceso efectivo.
- Para objetivo SUPER_ADMIN, P(t) son todas las properties activas de O según C2,
  aunque no existan filas explícitas en membership_properties.

Un Staff sin membership persistida no tiene organización atribuible mediante
C2: excluirlo de ambas lecturas; no inferir O desde correo, rol o actor. La
recuperación de huérfanos es operativa, fuera de esta API.

### 2.2 Visibilidad completa y selección

Predicado común `V(t)` aplicado en SQL:

1. M(t) pertenece a O.
2. SUPER_ADMIN actor: puede leer objetivos de O.
3. GERENCIA actor: objetivo no SUPER_ADMIN, P(t) no vacío y P(t) subconjunto de A.
4. Ningún otro rol del catálogo actual obtiene acceso sin STAFF_MANAGE.

La restricción explícita de conjunto no vacío para GERENCIA es **propuesta nueva
R03**, no consecuencia automática de la lógica matemática de subconjuntos.

| Selección explícita | Condición adicional al predicado V(t) |
| --- | --- |
| PROPERTY(p) | Resolver p en A antes de consultar; exigir p en P(t). |
| ALL_PROPERTIES | Resolver mediante C2; exige MULTI_PROPERTY_READ (SUPER_ADMIN conserva la excepción del resolver C2). No exigir solapamiento adicional: V(t) ya limita al actor. |

La propuesta del usuario para PROPERTY es compatible con C4: filtra pertenencia
a la propiedad seleccionada y conserva visibilidad completa frente a **A**.
Ejemplo: actor A={p1,p2}, objetivo P={p1,p2}; PROPERTY(p1) lo incluye y devuelve
ambas asignaciones autorizadas. Actor A={p1}, mismo objetivo: queda excluido;
detalle 404. No recortar P para aparentar que el objetivo es administrable.

Listado y detalle exigen la misma selección y predicado. Un detalle fuera de la
PROPERTY elegida devuelve 404 aunque pudiera verse al seleccionar ALL_PROPERTIES.
No ampliar scope automáticamente al navegar a detalle.

### 2.3 Estados y casos límite propuestos

| Objetivo | Resultado |
| --- | --- |
| ACTIVE/SUSPENDED/DISABLED con P no vacío | Mismo predicado de scope; status no concede ni elimina visibilidad. Por defecto incluir los tres estados. |
| Membership INACTIVE con asignaciones activas | Visible solo si cumple V y selección; informar membershipStatus=INACTIVE, sin afirmar acceso efectivo. |
| Sin propiedades activas, membership de O persistida | Solo SUPER_ADMIN en ALL_PROPERTIES; PROPERTY no lo incluye. GERENCIA no lo ve ni por ID. |
| SUPER_ADMIN objetivo | GERENCIA no lo ve; SUPER_ADMIN de O sí, sujeto a selección. |
| Propiedades o asignaciones INACTIVE | No devolver IDs/nombres históricos; no forman P. No es una pantalla de historial. |
| Actor SUPER_ADMIN con O sin properties activas | ALL_PROPERTIES vacío sigue siendo selección explícita; puede consultar usuarios de O sin asignaciones. La UI ofrecerá esa selección, sin fallback implícito. |
| Actor consulta su propia cuenta | Lectura permitida si cumple V y selección; ninguna mutación propia se habilita. |
| Objetivo de otra organización o sin membership atribuible | No aparece; detalle 404 idéntico al inexistente. |

Permisos efectivos del actor y memberships del objetivo se mantienen separados.
El catálogo de roles no contiene permisos individuales editables ni propiedades.

## 3. HTTP Backend propuesto

Audiencia BFF interna; `Authorization: Bearer` Staff solo entre Next.js y Spring.
GET sin body y sin Idempotency-Key. No escrituras ni nuevos eventos C6 de lectura:
no se inventa una taxonomía de eventos. Preservar eventos existentes de Auth y no
exponer detail, before/after, auth_sessions ni repositorios crudos.
En éxitos y errores: `Cache-Control: private, no-store`; no ETag ni respuestas 304.
Content-Type éxito `application/json`; errores `application/problem+json`.

### 3.1 GET /api/v1/staff-admin/roles

Sin query parameters. Devuelve catálogo fijo ACTIVE de PostgreSQL, en este orden:
SUPER_ADMIN, GERENCIA, RECEPCION, OPERACIONES, AUDITOR. `name` viene de roles.name;
sin contadores ficticios, permisos o flag editable. Los cinco roles se consultan
también por GERENCIA; consultar el catálogo no permite administrar SUPER_ADMIN.
Si falta un rol, hay duplicados o catálogo inconsistente: 503, no inventar entradas.

`StaffAdminRolesResponse`:

```json
{
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "items": [
    { "code": "SUPER_ADMIN", "name": "Super Admin" },
    { "code": "GERENCIA", "name": "Gerencia" },
    { "code": "RECEPCION", "name": "Recepcion" },
    { "code": "OPERACIONES", "name": "Operaciones" },
    { "code": "AUDITOR", "name": "Auditor" }
  ]
}
```

organizationId procede del actor, aunque el catálogo fijo sea compartido.
Permite vincular el contexto administrativo Web sin modificar el DTO C2 de sesión.

### 3.2 GET /api/v1/staff-admin/users

`StaffAdminUsersQuery` (parámetros únicos, case-sensitive salvo normalización indicada):

| Parámetro | Validación y comportamiento |
| --- | --- |
| scope | Obligatorio, PROPERTY o ALL_PROPERTIES exactos. |
| propertyId | UUID canónico, obligatorio solo para PROPERTY; prohibido para ALL_PROPERTIES. Aceptar hexadecimal mayúscula y normalizar a minúscula. |
| status | Opcional: ACTIVE, SUSPENDED o DISABLED exactos; ausente incluye todos. |
| roleCode | Opcional: uno de los cinco códigos; filtro de igualdad sobre M.role_code. |
| username | Opcional: búsqueda por subcadena literal, case-insensitive, trim, longitud 1..80 tras trim; rechazar vacío/control characters. Escapar %, _ y escape SQL: no son comodines del cliente. No buscar correo ni otros campos. |
| limit | Entero decimal 1..100; default 50. Rechazar cero, negativo, fracción o exceso; no clamp. |
| cursor | Opcional, no vacío, máximo 4096 caracteres; opaco, generado por Backend. |

Rechazar parámetros desconocidos, duplicados, arrays, scope ausente y combinaciones
inválidas con 400. Sin sort configurable, offset, page, totalCount ni exportación.
La UI usa «Buscar por usuario» para no prometer búsqueda de correo.

Orden total fijo: `username COLLATE "C" ASC, id ASC`; username sin normalizar para
ordenar, filtro case-insensitive separado. Keyset exclusivo tras la última tupla.
`LIMIT limit+1`; devolver como máximo limit usuarios y nextCursor si existe otra
fila. Limitar usuarios antes de expandir sus properties para evitar duplicados
y cortes parciales. Properties ordenadas por UUID ascendente.

`StaffAdminUsersPage`: organizationId, scope (kind y propertyIds resueltos),
items (StaffAdminUserView[]), limit y nextCursor (string|null). Scope es el filtro
de consulta; propertyIds de cada usuario es su asignación administrativa completa.

### 3.3 GET /api/v1/staff-admin/users/{id}

Path id UUID; query solo scope y propertyId con las reglas anteriores. Sin filtros,
limit ni cursor. `StaffAdminUserDetail`: organizationId, scope e item
(StaffAdminUserView). Si no satisface el mismo predicado SQL: 404 genérico.

### 3.4 DTO de usuario, validación y ejemplos

`StaffAdminUserView` (todos los campos obligatorios, ninguno nullable):

| Campo | Tipo y fuente |
| --- | --- |
| id | UUID StaffUser. |
| username | String no vacío, máximo 80; identificador inmutable. |
| workEmail | String no vacío, máximo 320 de persistencia; solo lectura. No redefinir aquí límites del login/alta. |
| status | ACTIVE / SUSPENDED / DISABLED. |
| roleCode | Rol asignado en única membership de O; uno de los cinco. |
| membershipStatus | ACTIVE / INACTIVE; precisión nueva de presentación administrativa. |
| organizationId | UUID O; debe coincidir con envelope. |
| propertyIds | UUID[] únicos y ordenados: P(t), nunca IDs ajenos. Puede ser []. |
| createdAt, updatedAt | RFC3339 UTC Z; updatedAt >= createdAt. |
| version | Entero 0..9007199254740991, seguro en JavaScript; no concurrencia de edición en esta entrega. |

No devolver passwordHash, contraseña, JWT, refresh, sessionId objetivo, permisos
individuales, correo personal, detalle de auditoría ni propiedades inactivas.
No serializar entidades JPA; proyección explícita. Dato obligatorio inconsistente
impide responder esa página/detalle: 503 genérico, no respuesta parcial exitosa.

Ejemplo ficticio de listado, seleccionando p1 con actor autorizado a p1 y p2:

```http
GET /api/v1/staff-admin/users?scope=PROPERTY&propertyId=22222222-2222-4222-8222-222222222222&status=SUSPENDED&roleCode=RECEPCION&username=recep&limit=50
```

```json
{
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "scope": { "kind": "PROPERTY", "propertyIds": ["22222222-2222-4222-8222-222222222222"] },
  "items": [{
    "id": "44444444-4444-4444-8444-444444444444",
    "username": "recepcion_ejemplo",
    "workEmail": "recepcion@example.test",
    "status": "SUSPENDED",
    "roleCode": "RECEPCION",
    "membershipStatus": "ACTIVE",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "propertyIds": ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"],
    "createdAt": "2026-10-01T12:00:00Z",
    "updatedAt": "2026-10-02T12:00:00Z",
    "version": 0
  }],
  "limit": 50,
  "nextCursor": null
}
```

Detalle: `GET /api/v1/staff-admin/users/44444444-4444-4444-8444-444444444444?scope=ALL_PROPERTIES`.
Respuesta 200: envelope organizationId igual al ejemplo, scope.kind=ALL_PROPERTIES,
scope.propertyIds=[p1,p2] e item con exactamente el objeto anterior. Listado vacío:
200 con items=[], limit solicitado y nextCursor=null, nunca 404.

### 3.5 Cursor y consistencia

Codec propio de paginación, no JWT ni credencial: Base64url de payload versionado
y firma HMAC-SHA256, comparación constante. JDK Crypto existente; sin dependencia
externa. Payload: última tupla username/id, exp (15 minutos), hash de contexto.
Hash sobre sessionId, staffUserId, O, rol/permisos vigentes ordenados, A ordenado,
selección resuelta, filtros normalizados y limit. Nunca tokens, correo ni hashes
de contraseña. No loguear cursor; navegador lo trata como opaco y transitorio.

Clave aleatoria en memoria de 32 bytes por proceso Backend, independiente de JWT.
Topología objetivo del incremento: una instancia Backend. Reinicio/expiración/
cambio de contexto/firma inválida: 400 INVALID_CURSOR y reiniciar paginación.
Varias réplicas requerirían una clave compartida aprobada; no introducirla ni
modificar secretos en este incremento. No cache servidor de usuarios o cursores.

Autenticar y resolver scope **antes** de aceptar cursor; nunca usar su contexto
para autorizar. Cada página/detalle usa transacción read-only REPEATABLE_READ para
snapshot coherente de autorización, selección de IDs y proyección de propiedades.
La sesión se revalida dentro del servicio además del filtro HTTP. Un cambio
concurrente posterior al snapshot se observa en la siguiente petición; no se
promete cancelación retroactiva de respuestas ya iniciadas ni snapshot entre páginas.
Keyset evita repetir la misma tupla en un conjunto estable; cambios concurrentes
pueden insertar/retirar usuarios entre páginas. Sin total global ni copia histórica.

### 3.6 Errores y precedencia

Después de seguridad de transporte: 401 antes de acceso a datos; luego permiso
403; validación de query/path 400; resolución de property 403; cursor 400;
consulta scoped y eventual 404. DTO/body de error idéntico para ausente/ajeno.

| HTTP | code propuesto | Uso |
| --- | --- | --- |
| 400 | INVALID_REQUEST | Query/path inválido o parámetro no admitido. |
| 400 | INVALID_CURSOR | Cursor inválido, expirado o de otro contexto. |
| 401 | STAFF_SESSION_REQUIRED | Ausente/inválida/caducada/revocada; token Guest también. |
| 403 | STAFF_ACCESS_DENIED | Sin STAFF_MANAGE, property no autorizada o ALL no permitido. |
| 404 | STAFF_USER_NOT_FOUND | Objetivo inexistente o no visible. |
| 503 | STAFF_READ_UNAVAILABLE | Error de persistencia, catálogo/proyección inconsistente o indisponibilidad. |

Sin 409 para GET. 405 para métodos no soportados, sin efectos; no contrato CRUD.
Errores del filtro, MVC y servicio deben usar la misma forma sanitizada:

```json
{
  "type": "about:blank",
  "title": "Staff user not found",
  "status": 404,
  "code": "STAFF_USER_NOT_FOUND"
}
```

Titles estáticos para cada code, sin excepciones, query, UUID, correo o existencia
de otro tenant. OpenAPI enumera todos los códigos y headers; no cookies en Spring.

## 4. Diseño SQL scoped (especificación, no migración ejecutada)

Servicio recibe principal revalidado; construye A/O y AuthorizedPropertyScope.
Repositorio recibe esos valores confiables, nunca filtros de organización del
navegador. Reutilizar JdbcClient existente. Esquema lógico para GERENCIA:

```sql
SELECT /* columnas públicas explícitas */
FROM staff_users u
JOIN organization_memberships m ON m.staff_user_id = u.id
WHERE m.organization_id = :actor_org
  AND m.role_code <> 'SUPER_ADMIN'
  AND EXISTS (
    SELECT 1 FROM membership_properties mp
    JOIN properties p ON p.id = mp.property_id AND p.organization_id = m.organization_id
    WHERE mp.staff_user_id = u.id AND mp.organization_id = m.organization_id
      AND mp.status = 'ACTIVE' AND p.status = 'ACTIVE'
  )
  AND NOT EXISTS (
    SELECT 1 FROM membership_properties mp
    JOIN properties p ON p.id = mp.property_id AND p.organization_id = m.organization_id
    WHERE mp.staff_user_id = u.id AND mp.organization_id = m.organization_id
      AND mp.status = 'ACTIVE' AND p.status = 'ACTIVE'
      AND NOT (mp.property_id = ANY(:actor_property_ids))
  )
  /* PROPERTY: EXISTS de la asignación activa a :selected_property_id */
  /* filtros parametrizados y keyset (username COLLATE "C", id) > última tupla */
ORDER BY u.username COLLATE "C", u.id
LIMIT :limit_plus_one;
```

SUPER_ADMIN usa rama explícita con m.organization_id=:actor_org, sin el rechazo
de rol ni EXISTS no vacío. PROPERTY sigue exigiendo pertenencia; para objetivo
SUPER_ADMIN esa pertenencia se resuelve mediante properties activas de O.
Detalle añade u.id=:target_id y el mismo predicado completo, no findById global.
La segunda consulta de proyección se limita a IDs ya autorizados, O y properties
activas; no cargar toda la tabla para recortar después. Ejecutar ambas dentro
del mismo snapshot. No joins con auth_sessions/refresh_tokens.
No nueva migración prevista para lectura; inspeccionar EXPLAIN en fixtures de
volumen. Cualquier índice necesario sería changeset nuevo revisado, no edición
de constraints ya aplicadas ni una condición de producto adicional.

## 5. BFF del mismo origen

| Browser GET | Spring GET interno |
| --- | --- |
| /api/staff/admin/roles | /api/v1/staff-admin/roles |
| /api/staff/admin/users | /api/v1/staff-admin/users |
| /api/staff/admin/users/{id} | /api/v1/staff-admin/users/{id} |

Mismos parámetros y DTO públicos explícitos; DTO TypeScript propio del módulo,
sin importar DTO de sesión ni RolePreview. El servidor BFF valida/proyecta la
allowlist; el mapper del módulo convierte DTO a Domain y produce
DomainMappingError ante obligatorios inválidos. No spread de upstream.

Leer solo pms_staff_access HttpOnly; si falta: 401 sin llamada upstream. Backend
mediante backendStaffRequest y PMS_BACKEND_INTERNAL_URL, `cache: no-store`,
Authorization Bearer interno, Accept JSON y señal de abort. No reenviar Cookie
completa, cookies Guest ni Authorization del navegador; no aceptar upstream URL.
No Set-Cookie ni tokens en respuestas de estos tres GET. Cookies existentes
Staff host-only/SameSite/Secure permanecen gestionadas por Auth.

BFF valida query y respuesta: UUID/enums, límites, timestamps/orden, duplicados,
organizationId consistente en envelope/items, scope consistente con petición y
formato de página/cursor. El mapper/hook Web verifica además los IDs de asignación
contra las memberships autorizadas de su contexto vigente, sin importarlas desde
el navegador como prueba de autorización Backend. Backend garantiza alcance completo;
BFF no intenta deducirlos de roles del cliente. Una respuesta inválida completa
se traduce a 503, no se muestran filas parcialmente confiables.

Para ALL_PROPERTIES, Web valida que el scope retornado coincida con el conjunto
vigente del provider; si hubo cambio de autorización, retirar datos y revalidar
sesión/contexto en vez de renderizar asignaciones nuevas silenciosamente.
Los Route Handlers no importan módulos Web: validación de transporte server en
helper local de app/api/staff/admin, sin dependencia lib/shared -> modules.

Error BFF: mismo envelope mínimo y codes allowlisted de §3.6; conservar solo
400/401/403/404 y código compatible. Transporte, timeout, 5xx, respuesta 2xx
distinta de 200 o DTO inválido => 503 STAFF_READ_UNAVAILABLE. Nunca reenviar body
crudo ni headers sensibles. 400 desconocido se reduce a INVALID_REQUEST.
`Cache-Control: private, no-store` también en errores; sin cache/CDN/ETag.
GET sin side effects: no nuevo CSRF token. No habilitar mutaciones ni CORS.
Futuras mutaciones requieren protección de origen como Inventory y su contrato.

Usar staffBffRead con refresh Staff compartido: primer 401 -> un refresh -> un
retry; segundo 401 definitivo provoca revalidación del provider, cancela/retira
datos administrativos y activa la salida existente a `/`. 403 no refresca ni
termina Guest; 5xx/red/DTO inválido son recuperables, no signed-out.
No retry automático de TanStack que multiplique este ciclo: retry=false.
Invitado/Guest sin cookies Staff -> 401; Staff sin permiso -> 403 desde Spring.
Con sesiones Guest y Staff coexistentes solo se considera Staff para esta API.

Con mocks generales true/false estas tres lecturas son siempre reales. Ampliar
solo los GET de /api/staff/admin/roles, /users y /users/{id} en
public/pmsMockServiceWorker.js (mismo origen, con slash final permitido), antes
del worker generado; stopImmediatePropagation sin respondWith. No modificar
mockServiceWorker.js generado. Métodos futuros y otros orígenes conservan el
comportamiento actual. Preview Staff local no autoriza Backend: mostrar que la
lectura requiere sesión real y no solicitar datos con una identidad ficticia.

## 6. Frontend, cache y experiencia

Composición app -> API pública @/modules/staff. Auth/properties consumidos solo
desde sus index públicos. Flujo Service -> DTO -> Mapper -> Domain -> Hook -> UI.
Domain propio StaffAdminUser/StaffAdminRole/StaffAdminScope/Page, inmutable y
solo lectura. El hook llama servicio DTO y mapper puro; UI nunca fetch ni DTO.

- /seguridad/usuarios: título Usuarios Staff, búsqueda por username, filtro de
  rol (catálogo real) y estado, selector de scope existente en StaffShell.
- Tabla con username, correo laboral, rol asignado, estado, propiedades y Ver
  detalle. Nombres de properties desde API pública properties/identidad vigente;
  sin inventar propiedades ni recortar la asignación completa. Membership INACTIVE
  se distingue de status del usuario y se explica en detalle.
- /seguridad/usuarios/[staffUserId]: mismos campos, fechas y estado membership,
  navegación de regreso con filtros/scope conservados; sin controles de edición.
- /seguridad/usuarios/nuevo: propuesta para después, no implementada ahora.
- Nav Usuarios visible únicamente con session.permissions.includes('STAFF_MANAGE').
  Comprobar también acceso directo antes de montar consultas. No habilitar por
  roleId elegido en UI ni por roles mock. Ampliar supportsScope en StaffShell.
- Caso O sin properties: añadir opción de presentación allowEmptyAll al
  PropertySwitcher existente, activada por StaffShell solo en estas rutas para
  SUPER_ADMIN con STAFF_MANAGE. Mantener select habilitado y opción ALL explícita
  en ese caso; sin selección automática ni alterar el comportamiento de otros
  módulos. PropertyScopeResolver Backend conserva su soporte de ALL vacío.
- Mantener /seguridad/roles y simulación Private 07 separados: no conectarlos al
  catálogo como editor RBAC. Filtro de roles del listado consume el endpoint real.
- Usar EntityListSurface/EntityDataGrid, Button/Input, LoadingState/ErrorState/
  EmptyState y tokens actuales. Sin SecurityFrame ni sidebar adicional.
- Navegación cursor «Anterior/Siguiente», historial de cursores en memoria por
  consulta; primera página al cambiar filtros/scope/limit. No useEntityPagination
  ni números de páginas/totales inventados. Limit seleccionable 25/50/100.
- loading inicial, vacío inicial vs sin coincidencias, error + Reintentar,
  detalle no disponible 404, acceso denegado 403 y cursor vencido 400 con acción
  «Volver al inicio del listado». No bucles de reintento.
- Teclado, labels, feedback aria-live, focus visible y sin overflow de página;
  tabla con desplazamiento contenido. Sin rediseñar el panel global.

### Cache exclusivamente en memoria

El DTO C2 actual no incluye organizationId: no ampliarlo como efecto lateral.
Primero consultar roles como contexto autenticado con clave bootstrap
`['staff-admin', sessionId, staffUserId, authorizationFingerprint, 'context']`.
Su respuesta vincula organizationId. Esta es la única consulta previa a conocer O;
no contiene usuarios ni se reutiliza entre sesiones. Después:

`['staff-admin', sessionId, staffUserId, organizationId, authorizationFingerprint,
  scopeKind, sortedScopePropertyIds, resource, normalizedFilters, limit, cursorOrId]`.

authorizationFingerprint es representación canónica de rol, permisos y memberships
vigentes; no credencial. Roles queda vinculado a O en el contexto; no consulta
independiente de catálogo global reutilizable entre identidades.
No consultar usuarios hasta tener contexto válido, permiso y selección explícita.
AbortSignal en peticiones y revalidación del contexto ante discrepancia de O.
No placeholderData/keepPreviousData entre identidades, scope o filtros. gcTime=0,
staleTime=0 en consultas nuevas, sin persistencia local ni prefetch masivo.
Filtros/scope pueden conservarse en query de navegación; cursor y correo no se
persisten ni se añaden a URLs de navegación. Las requests GET sí contienen el
cursor de transporte; no registrar sus query strings en logs de aplicación.

Añadir prefijo staff-admin a limpieza Staff de logout/signed-out. Ante cambio
de identidad/sessionId o fingerprint, ocultar inmediatamente datos anteriores,
cancelar y eliminar sus queries y cursores, cargar contexto nuevo. Al cambiar scope
retirar filas/detalle previos y cancelar consultas del scope abandonado. La
respuesta tardía de otro contexto no se publica en el actual. Revalidar sesión
por el flujo público Auth; no crear otra lógica de autenticación. Guest y queries
públicas intactos, sin QueryClient.clear.

## 7. Archivos exactos previstos para el código posterior

Todos son **previstos**, no creados por esta propuesta. Prefijo Java:
backend/src/main/java/com/pms/hotelboutique/backend/modules/securityauth/.

| Acción | Archivo(s) |
| --- | --- |
| Crear Backend API | api/StaffAdminReadController.java, StaffAdminReadExceptionHandler.java, StaffAdminReadDtos.java (records de query/response/error). |
| Crear Backend servicio | application/StaffAdminReadService.java, StaffAdminReadException.java, StaffAdminCursorCodec.java. |
| Crear Backend SQL | infrastructure/persistence/StaffAdminReadRepository.java; queries parametrizadas y proyecciones. |
| Crear cadena HTTP | infrastructure/security/StaffAdminSecurityConfiguration.java; matcher exclusivo /api/v1/staff-admin/**, StaffJwtService/StaffAuthService existentes, 401/403 sanitizados. No otro emisor/verificador JWT. |
| Crear tests Backend | src/test/java/.../modules/securityauth/StaffAdminReadIntegrationTests.java, StaffAdminReadHttpIntegrationTests.java; application/StaffAdminCursorCodecTests.java. |
| Modificar tests OpenAPI | backend/src/test/java/.../infrastructure/openapi/OpenApiContractIntegrationTests.java; registrar paths nuevos sin exclusiones falsas. |
| Crear BFF | frontend/pms-hotel-web/src/app/api/staff/admin/{roles/route.ts,users/route.ts,users/[id]/route.ts,proxy.ts,proxy.test.ts}. |
| Crear capas Staff | src/modules/staff/dtos/staff-admin-read.dto.ts; model/staff-admin.ts; mappers/staff-admin.mapper.ts y .test.ts; service/staff-admin-read.service.ts y .test.ts; hooks/use-staff-admin-read.ts y .test.tsx. |
| Crear UI Staff | src/modules/staff/components/staff-users-page.tsx, staff-user-detail.tsx, staff-users.module.css, staff-users.test.tsx, staff-user-detail.test.tsx. |
| Modificar API pública | src/modules/staff/index.ts y README.md (retirar limitación histórica de shell solo para el alcance autorizado). |
| Crear composición | src/app/(private)/seguridad/usuarios/page.tsx, [staffUserId]/page.tsx, staff-users-workspace.tsx y .test.tsx. |
| Modificar shell | src/app/(private)/staff-shell.tsx, staff-shell-scope.test.tsx y layout.test.tsx si corresponde a composición. |
| Modificar selector existente | src/modules/properties/components/property-provider.tsx y .test.tsx: opción allowEmptyAll limitada al caso administrativo descrito, sin cambiar permisos ni alcance del resolver. |
| Modificar limpieza Auth | src/modules/auth/components/staff-session-provider.tsx y .test.tsx: prefijo staff-admin/cambio de identidad; conservar separación Guest. |
| Modificar MSW | public/pmsMockServiceWorker.js; src/data/mocks/worker-boundary.test.ts. |
| Documentación de entrega | Este contrato tras aprobación, AlanPlan/AlanHandoff, Web docs de rutas/QA; colección Postman canónica Backend para los tres GET. No editar XLSX sin autorización. |

Rutas Web anteriores relativas a frontend/pms-hotel-web/. No nuevos módulos,
dependencias, migraciones ni cambios de C1/C2 previstos. Durante implementación
leer guía Next instalada aplicable antes de escribir Route Handlers/pages.

## 8. Matriz de aceptación y pruebas a ejecutar

Fixtures PostgreSQL aisladas: O1 con p1,p2,p3; O2 con p4; SUPER_ADMIN por org;
GERENCIA A={p1,p2}; usuarios P={p1}, {p1,p2}, {p1,p3}, {}, membership INACTIVE,
propiedad INACTIVE y estados ACTIVE/SUSPENDED/DISABLED. No provisionar en BD real.

| Caso | Evidencia esperada |
| --- | --- |
| SUPER_ADMIN O1 | Catálogo cinco roles; PROPERTY y ALL correctos; O2 invisible; puede leer su propio detalle si selección coincide. |
| GERENCIA | PROPERTY(p1) incluye P={p1,p2} completo; excluye P={p1,p3}; ALL nunca amplía A; SUPER_ADMIN y P={} invisibles. |
| RECEPCION/OPERACIONES/AUDITOR | Tres GET 403; acceso directo UI sin consultas/tabla. |
| Guest, ausente, access expirado, revocado, usuario/membership actor inactivo | 401; BFF no acepta cookie Guest como Staff. Probar ambos contextos coexistentes. |
| Cross-org y conjunto parcialmente ajeno | Listado no revela filas; detalle 404 idéntico; verificar predicados SQL y no findAll+filter. |
| Usuario suspendido/deshabilitado, membership INACTIVE | Puede leerse según asignación; nunca altera su acceso ni borra P para eludir scope. |
| P vacío | Solo SUPER_ADMIN ALL; PROPERTY vacío; huérfano sin membership siempre excluido. |
| SUPER_ADMIN O sin properties | Catálogo/contexto y selección explícita ALL disponibles, detalle/lista scoped a O. |
| Filtros | Default todos los estados; igualdad rol/estado; username trim/case-insensitive/literal %, _; parámetros duplicados/desconocidos y límites inválidos 400. |
| Paginación | Dataset >100; orden C/UUID estable; sin duplicación por múltiples properties; limit+1; final null; vacíos 200. |
| Cursor | Firma/TTL/contexto/sessionId/O/scope/filtros/limit, cambio de permisos/membership e instancia reiniciada; inválidos 400; autorización siempre revalidada. |
| Snapshot | Dos conexiones: cambio de asignación entre selección y proyección no mezcla versiones ni filtra datos fuera del snapshot. |
| DTO | Enums/fechas/UUID/versión/dobles IDs inválidos; error cerrado, sin éxito parcial. Secrets extra upstream eliminados por allowlist. |
| Seguridad de respuesta | Aserción recursiva de ausencia de password/hash/token/session objetivo/audit crudo; no-store en éxito/error; JSON sin serialización JPA. |
| BFF | Cookie Staff únicamente, URL interna fija, sin CORS/cookies Guest ni tokens en JS; status/code allowlisted y 503 de transporte/DTO. |
| 401 | Un refresh/un retry compartido; segundo 401 limpia Staff y activa guard; 403/5xx no hacen logout ni afectan Guest. |
| Cache | Logout, otra identidad con distinto O, scope, permisos/fingerprint y respuesta demorada; nunca filas previas, queries Guest preservadas. |
| Componentes | Loading, vacío vs búsqueda sin resultados, error/retry, 403/404/cursor vencido, filtro, detalle, volver y navegación por cursor. |
| MSW/preview | GET reales con mocks true/false; sin respondWith; otros métodos/orígenes no se amplían; preview ficticio no autoriza consulta real. |
| OpenAPI | Tres mappings, query/defaults/límites/enums, Bearer Staff, errores/no-store/DTO; documento generado, no solo anotaciones. |

Regresiones existentes que deben conservarse: StaffAdminSchemaIntegrationTests,
PropertyScopeResolverTests, StaffAuthAuditAppendOnlyIntegrationTests,
StaffAuthAuditAttributionIntegrationTests, StaffAuthAuditEmitterIntegrationTests,
SecurityConfigurationIntegrationTests, ExplicitAuthEndpointsIntegrationTests,
OpenApiContractIntegrationTests; Web staff-session-provider/session-service,
staff-logout-navigation, Guest coexistente, staff-shell-scope, private-07,
worker-boundary, inventory-proxy/mutation y lecturas reales de reservas/panel/
calendario. Ninguna prueba mock de Private 07 acredita autorización Backend.

Comandos previstos, **no ejecutados en esta fase documental**:

```bash
# cwd backend; PostgreSQL 17 aislado / Java 21
docker compose -p pms-staff-admin-read-qa -f compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress -Dtest=StaffAdminReadIntegrationTests,StaffAdminReadHttpIntegrationTests,StaffAdminCursorCodecTests,OpenApiContractIntegrationTests test
docker compose -p pms-staff-admin-read-qa -f compose.bd2-test.yaml run --rm verify
# Alternativa con BD aislada ya configurada: ./mvnw -B verify

# cwd frontend/pms-hotel-web
npm run test -- src/modules/staff src/app/api/staff/admin src/app/\(private\)/seguridad/usuarios src/data/mocks/worker-boundary.test.ts
npm run check
# cwd raíz
git diff --check
```

QA manual posterior: login real SUPER_ADMIN y GERENCIA con fixtures autorizadas;
lista/filtros/páginas/detalle y casos 403/404, F5, cambio de scope, logout/Atrás y
coexistencia Guest; responsive escritorio/móvil, teclado y mocks true/false.
Registrar entorno/evidencia sin tokens. Implementación EN_QA hasta confirmación
manual PASS del usuario; suite/CI no la sustituyen.

## 9. Decisiones propuestas para aprobación y orden de implementación

| ID local de decisión (no tarea nueva) | Resolución propuesta pendiente |
| --- | --- |
| R01 | Ratificar los tres GET Spring/BFF, DTO/envelopes/errores, filtros y cursor de este documento. |
| R02 | PROPERTY como pertenencia seleccionada + visibilidad completa contra A; detalle con idéntico scope; devolver P completo autorizado. |
| R03 | P vacío solo SUPER_ADMIN ALL, membership INACTIVE no borra asignaciones para scope, huérfanos sin org fuera; mostrar membershipStatus. |
| R04 | Roles cinco fijos; catálogo de lectura para ambos administradores; SUPER_ADMIN objetivo invisible a GERENCIA; sin editor RBAC. |
| R05 | Búsqueda solo username literal; orden fijo username/C,id; cursor firmado 15min con clave efímera independiente para una instancia. |
| R06 | Contexto organizationId desde catálogo; cache/limpieza, ALL vacío explícito para SUPER_ADMIN y MSW según §§5–6. |
| R07 | Autorizar como subconjunto de lectura BE-006, con STAFF_MANAGE/C2/C4 suficientes para estos GET; dependencias de credenciales, mutaciones, consulta C6 y BE-014A de otros dominios siguen fuera y pendientes. |

No se detecta contradicción con C4 en PROPERTY. R03 precisa un caso que C4 no
resuelve expresamente; la alternativa de permitir P={} a GERENCIA por subconjunto
vacío se descarta en esta propuesta porque carece de atribución property visible.
Si se desea otra política para usuarios sin asignación, requiere decisión explícita.

R07 debe aprobarse porque AlanPlan aún vincula BE-006B global a BE-014A y entrega
de credenciales: no declarar READY todo B ni quitar esas dependencias por inferencia.
La lectura propuesta no necesita resolver políticas de correo, reset, revocación
ni publicar AuditTrail. Revisores colaborativos pendientes no bloquean por silencio;
sí bloquea una contradicción concreta o una decisión sin aprobar.

Orden tras aprobación:

1. Registrar aprobación R01–R07/Change Control, alcance y trazabilidad Web en el
   control operativo; crear rama dedicada desde base verificada antes de código.
2. SQL/proyecciones/snapshot y codec con pruebas de scope/cursor PostgreSQL.
3. Servicio, cadena Staff y controllers; errores sanitizados, OpenAPI generado,
   pruebas HTTP/SQL y colección Postman del contrato aprobado.
4. BFF/proyección/MSW y pruebas de transporte/Guest/401.
5. Capas del módulo, contexto/cache, listado/detalle y navegación StaffShell;
   reutilizar componentes/tokens, sin habilitar alta.
6. Regresiones, check/verify, QA manual y evidencia; mantener EN_QA hasta PASS.

Bloqueos actuales: aprobación de precisiones R01–R07 y registro del alcance de
lectura. Riesgos técnicos controlados por pruebas: anti-join de conjunto completo,
snapshot SQL/proyección, cobertura del filtro Staff en el nuevo namespace, cache
con identidad cambiante e intercepción MSW. Clave efímera limita a una instancia;
si se exige despliegue multirréplica, resolver distribución de clave antes de código.
No nuevas dependencias externas ni cambios de secretos propuestos.
