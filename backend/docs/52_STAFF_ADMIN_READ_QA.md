# Fase 2A — Backend de lectura administrativa Staff: entrega y QA

Fecha: 2026-10-22. Rama `feature/staff-admin-read`, base `a0f62d0`.
**Estado: EN_QA; confirmación manual del usuario pendiente.**
Autorización explícita: implementar exclusivamente tres GET Backend del
[contrato 51](51_STAFF_ADMIN_READ_CONTRACT_PROPOSAL.md), conservando restricciones
C1/C2/C4/C6. Sin declarar aprobado globalmente el contrato BFF/frontend.
Cambios documentales de Fase 1 conservados. Sin commit, push ni merge.

## Entrega y control de cambios

| GET interno | Resultado |
| --- | --- |
| /api/v1/staff-admin/roles | OrganizationId del actor y cinco roles ACTIVE fijos en orden V1. |
| /api/v1/staff-admin/users | Página SQL scoped; filtros status/roleCode/username literal; limit 1..100, default 50. |
| /api/v1/staff-admin/users/{id} | Detalle con el mismo predicado; objetivo ajeno/inaccesible/inexistente indistinguible: 404. |

Reutiliza StaffJwtService, StaffAuthService, StaffAuthorizationService y
PropertyScopeResolver. Nueva cadena exclusiva Staff en /api/v1/staff-admin/**;
la adaptación de errores del filtro conserva el comportamiento predeterminado C1.
Las tres lecturas requieren STAFF_MANAGE; organización nunca viene del cliente.

PROPERTY exige pertenencia seleccionada y visibilidad de la asignación completa
frente al portfolio del actor. GERENCIA excluye SUPER_ADMIN, asignaciones
parcialmente ajenas y conjuntos vacíos. SUPER_ADMIN ALL puede leer objetivos
sin properties activas de su organización. Membership INACTIVE y usuarios
SUSPENDED/DISABLED conservan sus asignaciones para el predicado administrativo;
no se presentan como acceso efectivo. Huérfanos sin membership no se atribuyen
a ninguna organización por inferencia.

Precisión respecto de la propuesta: AuthorizedPropertyScope compartido prohíbe
vacíos. No se modifica: StaffAdminScope local representa exclusivamente el ALL
vacío administrativo autorizado. El resto reutiliza el resolver C2 existente.
La transacción REPEATABLE_READ cubre revalidación de sesión, autorización y SQL.
CTE MATERIALIZED limita usuarios antes de proyectar properties; no findAll/filter,
no N+1 ni entidades JPA serializadas. No nuevas migraciones/índices/dependencias.

Errores sanitizados: INVALID_REQUEST/INVALID_CURSOR 400, STAFF_SESSION_REQUIRED
401, STAFF_ACCESS_DENIED 403, STAFF_USER_NOT_FOUND 404 y STAFF_READ_UNAVAILABLE
503. Catálogo/proyección incoherente falla completo, sin éxito parcial. Éxitos y
errores incluyen Cache-Control private,no-store; sin credenciales ni datos de
sesiones objetivo. OpenAPI generado documenta parámetros, schemas, Bearer Staff,
audiencia internal-bff, respuestas y headers; no cookies atribuidas a Spring.
Métodos no soportados devuelven 405 sin body, Allow GET,HEAD y no-store. Un
resolver MVC limitado al namespace evita el dispatch /error que produciría 401;
no agrega mappings POST/PATCH/PUT/DELETE ni altera los de otros módulos.

## Cursor y límites operativos

- Orden fijo username COLLATE C ASC,id ASC, keyset exclusivo, limit+1 y nextCursor
  nullable. Sin offset, totalCount, sort configurable ni snapshot entre páginas.
- HMAC-SHA256 con clave aleatoria independiente de 32 bytes por proceso; TTL 15
  minutos. Comparación constante y encoding canónico; formato versionado.
- Vinculado a sesión, usuario actor, organización, rol/permisos vigentes,
  conjunto de properties autorizado, selección resuelta, filtros y limit.
  Cambio de autorización se comprueba antes de aceptar el cursor.
- Base64url codifica última tupla username/id y hash de contexto: **firma no es
  cifrado**. El cursor no es una credencial ni concede acceso; no contiene correo,
  JWT, refresh ni password/hash. No debe tratarse como contenedor de secretos.
- Reinicio, nueva instancia o despliegue invalida cursores; devolver 400
  INVALID_CURSOR y reiniciar listado. Topología soportada: una instancia. No hay
  clave compartida para réplicas, almacenamiento durable ni cambio de secretos.
- Cambios confirmados después del snapshot de una petición se ven en la siguiente;
  no se promete cancelar respuestas ya iniciadas ni estabilidad entre páginas
  ante cambios concurrentes de datos. No registrar cursores/query strings en logs
  de aplicación. No se implementa configuración externa de proxies en esta entrega.

## Archivos del incremento

Rutas relativas a backend/. Los documentos 51, AlanPlan y AlanHandoff ya tenían
cambios locales de Fase 1: se conservaron y ampliaron, sin descartarlos.

| Área | Archivos creados o modificados |
| --- | --- |
| API, bajo src/main/java/com/pms/hotelboutique/backend/modules/securityauth/api/ | StaffAdminReadController.java; StaffAdminReadExceptionHandler.java; StaffAdminMethodExceptionResolver.java. |
| Aplicación, bajo el mismo módulo application/ | StaffAdminReadService.java; StaffAdminReadModels.java; StaffAdminReadQuery.java; StaffAdminReadException.java; StaffAdminCursorCodec.java. |
| Persistencia/security, bajo el mismo módulo infrastructure/ | persistence/StaffAdminReadRepository.java; security/StaffAdminSecurityConfiguration.java; security/StaffJwtAuthenticationFilter.java (hook con comportamiento C1 predeterminado intacto). |
| Tests, bajo src/test/java/com/pms/hotelboutique/backend/ | modules/securityauth/StaffAdminReadHttpIntegrationTests.java; modules/securityauth/application/StaffAdminReadQueryTests.java y StaffAdminCursorCodecTests.java; infrastructure/openapi/OpenApiContractIntegrationTests.java. |
| Contrato/QA/seguimiento | docs/39_BACKEND_OPENAPI_BASELINE.md; docs/51_STAFF_ADMIN_READ_CONTRACT_PROPOSAL.md; docs/52_STAFF_ADMIN_READ_QA.md; docs/AlanPlan.md; docs/AlanHandoff.md. |
| Cliente manual | postman/BD1-Backend-APIs.postman_collection.json: tres GET y variable staffAdminUserId vacía; requests/variables anteriores intactos. |

No se modifican archivos frontend, migraciones históricas ni secretos.

## Pruebas ejecutadas

Entorno aislado Docker Compose `pms-staff-admin-read-qa`, Java 21 / PostgreSQL 17.
Fixtures creadas por tests únicamente en esa BD desechable: organizaciones y
properties únicas por caso, sesiones C1 persistidas y JWT emitido por servicio
existente. No cuentas de aplicación ni credenciales reales. Un spy de repositorio
solo sincroniza la prueba concurrente; no sustituye autenticación/autorización/SQL.

Comandos desde raíz:

```bash
docker compose -p pms-staff-admin-read-qa -f backend/compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress -Dtest=StaffAdminReadHttpIntegrationTests,StaffAdminReadQueryTests,StaffAdminCursorCodecTests,OpenApiContractIntegrationTests test
docker compose -p pms-staff-admin-read-qa -f backend/compose.bd2-test.yaml run --rm verify
git diff --check
```

| Validación | Resultado |
| --- | --- |
| Compilación Java 21 Docker | BUILD SUCCESS. |
| Focalizados finales: HTTP + query + cursor + OpenAPI | 31 PASS; cero fallos/errores/skipped. |
| Verify completo final | BUILD SUCCESS; 864 PASS, cero fallos/errores/skipped; Java 21/PostgreSQL 17. Incluye la corrección 405 y su aserción OpenAPI. |
| QA manual del usuario | PENDIENTE; no sustituida por pruebas automatizadas. |
| Postman | Tres requests/tests preparados en colección BD1; no ejecución Newman independiente. |
| BFF/React/QA visual | No implementados ni ejecutados en Fase 2A. |

La primera ejecución focalizada detectó una aserción global OpenAPI que prohibía
username/roleCode en query: ahora exceptúa solo esos filtros de GET users Staff
Admin; mantiene prohibidos parámetros que pretendan representar al principal.
Corrección verificada por la ejecución focalizada final PASS.
La comprobación adicional de métodos no soportados detectó 405→/error→401 en
Servlet real. Se corrigió con StaffAdminMethodExceptionResolver scoped; la
ejecución focalizada final incluye POST/PATCH/PUT/DELETE rechazados sin escrituras.

### Cobertura nueva

- SUPER_ADMIN/GERENCIA: catálogo, PROPERTY/ALL, lectura propia, assignments
  completos, properties del mismo portfolio devueltas completas y 404 por selección.
- RECEPCION/OPERACIONES/AUDITOR sin STAFF_MANAGE: los tres GET 403; permiso
  comprobado antes de interpretar filtros inválidos.
- 401 reales por ausencia, token malformado/Guest/expirado, sesión inexistente,
  revocada/caducada, usuario suspendido, membership inactiva o GERENCIA sin acceso.
- Organizaciones separadas; mismo 404 para parcial, ajeno, huérfano e inexistente.
- Membership objetivo INACTIVE, espejo role_code divergente, SUSPENDED/DISABLED,
  properties/asignaciones INACTIVE y conjuntos vacíos, incluida O sin properties.
- Búsqueda case-insensitive con %, _, ! y backslash literales; filtros combinados,
  parámetros desconocidos/duplicados, UUID, scope y límites inválidos.
- Dataset adicional de 105 usuarios con dos properties: páginas 100+5 sin filas
  duplicadas; recorrido keyset ordenado y cursor incompatible con sesión/scope/
  filtros/limit/portfolio, alterado, expirado y de otra instancia.
- Cambio concurrente en segunda conexión entre autorización y consulta: primera
  respuesta coherente con snapshot anterior; petición siguiente 404 al quedar el
  objetivo parcialmente ajeno. SQL/proyección real, sin filtrar en memoria.
- Campos exactos de usuario/rol/error y ausencia de secretos; headers no-store;
  OpenAPI generado y paridad con mappings, sin exclusiones nuevas.
- Métodos no soportados 405 con contador Staff sin cambios, sin un controller
  administrativo de mutaciones. Esto no es implementación de CRUD.

Artefactos regenerables: target/openapi-generated.json,
target/openapi-application-mappings.txt, target/openapi-inventory-counts.txt y
target/surefire-reports/. Logs locales sanitizados /tmp/pms-staff-admin-*.log.
Paridad generada final: 49 operaciones, 38 paths, 63 schemas, 14 tags. Diff-check
PASS. Regresiones de Auth, Guest, scope, auditoría, inventario, reservas, finanzas
y operaciones incluidas en verify completo; CI remoto no ejecutado.

## QA manual reproducible pendiente

1. Ejecutar los focalizados anteriores en PostgreSQL desechable. Confirmar PASS
   de usuarios sin properties, asignaciones parciales, snapshot y cursor.
2. Revisar /v3/api-docs y Swagger contra los tres GET y el contrato 51. No usar
   rutas administrativas nuevas desde el navegador: aún no existe BFF.
3. Si se dispone de un entorno QA con cuentas Staff provisionadas por un flujo
   autorizado, usar la carpeta «Staff — administración de usuarios (solo lectura)»
   de `postman/BD1-Backend-APIs.postman_collection.json`. Configurar baseUrl interno,
   staffAccessToken local de sesión existente, propertyId y staffAdminUserId
   reales de esa organización; nunca exportar valores de tokens.
4. Con SUPER_ADMIN y GERENCIA comprobar catálogo/lista/detalle, 404 de target
   parcial/ajeno, 403 de property no autorizada; ALL de SUPER_ADMIN incluye
   usuario sin asignaciones y GERENCIA no. Guest y roles sin STAFF_MANAGE fallan.
5. Confirmar resultado al usuario para cerrar EN_QA; sin commit/push/merge
   autorizados por esta guía. El fixture automatizado usa hashes no utilizables
   para login: no convertirlo en mecanismo de provisionamiento de aplicación.

## Fase 2A-QA — revalidación HTTP solicitada, 2026-10-22

**Estado: EN_QA.** Esta ejecución nueva no es QA manual del usuario y no marca
el incremento COMPLETADA. Rama feature/staff-admin-read conservada. No se
modificó implementación, tests, contratos, migraciones ni colección Postman.
Se actualizaron únicamente esta guía y el seguimiento AlanPlan/AlanHandoff.

### Procedimiento y aislamiento comprobados

Se revisaron compose.bd2-test.yaml, compose.auth-manual-qa.yaml y Dockerfile.
Se eligió el procedimiento existente de tests: PostgreSQL 17 con tmpfs y base
pms_bd2_test, Java 21 y servidor Tomcat real en puerto aleatorio por
@SpringBootTest(RANDOM_PORT). No puertos publicados ni env_file/credenciales
de aplicación/producción. Las fixtures son las ya definidas en
StaffAdminReadHttpIntegrationTests, con org/foreignOrg, p1/p2/p3,
foreignProperty, a/b/c/empty/inactiveMembership y demás casos existentes;
no se sustituyeron UUIDs ni se inventaron parámetros.

El perfil auth-manual-qa está disponible pero no se arrancó: su bootstrap
SUPER_ADMIN no contiene por sí solo las fixtures GERENCIA/targets de esta matriz.
No se añadió un provisionamiento paralelo. El spy del repositorio en la prueba
de snapshot solo coordina dos conexiones; HTTP, identidad, permisos y SQL reales.

### Estado por escenario (automático, ejecución nueva)

| Escenario | Resultado HTTP/condición comprobada | Evidencia existente ejecutada |
| --- | --- | --- |
| SUPER_ADMIN, catálogo fijo | PASS: 200, cinco roles y organizationId del actor. | rolesAreFiveFixedAndResponsesNeverExposeSecrets |
| SUPER_ADMIN, usuarios y detalle | PASS: 200 para objetivos propios visibles; PROPERTY/ALL y datos administrativos del contrato. | rolesAreFiveFixedAndResponsesNeverExposeSecrets; propertyChecksCompleteAssignmentsAgainstActorPortfolioInSql |
| GERENCIA limitada | PASS: 200 para P={p1} y P={p1,p2}; devuelve asignación completa autorizada, sin recortarla a la propiedad seleccionada. | propertyChecksCompleteAssignmentsAgainstActorPortfolioInSql |
| Sin STAFF_MANAGE | PASS: RECEPCION/OPERACIONES/AUDITOR reciben 403 en los tres GET. | rejectsAllUnprivilegedRolesAndGuestExpiredRevokedAndInactiveSessions |
| Sin sesión/inválida/Guest | PASS: 401 sanitizado; también token expirado, sesión revocada/caducada, usuario suspendido o membership inactiva. | rejectsAllUnprivilegedRolesAndGuestExpiredRevokedAndInactiveSessions |
| Target ajeno/inaccesible | PASS: 404 con body idéntico al inexistente, sin IDs ni explicación que revele existencia. | foreignPartialUnassignedAndSuperAdminTargetsAreIndistinguishableFromMissing |
| Aislamiento de organización y asignación parcial | PASS: O2, P={p1,p3}, target SUPER_ADMIN y huérfanos no visibles a GERENCIA. | foreignPartialUnassignedAndSuperAdminTargetsAreIndistinguishableFromMissing |
| Sin propiedades activas | PASS: solo SUPER_ADMIN ALL de su O; PROPERTY no incluye target vacío; O sin properties también cubierta. | superAdminWithEmptyOrganizationCanReadExplicitAllWithoutChangingSharedScope; foreignPartialUnassignedAndSuperAdminTargetsAreIndistinguishableFromMissing |
| Estado/membership objetivo | PASS: SUSPENDED/DISABLED y membership INACTIVE visibles solo bajo el mismo predicado, rol desde membership. | propertyChecksCompleteAssignmentsAgainstActorPortfolioInSql; filtersAreLiteralAndDefaultIncludesEveryState |
| Búsqueda y filtros | PASS: username trim/case-insensitive y %, _, !, backslash literales; rol/estado combinados; inválidos/duplicados 400. | filtersAreLiteralAndDefaultIncludesEveryState; strictParametersRejectDuplicatesUnknownAndMissingScope; StaffAdminReadQueryTests |
| Paginación Backend | PASS: recorrido ordenado sin IDs duplicados; 105 usuarios se dividen en 100+5 y terminan con nextCursor=null. | keysetHasStableOrderNoDuplicateRowsAndContextBoundCursors; pagesAboveOneHundredAreLimitedOnServerAndInactiveAssignmentsAreNotReturned |
| Cursor seguro | PASS: alteración/contexto/session/scope/filtros/limit/portfolio incompatibles rechazados; TTL exacto 15min y clave de otra instancia cubiertos unitariamente. No se atribuye una espera HTTP real de 15min. | keysetHasStableOrderNoDuplicateRowsAndContextBoundCursors; StaffAdminCursorCodecTests |
| Coherencia concurrente | PASS: respuesta conserva snapshot completo previo; siguiente petición 404 después de asignación ajena confirmada. | authorizationAndProjectionUseOneSnapshotAcrossConcurrentAssignmentChange |
| Sin credenciales/hash/tokens de autenticación | PASS: campos exactos de rol/usuario/error y schemas allowlisted, sin metadatos de sesión objetivo. Cursor de paginación permitido, no es credencial. | rolesAreFiveFixedAndResponsesNeverExposeSecrets; staffAdminReadsDocumentExactTransportScopePaginationAndSafeDtos |
| Cache-Control | PASS: private,no-store en respuestas de éxito/error de la matriz y 405. | assertResponse común y unsupportedAdministrativeMethodsHaveNoSideEffectsAndReturn405 |
| Métodos no implementados | PASS: POST/PATCH/PUT/DELETE /users dan 405, contador Staff sin cambios; OpenAPI solo publica GET en los tres paths. | unsupportedAdministrativeMethodsHaveNoSideEffectsAndReturn405; paridad OpenAPI |
| OpenAPI | PASS: /v3/api-docs generado, paths/métodos, Bearer interno, filtros, límites, enums, schemas, errores y headers coherentes. | OpenApiContractIntegrationTests: 16 pruebas |

No se detectaron defectos nuevos en esta revalidación; no fue necesaria una
corrección funcional. Los fallos históricos de OpenAPI/405 descritos arriba
pertenecen a la implementación anterior y sus correcciones se conservan.

### Comandos y evidencias de esta ejecución

Desde la raíz, mismos comandos focalizado/verify de la sección «Pruebas
ejecutadas». Logs separados para no atribuir resultados históricos a esta QA:

```bash
docker compose -p pms-staff-admin-read-qa -f backend/compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress -Dtest=StaffAdminReadHttpIntegrationTests,StaffAdminReadQueryTests,StaffAdminCursorCodecTests,OpenApiContractIntegrationTests test
docker compose -p pms-staff-admin-read-qa -f backend/compose.bd2-test.yaml run --rm verify
git diff --check
```

- Focalizado nuevo: **31 PASS**, cero failures/errors/skipped: 11 HTTP real,
  2 parser, 2 cursor y 16 OpenAPI. Log /tmp/pms-staff-admin-qa-recheck/focused.log.
- Verify nuevo: **BUILD SUCCESS, 864 PASS**, cero failures/errors/skipped;
  Java 21/PostgreSQL 17, finalizado 2026-10-22 20:40:48 UTC.
  Log /tmp/pms-staff-admin-qa-recheck/verify.log. Incluye todas las regresiones
  Backend existentes, no solo los tests administrativos.
- Resumen sanitizado por testcase: /tmp/pms-staff-admin-qa-recheck/focused-summary.json.
  No contiene JWT, credenciales ni respuestas con correos de usuarios.
- OpenAPI y mappings de esta QA copiados a /tmp/pms-staff-admin-qa-recheck/;
  artefactos canónicos regenerables siguen en backend/target/.
- Se tomó SHA-256 inicial de los 21 archivos locales modificados/no seguidos.
  Comparación final PASS: cambios de este turno únicamente en esta guía,
  AlanPlan y AlanHandoff; implementación/tests/contrato/Postman byte a byte intactos.
- git diff --check PASS; enlaces locales PASS. Inventario OpenAPI vigente:
  49 operaciones, 38 paths, 63 schemas y 14 tags. CI remoto y Newman independiente
  no ejecutados ni presentados como parte de esta validación local.

### Revisión humana pendiente, instrucciones exactas

No hay una interacción humana necesaria para ejecutar las aserciones técnicas
anteriores. Sigue pendiente **tu revisión y confirmación manual PASS**, que no
puede sustituirse con el resultado automático ni con una declaración del agente.
No se ejecutaron manualmente requests en Postman, navegador o Swagger UI.

1. Desde raíz, ejecutar el comando focalizado anterior. Esperado: BUILD SUCCESS,
   Tests run:31, Failures:0, Errors:0, Skipped:0. Si no coincide: FAIL y revisar
   backend/target/surefire-reports/ antes de confirmar cierre.
2. Revisar la evidencia HTTP/OpenAPI sin mostrar credenciales:

```bash
cat backend/target/surefire-reports/com.pms.hotelboutique.backend.modules.securityauth.StaffAdminReadHttpIntegrationTests.txt
cat backend/target/surefire-reports/com.pms.hotelboutique.backend.infrastructure.openapi.OpenApiContractIntegrationTests.txt
cat backend/target/openapi-inventory-counts.txt
```

Esperado: 11 HTTP y 16 OpenAPI, cero fallos/errores/skipped; inventario 49
operaciones/38 paths/63 schemas/14 tags. Contrastar los casos nombrados de la tabla
con sus aserciones en el test HTTP y el documento generado en el paso siguiente.
PASS si el resultado y alcance coinciden; FAIL si falta un caso o aparece error.

3. Comprobar los endpoints publicados en el artefacto generado:

```bash
python3 - <<'PY'
import json
d = json.load(open('backend/target/openapi-generated.json'))
paths = {p: sorted(v) for p, v in d['paths'].items() if p.startswith('/api/v1/staff-admin/')}
expected = {'/api/v1/staff-admin/roles', '/api/v1/staff-admin/users', '/api/v1/staff-admin/users/{id}'}
assert set(paths) == expected
assert all(methods == ['get'] for methods in paths.values())
print(json.dumps(paths, indent=2))
print('PASS: tres GET administrativos, sin mappings de mutación')
PY
```

Esperado: únicamente los tres GET, sin AssertionError. Si aparece un método de
mutación o falta un endpoint: FAIL. Tras revisar resultados, confirmar de forma
explícita «QA manual PASS» o informar el caso fallido. Esta revisión humana de
evidencia automatizada no se registrará como una ejecución HTTP manual independiente.

### Preparación para BFF

La evidencia focalizada y verify nuevo PASS respaldan el contrato de lectura:
**Backend listo técnicamente para integración BFF**, sin implementar esa capa.
No quedan bloqueos técnicos detectados
en los escenarios de lectura. Persisten la limitación operativa de cursor por
proceso/una instancia y la confirmación manual pendiente. No se acredita prueba
de BFF, cookies de navegador, MSW, cache frontend ni React en esta fase.

## Pendiente para BFF

Implementar únicamente con nueva autorización: rutas /api/staff/admin/*,
cookie Staff HttpOnly, proyección allowlist y normalización de errores; refresh
Staff acotado, bootstrap de organización desde roles, cache aislada/limpieza y
exclusión MSW de los GET reales. Seguir §5–6 del contrato 51 sin copiar DTO de
sesión o RolePreview. No alta, edición, reset, revocación ni cambios Guest/RBAC.
