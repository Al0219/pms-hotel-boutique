# Alta Staff MVP — COMPLETADA

Autorización directa del usuario: alta real Backend/BFF/UI, sin activación ni
entrega de credenciales. Base origin/main 53b3e09; rama feature/staff-admin-create.
No cambia el cierre de 3B-1/3C/3D-1/3D-2 ni QA2A/2B; M08 sigue bloqueando reactivación.

## Contrato y comportamiento

POST `/api/v1/staff-admin/users` y POST `/api/staff/admin/users`, query estricta
`scope=PROPERTY&propertyId={UUID}` o `scope=ALL_PROPERTIES`. JSON exclusivamente
`username` (1–80, trim, sin controles), `workEmail` (regla login, normalizado,
máx.50), `roleCode` (GERENCIA/RECEPCION/OPERACIONES/AUDITOR), `propertyIds`
(conjunto sin duplicados). Organización exclusivamente de sesión; STAFF_MANAGE.
Propiedades activas de la organización dentro del portfolio autorizado. PROPERTY
requiere incluir su propiedad seleccionada para conservar visibilidad del alta.
Vacío solo SUPER_ADMIN en ALL_PROPERTIES, coherente con visibilidad sin propiedades.

201: StaffAdminUserView existente, versión0, SUSPENDED, membership ACTIVE.
Creación JDBC, asignaciones y STAFF_CREATED/ORGANIZATION con actor/sujeto/correlación
en una transacción, con revalidación del actor bajo el protocolo de locks existente.
Unicidad SQL vigente; 409 STAFF_USERNAME_CONFLICT o STAFF_EMAIL_CONFLICT.
No migraciones. Hash BCrypt sobre 256bits aleatorios descartados; no contraseña
predeterminada, entrega ni evidencia de credencial preparada. Auth existente
rechaza usuarios no ACTIVE. OpenAPI actualizado; no se declara comprobado el JSON
generado sin ejecutar su prueba PostgreSQL.

BFF reutiliza transporte Staff, cookie HttpOnly, Origin obligatorio, body64KiB,
proyección explícita/no-store y errores sanitizados400/401/403/409/503. Un solo
POST; sin refresh/retry de escrituras. Boundary MSW deja pasar el POST real.
Formulario Modal compartido: username/correo/rol/propiedades de la sesión real,
validación, Crear/Cancelar, bloqueo por ref frente a doble envío. Tras éxito,
cierra, limpia búsqueda/filtros, reinicia el cursor y actualiza el listado real
del scope actual, sin restringirlo al username creado.
SUSPENDED se presenta como «Pendiente de activación». Tres columnas intactas.
503/red/acuse inválido: formulario y datos bloqueados, «Comprobar listado» realiza
GET paginado por username exacto sobre los resultados literales antes de permitir
otra alta. Si encuentra la cuenta verifica sus datos; no ejecuta otro POST.
No ofrece idempotencia por clave ni reintento automático. Las constraints SQL
impiden duplicar username/email aunque el primer comando aún esté terminando.

## Aceptación manual

El usuario confirmó **PASS** en creación, persistencia y actualización del listado.
Tras el alta, la tabla muestra el usuario nuevo y conserva el estado «Pendiente de
activación». Esta aceptación se limita a esos escenarios; no atribuye validación
manual de otras transiciones, errores, concurrencia, Origin o accesibilidad.

## Evidencia automatizada

- Backend: `mvn -B --no-transfer-progress -Dtest=StaffAdminMutationParserTests,StaffAdminCreateServiceTests test`: **25 PASS** (22 parser +3 alta), fuente Java21 bajo JDK25 local.
- Ejecutado en copia temporal /tmp porque target previo tiene archivos no escribibles; compilación de fuentes y tests PASS. Primer intento offline bloqueado por dependencia mail ausente; descargada con Maven.
- Web focal previo al ajuste final: create-proxy, proxy, mutation-proxy, staff-admin, staff-inline-edit, staff-status-actions, worker-boundary: **370 PASS /7 archivos**.
- Ajuste final del listado: `staff-admin.test.tsx`: **51 PASS**, incluido alta desde filtros y cursor activos, refresco sin filtros en la primera página del scope y estado pendiente.
- Cierre: BFF create-proxy/proxy y UI staff-admin: **158 PASS /3 archivos**; Backend parser/alta: **25 PASS**.
- Typecheck y ESLint de archivos funcionales afectados: **PASS**. `git diff --check`: **PASS**.

No se ejecutaron las pruebas HTTP/SQL de alta ni la prueba OpenAPI generada; se
probarán en CI del PR. También quedan fuera de la evidencia manual: integración
automática PostgreSQL, rollback/concurrencia, Firefox, lector de pantalla,
resultados inciertos, conflictos y login rechazado para cuentas nuevas. No se
repitieron suites completas, builds ni Docker.

MVP de creación **COMPLETADO** con esta aceptación manual. Sin alta SUPER_ADMIN,
reactivación, invitación, reset ni credenciales entregables. El siguiente incremento
requiere contrato/flujo seguro para invitación y credenciales; reactivación sigue
bloqueada por M08.
