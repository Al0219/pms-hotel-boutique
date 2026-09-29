# AlanHandoff — Backend Dev 1

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
