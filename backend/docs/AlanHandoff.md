# AlanHandoff — Seguimiento Backend

## BD2-006B — Properties: contrato aprobado y APIs

- **Rama:** `feature/bd2-properties-crud`; contrato 15 aprobado por el usuario.
- **DoR:** C2, esquema Property y AuditService disponibles; no modificar BD3.
- **Estado:** EN_QA; alcance BD2 validado, CI global pendiente de fixtures BD3.
  Publicación por commit/push autorizada.
- **Entregado:** POST/GET de Properties y GET/PATCH por ID; permisos existentes
  por método, sesión vigente y scope aplicado en SQL; edición de nombre/código
  con bloqueo de fila y auditoría before/after transaccional. No-op sin cambios
  de timestamps/eventos. Validación estricta, 409 por unicidad y OpenAPI.
- **QA enfocada:** wrapper verify con selección explícita de las tres clases
  Properties: BUILD SUCCESS, 13 tests sin fallos/errores/omitidas y JAR empaquetado.
  Incluye PostgreSQL, rollback real de auditoría, bloqueo NOWAIT, aislamiento,
  permisos, JWT Guest/revocación y escrituras HTTP entre transacciones separadas.
- **Postman/Newman:** 14 solicitudes y 20 assertions PASS con login/C2 reales.
  SQL confirmó dos eventos (alta/edición), actor Staff real, property/correlation
  correctos y una sola propiedad pese al intento duplicado.
- **Correcciones QA:** precisión PostgreSQL de microsegundos preserva timestamps
  entre requests; OpenAPI declara 200/201 con DTO y errores con ProblemDetail.
  Live Swagger confirmó los schemas; se conservan pruebas de regresión.
- **Verify completo final:** `./mvnw -B verify`, Java 21/PostgreSQL 17:
  BUILD FAILURE, 190 tests, 0 failures, 8 errors, 0 skipped. Las 13 pruebas
  Properties pasan también en esta ejecución; los errores pertenecen solo a
  ReservationBookingServiceIntegrationTests (7, dos beans AvailabilityPort) y
  ReservationBookingWithoutAvailabilityTests (1, ATS real en supuesto sin puerto).
  No se cambió BD3, el workflow ni la selección de tests del verify completo.
  Logs de evidencia fuera del repositorio: pms-bd2-properties-focused.log y
  pms-bd2-properties-verify-final.log.
- **Base actualizada:** `origin/main` `c05a091` integró PR #66 (propuesta).
  Su árbol es idéntico a `73c6f9f`; el código combinado no añade diferencias
  de ejecución. Esta entrega funcional necesitará un nuevo PR.
- **Siguiente paso:** abrir PR funcional desde esta rama hacia main; resolver
  los fixtures de BD3 en su rama responsable y continuar con contrato RoomTypes.
  Baja/reactivación y cambios de moneda/zona permanecen fuera de esta entrega.

## BD2-006A — Propuesta de administración de propiedades

- **Rama/base:** `feature/bd2-properties-crud`, `origin/main` `9552325`.
  Fase 5 integrada por PR #65; su conexión productiva BD3 continúa pendiente.
- **Estado histórico:** preparación de propuesta COMPLETADA; aprobación e
  implementación posteriores registradas arriba en BD2-006B.
- **Entregado:** `15_BD2_PROPERTIES_CRUD_CONTRACT_PROPOSAL.md`; primera entrega
  C/R/U de Properties y secuencia RoomTypes/Rooms/RatePlans/bajas, con ownership BD2.
- **Decisiones al preparar la propuesta:** rutas/permisos operativos, alta limitada al
  SUPER_ADMIN de su organización y edición solo de nombre/código. Baja y
  reactivación necesitan definición de acceso a properties inactivas bajo C2.
- **Revisión:** coherencia con C2, modelo/schema existentes y reglas de dominio;
  distinguir propuesta de contrato confirmado. Diff/whitespace revisados.
  Solo documentación; no se declara una nueva ejecución Maven ni una API creada.
- **Siguiente paso:** confirmar propuesta, implementar BD2-006B y validar
  PostgreSQL/HTTP/OpenAPI/Postman antes de su commit/push. No modificar fixtures BD3.

## BD2-005 — Admisión e integración (Fase 5)

- **Rama:** `feature/bd2-inventory-admission`, desde Fase 4 publicada en `0dbaa74`.
- **Estado:** EN_QA; entrega BD2 validada, conexión BD3 pendiente. Publicación autorizada.
- **PR objetivo:** `main`; Fase 4 integrada mediante PR #64 en `a4dc6b0`.
  El fetch previo a esta entrega confirma que sus fixtures BD3 no cambiaron.
- **DoR:** motor/API BD2 disponibles y esquema BD3 integrado en `origin/main`.
- **Hallazgo:** booking BD3 comprueba cada stay antes de escribir; no acumula
  demanda multi-room ni serializa dos transacciones que venden la última unidad.
- **Entregado:** `InventoryAdmissionPort`, demanda conjunta, locks PostgreSQL
  por property/RoomType, excepción de agotamiento y rollback. Contrato en
  `13_BD2_INVENTORY_ADMISSION_CONTRACT.md`; guía y colección Postman en
  `14_BD2_TESTING_AND_POSTMAN.md` y `../postman/BD2-Inventory.postman_collection.json`.
- **QA BD2:** `./mvnw -B verify` BUILD SUCCESS, Java 21/PostgreSQL 17;
  46 pruebas, cero fallos/errores/omitidas. Incluye 8 pruebas de admisión real
  y 2 con servidor HTTP real. Log TEMP: `pms-bd2-phase5-verify-http-fix.log`.
- **Corrección HTTP:** `sendError(403)` provocaba error dispatch a `/error`,
  protegido por la cadena global; se reemplaza por `setStatus` solo en BD2.
  No se cambian Auth BD1 ni rutas globales. Regresión cubierta con HTTP real.
- **Postman:** Newman PASS, 8 solicitudes/13 assertions contra runtime combinado
  con login/scope reales; fixture de una habitación, credenciales efímeras.
  Runtime detenido y credenciales/reporte privado eliminados de TEMP.
- **Integración real aislada:** fuentes BD3 de `origin/main` `7c060c9` intactas,
  con cuatro tests temporales que envuelven `ReservationBookingService` en el
  puerto nuevo: ATS disminuye exactamente uno, cancelación libera sin borrar
  stay, demanda multi-room se rechaza antes de crear y consumo JPA pendiente
  se observa en la siguiente admisión. Cuatro PASS, sin mock ATS ni booking.
  Esta envoltura pertenece a la validación; no conecta el booking productivo.
- **Verify combinado:** BUILD FAILURE, 181 pruebas incluyendo las 4 temporales;
  cero failures, 8 errors, cero omitidas. Siete errores en el contexto de
  `ReservationBookingServiceIntegrationTests` por beans `availabilityService`
  y `availabilityPort` competidores; uno en
  `ReservationBookingWithoutAvailabilityTests` por presencia del ATS real.
  Los demás tests, incluidos todos los BD2, pasan. Fuentes/fixtures BD3 intactos.
  Log TEMP: `pms-bd2-phase5-combined-http-fix.log`.
- **Límite:** los escritores que no utilicen el puerto siguen fuera de su
  garantía. No declarar sobreventa cero global ni Fase 5 COMPLETADA todavía.
- **Siguiente paso BD3:** resolver el mock `AvailabilityPort` no primario y el
  contexto que supone que no hay puerto; conectar el booking al callback del
  puerto de admisión, con validación y revisión del owner, antes de cerrar Fase 5.

## BD2-004 — API Staff de disponibilidad (Fase 4)

- **Rama:** `feature/bd2-availability-api`, dependiente de BD2 Fase 3 en `277390d`.
- **Estado:** COMPLETADA para entrega BD2; publicada en `0dbaa74`.
- **Contrato:** `12_BD2_AVAILABILITY_API_CONTRACT.md`; consulta Staff por
  property/room type y fechas locales, mínimo ATS, sin precios ni reserva.
- **Seguridad:** servicios JWT/sesión/permiso/scope C2 reutilizados; cadena BD2
  limitada a la ruta de disponibilidad y autorización por método. No se cambia BD1.
- **Dependencia:** las tablas BD3 ya están en `origin/main` (`7c060c9`), pero
  todavía no forman parte de esta rama dependiente; sus correcciones de tests
  permanecen fuera de esta rama.
- **QA:** `./mvnw -B verify` BUILD SUCCESS con Java 21, PostgreSQL 17 y Maven
  3.9.16 del wrapper; 36 pruebas, cero fallos/errores/omitidas. Incluye 11 pruebas
  HTTP con JWT firmado, separación Guest/Staff, sesión revocada, permisos vivos,
  scope antes de ATS, cero unidades, errores 400/404 y schemas OpenAPI.
  El puerto ATS se sustituye solo en el contexto de pruebas HTTP; el query SQL
  real se mantiene cubierto por las pruebas de Fase 3. No sustituye Fase 5.
- **Siguiente paso:** PR de Fase 4 dependiente de Fase 3; iniciar Fase 5 con
  validación aislada contra `origin/main` y revalidar cuando BD3 ajuste sus tests.

## BD2-CI-001 — Entrega de corrección BD2

- **Rama:** `feature/bd2-availability-engine`; corrección publicada en `277390d`.
  Fase 3 ya publicada en `ec8c68f` y `99fe5a0`.
- **Corrección:** validar upgrade contra el total del master instalado en limpio;
  comprobar el changeset `002-management-002` y conservar idempotencia/Property.
- **Validación:** `./mvnw -B verify` PASS, 25 pruebas, cero fallos/errores/omitidas;
  Java 21, PostgreSQL 17 y Maven 3.9.16 del wrapper. Diff revisado.
- **Dependencia:** BD3 debe ajustar sus contextos de pruebas al motor ATS real;
  la referencia combinada del PR `a7b9b14` falla en sus dos pruebas de booking.
- **Retomar:** cuando BD3 integre sus correcciones, revalidar el PR BD2. Tras
  integrar BD2, iniciar la siguiente tarea desde `origin/main` actualizado.
  Pendientes de BD2: Fase 4 (API/contrato/scope) y Fase 5 (integración transaccional).

## BD2-003 — Fase 3 completada (entrega BD2)

- **Rama:** `feature/bd2-availability-engine`, basada en `origin/main` `8e67b7d`.
- **Commit/push:** `ec8c68f` publicado en `origin/feature/bd2-availability-engine`.
- **Estado:** COMPLETADA para entrega BD2; lista para PR/revisión del equipo.
- **Entregado:** `AvailabilityService` calcula el mínimo de unidades vendibles
  por noche como `max(0, físico - OOO - ReservationStay consumidor)`. El query
  usa IDs explícitos de propiedad/tipo, cuenta habitaciones OOO distintas y
  excluye Reservation padre cancelada.
- **Consumo BD3 verificado en** `origin/feature/bd3-foundation` (`d1cb2b7`):
  `RESERVED`/`IN_HOUSE` consumen; `CANCELLED`/`NO_SHOW`/`CHECKED_OUT` liberan.
  Cancelar Reservation no cascada a stays; el `EXISTS` contra el padre cubre
  deliberadamente ese caso. BD3 ya tiene tests de ciclo de vida para esos estados.
- **Entregado:** `PropertyStayTime` y `UtcStayInstantRange` convierten límites
  locales `[arrival, departure)` a UTC con `ZoneId`, incluyendo cambios DST.
- **Scope:** SQL limitado por `propertyId`; de acuerdo con el contrato existente,
  la capa de aplicación/HTTP debe autorizar la propiedad antes de llamar al puerto.
  No se agrega autenticación al query interno.
- **Validación:** `docker compose -p pms-bd2-phase1 -f
  backend/compose.bd2-test.yaml up --abort-on-container-exit --exit-code-from
  verify` — BUILD SUCCESS en PostgreSQL 17/Temurin 21; 25 pruebas, cero
  fallos/errores/omitidas. Incluye prueba SQL con estados consumidores,
  fechas `[arrival, departure)` y Reservation padre cancelada; ATS por
  mínimo/no negativo; y límites UTC a través de DST.
- **Dependencia de integración:** el query requiere las tablas BD3 `reservations`
  y `reservation_stays`, presentes en `origin/feature/bd3-foundation`, todavía
  no integradas a `main`; el ATS entra en funcionamiento cuando BD3 se integre.
- **Límite:** el precheck no bloquea ni serializa admisiones concurrentes; la
  garantía de sobreventa cero requiere el trabajo transaccional posterior.

## BD2-002 — Fase 2 completada

- **Rama:** `feature/bd2-entities-repositories`.
- **Base:** `origin/main` en `a59a235`; Fase 1 integrada mediante PR #60.
- **Estado:** COMPLETADA — aceptación y DoD local PASS, 2026-10-01.
- **Archivos:** dominio y persistencia de `modules/inventory`, pruebas JPA,
  contrato BD2 y estos documentos de seguimiento.
- **Entregado:** entidades JPA Property, RoomType, Room, RatePlan y
  OutOfOrderRecord; repositorios property-scoped; conteo de habitaciones OOO
  distintas por noche local.
- **Validación:** `docker compose -p pms-bd2-phase1 -f
  backend/compose.bd2-test.yaml run --rm --no-deps verify mvn -B
  --no-transfer-progress verify` — BUILD SUCCESS en PostgreSQL 17/Temurin 21;
  19 pruebas, cero fallos/errores/omitidas. Validó migración, Hibernate,
  roundtrip JPA de monedas/fechas, aislamiento de scope, exclusión de OOS y
  registros liberados, y solapamientos OOO contados una vez por Room/noche.
- **Artefacto:** JAR empaquetado con los cinco tipos de dominio y sus cinco
  repositorios; no se añadieron cambios a Liquibase.
- **Revisión local:** `git diff --check` PASS. Sin PR ni publicación remota.
- **Siguiente paso:** Fase 3 (motor ATS) requiere la coordinación de consumo por
  ReservationStay con BD3 y control atómico antes de habilitar overbooking cero.

## BD2-001 — Fase 1 completada

- **Rama:** `feature/bd2-foundation-contracts`.
- **Owner:** BD2.
- **Autorización:** plan de Fase 1 indicado por el usuario el 2026-09-30.
- **Base:** esquema y seguridad existentes de BD1; no se recrea `properties`.
- **Contrato:** `11_BD2_CORE_FOUNDATION_CONTRACT.md`.
- **Estado:** COMPLETADA — aceptación y DoD local PASS, 2026-09-30.
- **Entregado:** changeset `002-management-002`, valores/converters monetarios,
  AvailabilityPort, rango local de noches y configuración de mock solo para tests.
- **Validación:** PostgreSQL 17 y Maven/Temurin 21 aislados mediante
  `compose.bd2-test.yaml`: `mvn -B verify` terminó con BUILD SUCCESS y código 0.
  18 pruebas, cero fallos/errores/omitidas (7 existentes + 11 nuevas).
- **Migraciones:** instalación vacía con seis changesets; actualización BD1
  (cinco changesets) a BD2 (seis), seguida de reaplicación sin cambios. Property
  inicial preservada; no se modificaron changesets previos.
- **Restricciones verificadas:** referencias cruzadas entre propiedades, precios
  negativos, códigos duplicados, períodos vacíos, liberación incompleta y borrado
  de una Room con historial son rechazados por PostgreSQL.
- **Dinero:** roundtrip de converters, escala de moneda, precisión decimal,
  overflow y mezcla de monedas cubiertos. El mapeo de entidades será Fase 2.
- **Artefacto:** JAR contiene AvailabilityPort, valores/converters y migración;
  no contiene AvailabilityStubConfiguration ni el changelog base de pruebas.
- **Revisión local:** scope y cambios inspeccionados; `git diff --check` PASS.
  No se declara revisión externa, PR ni publicación a GitHub.
- **Siguiente paso:** Fase 2, entidades y repositorios según el contrato de BD2.
  ATS real, autorización de endpoints y consumo atómico con BD3 siguen pendientes.

## Foundation Backend — BE-001

- **Rama:** `feature/backend-foundation`
- **Base:** `main` en `94ee1f0`
- **Tarea:** BE-001 — Foundation y control Backend
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-29

### Entregado

- Bootstrap Spring Boot 4.1.1 con Java 21, Spring MVC, JPA, PostgreSQL,
  Liquibase, Spring Security, Resource Server OAuth2 y OpenAPI.
- Un único `compose.yaml` raíz que construye y levanta PostgreSQL, Backend y
  Web; solo Web publica un puerto al host y Backend queda en la red privada.
- Liquibase como único mecanismo de esquema, con Hibernate en `ddl-auto: validate`
  y changelog modular inicial `003ServiceSecurityAuth` sin tablas de negocio.
- Perímetro `SecurityFilterChain` sin estado: health y documentación técnica
  públicos; cualquier ruta no declarada se deniega.
- OpenAPI técnico disponible; no se publicaron endpoints ni DTOs de negocio no
  confirmados.
- Control de trabajo Backend en `AlanPlan.md` y `AlanHandoff.md`, más workflows
  GitHub Actions para Backend y para la pila Docker completa.

### Evidencia de validación

- `maven:3.9.11-eclipse-temurin-21 mvn -q -DskipTests compile`: exitoso.
- `maven:3.9.11-eclipse-temurin-21 mvn -q test`, con PostgreSQL 17: exitoso;
  Spring inicia, Liquibase registra cero changesets de negocio y MockMvc verifica
  health/OpenAPI públicos y denegación por defecto.
- Ejecución HTTP aislada en el puerto 18080: `/actuator/health` = 200,
  `/v3/api-docs` = 200 y `/not-configured` = 403.
- El host no dispone de `javac`; las validaciones anteriores usan el JDK 21
  reproducible de Docker. CI ejecutará la misma versión con Temurin 21.
- `docker compose up --build --wait`: construyó las imágenes. El puerto 3000
  local estaba ocupado por otro proyecto, por lo que `PMS_WEB_PORT=3001 docker
  compose up --wait` confirmó los tres servicios healthy; Web respondió por HTTP
  y alcanzó al health Backend mediante `http://backend:8080` dentro de Compose.

### Cierre de revisión

- Revisión local completada: `git diff --check`, configuración Compose, build de
  imágenes, healthchecks y conectividad privada Web → Backend.
- Backend CI y Docker Stack CI se ejecutarán automáticamente al crear el pull
  request o integrar cambios a `main`, de acuerdo con sus triggers.

### Siguiente tarea

La propuesta `08_AUTH_SESSION_CONTRACT_PROPOSAL.md` fue derivada de Web y
actualizada con la regla de producto: correo permite reserva puntual sin cuenta;
la cuenta Guest requiere Google y se implementa en BE-004. Staff solo se
provisiona por el hotel con username, contraseña, correo laboral y un rol;
`SUPER_ADMIN` es global. MFA Guest se delega a Google y MFA local Staff queda
diferido. C1 fue aprobado y BE-002 implementa exclusivamente el contexto Staff;
Guest Google continúa en BE-004.

## BE-002 — Inicio

- **Rama:** `feature/be-002-staff-auth`
- **Estado:** COMPLETADO
- **Contrato:** C1 aprobado en `08_AUTH_SESSION_CONTRACT_PROPOSAL.md`.
- **Alcance autorizado:** usuarios Staff provisionados por hotel, username,
  correo laboral, contraseña hasheada, un rol, SUPER_ADMIN, sesiones Staff, JWT,
  refresh rotativo y logout.
- **Fuera de alcance:** Google/Guest (BE-004), property scope efectivo
  (BE-003), UI de provisionamiento y gestión de roles.


### Validación BE-002

- `./mvnw test` se ejecutó en JDK 21 contra PostgreSQL local con el esquema
  validado por Liquibase.
- Smoke en contenedor: login Staff, JWT con audiencia/contexto Staff, refresh
  rotativo, rechazo 401 sin refresh y revocación persistente tras logout.
- El changeset aplicado es `003-staff-auth-001`; no se modifica ni se reutiliza.

### Próximo alcance

BE-003 implementará roles/permisos efectivos, memberships y property scope.
BE-004 incorporará Google OIDC, sesión Guest y los Route Handlers BFF; no debe
reutilizar cookies, tokens ni sesiones Staff.

## BE-003 — Cierre

- **Rama:** `feature/be-003-authorization-scope`
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-29
- **Contrato:** C2 aprobado en `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`.
- **Alcance:** Organization/Property iniciales, roles y permisos Staff,
  memberships activas y resolución `PROPERTY`/`ALL_PROPERTIES` en Backend.
- **Límite:** no publica CRUD de Staff ni conecta los mocks Web. Esas tareas
  requieren su contrato BFF/administrativo y mantienen la regla de revocar
  sesiones al cambiar acceso.


### Entregado

- `002ServiceManagement/001` crea Organization y Property iniciales mediante
  Liquibase; no hay creación manual de tablas.
- `003ServiceSecurityAuth/002` crea roles fijos, catálogo de permisos,
  memberships y propiedades por membership. `003` impone una sola membership y
  rol por usuario Staff en V1.
- La sesión Staff resuelve rol, permisos y propiedades activas desde PostgreSQL
  antes de emitir token, validar una sesión y responder `GET /session`.
- `PropertyScopeResolver` construye scopes explícitos `PROPERTY` o
  `ALL_PROPERTIES`; este último exige `MULTI_PROPERTY_READ` y solo contiene IDs
  autorizados.

### Evidencia de validación

- `./mvnw -B test` con Maven/Temurin 21 y PostgreSQL 17: 6 pruebas exitosas.
- PostgreSQL 17 vacía: Liquibase aplicó, en orden, `002-management-001`,
  `003-staff-auth-001`, `003-staff-auth-002` y `003-staff-auth-003`; después
  la suite completa pasó.
- Smoke Docker aislado: bootstrap temporal de `SUPER_ADMIN`, login Staff y
  `GET /api/v1/staff-auth/session` verificaron `SUPER_ADMIN`,
  `MULTI_PROPERTY_READ` y `HB-GT-001`. Los contenedores y token temporales se
  eliminaron al finalizar.
- `git diff --check`: exitoso.

### Siguiente tarea

BE-004 implementa Google OIDC, identidad Guest y BFF. BE-005 reemplazará la
fixture Web Private-09 por un DTO/Mapper BFF basado en C2. El CRUD auditado de
Staff y memberships queda como tarea administrativa posterior; deberá revocar
sesiones cuando cambie el acceso.

## BE-004 — Cierre

- **Rama:** `feature/be-004-guest-oidc-bff`
- **Estado:** COMPLETADO
- **Contrato:** C3 aprobado en `10_GUEST_AUTH_CONTRACT_C3.md`.
- **Alcance:** Google OIDC, GuestAccount/GuestIdentity, sesión Guest,
  refresh rotativo y Route Handlers BFF con cookies host-only.
- **Dependencia registrada:** el OTP de vinculación histórica se integra una
  vez que Reservations publique la consulta de referencia/correo; BE-004 no
  crea entidades de Reservation, Stay ni GuestProfile.


### Avance BE-004

- C3 está registrado y el Backend implementa la transacción Google OIDC con
  `state`, `nonce`, PKCE, validación de token y `email_verified`.
- GuestAccount, GuestIdentity, sesiones, refresh rotativo y JWT Guest son
  estructuras separadas de Staff. Las rutas BFF Guest manejan cookies host-only
  HttpOnly sin serializar tokens hacia JavaScript.
- Resend se implementa como adaptador de infraestructura. La consulta y OTP de
  reservas históricas esperan el puerto seguro del módulo Reservations.

### Validación realizada

- Maven/Temurin 21 y PostgreSQL 17: 7 pruebas exitosas.
- PostgreSQL vacía aplicó cinco changesets, incluido `003-guest-auth-004`.
- `npm run typecheck`, `npm run lint` y el build de imágenes Docker Backend/Web
  fueron exitosos.
- Prueba local real: Google OIDC con usuario externo de prueba creó sesión y
  `GET /api/auth/guest/session` devolvió el correo validado y `context=GUEST`.
  La redirección BFF usa `PMS_WEB_PUBLIC_URL`, por lo que no filtra la dirección
  interna del contenedor.
- Refresh real por BFF: `POST /api/auth/guest/refresh` devolvió `200` y
  `refreshed=true`; el token de refresh se rotó.
- Logout real por BFF: `DELETE /api/auth/guest/session` devolvió `204` y la
  consulta posterior de sesión devolvió `401`. Se corrigió la respuesta BFF para
  emitir `204 No Content` sin cuerpo.

### Seguimiento de despliegue e integración

- Registrar el callback y dominio definitivos en Google para producción.
- Configurar dominio/remitente y API key de Resend para el OTP futuro.
- Integrar el puerto de vínculo OTP cuando Reservations publique búsqueda segura
  por referencia y correo, sin revelar existencia de reservas.


## BE-005 — Inicio

- **Rama:** `feature/be-005-staff-bff-integration`
- **Estado:** EN_PROGRESO
- **Contrato:** C2 aprobado en `09_AUTHORIZATION_SCOPE_CONTRACT_C2.md`; C1 sigue siendo autoridad para cookies y sesiones Staff.
- **Alcance autorizado:** Route Handlers BFF Staff, DTO/Mapper C2 y sustitución de la rama no-mock del provider Private-09.
- **Límite:** no crea CRUD de Staff, roles, memberships ni migraciones; el fixture Private-09 permanece para el modo mock y sus pruebas.


## BE-005 — Cierre

- **Rama:** `feature/be-005-staff-bff-integration`
- **Estado:** COMPLETADA
- **Fecha de cierre:** 2026-09-30
- **Contrato:** C1 para el ciclo de sesión Staff y C2 para la sesión/autorización
  efectiva, ambos registrados en los documentos de Backend.

### Entregado

- Route Handlers BFF Staff para login, consulta de sesión C2, refresh y logout,
  con cookies `HttpOnly` host-only separadas de Guest. Ninguna respuesta BFF
  serializa access ni refresh token hacia JavaScript.
- DTO, mapper estricto y servicio de sesión Staff para el flujo no-mock Web.
  El mapper rechaza roles, permisos, propiedades, zonas horarias o monedas
  inválidos y memberships duplicadas.
- Provider Staff que resuelve la sesión C2, intenta refresh ante un `401` y
  conserva la fixture Private-09 únicamente cuando el modo mock está activo.
- Navegación privada basada en el rol C2 y las propiedades/permisos efectivos;
  `SUPER_ADMIN` recibe todos los módulos definidos.
- La descripción OpenAPI de `GET /api/v1/staff-auth/session` y el contrato C2
  especifican que la autorización se recalcula y que los tokens quedan dentro
  del BFF. No se crearon migraciones ni CRUD administrativo.

### Evidencia de validación

- `npm run typecheck`, `npm run lint` y `npm run build`: exitosos.
- `npm run test -- --run`: 182 archivos y 768 pruebas Web exitosas.
- Maven/Temurin 21 contra PostgreSQL 17 en Docker: `./mvnw -B -q test` exitoso,
  con Liquibase actualizado y validación Hibernate activa.
- `docker compose up --build -d`: imágenes Backend/Web construidas y servicios
  healthy.
- Smoke BFF Staff sin exponer secretos: login `201` con acuse limitado, sesión
  C2 `200` con rol `SUPER_ADMIN`, refresh `200`, logout `204` y consulta
  posterior `401`.
- `git diff --check`: exitoso antes del cierre.

### Siguiente tarea

El siguiente módulo operativo puede consumir C2 desde el BFF y debe aplicar
`PROPERTY`/`ALL_PROPERTIES` mediante el scope Backend. El CRUD auditado de
usuarios, roles y memberships continúa fuera de BE-005 y deberá revocar
sesiones al modificar el acceso.
