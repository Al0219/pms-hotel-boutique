# Backend3B-1 — Mutaciones administrativas Staff y QA

Fecha: 2026-10-22. Rama: `feature/staff-admin-read`.
**Estado: COMPLETADA; QA manual PASS del usuario para el alcance verificado (2026-10-22).**
Autorización expresa del subincremento descrito en
[53, secciones14–17](53_STAFF_ADMIN_MUTATIONS_CONTRACT_PROPOSAL.md).
No marca todo53 APPROVED ni completa BE-006B/C, BE-014A o C6-D06.
Backend2A/BFF2B conservan EN_QA independiente; Web2C COMPLETADA con salvedades.
Sin BFF de escritura, React, creación, reactivación, invitación/reset o credenciales.

## Cierre autorizado — QA manual confirmada por el usuario

El usuario confirmó ejecución satisfactoria en PostgreSQL aislado y autorizó
expresamente **EN_QA → COMPLETADA** para Backend3B-1. Evidencia manual declarada
por el usuario, separada de las pruebas automatizadas anteriores:

| Comprobación manual confirmada | Resultado |
| --- | --- |
| Login Staff | PASS |
| Cuenta RECEPCION rechazada con403 en catálogo administrativo | PASS |
| SUPER_ADMIN autorizado | PASS |
| Modificación de correo exitosa y persistida | PASS |
| No-op200 con changed=false | PASS |
| Conflicto de versión409 | PASS |
| Cambio de rol y propiedades | PASS |
| Suspensión SUSPENDED | PASS |
| Retiro de propiedades | PASS |
| Baja lógica DISABLED | PASS |
| Cambios posteriores a DISABLED rechazados con409 | PASS |
| Reinicio del Backend sin pérdida ni restauración de datos | PASS |
| Inspección SQL: membership ACTIVE, asignación retirada INACTIVE; auditoría ORGANIZATION con actor, sujeto, organización y correlación correctos | PASS |

**Evidencia automatizada conservada:**915 pruebas Backend PASS y30 aserciones
HTTP/SQL PASS del agente, además de los114 focalizados e inventario OpenAPI
registrados abajo. No se vuelven a ejecutar ni se atribuyen esas corridas al usuario
por este cierre documental. No se le atribuyen pruebas manuales de concurrencia,
rollback, revocación de tokens o aislamiento entre organizaciones. CI remoto
permanece **NO ACREDITADO**. Ningún escenario adicional del procedimiento de
referencia se considera manualmente ejecutado si no está en esta confirmación.

Cierre limitado a3B-1:3B-2/reactivación sigue **BLOQUEADA por M08**; no completa
BE-006B/C ni BE-014A. Backend2A/BFF2B conservan sus estados QA independientes.
No implementa3C ni modifica código, migraciones, BFF o frontend; sin commit/push/merge.
El historial de entrega EN_QA y el procedimiento se conservan como referencia.

## Entrega real

| Endpoint | Body estricto | Resultado |
| --- | --- | --- |
| PATCH /api/v1/staff-admin/users/{id} | workEmail, expectedVersion | Correo con mismas reglas Backend de login, máximo50; lectura320 intacta. |
| PUT /api/v1/staff-admin/users/{id}/membership | roleCode, propertyIds, expectedVersion | Rol asignable y conjunto completo; filas retiradas INACTIVE, membership.status intacto y espejo sincronizado. |
| PATCH /api/v1/staff-admin/users/{id}/status | status, expectedVersion | Solo SUSPENDED/DISABLED; ACTIVE rechazado400 incluso si coincidiría con estado actual. |

Query obligatoria como GET: scope=PROPERTY&propertyId=UUID o scope=ALL_PROPERTIES.
Organización desde sesión; no parámetros extra, duplicados ni campos desconocidos.
JSON <=64KiB, sin claves duplicadas/trailing JSON, application/json; UUID estricto,
expectedVersion entero seguro. Sin coerción de strings/decimales ni claim readiness.
Respuesta200: `{organizationId,staffUserId,version,changed}`; nunca StaffView.
Cache-Control private,no-store en éxito/error. Errores400/401/403/404/409/413/415/503
sanitizados;405 con Allow por recurso. GET/HEAD existentes conservados; OPTIONS
administrativo rechazado405. Ningún secreto retornado por estos comandos.

Reglas: STAFF_MANAGE efectivo; visibilidad completa scoped SQL antes de locks y
revalidada después. GERENCIA no descubre SA/objetivos parcialmente ajenos;404
indistinguible de ausente. Props propuestas activas, O y A completos;403 uniforme
si no autorizadas. Sin autoedición. Todos los SA protegidos en membership/estado;
contacto de otro SA solo por SA. DISABLED sin edición de contacto/membership.
Q vacío solo SUSPENDED+SA+ALL. No cambiar organización, memberships extra ni Guest.

## Transacción y autenticación

StaffSecurityLocks usa orden común de UUID de usuarios → memberships → properties
→ sesiones → refresh. Lock de padre impide carreras de INSERT de hijos entre
productores que siguen el protocolo. Lock timeout local5s. READ_COMMITTED en comandos;
GET mantiene su snapshot existente. Revalidación de sesión/usuario/permiso/scope
tras locks; recarga JPA explícita para no usar entidad leída antes de esperar.

CAS sobre staff_users.version y updated_at se ejecuta una vez por cambio, incluso
si solo cambian properties. No combinar incremento SQL con dirty update JPA del
objetivo. No-op se comprueba tras autorización/versión, compara correo normalizado,
conjuntos sin orden y roles; no cambia timestamps/sesiones/tokens/eventos. Versión
obsoleta siempre409. Un espejo legado divergente sí requiere reparación real.

Revocación SQL de todas las sesiones Staff y tokens de todas sus familias del
objetivo, eventos y cambio en la misma transacción. Fallo de CAS/revocación/INSERT
obligatorio/flush revierte todo. Acuse se entrega después del interceptor de commit.
Actor/sujeto separados; eventos ORGANIZATION con organización/correlación y código
seguro, sin snapshot ni correo/password/hash/token. Trigger append-only existente.

Login vuelve a validar correo/credencial/estado tras el lock; refresh bloquea y
recarga usuario/sesión/token antes de rotar. Logout comparte orden. Un refresh
conocido rechazado confirma la revocación necesaria antes del401; solicitudes a
familias ya revocadas no inventan nuevos hechos de revocación. Rollback sigue
obligatorio para fallos de persistencia/auditoría. Ese subconjunto de C6-D06 está
cubierto; login fallido legado aún revierte su evento y no se declara C6-D06 global
resuelto. No cambia TTL, cookies, formato JWT, login universal ni Guest.

Límites: no cancelar solicitudes de otros dominios ya autorizadas; no retry de
escrituras ni suponer rollback por timeout/desconexión. Cambiar correo/membership
revoca sesiones existentes, pero cuenta ACTIVE elegible puede iniciar una sesión
nueva con sus credenciales vigentes. Suspender/baja impiden ese login. Un hash no
acredita preparación para reactivar; no se añade metadata/migración de M08.

## Bootstrap demo y persistencia

DemoDataBootstrap conserva dataset de properties/rooms y Guest. INSERT Staff
idempotente seguido de FOR UPDATE del padre: solo el creador inicial agrega
membership/asignaciones. Un Staff existente conserva correo/rol/estado/propiedades,
versión y credencial; ya no debe coincidir en campos editables con la muestra.
Identidad UUID/username esperados sigue comprobada. Reinicio no repone asignaciones
inactivadas ni intenta reparar una membership ausente de una cuenta existente.
Recuperación de datos inconsistentes sigue operativa, no seed paralelo ni hard delete.

No migraciones nuevas: columna version, índice único normalizado, membership única,
FK compuesta org/property y auditoría append-only/atribución ya están instaladas.
Las pruebas de esquema vacío/upgrade/checksums/reaplicación permanecen en verify.

## Archivos del incremento

- Nuevos: api/StaffAdminMutationController y StaffAdminMutationExceptionHandler;
  application/StaffAdminMutationModels, MutationParser, MutationException,
  MutationService; persistence/StaffAdminMutationRepository y StaffSecurityLocks.
- Modificados: StaffAuthServiceImpl, AuthSession/RefreshToken (consulta interna de
  revocación), AuthAuditEvent (factoría organizativa), DemoDataBootstrap,
  StaffAdminMethodExceptionResolver y StaffAdminSecurityConfiguration.
- GET: solo documentación Allow del detalle/tag; DTO/query/repository/service de
  lectura conservados. Pruebas GET existentes ejecutadas como regresión.
- Tests: nuevos StaffAdminMutationParserTests/StaffAdminMutationHttpIntegrationTests;
  ampliados OpenApiContractIntegrationTests, DemoDataBootstrapIntegrationTests y
  StaffAuthAuditEmitterIntegrationTests (persistencia nueva de refresh rechazado).
- Contrato53, esta54, baseline39, Postman canónico, AlanPlan y AlanHandoff.
  Sin cambios frontend/BFF ni dependencias nuevas/migraciones históricas.

## Comandos automatizados y evidencia

Entorno descartable PostgreSQL17/Java21, sin puertos de DB host ni secretos de
producción. Desde backend/:

```bash
docker compose -p pms_staff_mutations_qa -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_staff_mutations_qa -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress \
  -Dtest=StaffAdminMutationParserTests,StaffAdminMutationHttpIntegrationTests,StaffAdminReadHttpIntegrationTests,OpenApiContractIntegrationTests,ExplicitAuthEndpointsIntegrationTests,UnifiedLoginIntegrationTests,StaffAuthAuditEmitterIntegrationTests,DemoDataBootstrapIntegrationTests test
docker compose -p pms_staff_mutations_qa -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
git diff --check
```

Evidencia final y resultados de runtime se registran abajo al terminar. Los fallos
intermedios no se presentan como PASS: anotaciones OpenAPI en ubicación no admitida,
fixture Guest incompleta y correos de pruebas no aislados; regresión de refresh de
sesión creada sin flush en transacción compartida y duplicación de evento de una
sesión ya revocada. Se corrigieron sin cambiar los contratos de entrada/salida de
auth ni ocultar fallos. Las primeras corridas fallidas están en logs temporales.

## Resultados finales ejecutados — 2026-10-22

| Validación | Resultado real |
| --- | --- |
| Focalizados + regresiones auth/demo/OpenAPI (8 clases indicadas arriba) |114 PASS, cero failures/errors/skipped. |
| Verify final completo | **BUILD SUCCESS,915 PASS**, cero failures/errors/skipped;108 clases de tests. PostgreSQL17.11/Java21, Liquibase y paquete JAR. |
| Paridad OpenAPI/mappings |52 operaciones,40 paths,68 schemas,15 tags; sin exclusiones nuevas. Acuse y DTO estrictos propios; estado de entrada sin ACTIVE. |
| JAR real + demo sobre misma DB, detener y crear nuevo proceso | **30 aserciones HTTP/SQL PASS** (23 antes,7 después). Login Staff, cuatro comandos, versiones, no-store, GET, Guest intacto; tras reinicio detalle idéntico, fila histórica INACTIVE, reactivación400 y contacto DISABLED409. |
| Migraciones y aislamiento de cambios | Sin changesets nuevos ni históricos editados;44 archivos frontend/BFF previamente pendientes conservados por SHA-256. |
| Postman y revisión de árbol | JSON canónico válido; se agrega carpeta de comandos sin scripts de retry/versionado automático. git diff --check PASS. |

Concurrencia real: barreras alrededor de operaciones de lock auténticas y observación
de espera en pg_stat_activity, conexiones independientes. Matriz de ocho combinaciones
login/refresh × antes/después del lock × SUSPENDED/DISABLED; además correo concurrente
con login, doble refresh, logout, comandos simultáneos con misma versión, dos correos
iguales, administradores cruzados y pérdida de permiso del actor antes del lock.
Rollback de revocación y fallo real de INSERT auditoría (trigger exclusivamente QA),
no-op, versión de asignación y Guest con mismo correo también ejecutados.

Prueba de reinicio: admin SA sintético, objetivo real `pms_demo_reception` del
bootstrap; se suspendió, cambió a AUDITOR, retiró su conjunto de properties, modificó
correo y dio de baja mediante HTTP. Se detuvo y arrancó otro proceso del JAR sobre
el mismo PostgreSQL; no se alteraron datos a mano para hacer pasar esa comprobación.
La lectura autorizada final permaneció idéntica, incluido version/timestamps. Se
comparó un digest de filas Guest, no se imprimieron hashes de credencial ni tokens.

Evidencia efímera local: `/tmp/pms-staff-mutations-qa/`: focused-final.log,
verify-final.log, runtime-before.json, runtime-after.json, initial.json y validación
de preservación. OpenAPI generado/inventario y XML Surefire en backend/target/.
Las credenciales sintéticas no se presentan como credenciales reales del proyecto.
**Todo lo anterior es QA automatizada del agente**, no QA manual PASS del usuario
ni CI remoto. Esta fue la entrega inicial EN_QA; el cierre manual posterior está
registrado al inicio. Servicios QA propios retirados al final.

## Procedimiento de QA manual (referencia; cierre confirmado arriba)

Usar una base nueva/descartable con proyecto Docker propio. No usar producción ni
la base habitual. El JAR debe corresponder al verify final. Desde backend/:

```bash
docker compose -p pms_staff_mutations_manual -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_staff_mutations_manual -f compose.bd2-test.yaml run --rm -d \
  --name pms_staff_mutations_manual_app -p 127.0.0.1:18092:8080 \
  -e PMS_BOOTSTRAP_ADMIN_USERNAME=qa_mutations_admin \
  -e PMS_BOOTSTRAP_ADMIN_EMAIL=qa.mutations.admin@example.test \
  -e PMS_BOOTSTRAP_ADMIN_PASSWORD=QA-only-mutations-password1! \
  verify java -jar target/pms-hotel-backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=demo --pms.demo.data.enabled=true
```

Esperar GET http://127.0.0.1:18092/actuator/health →200/UP. Revisar Swagger
http://127.0.0.1:18092/swagger-ui/index.html: tres comandos, JSON permitido,
expectedVersion, scope y sin ACTIVE en enum de entrada de estado; GET sí muestra
los tres estados. No pegar tokens/cookies/hash en evidencias compartidas.

Importar `postman/BD1-Backend-APIs.postman_collection.json`. Configurar baseUrl
http://127.0.0.1:18092. Usar login Staff existente (no Guest):

- Primero cuenta demo `staff.demo@example.test` / `PmsDemoLocal2026!`: comandos
  deben dar403 por falta STAFF_MANAGE, sin modificar datos. Luego iniciar sesión
  SA QA `qa.mutations.admin@example.test` / `QA-only-mutations-password1!`.
- GET usuarios ALL_PROPERTIES, username literal pms_demo_reception. Copiar id
  objetivo a staffAdminUserId y su version a staffAdminExpectedVersion. El objetivo
  debe ser otro usuario; nunca elegir al SA actor. Copiar propertyId si se usa PUT
  de una propiedad. La versión se copia explícitamente desde GET/acuse, no se
  reintenta ni se obtiene una versión nueva automáticamente tras409.

| Paso manual | Petición/evidencia | PASS / FAIL |
| --- | --- | --- |
| Seguridad | Sin Bearer401; Bearer demo sin permiso403; SA autorizado. Probar IDs ausente y ajeno con fixtures controladas si disponibles | PASS solo si no cambia target ni revela datos fuera de scope; no atribuir prueba de otra org si no hay fixture manual. |
| Correo | PATCH carpeta3B-1, workEmail único<=50; observar acuse, GET y no-store |200, changed=true, version+1, correo normalizado; sin username editable/StaffView/secretos. |
| No-op/conflicto | Repetir valor con versión vigente; después usar versión anterior | No-op200 misma versión/changed=false; obsoleta409. Ningún éxito ficticio. |
| Campos inválidos | Agregar username, organizationId, campo extra; correo51; status ACTIVE |400 y datos intactos; no aceptar reactivación ni scope aportado como autoridad. |
| Membership | PUT roleCode=AUDITOR, propertyIds conjunto completo permitido |200, rol/espejo iguales, membership.status no cambia; comprobar GET. |
| Suspensión | PATCH SUSPENDED con versión vigente |200; sesión/refresh anteriores dejan de funcionar. Aún NO hay reactivación: no usar como prueba reversible sin aceptar esta limitación. |
| Retirar asignación | Con SUSPENDED y SA+ALL, editar body PUT a propertyIds=[] |200; sigue visible SA+ALL, asignación anterior queda INACTIVE. No inventar COUNT global ni cambiar scope del GET. |
| Baja | PATCH DISABLED con versión vigente |200; ACTIVE400, SUSPENDED409 y contacto/membership409 posteriores. No hay eliminación física. |
| Reinicio | Guardar detalle final y ejecutar stop/arranque siguiente | GET final idéntico y ninguna asignación activa repuesta. Guest demo sin cambios administrativos. |

Para reiniciar, detener **solo** el proceso QA propio y repetir el comando `run`
anterior con los mismos argumentos sobre el mismo proyecto PostgreSQL:

```bash
docker stop pms_staff_mutations_manual_app
# Repetir docker compose ... run ... del bloque anterior (sin down -v).
```

Inspección SQL de evidencia sintética tras reinicio, sin hashes/tokens:

```bash
docker compose -p pms_staff_mutations_manual -f compose.bd2-test.yaml exec -T postgres \
  psql -U pms_test -d pms_bd2_test -v ON_ERROR_STOP=1 <<'SQL'
SELECT username,work_email,role_code,status,version
FROM staff_users WHERE username='pms_demo_reception';
SELECT m.role_code,m.status AS membership_status,mp.status AS assignment_status
FROM organization_memberships m JOIN staff_users u ON u.id=m.staff_user_id
LEFT JOIN membership_properties mp ON mp.staff_user_id=m.staff_user_id
 AND mp.organization_id=m.organization_id WHERE u.username='pms_demo_reception';
SELECT e.event_type,a.username AS actor,u.username AS subject,e.scope_kind,
       e.organization_id IS NOT NULL AS has_org,e.correlation_id IS NOT NULL AS has_correlation
FROM auth_audit_events e JOIN staff_users u ON u.id=e.staff_user_id
LEFT JOIN staff_users a ON a.id=e.actor_id
WHERE u.username='pms_demo_reception' AND e.scope_kind='ORGANIZATION'
ORDER BY e.occurred_at,e.id;
SQL
```

Esperado: correo/rol/estado/versión finales persistentes, membership ACTIVE y fila
retirada INACTIVE; actor SA QA, sujeto demo, ORGANIZATION, org/correlación presentes.
Las pruebas automatizadas acreditan rollback/concurrencia; esta inspección no debe
reportarse como prueba manual de fallos inyectados ni de todas las carreras.

Al terminar y conservar evidencia sanitizada:

```bash
docker stop pms_staff_mutations_manual_app
docker compose -p pms_staff_mutations_manual -f compose.bd2-test.yaml down -v
```

Ese down elimina solo el proyecto QA indicado, no datos del proyecto habitual.
La confirmación manual explícita para cerrar3B-1 ya fue recibida y se registra
al inicio. No cierra por arrastre Backend2A/BFF2B, BE-006B/C o BE-014A.

## Pendientes y siguiente incremento

- QA manual de3B-1 confirmada por el usuario exclusivamente para la lista del
  cierre. CI remoto NO ACREDITADO; pruebas automáticas y manuales diferenciadas.
- 3B-2/reactivación bloqueada por evidencia/productor Staff de M08. Ninguna cuenta
  ACTIVE suspendida por migración ni preparación inferida desde hash.
- BFF de mutaciones todavía405; implementar después de autorización usando estas
  respuestas mínimas, cookies Staff, Origin/CSRF existente, no-store, sin retry de
  escrituras inciertas y extensión MSW acotada a métodos/rutas reales.
- Luego UI inline por grupo y baja con confirmación, tres columnas/expansión
  preservadas. No incluir esas funciones como entregadas en este incremento.
- SQL operativo manual que ignore locks/protocolo no está cubierto por garantía
  de concurrencia; modificaciones excepcionales requieren procedimiento controlado.

## Inventario exacto de esta entrega

Creados:

- `docs/54_STAFF_ADMIN_MUTATIONS_QA.md`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/api/StaffAdminMutationController.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/api/StaffAdminMutationExceptionHandler.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/application/StaffAdminMutationException.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/application/StaffAdminMutationModels.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/application/StaffAdminMutationParser.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/application/StaffAdminMutationService.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/infrastructure/persistence/StaffAdminMutationRepository.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/infrastructure/persistence/StaffSecurityLocks.java`
- `src/test/java/com/pms/hotelboutique/backend/modules/securityauth/StaffAdminMutationHttpIntegrationTests.java`
- `src/test/java/com/pms/hotelboutique/backend/modules/securityauth/application/StaffAdminMutationParserTests.java`

Modificados:

- `docs/53_STAFF_ADMIN_MUTATIONS_CONTRACT_PROPOSAL.md`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/api/StaffAdminMethodExceptionResolver.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/api/StaffAdminReadController.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/infrastructure/security/StaffAdminSecurityConfiguration.java`
- `docs/39_BACKEND_OPENAPI_BASELINE.md`
- `docs/AlanHandoff.md`
- `docs/AlanPlan.md`
- `postman/BD1-Backend-APIs.postman_collection.json`
- `src/main/java/com/pms/hotelboutique/backend/modules/inventory/infrastructure/demo/DemoDataBootstrap.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/application/StaffAuthServiceImpl.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/domain/AuthAuditEvent.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/domain/AuthSession.java`
- `src/main/java/com/pms/hotelboutique/backend/modules/securityauth/domain/RefreshToken.java`
- `src/test/java/com/pms/hotelboutique/backend/infrastructure/openapi/OpenApiContractIntegrationTests.java`
- `src/test/java/com/pms/hotelboutique/backend/modules/inventory/infrastructure/demo/DemoDataBootstrapIntegrationTests.java`
- `src/test/java/com/pms/hotelboutique/backend/modules/securityauth/infrastructure/security/StaffAuthAuditEmitterIntegrationTests.java`
