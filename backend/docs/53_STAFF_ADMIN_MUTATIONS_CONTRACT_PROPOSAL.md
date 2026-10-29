# Fase 3A — Contrato de mutaciones administrativas Staff

**Estado: PENDIENTE DE APROBACIÓN.** Fecha: 2026-10-22.
Rama examinada: `feature/staff-admin-read`. Owner Backend: Alan/BD1; integración
Web: WEB-2, revisión WEB-3. Revisiones colaborativas BD2/BD3 para efectos concretos
sobre persistencia, roles operativos y consumidores. Este documento no constituye
aprobación de endpoints/DTO nuevos ni autorización de implementación.

### Revisión M08/M11 solicitada por producto — 2026-10-22

Recomendación favorable del usuario para M01–M07, M09 y M10, con precisiones M02/M10;
**no es aprobación final del contrato ni autorización para implementar**. Las once
decisiones conservan aprobación pendiente. Secciones14–16 concretan M08/M11 y el
subincremento recomendado3B-1. Reactivación queda fuera de3B-1 aunque exista hash.
No se suspenden cuentas ACTIVE ni se cambian estados QA independientes.

### Autorización acotada de implementación Backend3B-1 — 2026-10-22

El usuario autoriza expresamente el subconjunto de15.2 y su gate15.3: correo,
rol/propiedades, SUSPENDED/DISABLED y base transaccional/auth/demo. Contraste final
con M01–M11,14–17 y C1/C2/C4/C6: sin contradicción material. Esta autorización
sustituye para ese subconjunto la espera de implementación de las secciones
históricas, no marca el documento completo APPROVED ni autoriza3B-2/BFF/UI.
No requiere migración adicional: se reutilizan constraints/version vigentes.
Implementación Backend3B-1 EN_QA;915 pruebas PASS y30 aserciones runtime/reinicio
en [QA54](54_STAFF_ADMIN_MUTATIONS_QA.md). Confirmación manual pendiente; no
publicación externa ni aprobación global de esta propuesta.

## 1. Alcance, autoridad y evidencia

El usuario autoriza preparar este contrato y registrar **solo Fase 2C COMPLETADA**:
la conformidad manual condicionada quedó satisfecha con tres columnas y regresiones
PASS. No se atribuye una nueva inspección humana de la tabla modificada. Paginación
positiva manual sigue NO EJECUTABLE y lector de pantalla NO ACREDITADO. Fases 2A y
2B siguen EN_QA; BE-006B/C no quedan completadas por este documento.

Fuentes contrastadas:

- [C1](08_AUTH_SESSION_CONTRACT_PROPOSAL.md), [C2](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md),
  [C4](26_BD1_STAFF_ADMIN_CONTRACT_C4_PROPOSAL.md), [C6](25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md).
- [Lectura 51](51_STAFF_ADMIN_READ_CONTRACT_PROPOSAL.md), [QA 52](52_STAFF_ADMIN_READ_QA.md),
  [BFF 64](../../frontend/pms-hotel-web/docs/64_STAFF_ADMIN_BFF_QA.md),
  [UI 65](../../frontend/pms-hotel-web/docs/65_STAFF_ADMIN_UI_QA.md).
- [Esquema 27](27_BD1_STAFF_SCHEMA_MIGRATION_QA.md),
  [append-only 36](36_BD1_STAFF_AUTH_AUDIT_APPEND_ONLY_QA.md),
  [atribución 37](37_BD1_STAFF_AUTH_AUDIT_ATTRIBUTION_QA.md),
  [emisores 38](38_BD1_STAFF_AUTH_AUDIT_EMITTER_QA.md).
- [Change Control](../../docs/10_CHANGE_CONTROL.md),
  [política HTTP](02_API_CONTRACT_POLICY.md), [AlanPlan](AlanPlan.md).

Inspección focalizada del código actual, sin modificarlo:

| Pieza existente | Reutilización y diferencia necesaria |
| --- | --- |
| StaffAdminReadController/Service/Repository y StaffAdminSecurityConfiguration | Tres GET reales, scope SQL, DTO allowlist, sesión C1/C2; namespace autenticado, métodos de escritura actualmente 405. Añadir comandos sin cambiar GET. |
| StaffUser | `@Version long version`, estado, correo único normalizado en PostgreSQL, username inmutable por API. No hay marcador de credencial preparada ni flag persistido de bootstrap. |
| StaffAuthorizationRepository | Membership única, rol efectivo y propiedades activas. Cambios administrativos nuevos deberán sincronizar espejo StaffUser y versionar el agregado. |
| AuthSessionRepository/RefreshTokenRepository, StaffAuthServiceImpl | Login y refresh actuales sin bloqueo común explícito de usuario/sesión/token. Revocación actual es privada por sesión; no basta copiarla para revocar todo concurrentemente. |
| AuthAuditEvent | Sujeto en staff_user_id; actor/contexto y org/scope/correlación persistibles, trigger append-only ya instalado. Faltan emisor administrativo y factoría completa. C6-D06 de fallos de auth sigue pendiente. |
| PasswordLoginValidator | Login limita correo a 50 caracteres, frente a columna/lectura de 320. Resolver M02 antes de publicar edición de correo. |
| BFF staff/admin + lib/bff/staff-auth | GET con cookie HttpOnly, transporte interno, DTO allowlist, timeout10s, no-store y 405. Ampliar solo métodos aprobados; no crear autenticación. |
| BFF inventory-proxy/assignment-proxy | Patrón real de Origin exacto contra PMS_WEB_PUBLIC_URL y JSON allowlist. Reutilizar política, sin reutilizar DTO de inventario. |
| modules/staff | Tres columnas, expansión por fila, detalle bajo demanda fresco30s, debounce350ms, cursores e identidad/scope aislados. Extender las mismas capas; ningún formulario de edición separado. |

La unicidad de correo es **global Staff**, no por organización: conservarla y
sanitizar duplicados sin identificar cuenta u organización. Guest permanece aparte.
El bootstrap actual es idempotente por username configurado; no acredita por sí
solo que jamás haya más de un SUPER_ADMIN tras cambios de configuración.

## 2. Qué está aprobado y qué se propone ahora

**Ya aprobado en C4-D01–D07:** STAFF_MANAGE, scope completo del objetivo, membresía
única/rol fijo/espejo transaccional, SUPER_ADMIN solo bootstrap, no promoción CRUD,
protección del administrador bootstrap, username inmutable, correo sensible,
SUSPENDED reversible/ACTIVE elegible/DISABLED terminal, revocación atómica,
expectedVersion obligatorio e invitación/reset seguro posterior. C1/C2/C6 conservan
su autoridad. Las rutas C4 son candidatas; StaffView es respuesta conceptual.

**Nuevas precisiones siguientes requieren aprobación explícita.** No se infieren
como aprobadas por haber aprobado C4 ni por autorizar la propuesta de Fase 3A.

| ID | Propuesta concreta / alternativa | Efecto y condición de implementación |
| --- | --- | --- |
| M01 | Formalizar los tres métodos/paths C4 y sus equivalentes BFF, query de scope, cuerpos estrictos y errores de este documento. | Registrar decisión conforme Change Control antes de publicar controllers o handlers de escritura. No agregar endpoint transaccional compuesto. |
| M02 | Correo nuevo con normalización, sintaxis y validación exactamente iguales al login existente, máximo50; lectura320 intacta. Sin restricción ASCII adicional. Alternativa: ampliar login a320 mediante cambio C1 separado. | Recomendación favorable de producto, aprobación final pendiente. Paridad por capa con PasswordLoginValidator/login-input, detallada en14.1; no truncar cuentas ni modificar login. |
| M03 | Respuesta uniforme200 con acuse mínimo de comando, no StaffView, para soportar quitar la propiedad seleccionada. Alternativa: StaffView de resultado con semántica de scope de escritura nueva; no alterar GET. | Diferencia explícita respecto al StaffView candidato C4. Aprobar DTO antes de BFF/UI. |
| M04 | Una versión global por usuario para correo, rol, asignaciones y estado; no-op con versión vigente devuelve misma versión/changed=false, sin revocar ni evento de cambio. Versión obsoleta siempre409 incluso si coincide el valor. | No introducir almacén de idempotencia para estos comandos; reintentos y resultado incierto como sección6. |
| M05 | Excluir también el propio correo de esta API sensible; no-op de autoedición tampoco permitido. | C4 prohíbe explícitamente propio rol/estado/credencial/membership, pero no nombra el correo. Aprobar esta extensión; un futuro perfil propio tendrá contrato distinto. |
| M06 | No cambiar contacto/membership de DISABLED. Proteger todos los objetivos SUPER_ADMIN contra degradación de rol, cambios de membership y estado; permitir contacto de otro SUPER_ADMIN solo por SUPER_ADMIN. | DISABLED terminal y bootstrap protegido ya son C4; cerrar toda edición del dado de baja y proteger todo SA es una precisión conservadora más amplia que proteger el único bootstrap. Alternativa requiere identificación bootstrap fiable y política aprobada de otros SA. |
| M07 | PUT modifica rol/asignaciones, **no** organization_memberships.status. Mantener filas históricas de asignación inactivándolas. Rechazar conjunto vacío si cuenta ACTIVE; permitir vacío SUSPENDED solo SA+ALL. | No reactivar una membership INACTIVE implícitamente. No aceptar membershipStatus en body. Resolver casos de recuperación fuera de estos tres comandos. |
| M08 | Reactivación exige evidencia persistida y ligada a la generación vigente de credencial, producida por consumo verificado de un flujo Staff aprobado. No usar password_hash NOT NULL ni eventos legados como preparación. | Diseño recomendado en14; sin productor confiable actual, reactivación fuera de3B-1. Persistencia/flujo futuro requieren aprobación, sin campo confiado al navegador. |
| M09 | Comandos auditados como ORGANIZATION con metadatos seguros por operación; clasificación/property y fallos de auditoría como sección7. | La escritura por GERENCIA no concede lectura del evento organizativo: C6-D02 la reserva a SA+AUDIT_READ. Confirmar clasificación, sin ampliar AuditTrail. |
| M10 | Guardados inline separados por grupo, uno por vez: Contacto y Acceso/asignación; estado por operación/confirmación separada. Tres columnas Usuario/Acceso/Asignación, controles contextuales accesibles dentro de las celdas y expansión por clic en zonas no interactivas de la fila. | Recomendación favorable de producto, aprobación final pendiente. Sin columna Acciones, página de edición ni Guardar todo; swipe revela baja con selección/confirmación y alternativa mouse/teclado. |
| M11 | Delimitar3B-1: versión global, locks login/refresh, revocación/auditoría atómicas, correo, rol/properties, suspensión y DISABLED; reactivación diferida a3B-2. | Matriz por operación/dependencia en15. No se cierra BE-006B/C ni BE-014A; autorización final pendiente. R07 de51 solo autoriza lectura. |

M01–M11 quedan **PENDIENTES DE APROBACIÓN FINAL**. Nueve cuentan con recomendación
favorable de producto, sin autorizar implementación. M08 bloquea reactivación;
M02 exige paridad con login antes de publicar contacto; M05/M06/M07 aplican
a las operaciones indicadas. La implementación no debe
resolverlos con defaults silenciosos. No se asigna un DEC/ADR ficticio: registrar
el identificador real al aprobar. Revisiones colaborativas sin respuesta no son
por sí solas un bloqueo; sí lo es una decisión de negocio/seguridad sin resolver.

## 3. Contrato HTTP propuesto

### 3.1 Transporte y scope común

Todos los comandos requieren Bearer **Staff** interno, sesión activa revalidada,
usuario ACTIVE, membership ACTIVE y permiso efectivo STAFF_MANAGE desde PostgreSQL.
No comparar solo etiquetas de rol. Organización exclusivamente del snapshot.

Query obligatoria, idéntica al detalle existente:

- `?scope=PROPERTY&propertyId=<UUID>`: propiedad activa autorizada del actor.
- `?scope=ALL_PROPERTIES`: requiere MULTI_PROPERTY_READ; conjunto autorizado de sesión.
- No admitir propertyId con ALL, claves duplicadas/desconocidas, filtros/cursor,
  organizationId, actorId ni permisos aportados por cliente. UUID de path estricto.
- SUPER_ADMIN+ALL con cero propiedades conserva el caso administrativo local de51.

Objetivo inicial: **el mismo predicado SQL de lectura51**, antes de cargarlo o
escribirlo: membership organizativa persistida en O; P(t) calculado con asignaciones
y properties activas incluso si la cuenta está SUSPENDED o membership INACTIVE;
GERENCIA excluye SA y P vacío y exige P(t) subconjunto completo de A. PROPERTY
además exige pertenencia a la seleccionada. P vacío solo SA+ALL. A es todo el
conjunto autorizado del actor, no solo la seleccionada. Nunca recuperar una colección
global para filtrarla en Java; target ajeno/inaccesible/huérfano → mismo404.

Nuevo conjunto propuesto Q debe pertenecer **completo** a propiedades activas de O
y A mediante consulta SQL scoped. Un ID propuesto ajeno, inactivo o fuera de A
produce403 genérico, sin revelar cuál ni su existencia. No cambiar org ni permisos.

Después de PUT, Q puede no contener la propiedad seleccionada: no rechazarlo por
esa sola razón ni enviar un detalle que viole el contrato GET. El acuse M03 confirma
solo el comando autorizado; refrescar el listado y retirar la fila fuera de scope.
Una petición posterior contra ese objetivo en el scope anterior será404.

### 3.2 DTO de entrada (exactos; todos los campos obligatorios)

Content-Type `application/json`, objeto plano, no null ni arrays de raíz; rechazar
campos adicionales y claves JSON duplicadas. Límite propuesto64KiB en BFF/Backend;
exceso413. Sin coerción de string a número. expectedVersion entero JSON seguro,
0..9007199254740990; el resultado debe seguir dentro del rango seguro de lectura.

| Endpoint candidato | DTO propuesto | Validación |
| --- | --- | --- |
| PATCH /api/v1/staff-admin/users/{id} | `{workEmail:string,expectedVersion:number}` | Misma normalización/validación de correo de PasswordLoginValidator: Java trim(), lowercase Locale.ROOT, @NotBlank, @Email(regexp=EMAIL_PATTERN), @Size(max=50) sobre resultado normalizado. Sin rechazo ASCII ni de caracteres crudos adicional a login. BFF/UI replican login Web según14.1. Unicidad por lower(btrim(work_email)) en DB. Rechazar username y cualquier otro campo. |
| PUT /api/v1/staff-admin/users/{id}/membership | `{roleCode:string,propertyIds:UUID[],expectedVersion:number}` | Rol activo fijo GERENCIA/RECEPCION/OPERACIONES/AUDITOR; nunca asignar SUPER_ADMIN. Reemplazo completo, UUID distintos; duplicados400, orden indiferente. Q completo scoped; reglas de vacío M07. |
| PATCH /api/v1/staff-admin/users/{id}/status | `{status:string,expectedVersion:number}` | En3B-1 enum exacto SUSPENDED/DISABLED; ACTIVE se reserva a3B-2, condicionado por14. Transición y requisitos en sección4. No aceptar membershipStatus, credentialReady ni motivos libres. |

El catálogo GET sigue mostrando cinco roles; el selector de asignación ofrece solo
los cuatro asignables y las restricciones vigentes. GERENCIA puede asignar GERENCIA
según C4 dentro de A: no inventar una jerarquía numérica ni permisos individuales.

### 3.3 DTO de éxito M03

**200 application/json**, Cache-Control `private, no-store`, sin Set-Cookie:
`{organizationId:UUID,staffUserId:UUID,version:number,changed:boolean}`.
Versión posterior al commit, changed verdadero solo si hubo cambio efectivo.
No es el DTO de sesión ni contiene credenciales, rol, properties, flags editables
ni el estado de auditoría. No dar por actualizado todo el registro con este acuse:
revalidar GET scoped. Fallo de esa revalidación no convierte un200 confirmado en
fracaso del guardado; mostrar «Guardado; no se pudo actualizar el listado».

Ejemplos sintéticos de contrato (no fixtures ejecutadas ni endpoints disponibles):

```http
PATCH /api/v1/staff-admin/users/11111111-1111-4111-8111-111111111111?scope=PROPERTY&propertyId=22222222-2222-4222-8222-222222222222
Content-Type: application/json
```
```json
{"workEmail":"recepcion@hotel.example","expectedVersion":7}
```
```http
PUT /api/v1/staff-admin/users/11111111-1111-4111-8111-111111111111/membership?scope=ALL_PROPERTIES
Content-Type: application/json
```
```json
{"roleCode":"RECEPCION","propertyIds":["22222222-2222-4222-8222-222222222222"],"expectedVersion":8}
```
```http
PATCH /api/v1/staff-admin/users/11111111-1111-4111-8111-111111111111/status?scope=ALL_PROPERTIES
Content-Type: application/json
```
```json
{"status":"SUSPENDED","expectedVersion":9}
```
```json
{"organizationId":"33333333-3333-4333-8333-333333333333","staffUserId":"11111111-1111-4111-8111-111111111111","version":10,"changed":true}
```

Los números7/8/9 ilustran operaciones sucesivas confirmadas y revalidadas, no un
Guardar todo automático. No se proporciona ejemplo de contraseña/hash/token.

### 3.4 Errores

Sobre allowlist compatible con lectura: `{type:"about:blank",title,status,code}`;
application/problem+json y private,no-store también en fallos. Códigos nuevos de
mutación son **propuestos**, no permisos ni errores actualmente implementados.

| HTTP | code / title propuestos | Recuperación |
| --- | --- | --- |
| 400 | INVALID_REQUEST / Invalid Staff request | Formato, enum, campos, JSON, ID o query inválidos. Mensajes de validación por campo se generan localmente; no devolver rejectedValue. |
| 401 | STAFF_SESSION_REQUIRED / Staff session required | Sin sesión, Guest, expirada, revocada o principal inválido; flujo canónico auth. |
| 403 | STAFF_ACCESS_DENIED / Staff access denied | Sin permiso, scope seleccionado no autorizado, Q ajeno, autoedición prohibida o SA protegido. Sin detalles del objetivo. |
| 404 | STAFF_USER_NOT_FOUND / Staff user not found | Ausente/inaccesible/otra organización: indistinguibles. No consultar versión ni unicidad del objetivo inaccesible. |
| 409 | STAFF_VERSION_CONFLICT / Staff version conflict | Versión distinta; conservar borrador, GET vigente explícito; no incluir versión/datos ajenos en error. |
| 409 | STAFF_EMAIL_CONFLICT / Staff email unavailable | Duplicado normalizado, incluso carrera DB. No indicar quién ni organización. |
| 409 | STAFF_STATE_CONFLICT / Staff state conflict | Transición prohibida, requisitos de activación incumplidos, edición de DISABLED o Q vacío incompatible. No exponer causa de credenciales. |
| 405 | Sin body, Allow según recurso | BFF: usuarios/roles GET; users/{id} GET,PATCH; membership PUT; status PATCH, sin HEAD/OPTIONS. Spring conserva HEAD implícito de sus GET; Allow de users/{id} GET,HEAD,PATCH y de las subrutas PUT o PATCH. No cambiar otros métodos GET existentes. |
| 413 / 415 | INVALID_REQUEST / Invalid Staff request | Tamaño o media type incompatibles; conservar HTTP. |
| 503 | STAFF_WRITE_UNAVAILABLE / Staff write unavailable | Dependencia caída, lock timeout/deadlock/serialización agotados, fallo interno sanitizado. Resultado puede ser incierto tras despacho BFF. |

Orden: autenticar/permiso → validar transporte/scope → SQL visible+locks → restricciones
→ expectedVersion → validación del cambio → escribir/commit. No dar409 que revele
versión/existencia antes de comprobar visibilidad. Un duplicado de correo propuesto
solo se evalúa tras autorizar objetivo. No persistir cambios parciales ante excepción.

## 4. Estado y elegibilidad

Tabla del objetivo completo del contrato; en **3B-1 solo se acepta como entrada
SUSPENDED o DISABLED**. Cualquier body con status=ACTIVE devuelve400 INVALID_REQUEST,
incluso ACTIVE→ACTIVE: operación todavía no publicada, no una comprobación de
credencial. OpenAPI3B-1 debe expresar ese enum de entrada separado del enum de
lectura (que conserva tres estados). No existe CTA Reactivar antes de3B-2.


| Estado actual | Petición | Resultado propuesto |
| --- | --- | --- |
| ACTIVE | SUSPENDED | Suspensión temporal; revocar todo. |
| ACTIVE | DISABLED | Baja lógica terminal; revocar todo. |
| SUSPENDED | ACTIVE | Solo credencial preparada verificable + membership ACTIVE + al menos una property activa válida. Sin ese dato fiable, reactivación bloqueada M08. |
| SUSPENDED | DISABLED | Baja terminal; revocar todo. |
| ACTIVE/SUSPENDED | Mismo estado | No-op M04 si objetivo autorizado/no protegido y versión vigente. |
| DISABLED | ACTIVE/SUSPENDED | 409; ninguna recuperación ordinaria. |
| DISABLED | DISABLED | No-op M04; no rehabilita ni borra historia. |

La API de estado no cambia membership.status ni prepara credenciales. Una membership
INACTIVE puede ser visible y editable en asignaciones, pero no se vuelve ACTIVE por
PUT; su recuperación necesita contrato posterior. Q vacío no puede dejar una cuenta
ACTIVE no-SA sin acceso. Cuentas SUSPENDED sin propiedades solo se recuperan por
SA+ALL. No asignar SUPER_ADMIN para eludir la exigencia de property o scope.

M06 prohíbe degradación/suspensión/baja/membership de objetivos SUPER_ADMIN incluso
si hay varios; propio estado/rol/membership/credencial están prohibidos por C4.
No basar protección bootstrap en username recibido del cliente ni en un COUNT
sin bloqueo. Recuperación excepcional bootstrap queda fuera de esta API.

## 5. Transacción, SQL y versión del agregado

Una transacción PostgreSQL por comando, con commit antes de emitir éxito:

1. Identidad/session snapshot C1/C2 validado; iniciar transacción de escritura con
   READ COMMITTED y bloqueos explícitos (no copiar sin más el REPEATABLE_READ del GET).
2. Adoptar un orden común con login/refresh/logout: filas StaffUser implicadas por
   UUID ordenado (actor/objetivo), luego membership por clave, properties por UUID,
   sesiones por UUID, refresh por UUID. Resolver candidatos solo con consultas scoped;
   la consulta del objetivo con FOR UPDATE incluye O y predicado de visibilidad SQL.
   Volver a resolver sesión, permisos y scope después de adquirir bloqueos.
3. Bloquear filas de membership del actor/objetivo y properties relevantes; las
   escrituras de asignaciones toman siempre el lock de su StaffUser antes de tocar
   filas hijas. Roles/permisos fijos V1 no tienen endpoints de edición. Los cambios
   de estado/organización de properties por otros productores deben coordinarse con
   el mismo bloqueo; verificar productores reales antes de habilitar el comando.
4. Verificar autorización actual, expectedVersion y reglas. Mantener el lock de
   usuario para impedir inserciones concurrentes de sesiones y asignaciones bajo
   el protocolo común. Revalidar Q completo en SQL, no confiar en el selector Web.
5. Aplicar contacto o membership o estado. Membership actualiza rol efectivo,
   espejo staff_users.role_code y asignaciones en la misma transacción. Inactivar
   asignaciones retiradas; reactivar/insertar Q, conservando claves y createdAt.
   Membership.status no cambia. updatedAt se actualiza en el agregado.
6. **Incrementar version exactamente una vez por cambio real**, también si cambian
   solo filas membership_properties y el rol no cambia. @Version del padre no
   aumenta por JDBC hijo automáticamente: usar CAS explícito `WHERE version=:v`
   o mecanismo JPA verificado, sin doble incremento ni estado JPA obsoleto.
7. Revocar todas las sesiones y refresh del sujeto, insertar evento administrativo
   y eventos de revocación atribuibles. Flush y commit únicos; fallo en cualquiera
   revierte correo/rol/properties/estado/version/sesiones/tokens/eventos.

No bloquear solo las filas hijas actuales: no evita nuevos INSERT concurrentes.
No hacer REQUIRES_NEW para auditoría de una mutación exitosa ni revocación fuera de
transacción. Lock timeout/deadlock se revierte completo y se devuelve503; sin retry
automático del comando. Índices existentes de usuario/org y PK de asignaciones se
reutilizan; justificar EXPLAIN de scoped lookup/revocación y añadir solo índices
necesarios mediante nueva migración, nunca reescribir changesets aplicados.

El lock de usuario de actor también protege frente a pérdida concurrente de su
membership/estado por otro comando. Sin coordinación de todos los productores
relevantes, no afirmar garantía de autorización/revocación linealizable. Prueba
obligatoria de cambios cruzados entre administradores y ausencia de deadlock lógico.

## 6. Revocación, idempotencia y resultado incierto

Modificar StaffAuthServiceImpl/repositorios de forma acotada al protocolo común,
no crear otro login. Login debe revalidar credencial/estado/membership **después** de
adquirir lock de usuario antes de insertar sesión. Refresh localiza ID por hash,
luego bloquea usuario → sesión → token, vuelve a leer/revalidar token/session y
rota bajo esos locks. Dos refresh del mismo token no pueden crear dos sucesores
válidos. Logout usa el mismo orden. Nunca esperar lock de usuario reteniendo primero
un token/sesión en orden inverso. Revalidar entidades para evitar lecturas JPA viejas.

Si refresh/login confirma antes, la mutación posterior revoca su resultado; si la
mutación confirma antes, un refresh antiguo no rota. Un **nuevo login** con credencial
vigente puede iniciar una nueva sesión tras cambio de contacto/membership en cuenta
ACTIVE; suspensión/baja lo impiden. Revocar no significa prohibir login para siempre.
El JWT emitido no se borra, pero validación C1 de sesión lo rechaza después del commit.
No se promete cancelar solicitudes de otros dominios que ya pasaron autorización.

C6-D06 sigue pendiente: el refresh rechazado actual guarda/revoca y lanza excepción
que puede revertir esos efectos. No declarar reparada esa familia de auditoría ni
revocación ante replay. Si el protocolo nuevo toca ese camino, tratar su reparación
como subincremento explícito con pruebas; no ocultarla en el nuevo controller.

M04: no exigir Idempotency-Key ni añadir almacenamiento de claves para estas tres
operaciones sobre recurso existente. expectedVersion impide aplicar dos veces una
versión; PUT expresa reemplazo, pero una repetición tras commit devolverá409, no un
replay200. Un no-op con versión vigente no cambia updatedAt, version, auditoría ni
sesiones. Alta y credential-reset sí necesitan su contrato de idempotencia posterior.

Timeout/cancelación/desconexión **no prueban rollback**. El BFF no reenvía escrituras
por timeout ni hace refresh+retry automático después del despacho. La UI conserva
borrador, informa «No se pudo confirmar el resultado», invalida lectura y ofrece
recargar versión vigente. Igualdad de valores tras GET no prueba quién guardó el
cambio; no afirmar éxito propio sin200. Reaplicar exige decisión explícita con nueva
versión; no sustituir expectedVersion automáticamente ni guardar al reconectar.

## 7. Auditoría C6 atribuida y atomicidad

Reutilizar auth_audit_events, su trigger y campos de atribución; no crear otro
AuditTrail. Factoría administrativa nueva, distinta del constructor legacy:

- event_type: STAFF_CONTACT_UPDATED, STAFF_MEMBERSHIP_REPLACED o STAFF_STATUS_CHANGED,
  familias ya candidatas C4; un evento por cambio real.
- staff_user_id = objetivo; actor_context=STAFF, actor_id = administrador autenticado.
- organization_id = O validada; scope_kind=ORGANIZATION y property_id=NULL (M09).
  El hecho afecta la cuenta/conjunto completo, no exclusivamente la property visible.
- correlation_id generado por servidor por comando, propagado internamente; nunca
  autorización. Session ID interno solo en evento de revocación correspondiente.
- detail: código seguro fijo por acción; sin correo, contraseña/hash/token, lista
  libre de properties ni JSON de request. No fingir columnas before/after que esta
  tabla no tiene. Si se requieren snapshots auditables estructurados, aprobar su
  esquema/redacción en otro incremento; no usar texto libre como contrato oculto.

STAFF_SESSION_REVOKED por cada sesión cuyo estado se modifica, actor administrador
y sujeto separados, misma correlación/org y clasificación. Tokens ya inactivos no
se reactivan. No escribir eventos de «cambio exitoso» para409/no-op. La ausencia de
eventos de éxito en rollback es correcta; registro durable de intentos rechazados
es otra política C6-D06, no un commit parcial de la mutación.

La clasificación ORGANIZATION implica que GERENCIA puede ejecutar el comando pero
no gana acceso a esa auditoría organizativa (C6-D02). El acuse no publica el evento.
No crear endpoint de auditoría ni conceder AUDIT_READ adicional.

## 8. Contrato BFF propuesto

| Ruta mismo origen | Método permitido nuevo | Backend |
| --- | --- | --- |
| /api/staff/admin/users/[id] | PATCH (GET existente intacto) | /api/v1/staff-admin/users/{id} |
| /api/staff/admin/users/[id]/membership | PUT | /api/v1/staff-admin/users/{id}/membership |
| /api/staff/admin/users/[id]/status | PATCH | /api/v1/staff-admin/users/{id}/status |

Misma query y DTO de entrada; sin transformar negocio. Route Handlers delgados →
proxy de mutación → backendStaffRequest. Cookie pms_staff_access HttpOnly; nunca
aceptar Authorization/actor/org arbitrario del navegador. No leer cookie Guest ni
refresh fuera del flujo Staff canónico. Backend sigue enforcement definitivo.

Antes de upstream: cookie Staff; Origin exacto contra origin de PMS_WEB_PUBLIC_URL,
rechazar ausente/null/externo con403 (patrón Inventory/Assignment); JSON/tamaño,
UUID/query y body allowlist. SameSite de cookies existente se conserva; no confiar
en Host/forwarded-origin para decidir origen público ni permitir CORS amplio. No
inventar segundo token CSRF: cualquier cambio de política requiere Change Control.

DTO BFF propio para cada comando y acuse; proyectar exactamente cuatro campos del
acuse. Validar id igual al solicitado, organizationId UUID, versión segura >=esperada,
changed boolean y coherencia version: changed=true → esperada+1; false → esperada.
La organización del acuse no se considera prueba de autorización aportada por el
cliente; servidor confiable y posterior GET por sesión mantienen aislamiento.
No exigir propertyId de selección en un acuse sin properties ni inventarlas.

Preservar status/códigos permitidos de sección3 mediante allowlist; descartar
stacktrace, SQL, instance, detail, URLs internas y Set-Cookie. Código desconocido,
JSON inválido o éxito incoherente →503 STAFF_WRITE_UNAVAILABLE sin fingir rollback.
No mapear409 a vacío/éxito. Misma política timeout10s/AbortSignal y redirect:error;
no reintentar una escritura despachada ni reutilizar staffBffRead como mutador.
Sin almacenamiento caché BFF; private,no-store en todas las respuestas.
401 notifica al manejo canónico de sesión/revalidación y oculta el módulo si la
sesión caducó; no envía usuarios sin sesión al dashboard. 403 por pérdida de
STAFF_MANAGE revalida sesión y reutiliza el destino Staff autorizado existente,
sin montar consultas administrativas ni crear otra pantalla de acceso denegado.
Ninguno de esos caminos reenvía automáticamente el comando original.

MSW: ampliar únicamente el bypass temprano del worker a estos métodos/paths exactos
tras aprobarlos, antes de respondWith del worker generado. Mantener GET reales y
Guest aislado; mocks=true/false deben llegar a los mismos comandos reales, nunca
interceptar una escritura con un usuario ficticio o fallback exitoso.

## 9. UX dentro de las tres columnas existentes

Usuario(username inmutable/correo), Acceso(rol/estado), Asignación(properties).
Menú contextual discreto accesible dentro de **Usuario**, sin columna Acciones;
acciones nombradas «Editar correo», «Editar acceso y propiedades», «Suspender»,
«Reactivar» elegible y alternativa «Dar de baja». No añadir acciones falsas antes
de aprobar/implementar Backend+BFF. ConfirmDialog compartido solo para transición
sensible, no modal general de edición. El menú es descubrible por foco/teclado/tacto,
no solo hover ni menú contextual del navegador.

- Un grupo editable por fila a la vez; abrir otro grupo con borrador requiere
  guardar/cancelar el actual. Contacto se guarda por PATCH, rol+properties por PUT
  atómico interno. Guardar/Cancelar contextuales en la misma celda/grupo, sin cuarta
  columna. No existe Guardar todo ni secuencia silenciosa de dos peticiones.
- Si el producto decide permitir dos borradores simultáneos, mostrar dos acciones
  explícitas «Guardar correo» y «Guardar acceso» y resultados separados, serializar
  guardados y revalidar versión entre ellos; no compensar automáticamente el primero
  si falla el segundo. Se recomienda el grupo único M10 por menor ambigüedad.
- Mantener original y borrador en memoria ligados a identidad/org/scope/target/version;
  validación por campo, controles etiquetados, no mutar Domain ni DTO de lectura.
  Estado saving bloquea envío duplicado y navegación interna del grupo, no la página.
- 409: conservar borrador, explicar conflicto, ofrecer cargar versión vigente y
  comparar/reaplicar explícitamente; nada de sobrescribir ni resolver silenciosamente.
  Si GET devuelve404 tras conflicto, ocultar datos del objetivo fuera de alcance y
  descartar borrador sensible de ese contexto; no mostrar versión anterior indefinidamente.
- Cambio voluntario de propiedad con borrador: confirmar descarte antes de cambiar
  PropertyProvider usando la composición existente; cancelar conserva scope/borrador.
  Cambio forzoso de identidad/permisos/logout invalida inmediatamente, cancela queries,
  limpia borradores y oculta datos sin esperar confirmación. No persistirlos en storage.
- Mientras la fila está en edición/guardando, desactivar expansión y swipe. Eventos
  de input/select/botones/menú/contenido editable nunca alternan detalles. Fuera de
  edición conservar expansión actual por fila y Enter/Espacio del control accesible.
- Confirmado200: invalidar todas las páginas/detalles del objetivo dentro de la
  identidad/org actual, cancelar GET anteriores y resetear historia de cursores;
  no actualizar membership de sesión del actor desde el DTO administrativo. No
  reutilizar detalle fresco30s anterior a la mutación. Refetch con filtros/scope
  actuales; la fila puede desaparecer tras cambio de rol/estado/properties.
- Mutación tardía de un contexto anterior no repuebla caché ni UI actual. Solo
  procesar acuse/caché si coincide el contexto de inicio. Cambiar scope durante
  saving no significa que el servidor haya cancelado el comando; informar resultado
  incierto si corresponde y revalidar únicamente contextos autorizados.

## 10. Baja lógica por deslizamiento y alternativa accesible

Swipe horizontal intencional de una fila en reposo revela «Dar de baja»; **jamás
la ejecuta**. Umbral técnico inicial propuesto48px y predominio horizontal sobre
vertical, ajustable con QA; touch-action preserva scroll vertical. No iniciar sobre
controles, texto seleccionado, menú, edición ni contenido expandido interactivo.
Cancelar/cerrar otra fila al iniciar gesto; respetar prefers-reduced-motion.

Pulsar acción revelada o menú dentro de Usuario abre ConfirmDialog compartido:
«Dar de baja a [username]»; explica DISABLED terminal por flujo ordinario,
revocación de sesiones y conservación de historial. Confirmar manda PATCH status
con expectedVersion; cancelar no envía nada. Actualizar registro solo tras200.
Fallos/409 conservan estado anterior, con recuperación de versión; ninguna animación
de eliminación física ni eliminación optimista del usuario.

Escritorio/teclado: menú contextual visible con foco y nombre accesible por usuario,
activable Enter/Espacio, opción «Dar de baja», Escape/cierre y retorno de foco.
Diálogo con foco inicial no destructivo, labels y mensajes anunciados. No depender
de arrastrar mouse ni exigir gesto. Misma protección C4/Backend en ambos caminos;
no ofrecer acción para uno mismo, SA protegido o DISABLED. Suspender comunica
reversibilidad; Reactivar aparece solo con elegibilidad fiable. El DTO GET actual
no expresa credencial preparada: no inferirla por estado/rol. Aprobar extensión de
lectura con indicador seguro si se necesita mostrar elegibilidad; **no modificar
GET en esta fase** ni exponer detalles de credencial para resolverlo.

## 11. Matriz de pruebas prevista (NO EJECUTADA en Fase 3A)

Fixtures aisladas PostgreSQL: organizaciones O1/O2; properties A/B/C activas e I
inactiva; SA1, SA2 de bootstrap/legado controlado, GERENCIA con A/B, otros cuatro
roles asignables; usuarios ACTIVE/SUSPENDED/DISABLED; membership INACTIVE; P=A,
A+B, A+C, vacío, asignación inactiva y credencial preparada/no preparada/legada
indeterminada. Las fixtures de credenciales dependen M08; nunca datos de producción.

| ID | Capa / casos obligatorios | Aceptación |
| --- | --- | --- |
| T01 | HTTP Backend: cada comando SA y GERENCIA con STAFF_MANAGE; roles restantes sin permiso; Guest/sin/expirada/revocada | Éxito scoped;403 sin permiso,401 auth inválida; ninguna escritura/evento de éxito en rechazos. |
| T02 | PROPERTY y ALL, O2, target inexistente/huérfano, A+C para gerente A+B, membership INACTIVE/estado suspendido |404 sanitizado indistinguible; SQL filtra antes de lectura/lock; no fuga parcial. |
| T03 | Q=A+B válido, Q=C/O2/I/no existente, duplicados, vacío por estado/actor, retirar propiedad seleccionada | Reemplazo completo;403 uniforme ante Q ajeno; acuse200 y posteriorGET404 si salió de selección. |
| T04 | Correo válido/case/trim, sintaxis inválida, vacío/null/CRLF, límites50/51 y320 según M02, correo de O2 | Unicidad normalizada;409 sin identidad; no truncar ni cambiar datos ante error. |
| T05 | Dos transacciones asignando mismo correo | Una confirma; otra409; no pérdida de versión ni sesiones revocadas en rollback. |
| T06 | Cada rol asignable por SA/GERENCIA; SUPER_ADMIN nuevo, rol desconocido/inactivo, permissions/username/org extras | Sin promoción/escalamiento ni segundo rol; espejo y membership coinciden. |
| T07 | Propio correo/rol/status/membership; cualquier SA protegido y cambio de configuración bootstrap |403 según M05/M06; bootstrap mantiene capacidad; no usar roleLabel UI como autoridad. |
| T08 | Todas las transiciones sección4; ACTIVE→SUSPENDED→ACTIVE elegible; credencial no preparada/indeterminada; membership INACTIVE | Reactivar solo con requisitos; DISABLED nunca vuelve; memberships no se activan implícitamente. |
| T09 | Cambio únicamente de propertyIds; noop/repetición/versión omitida/string/fraccionaria/negativa/límite seguro | Versión global exactamente+1 en cambio; noop no aumenta ni audita/revoca; obsoleta409. |
| T10 | Dos administradores misma versión, correo vs membership, status vs membership | Solo uno confirma; otro409; sin lost update ni mezcla de columnas. |
| T11 | Barreras deterministas: login vs mutación; refresh vs mutación en ambos órdenes; dos refresh; logout vs revocación | Ninguna sesión previa válida tras commit; sucesor previo revocado; no nuevos tokens de sesión revocada. |
| T12 | Dos administradores se modifican entre sí; actor pierde STAFF_MANAGE/membership mientras espera lock; property se inactiva concurrentemente | Revalidación bajo locks; sin concesión obsoleta ni deadlocks no manejados. |
| T13 | Inyectar fallo tras update/assignments/version/revoke/audit/flush; timeout/deadlock | Rollback total observable desde otra conexión; ni200 prematuro ni evento huérfano. |
| T14 | Eventos y sesiones múltiples/refresh expirados/ya revocados | Actor≠sujeto correcto, O/correlación/scope seguro; revocación de todas las sesiones; Guest intacto. |
| T15 | Append-only/upgrade y legado; auditoría C6-D06 | UPDATE/DELETE rechazados; historia preservada; no acreditar fallos de auth todavía no reparados. |
| T16 | BFF métodos/rutas, Origin válido/ausente/null/externo, Guest, payload/size/media/query inválidos | Sin despacho no autorizado;400/401/403/405/413/415 exactos y no-store. |
| T17 | Upstream400/401/403/404/409/503, HTML/JSON inválido/código desconocido/acuse ID o versión incoherente | Allowlist, status correcto, sin SQL/hash/token/cookies/infraestructura; jamás fallback vacío. |
| T18 | BFF timeout/desconexión antes/después del commit, cancelación | Sin retry automático; resultado incierto explícito; POST/DELETE no aprobados405. |
| T19 | MSW activo/inactivo + Next→Spring→PostgreSQL | Escrituras llegan solo a Backend real; ningún mock simula guardado, Guest sin interceptar. |
| T20 | Componentes inline correo y acceso, validación, cancelar, borradores y dos grupos | Tres columnas exactas; original conservado; endpoints separados, sin Guardar todo. |
| T21 | UI409,503,resultado incierto, éxito seguido de falloGET; cambio scope/login/logout durante guardado | No falsa atomicidad, borrador recuperable solo en contexto autorizado; no repoblación tardía. |
| T22 | Swipe revela/selección/confirmar/cancelar; scroll vertical, texto, inputs, edición | Gesto solo no muta; un PATCH al confirmar; sin activaciones accidentales ni hard delete. |
| T23 | Menú teclado/mouse/tacto, lector de pantalla, ConfirmDialog, Escape/foco, reducción movimiento | Alternativa descubrible, labels/estado/foco coherentes; pruebas automáticas y manuales diferenciadas. |
| T24 | Lectura y sesión: búsqueda350ms, filtros/cursor, detalle bajo demanda30s, paginación compartida, PropertySwitcher/StaffShell/dashboard/login/refresh/logout | Sin regresiones de contratos51/52/64/65; cache Guest intacta; sin credenciales en payload/log/storage. |
| T25 | Responsive escritorio/tablet/móvil en Firefox y navegador de regresión disponible | Tres grupos compactos sin cuarta columna/overflow; edición y confirmación usables por teclado/tacto. |

Preparar al implementar clases StaffAdminMutation*Tests (unitarias DTO/reglas y
PostgreSQL HTTP/transacciones), ampliar StaffAuth* concurrencia y OpenApiContractIntegrationTests.
Probar secuencias reales con latches/barreras y conexiones independientes, no sleeps
que pasen por azar. Verificar consulta SQL/plan sin capturar valores sensibles.

Comandos previstos, **no ejecutados ni declarados PASS aquí**:

```bash
# backend/; únicamente PostgreSQL QA aislado del compose existente
# Elegir nombre de proyecto QA nuevo y retirar solo sus recursos al terminar.
docker compose -p pms_staff_mutations_qa -f compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress verify
# frontend/pms-hotel-web/; scripts existentes
npm run test -- src/modules/staff/staff-admin.test.tsx src/shared/components/entity-pagination.test.tsx
NEXT_PUBLIC_USE_MOCK_API=false npm run check
NEXT_PUBLIC_USE_MOCK_API=true npm run build
npm run typecheck
git diff --check
```

Completar comando focalizado Backend con nombres reales al crear tests, sin usar un
patrón que silencie ausencia de pruebas. OpenAPI generado debe publicar solo métodos
aprobados con request/response/error/scope/version y regenerar baseline/Postman en el
mismo incremento Backend. No generar un OpenAPI que anuncie mutaciones aún inexistentes.

## 12. Archivos previstos y plan incremental

Nombres nuevos son propuestos, no archivos funcionales creados por Fase 3A.

| Incremento | Archivos que se crearían/modificarían | Criterio para avanzar |
| --- | --- | --- |
| 3A contrato | Este53, QA65, AlanPlan, AlanHandoff | Precisiones abiertas enumeradas; solo2C cerrada por instrucción expresa. |
| 3B-1a base transaccional interna (parte de3B-1) | securityauth/application/StaffAdminMutationService.java, DTO/command models/validator/exception; infrastructure/persistence/StaffAdminMutationRepository.java; StaffUser/StaffAuthServiceImpl/AuthSessionRepository/RefreshTokenRepository/StaffUserRepository; AuthAuditEvent factoría y repositorio si necesario; ajuste mínimo DemoDataBootstrap de inicialización de memberships | Aprobar M01/M04/M05/M06/M07/M09/M11 y protocolo común; concurrencia/revocación/rollback probados antes de exponer escrituras. Mantener lecturas. |
| 3B-1b comandos Backend (mismo incremento3B-1) | api/StaffAdminMutationController.java y handler, StaffAdminMethodExceptionResolver/SecurityConfiguration, StaffAdminMutation*Tests, OpenAPI tests/baseline y Postman; migración **nueva** solo si base aprobada lo exige | Correo depende M02; membership/suspensión/baja con expectedVersion; reactivación excluida hasta3B-2/M08. Sin entrada ACTIVE en este incremento. Todos auditados; verify y QA HTTP aislado. No dar por completado BE-006B/C. |
| 3B-2 elegibilidad | Estado de credencial preparado y su migración aditiva/upgrade solo tras aprobación M08; lógica elegibilidad y posible extensión DTO GET explícitamente aprobada | Recuperación de cuentas legadas sin inferir preparación del hash; no implementar entrega/reset dentro de este alcance. Si no se resuelve, reactivación permanece bloqueada. |
| 3C BFF | app/api/staff/admin/users/[id]/route.ts y nuevos membership/route.ts,status/route.ts; mutation-proxy.ts, mutation-contract.ts, DTO/tests propios; worker boundary/MSW y docsQA | Métodos/origen/allowlist/errors/no-store, sin replay inseguro; real mocks on/off, regresiones auth. |
| 3D inline | modules/staff/dtos,mapper,model,service: comandos propios; hook use-staff-admin-mutations; componentes locales de grupo editable/menú, workspace/CSS/tests; index API pública; PropertyProvider solo mínimo necesario para confirmar descarte | Aprobar M10; tres columnas; guardados separados, borrador/409/contexto/cache seguros; sin página nueva ni deep imports. |
| 3E estado e interacción | Mismo workspace/celdas/menú + ConfirmDialog compartido, controlador local swipe y tests; sin alterar tablas ajenas | Reactivar solo elegible; swipe revela, menú accesible, confirmar→Backend, sin optimismo destructivo. |
| 3F QA y cierre | QA nueva de mutaciones vinculada aquí, AlanPlan/AlanHandoff; evidencia automatizada y manual por incremento | Mantener EN_QA cada incremento hasta confirmación manual aplicable; no heredar cierre2C para mutaciones ni para2A/2B. |

Alta, sesiones administrativas, invitación/reset C4-D05 y su proveedor/plantilla,
idempotencia de entrega y recuperación bootstrap operativa quedan fuera. No usar
constructor actual ACTIVE como futuro flujo de alta: C4 exige crear SUSPENDED.
No copiar almacenamiento/OTP Guest ni entregar enlace/token/password a administrador.
Ninguna dependencia externa nueva ni refactorización general necesaria.

## 13. Riesgos y cierre de esta propuesta

Bloqueos reales: aprobación específica M01–M11 según operación, evidencia de
credencial preparada ausente, diferencia correo50/320, respuesta conceptual C4
frente a salida de PROPERTY, coordinación de locks de auth y productores de scope.
La auditoría append-only/atribución existentes no resuelven C6-D06 ni garantizan por
sí solas revocación concurrente. Un acuse200 debe significar commit completo; timeout
sigue incierto. No convertir estas limitaciones en reglas inventadas o QA aprobada.

Recomendación: aprobar las precisiones por ID; después base transaccional y comandos
Backend, luego BFF, inline y estado/swipe. Reactivación permanece fuera de3B-1
hasta productor y evidencia verificables M08, aunque se apruebe su diseño conceptual. No iniciar código de
mutaciones por esta entrega documental. Ningún contrato C1/C2/C4/C6 se reescribe ni
se marca APPROVED en nombre del usuario.

### Validación documental inicial ejecutada en Fase 3A (histórica)

- Rama `feature/staff-admin-read` y árbol local verificados antes de editar.
- `git diff --check`: PASS.
- Script local Python:15 enlaces relativos de esta propuesta resueltos, cuatro
  ejemplos JSON parseados, registro M01–M11 y matriz T01–T25 completos: PASS.
- Comparación SHA-256 de65 archivos previamente modificados/no versionados:
  solo cambiaron QA65, AlanPlan y AlanHandoff. Código funcional, contratos previos,
  QA52 y QA64 preservados. Nuevo archivo: esta propuesta53.
- No se ejecutaron Maven, npm, builds ni navegador: no hubo cambios funcionales.
  Los resultados864 Backend y1937 Web citados en el seguimiento son evidencia
  histórica de las fases anteriores, no nuevas ejecuciones de Fase 3A.

## 14. Resolución recomendada M08 y precisión M02

### 14.1 M02: paridad comprobada por inspección, sin restricciones adicionales

Fuentes actuales: `infrastructure/security/PasswordLoginValidator.java`,
`securityauth/application/StaffAuthServiceImpl.java`, Web `src/lib/login-input.ts`
y `src/lib/bff/login-credentials.ts`; contrato vigente de login
[44](44_UNIFIED_LOGIN_CONTRACT_QA.md) y C1. En Backend el orden es
`email.trim().toLowerCase(Locale.ROOT)` → @NotBlank + @Email con EMAIL_PATTERN
actual + @Size(max=50) → lookup normalizado. El login Web/BFF usa
`email.trim().toLowerCase()`, límite LOGIN_MAX_LENGTH=50 y su emailPattern espejo.

Edición debe aceptar/rechazar el mismo correo que login en **cada capa**:

- Reutilizar la regla de correo existente o una extracción mínima con pruebas de
  equivalencia que no cambie resultados del login. No invocar validación de
  contraseña con un valor ficticio para validar solo correo.
- BFF/UI usan las reglas Web actuales; Backend es autoridad y usa su validador
  equivalente. No agregar isASCII, nuevos patrones, política de dominio/TLD,
  normalización Unicode, trim distinto, límite de bytes de correo ni prohibición
  previa de caracteres que el login elimina/normaliza. Las restricciones efectivas
  del patrón actual se conservan, sin convertirlas en un filtro ASCII adicional.
- Java trim() y JavaScript trim() difieren para espacios Unicode: **no afirmar
  equivalencia de ambas funciones sobre toda entrada cruda**. La paridad exigida
  es administración vs login en la misma capa y en la cadena Browser→BFF→Spring.
  Spring directo conserva la semántica del login Spring directo. No cambiar login
  ni forzar una normalización nueva en esta entrega.
- Preservar lectura320 y columna320. Límite50 se evalúa sobre correo normalizado,
  no truncar valores existentes. Mantener índice único lower(btrim(work_email)).

Pruebas futuras obligatorias de paridad (no ejecutadas aquí): vectores compartidos
para longitud normalizada50/51, mayúsculas/espacios, null/vacío, puntos y caracteres
permitidos/rechazados por EMAIL_PATTERN, controles/CRLF externos e internos,
espacios Unicode y caracteres cuya conversión a minúsculas cambie su representación.
Comparar decisión y valor normalizado con login **por capa**, además de prueba
end-to-end. No afirmar que una revisión estática acredita pruebas de paridad PASS.

### 14.2 Inventario real: qué acredita y qué no acredita preparación

| Fuente inspeccionada | Hecho y límite |
| --- | --- |
| StaffUser/password_hash y constructor | Hash requerido y creación actualmente ACTIVE. Sin versión específica de credencial ni evidencia de preparación/entrega. La versión administrativa no identifica qué credencial fue preparada. |
| StaffBootstrapConfiguration | Genera hash de secreto de despliegue y membership SA; STAFF_BOOTSTRAP_CREATED acredita provisionamiento SYSTEM. No prueba entrega ni consumo por destinatario. Reejecución con username existente no cambia credencial. |
| StaffAuthServiceImpl.login/acceptsCredentials | Comprueban contraseña, estado y autorización actuales. Login crea sesión; acceptsCredentials participa en login universal. No son un flujo de preparación ni escriben evidencia de entrega. No modificarlos para marcar cuentas preparadas automáticamente. |
| STAFF_LOGIN_SUCCEEDED | Prueba un login ocurrido; evento sin referencia a generación de credencial/preparación. No usarlo para backfill de readiness actual. |
| RefreshToken/AuthSession | Familia, hash de refresh, expiración y revocación; no acreditan propiedad del correo ni preparación de contraseña. |
| AuthAuditEvent/guías36–38 | Historia append-only y atribución. No hay eventos/productores Staff de invitación consumida/reset completado ni vínculo a generación de credencial. |
| Flujos de registro/OTP Guest | Existen, pero corresponden a GuestAccount y no autorizan preparación de Staff. No reutilizar prueba Guest para activar Staff aunque coincida correo. |

**Conclusión:** actualmente no existe productor Staff confiable de esta evidencia.
No inferirla de hash no nulo/BCrypt válido, estado ACTIVE, sesión, rol, fecha de
creación, bootstrap o texto libre de auditoría. Reactivación no implementable en3B-1.

### 14.3 Definición exacta recomendada

Una credencial está **preparada para evaluar activación** cuando el Backend ha
confirmado, en un futuro flujo Staff previamente aprobado de invitación/reset:

1. Prueba válida del destinatario previsto, ligada al StaffUser, a su organización,
   al workEmail vigente y a la generación específica del flujo/credencial.
2. Consumo de un secreto de un uso, no expirado ni revocado, por el destinatario
   autorizado; no basta aceptación del mensaje por el proveedor ni estado SENT.
3. Establecimiento de la credencial final por el mecanismo aprobado; administrador
   no recibe contraseña, token ni enlace. Hash persistido y generación identificada.
4. Consumo del flujo, evidencia y auditoría confirmados en la misma transacción.

Esta evidencia acredita **preparación**, no concede sesión ni activa automáticamente.
Para SUSPENDED→ACTIVE también se revalidan membership ACTIVE, propiedad válida,
STAFF_MANAGE del actor y todas las restricciones de scope/SA/autoedición C4.
Definición recomendada pendiente de aprobación; no publica endpoints de consumo.
El consumo pertenece a un proceso iniciado por administrador autorizado conforme
C4-D05; no crea recuperación autónoma ni cambio libre de contraseña Staff.

### 14.4 Productor autorizado y momento de registro

Solo el servicio Backend que consume el futuro flujo Staff aprobado puede acreditar
readiness. Su autoridad deriva de la prueba del flujo, no de un booleano del body,
un rol visual ni un administrador que declare haber entregado la contraseña.
No endpoint genérico «marcar preparada», SQL de backfill automático ni script del
frontend. La identidad del productor y el consumo deben quedar auditables.

Registrar evidencia **al completar el consumo**, junto al hash final y referencia
interna del flujo, antes del commit. Un fallo en cualquiera revierte todo. No marcar
en intención de invitación/reset, envío, callback del proveedor, apertura del correo,
login o refresh. Si un futuro aprovisionamiento excepcional requiere otra fuente,
exige contrato operativo explícito; no queda autorizado por esta propuesta.

### 14.5 Persistencia mínima recomendada (solo futura, no migración de3B-1)

Extensión nullable de `staff_users`, sin segunda tabla de autenticación ni hash nuevo:

| Campo interno propuesto | Propósito |
| --- | --- |
| credential_generation UUID | Identifica la generación vigente; la asigna Backend al preparar/sustituir credencial mediante flujo aprobado. No se deriva del hash ni de version administrativa. |
| credential_prepared_generation UUID | Generación acreditada; debe coincidir con credential_generation para ser válida. |
| credential_prepared_at timestamptz | Momento confirmado de consumo/preparación. |
| credential_prepared_source varchar | Allowlist propuesta INVITATION_CONSUMED o RESET_CONSUMED; códigos internos aún no implementados/aprobados. |
| credential_prepared_flow_id UUID | Referencia interna al flujo consumido; no secreto. Identifica la evidencia para comprobar origen y auditoría. |

Evidencia válida: generación no nula, prepared_generation igual a generación actual,
los otros tres campos de preparación completos y coherentes con el flujo consumido.
Conjunto de cuatro campos de preparación todo NULL o todo presente; constraints
y pruebas de coherencia en una **nueva** migración futura. Referencia al registro
real del flujo con integridad definida cuando se apruebe su esquema; no inventar
una FK a una tabla inexistente. Productor futuro debe impedir referencias huérfanas.
No hash/password/secreto en estos metadatos, DTO GET/BFF, logs o navegador.

UUID de generación no es permiso ni Idempotency-Key. Reutilizar versión global
como CAS para cambios sensibles y lock StaffUser para serializar productor,
contacto, estado y activación. Cambiar evidencia modifica el agregado/version y
se audita de forma segura; no sumar incrementos adicionales dentro del mismo comando.
Un flag público de elegibilidad, si se necesita, será derivado y tendrá aprobación
separada del contrato GET; nunca estos campos internos ni un flag escribible.

### 14.6 Cuentas existentes y reglas de invalidación

Migración futura: todos estos campos NULL para cuentas existentes, sin clasificar
como preparadas usando hash, login histórico o bootstrap. Cuentas ACTIVE **siguen
ACTIVE**, con login/sesiones según C1/C2; desconocer preparación histórica no causa
suspensión, revocación ni un nuevo requisito para login. Sin cambios de datos en3B-1.

Cuenta SUSPENDED sin evidencia: no reactivar; necesita completar el futuro flujo
seguro. Una cuenta ACTIVE legada que se suspenda en3B-1 tampoco obtiene evidencia
por esa suspensión y no tendrá una vía de reactivación disponible en ese incremento.
Comunicar esta limitación antes de confirmar suspensión en la UI futura: es
reversible en el dominio, pero la operación Reactivar aún no está disponible.

| Hecho futuro | Tratamiento de evidencia |
| --- | --- |
| Reset autorizado iniciado, compromiso confirmado o reemplazo del hash | Invalidar evidencia anterior y bloquear activación con ella; cambio de generación/consumo según flujo aprobado. Revocar sesiones conforme C4. |
| Consumo válido final de invitación/reset | Registrar nueva generación y evidencia en commit único; no activar por efecto lateral. |
| Cambio efectivo de workEmail | Limpiar evidencia de preparación; la prueba anterior estaba ligada al destinatario anterior. Revocación de sesiones del comando permanece obligatoria. No suspender cuenta ACTIVE automáticamente. |
| No-op de correo o de otro comando | No invalidar, versionar ni revocar por sí solo. |
| Suspensión temporal; cambio de rol/propiedades o membership INACTIVE | No invalidar por sí solos una preparación válida de la misma credencial/correo; activación exige además los requisitos vigentes. |
| DISABLED | Invalidar evidencia; estado terminal aunque después se obtuviera una prueba. Ningún consumo ordinario lo rehabilita. |
| Expiración/revocación de invitación pendiente o fallo de entrega | No generar evidencia. TTL del secreto pendiente no es una caducidad automática de la evidencia ya completada. No inventar plazo de caducidad de contraseña/preparación. |

No hay evidencia en3B-1 que invalidar: las reglas anteriores deben incorporarse
cuando se apruebe/integre el modelo futuro. Esa ampliación deberá revisar los
comandos existentes de contacto/baja para aplicar la invalidación atómica.

### 14.7 Pruebas de M08 y dependencia de entrega

Reactivación3B-2 exige pruebas de consumidor sin token/ajeno/expirado/reutilizado,
vínculo Staff/org/email/generación, intentos de suministrar readiness desde BFF,
doble consumo y competencia entre consumo-reset/cambio correo/baja/activación.
Locks deben impedir que una prueba anterior al cambio de correo/generación habilite
activación posterior. Probar rollback de hash/evidencia/consumo/auditoría y rechazo
DISABLED; verificar que migración no altera estados ni convierte cuentas legadas
en preparadas. Acreditar que campos internos no salen de Backend.

Dependencias reales pendientes: contrato de invitación/reset C4-D05, esquema de
flujo de un uso y su consumo, canal/plantilla/proveedor Staff aprobado y prueba del
destinatario. Resend/OTP Guest no resuelve ninguna automáticamente. El diseño M08
queda especificado para aprobación; **no existe productor implementado**. Por ello
3B-2 permanece bloqueado incluso si se aprueba el concepto de evidencia persistida.

## 15. Resolución recomendada M11: matriz y alcance3B-1

### 15.1 Estado real y dependencias por operación

Estados tomados de AlanPlan/AlanHandoff vigentes, no solo de encabezados históricos
de guías QA: BE-002/003/005 COMPLETADAS; esquema BE-006B-SCHEMA-01 COMPLETADA;
BE-008B-AUTH-01/02/03 COMPLETADAS; BE-006B/C globales PENDIENTES; BE-014A global
EN_QA (AD-01/02/03 aprobadas, AD-04/05/06 pendientes). Backend2A/BFF2B EN_QA
independientes;2C COMPLETADA con salvedades conservadas. Referencias:
[matriz de acceso21](21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md),
[AlanPlan](AlanPlan.md), [AlanHandoff](AlanHandoff.md).

«Prueba» en la matriz indica el requisito de verificación de3B-1, **no PASS nuevo**.
Implementación significa trabajo autorizado en rama aislada después de aprobación;
publicación significa habilitar los comandos para consumo. No se autoriza ninguna
ahora. Gates pendientes pueden implementarse dentro de3B-1, pero deben pasar antes
de publicar sus mutaciones.

| Operación | Dependencia concreta / estado real | Necesidad y riesgo de comenzar sin ella | Prueba de cumplimiento | Qué bloquea |
| --- | --- | --- | --- | --- |
| Todas las escrituras | Aprobación final53/M01–M11: PENDIENTE; recomendación favorable no equivale a aprobación | Fijar alcance/DTO/reglas antes de programar; inferir aprobación cambia contrato por cuenta del implementador | Registro expreso del subconjunto, DTO/errores/scope y decisiones aprobadas | IMPLEMENTACIÓN y publicación hasta aprobación; no se marca READY ahora |
| Todas las escrituras | C1/C2 y BE-002/003/005 COMPLETADAS; nuevos guards de comando/scoped SQL aún inexistentes | Reutilizar sesión/STAFF_MANAGE/org/A; riesgo de target ajeno, autoedición o TOCTOU | T01/T02/T07 y revalidación bajo lock T12, HTTP sin Guest y SQL scoped | Nuevos guards se construyen dentro de3B-1; su ausencia bloquea PUBLICACIÓN, no exige rehacer auth |
| Todas las escrituras | Versión/constraints BE-006B-SCHEMA-01 COMPLETADA; CAS agregado y no-op pendientes | Versión del padre no aumenta sola en JDBC hijo; riesgo de lost update o revocación por noop | T05/T09/T10: correo duplicado, versión obsoleta, cambio solo propiedades, no-op/version/límite | CAS/normas de comando: PUBLICACIÓN; constraints existentes no bloquean implementación |
| Todas las escrituras sensibles | Locks comunes login/refresh/logout y revocación masiva/familias: PENDIENTES; capacidad incluida en BE-006B/C global | expectedVersion no impide emitir sesión/refresh al mismo tiempo; riesgo de tokens utilizables tras commit | T11/T12 y gate15.3: ambos órdenes de login/refresh, doble refresh, todas sesiones/familias, orden de locks | PUBLICACIÓN de CUALQUIER mutación; construir primero dentro de3B-1; no requiere la pantalla/API de sesiones BE-006C |
| Todas las escrituras | Append-only/atribución AUTH-01/02/03 COMPLETADAS; emisor administrativo/rollback atómico pendientes | Riesgo de cambio sin evento, actor=sujeto inventado o revocación parcial | T13/T14/T15 y fallo deliberado INSERT auditoría, sesión/evento/version rollback | PUBLICACIÓN hasta probar emisor/atomicidad; consulta AuditTrail no bloquea productor |
| Refresh/revocación que3B-1 coordina | C6-D06: PENDIENTE; rechazo actual puede revertir revocación/evento al lanzar401 | Si se toca ese camino y se deja rollback, no se acredita revocación durable ante replay/rechazo | Prueba conocida token/familia rechazada con segunda conexión tras401, persistencia de revocación/evento, rollback correcto en fallo de persistencia | PUBLICACIÓN del protocolo nuevo afectado; reparación mínima incluida en3B-1, sin declarar C6-D06 ni BE-006C globales completos |
| PUT/asignaciones y arranque demo | DemoDataBootstrap escribe memberships/asignaciones con ON CONFLICT DO NOTHING; advisory lock local, sin protocolo Staff ni versión | Un reinicio podría reponer una asignación retirada o eludir revocación; coordinación pendiente | Retirar asignación→reiniciar demo→no se repone; arranque vs PUT con barreras; Guest/credenciales intactos | PUBLICACIÓN en entornos demo hasta adaptar inicialización/protocolo; no exige cerrar BE-014A global |
| PATCH correo | Login50 vigente COMPLETADO; M02 precisado, paridad administrativa aún sin implementar; unicidad global esquema COMPLETADA | Un correo aceptado por administración y rechazado por login puede impedir acceso; restricciones adicionales generan divergencia | Paridad por capa14.1/T04, carrera unicidad T05; revocación de todas sesiones y no-op | Decisión M02 forma parte aprobación; pruebas bloquean PUBLICACIÓN de contacto. Preparación/entrega no bloquea este comando |
| PUT rol/propiedades | C2/C4/constraints vigentes; SQL de reemplazo/espejo/version y protección SA pendientes | Escalada de rol/scope, membership activada implícitamente, cuenta ACTIVE sin propiedades | T03/T06/T07/T09/T12, Q completo scoped, retirada propiedad actual→acuse yGET404 | PUBLICACIÓN de PUT; recuperación de membership INACTIVE queda fuera, no se inventa operación |
| PATCH suspensión | Transición ACTIVE→SUSPENDED aprobada C4; protocolo de revocación pendiente; evidencia M08/productor AUSENTES | Suspender sin revocar falla seguridad; prometer Reactivar inmediato falla UX | T08/T11/T13; rechazo de ACTIVE en3B-1, estado anterior ante rollback | Revocación bloquea PUBLICACIÓN. M08 no bloquea suspensión, pero sí Reactivar posterior; advertir limitación al consumidor |
| PATCH baja DISABLED | C4 terminal/bootstrap/autoedición vigentes; comando/auditoría/revocación pendientes | Riesgo de hard delete, baja de SA o sesiones utilizables; irreversibilidad ordinaria | T07/T08/T11/T13; no cambio de filas históricas y posterior ACTIVE rechazado | PUBLICACIÓN hasta cumplir controles; gesto/confirmación corresponde a UI posterior |
| PATCH reactivación | M08: diseño nuevo propuesto, productor/metadata/flujo C4-D05 AUSENTES | Hash/evento legado no prueban preparación; activación insegura |14.7 + T08 con evidencia por generación y consumo real | IMPLEMENTACIÓN funcional/publicación de reactivación BLOQUEADAS; EXCLUIDA de3B-1;3B-2 no READY |
| BE-014A aplicable a comandos Staff | Global EN_QA; C2/C4 fijan STAFF_MANAGE/scope; AD-04 mensajería, AD-05 GuestProfile, AD-06 fiscal pendientes | No requieren resolver permisos de esos dominios para editar Staff; sí evitar usar sus servicios crudos o introducir facultades nuevas | T01/T02/T06/T07/T12; inspección de dependencias: comandos securityauth y coordinación técnica de productores de bootstrap, roles/permisos fijos sin modificar catálogo | Aprobación M11 debe delimitar dependencia por alcance; AD-04/05/06 no bloquean este subconjunto por sí solas. BE-014A global NO se cierra |
| BE-006B/C globales y proveedor Staff | Alta, reset/entrega, listado/revocación administrativa de sesiones y consulta audit pendientes | Esos entregables son distintos de revocar sesiones como efecto interno de comando; confundirlos produce cierres falsos | Ausencia de endpoints/DTO de alta/reset/sesiones/audit nuevos; alcance53 y seguimiento conservados | CIERRE GLOBAL BE-006B/C, no trabajo del subconjunto tras aprobación. Entrega Staff bloquea3B-2, no correo/membership/suspensión/baja |
| Integración consumidores y QA | Backend2A/BFF2B EN_QA; frontend2C COMPLETADA, paginación manual positiva no ejecutable y lector no acreditado | No heredar QA ajena para mutaciones ni reconstruir lectura | Regresiones864 como referencia histórica, nuevas suites reales, OpenAPI/HTTP y QA manual3B-1 separada | QA pendiente de otros incrementos no los completa ni autoriza cierre3B-1;3B-1 tendrá sus propios gates y permanecerá EN_QA hasta confirmación |

BE-014A no se declara satisfecha globalmente. Se recomienda aprobar el cumplimiento
**acotado** de su preocupación de acceso para Staff mediante C2/C4 + guards y SQL
scoped de este namespace. No usar esa delimitación para publicar mensajería, CRM,
invoices u otras APIs ni para modificar sus permisos. Si se descubre una llamada
a esos productores o contradicción normativa, detener solo el comando afectado.

Productores adicionales comprobados: PropertyService.create inserta properties
ACTIVE dentro de O; update solo renombra code/name bajo lock de property, no cambia
org/estado. StaffAuthorizationRepository.ensureSuperAdminMembership inicializa la
membership SA. **DemoDataBootstrap.bootstrapCredentials** inserta membership y
membership_properties con ON CONFLICT DO NOTHING también para un Staff demo ya
existente: una asignación retirada podría reinsertarse en otro arranque. Su
pg_advisory_xact_lock privado serializa el dataset demo, no los comandos Staff.

Antes de habilitar3B-1 en un entorno con demo, adaptar mínimamente ese productor al
protocolo común y a inicialización de asignaciones solo al crear el Staff nuevo,
sin recomponer asignaciones de una cuenta ya administrada ni exigir que sus campos
editables (correo/rol) sigan coincidiendo con los valores de muestra originales.
Preservar comprobaciones de identidad/integridad aplicables. Probar arranques
repetidos y concurrentes con PUT/estado; no cambiar Guest ni sobrescribir datos o
secretos. Esto forma parte de la aprobación del alcance técnico M11, no de una
refactorización de inventario. Si no se implementa esa coordinación, PUBLICACIÓN
en ese entorno queda bloqueada. No anunciar garantía frente a SQL operativo
manual que eluda el protocolo; tales cambios requieren procedimiento controlado.

### 15.2 Alcance exacto recomendado de Backend3B-1

Un único incremento de Backend (paquetes internos3B-1a base y3B-1b comandos):

- Versión global, locks y revalidación de actor/objetivo, coordinación de login,
  refresh y logout existentes, sin otro mecanismo de autenticación.
- Revocación transaccional de **todas** las sesiones Staff del sujeto y tokens de
  todas sus familias, incluyendo sucesores concurrentes confirmados antes del lock.
- Auditoría atribuida al administrador y sujeto, clasificación M09, mismo commit.
- PATCH correo máximo50 con paridad login; PUT rol/propiedades completo, espejo y
  versión; PATCH estado para SUSPENDED/DISABLED exclusivamente; no-op M04 válido
  solo después de autorización y comprobación expectedVersion.
- Seguridad HTTP explícita y métodos permitidos, DTO/problemas sanitizados,
  private,no-store, OpenAPI/Postman y pruebas unitarias/SQL/HTTP/concurrencia.

**Excluidos:** cualquier status=ACTIVE de entrada (400), preparación de credenciales,
metadata/migración M08, creación, invitación/reset/entrega, administración pública de
sesiones, consulta audit, BFF/React/mutaciones simuladas, hard delete, roles nuevos,
permisos nuevos y cambios de Guest. Lectura conserva DTO/semántica actuales.

Corrección mínima del camino auth afectado: distinguir resultado interno de refresh
rechazado de su traducción HTTP401 para confirmar revocación/evento conocidos antes
de devolver el rechazo. No lanzar la excepción que revierte la misma transacción
antes de confirmar esos efectos. No usar REQUIRES_NEW para auditoría del comando
administrativo. Token desconocido no permite inferir sujeto/familia ni atribuir un
actor; no inventarlos ni registrar secretos. Si falla persistencia de revocación,
no emitir ningún token; responder fallo sanitizado conforme contrato de seguridad
aplicable. Login/refresh exitosos mantienen formatos/TTL/cookies vigentes.

Esa reparación y sus pruebas se limitan a rutas tocadas para garantizar el protocolo.
No declarar resueltos todos los fallos de login, emisores o consulta C6-D06 por ese
hecho; documentar cobertura concreta y resto pendiente bajo BE-006C.

### 15.3 Gate obligatorio antes de publicar cualquier comando sensible

Pruebas PostgreSQL con conexiones independientes y barreras deterministas, no
solo mocks ni sleeps, todas pendientes de ejecutar al implementar:

1. Login con correo/credencial ya leídos compite con comando: revalidar tras lock.
   Si login confirma antes, su sesión/refresh quedan revocados por comando; si
   cambio de correo/estado confirma antes, no emitir usando datos viejos.
2. Refresh vs SUSPENDED y DISABLED en ambos órdenes: ningún token de sesión previa
   utilizable tras commit. El sucesor emitido antes también se revoca. Cambios de
   correo/membership también revocan; nuevo login posterior permitido solo si C1/C2
   lo permiten (no se prohíbe login para siempre por modificar una cuenta ACTIVE).
3. Varias sesiones y familias del objetivo, tokens vigentes/rotados/expirados y
   doble refresh: ningún descendiente activo omitido.401 por rechazo afectado debe
   conservar revocación/evento si esa es la salida del protocolo.
4. Revocación del actor/cambio de membership mientras espera: revalidar permiso,
   estado, sesión, O y A después de locks; no autorizar con snapshot previo.
5. Orden común StaffUser(UUID ordenado)→membership→properties→sesiones→refresh;
   comandos cruzados entre administradores, logout y productores de properties.
   Auditar todos los productores reales implicados antes de prometer garantía;
   timeout/deadlock revierte, no genera éxito ni retry automático.
6. expectedVersion obsoleto409 incluso si coincide payload; cambio solo de tabla
   hija incrementa versión una vez; no-op válido no altera versión/updatedAt,
   sesiones, refresh ni eventos de cambio.
7. Fallos tras usuario/membership/properties/version/revocación y durante INSERT
   auditoría/flush: rollback de todo, comprobado desde otra conexión. Evento de
   éxito no queda huérfano y no hay commit anticipado del comando.
8. Guest separado: ninguna sesión, familia, cuenta, credencial o evento Guest
   modificado, aunque coincida el correo. DTO/logs/respuestas sin secretos.

Sin este gate PASS no se habilita PATCH/PUT administrativo para consumidores,
aunque los tests unitarios o expectedVersion hayan pasado. No introducir un flag
nuevo para justificar una publicación incompleta: terminar la base y las pruebas
antes de publicar los mappings de comando como disponibles.

## 16. Aprobación y secuencia de entrega propuestas

| Parte | Lista para qué / decisión pendiente |
| --- | --- |
| M01–M07, M09, M10 precisadas | Listas para aprobación final del contrato de3B-1, no aprobadas. M02 sin ASCII extra y M10 sin cuarta columna; acuseM03/no-opM04/protecciónM05–M07 conservados. |
| M08 | Diseño recomendado técnicamente definido para revisión/aprobación de principio y futuro esquema; productor, consumo y canal Staff aún requieren contratos/implementación. No habilita3B-2. |
| M11 | Matriz y subincremento delimitados para aprobación expresa; no exención global de dependencias ni READY automático. |
| Backend3B-1 | Puede autorizarse separadamente del productor de evidencia; antes de PUBLICACIÓN exige gate15.3 y regresiones/HTTP/OpenAPI PASS. Hoy no autorizado para implementar. |
| Backend3B-2 | Bloqueado por productor confiable, esquema de flujo/metadata e integración de entrega C4-D05. No incluir ACTIVE en3B-1 para aparentar cobertura. |

Orden recomendado tras aprobación: (1)3B-1a protocolo/CAS/revocación/auditoría y
pruebas concurrentes y coordinación del bootstrap demo; (2)3B-1b correo/membership/suspensión/baja y OpenAPI/QA HTTP;
(3)verify y QA manual Backend3B-1, estado EN_QA hasta confirmación;
(4)BFF3C solo para operaciones Backend reales aprobadas;
(5)UI3D/3E: tres columnas, un grupo inline por vez, menú contextual dentro de celdas,
expansión por zonas no interactivas conservada, swipe→selección→confirmación y
alternativa accesible sin columna Acciones ni página de edición;
(6)3B-2 cuando se apruebe e implemente productor Staff confiable, con invalidación
en los comandos3B-1 y contrato de elegibilidad de lectura si hace falta.

No hay atomicidad entre PATCH correo y PUT membership: guardados separados,
expectedVersion vigente, borrador/409, cancelación y resultados inciertos según
secciones6/9. No resetear sesiones ni actualizar UI optimistamente ante no-op/error.
La aprobación futura del subconjunto no declara COMPLETADAS2A/2B, BE-006B/C,
BE-014A, C6-D06 ni entrega de credenciales. No commit/push/merge autorizado.

## 17. Validación de esta revisión M08/M11 — ejecutada, solo documental

- `git status --short --branch`: feature/staff-admin-read con trabajo previo
  conservado. Sin creación de rama, commit, push ni merge.
- Inspección estática de modelos, login/refresh/logout, bootstrap Staff/demo,
  auditoría/repositorios, validador Java y regla Web de correo; fuentes C1/C2/C4/C6,
  guías51/52/64/65, contrato21 y estados AlanPlan/AlanHandoff contrastados.
- Script Python: **19 enlaces locales válidos,4 ejemplos JSON válidos**, once IDs
  M01–M11 y25 filas T01–T25 presentes; retiradas las restricciones ASCII añadidas.
- Hashes SHA-256 de **66 archivos previos**: solo cambiaron este53, AlanPlan y
  AlanHandoff. Java/BFF/React/SQL, contratos previos y QA52/64/65 intactos.
- `git diff --check`: PASS. No Maven/npm/build/HTTP/navegador ejecutados; no código
  funcional cambiado. Paridad de validadores, concurrencia, gates de publicación
  y prueba de reinicio demo son requisitos futuros, **NO ejecutados/NO PASS** aquí.
- Todos los estados de aprobación/QA independientes se conservan. Documento
  PENDIENTE DE APROBACIÓN FINAL; nueve recomendaciones favorables no son autorización.
