# Invitación y activación inicial Staff — MVP COMPLETADA / PASS

Autorización directa de implementación del usuario. Rama `feature/staff-activation-mvp`,
base `origin/main` fe6a381 (incluye creación MVP). No declara aprobado todo contrato53
sin cerrar BE-006B/C, BE-014A o QA2A/2B independientes. La extensión de
reactivación MVP autorizada el2026-10-25 permanece EN_QA (última sección).

## Alcance y contrato

| Operación | Backend | BFF | Respuesta |
| --- | --- | --- | --- |
| Elegibilidad | GET `/api/v1/staff-admin/users/{id}/invitation` | GET `/api/staff/admin/users/{id}/invitation` | 200 `{organizationId,staffUserId,version,invitationAllowed,activationAllowed,credentialPrepared}` |
| Invitación inicial | POST misma ruta | POST misma ruta | Body exclusivo `{expectedVersion}`; 200 acuse mínimo4 campos de contrato53 |
| Establecer contraseña | POST `/api/v1/staff-auth/invitations/consume` | POST `/api/auth/staff/invitations/consume` | Body exclusivo `{token,password}`; 200 `{credentialPrepared:true}` |
| Activar / reactivar con M08 | PATCH `/api/v1/staff-admin/users/{id}/status` | PATCH `/api/staff/admin/users/{id}/status` | `{status:"ACTIVE",expectedVersion}`; acuse mínimo existente |

Operaciones administrativas usan scope contractual PROPERTY/propertyId o
ALL_PROPERTIES, organización de sesión, STAFF_MANAGE, visibilidad SQL completa,
reglas GERENCIA/SUPER_ADMIN/autoedición y expectedVersion. Elegibilidad es derivada
y jamás escribible desde navegador. BFF utiliza cookies Staff HttpOnly, Origin,
allowlist/no-store/transporte fijo y un solo envío. Consumo es anónimo con prueba
del enlace; no reenvía cookies ni crea sesión. Guest queda separado.

Migración **aditiva012**: tabla `staff_invitation_flows` con token SHA-256, generación,
usuario/org/correo, TTL30min, envío/consumo/revocación; metadatos M08 nullable en
staff_users con constraint de coherencia y FK al flujo. Token aleatorio256bits,
enlace de un uso solo al workEmail; nada de token/enlace/contraseña en respuesta
administrativa. El enlace usa fragmento, que la página `/activar-staff` elimina
del historial antes de interactuar. Password8–50 caracteres/máx72bytes UTF8,
validación compatible con login y hash mediante PasswordEncoder instalado.

`initial_activation_pending` sigue identificando altas nuevas y no se hace backfill
de credenciales. La extensión autorizada permite recuperar cuentas SUSPENDED
antiguas exclusivamente mediante invitación explícita de un administrador. La
autorización del consumo procede del flujo persistido/generación/correo, nunca de
un flag de preparación enviado por navegador ni de un hash de contraseña existente.
Cuentas ACTIVE anteriores siguen operando.

Cambio de producto autorizado 2026-10-25: consumir una invitación válida guarda
contraseña y M08, consume el token y activa la cuenta **en la misma transacción**.
No requiere confirmación administrativa adicional ni crea una sesión. Comprueba
correo/generación, cuenta SUSPENDED, membership/rol activos y consistentes,
asignaciones no vacías y todas las propiedades activas en la organización.
Bloquea usuario→membership→propiedades→sesiones/tokens; revocación y ambos eventos
`STAFF_INVITATION_CONSUMED`/`STAFF_INITIAL_ACTIVATED` comparten el commit. La versión
aumenta exactamente una vez al consumir; un fallo revierte estado, contraseña, M08
y consumo del token. Primera activación cierra el marcador inicial. Suspensiones
posteriores requieren M08 vigente para reactivación administrativa o una nueva
recuperación explícita cuando falta evidencia. DISABLED sigue terminal.

Cambios efectivos de correo y DISABLED invalidan preparación e invitaciones
pendientes dentro del comando existente; no-op no invalida. Versión global se
incrementa una vez por envío/consumo/cambio efectivo. Locks mantienen orden
users→memberships→properties→sessions/tokens; consumidor también comienza por user.
SMTP fallido revierte versión/flujo/auditoría; cooldown60s limita reenvíos.
SMTP y commit SQL no forman una transacción distribuida: un fallo de commit tras
SMTP podría entregar un enlace inválido. No prometer entrega exactamente una vez;
503 exige GET/revisión explícita y jamás reenvía automáticamente.

## SMTP y QA en Firefox

La invitación reutiliza el bean `JavaMailSender` de `SmtpEmailConfiguration`,
configurado para Gmail por `PMS_EMAIL_PROVIDER=smtp` y las variables existentes
`PMS_SMTP_HOST/PORT/USERNAME/APP_PASSWORD/FROM`. No crea otro transporte ni modifica
el servicio Guest. `PMS_STAFF_INVITATION_URL` es solo la URL pública de activación
(default `http://localhost:3001/activar-staff`). SMTP ausente/fallido devuelve503;
no existe fallback de éxito simulado. Se retiró `PMS_STAFF_SMTP_*`.

Corrección 2026-10-25: se detuvo únicamente `pms_staff_activation_qa_mail`;
PostgreSQL y demás servicios conservados. Mailpit ya no es dependencia del flujo
ni de los tests. La suite HTTP captura el límite de envío en memoria; su cobertura
no acredita entrega SMTP. La evidencia anterior con Mailpit se conserva abajo como
histórica, no como verificación Gmail.

Arranque integrado desde la raíz, usando `.env` existente (sin ejecutarlo en esta
corrección):

```bash
docker compose --env-file .env up -d postgres
docker compose --env-file .env up -d --build backend
docker compose --env-file .env up -d --build web
```

Los builds indicados actualizan las imágenes al código actual; no se ejecutaron
builds ni Docker E2E durante esta corrección. Gmail existente completo: ninguna
variable SMTP adicional. No versionar `.env` ni credenciales.

1. Firefox: entrar en `http://localhost:3001/acceso` con un administrador local.
2. Crear una cuenta con correo laboral real del destinatario QA.
3. El alta confirmada envía automáticamente la invitación; comprobar el mensaje
   «Usuario creado. Invitación enviada a su correo». Si no se confirma el envío,
   usar Acceso → «Invitación / Activación» para comprobar estado y reenviar manualmente.
4. Abrir el correo recibido en Gmail (revisar spam) y establecer contraseña.
5. Ver «Cuenta activada correctamente. Ya puedes iniciar sesión»; seguir el enlace
   a `/acceso` y autenticar con el correo y la contraseña elegida. No hay autologin.
6. Refrescar el listado administrativo: usuario ACTIVE, sin activación manual.

El listado conserva tres columnas y sus interacciones. Diálogos salen de la fila
mediante portal para evitar clipping por transform/overflow del swipe. Una escritura
por usuario comparte el lock de3D-1; 409 exige lectura y revisión; 503 bloquea hasta
GET autorizado. No se envía ACTIVE desde el gesto de suspensión/baja.

## Evidencia histórica ejecutada (antes de reutilizar Gmail)

- Backend focal: **57 PASS**: invitación HTTP/SMTP/SQL11, parser22, alta3, OpenAPI21.
  Java local25 compilando release21; PostgreSQL17.11 aislado y Mailpit real.
  Incluye token vencido/reutilizado, consumo concurrente, mail/audit rollback,
  email/estado invalidando evidencia, elegibilidad, login bloqueado hasta activar,
  login concurrente antes de activación, revocación de sesiones/familias y cuentas
  antiguas/terminales bloqueadas. Migración y OpenAPI generados comprobados.
- Web focal/regresión: **334 PASS /7 archivos**. Tras ajustes de arranque en efectos,
  nuevos tests de invitación BFF/UI: **30 PASS /2 archivos**. Incluye StrictMode,
  no secretos/cookies de destinatario, Origin, permisos, confirmación/cancelación,
  409/503 y ausencia de reintentos, además de edición/listado/swipe/MSW existentes.
- **28 aserciones HTTP/SQL/SMTP reales PASS**: Next→Spring→PostgreSQL→Mailpit,
  consume→ACTIVE→login real; Origin,403RECEPCION,401,409; se detuvo únicamente el
  capturador QA para comprobar503 y rollback real de versión/flujo.
- Typecheck, ESLint focal y `git diff --check`: PASS.
- Sin suites completas, build de producción ni stack/suite Docker E2E. Únicamente
  contenedores descartables de PostgreSQL/Mailpit; aplicaciones en procesos locales.
- Incidencias de pruebas corregidas: etiqueta de ConfirmDialog es «Volver»;
  restauración de spy JPA mediante reset (no llamar método abstracto real).

**Pendiente manual:** recorrido completo Firefox, móvil/teclado/lector de pantalla,
SMTP de un proveedor externo y experiencia de resultados inciertos. Lo anterior es
QA automatizada/HTTP del agente; no se atribuye PASS manual al usuario. EN_QA hasta
su confirmación. No commit/push/PR. Invitación/reset de cuentas antiguas, plantillas
avanzadas y reactivación general siguen fuera del alcance.

## Corrección Gmail — 2026-10-25 (EN_QA)

- `StaffInvitationMailerTests,SmtpEmailTests`: **15 PASS** (3 Staff +12 correo
  existente). Verifican reutilización del bean Gmail/configuración TLS, destinatario,
  enlace, fallo sanitizado sin reintento y ausencia de falso éxito sin SMTP.
  Transporte interceptado en test: no se enviaron mensajes reales a Gmail.
- `npm run typecheck` y `git diff --check`: PASS. Sin suite completa/build/E2E.
- Ejecución Java en copia temporal por permisos preexistentes de `backend/target`;
  Mockito necesitó instrumentación fuera del sandbox. Log: `/tmp/pms-staff-gmail-tests.log`.
- Suite HTTP adaptada a captura en memoria, compilada pero no ejecutada en esta
  corrección. La evidencia histórica de SMTP real no equivale a entrega Gmail.
- Pendiente: recepción real en Gmail y recorrido manual Firefox. Se conservan
  tokens/un uso/TTL, hash, evidencia M08, activación separada y estados anteriores.

## Alta con invitación automática — 2026-10-25 (EN_QA)

El hook de creación encadena un único POST invitation después del201 validado, con
ID/versión reales y mismo scope. El formulario sigue bloqueado durante el envío.
Al terminar cierra, limpia filtros/paginación e invalida el listado; distingue
creación+envío confirmado de creación confirmada con envío no confirmado. No se
vuelve a crear el usuario ante fallos de invitación. Un503/red/acuse inválido conserva
el bloqueo compartido hasta GET autorizado desde la opción manual existente. Una
alta incierta recuperada por GET no dispara invitaciones automáticamente. Cuenta
SUSPENDED y configuración Gmail/Backend/BFF sin cambios.

- Focal creación+invitación: **15 PASS**,45 escenarios ajenos omitidos mediante
  filtro de tests. Cubre ID/versión/scope, envío único, procesamiento,400/401/403/409/503,
  fallo de red/acuse inválido, recuperación sin replay y filtros/listado.
- `npm run typecheck` y `git diff --check`: PASS. Sin suite completa/build/Docker.
- Recepción Gmail real y recorrido Firefox pendientes; no se atribuye QA manual.

## Activación automática inicial — 2026-10-25 (EN_QA)

Autorización explícita del usuario sustituye el paso administrativo obligatorio
para altas nuevas. No amplía la reactivación general de cuentas antiguas. Se
conserva el DTO de consumo `{credentialPrepared:true}`; ahora su200 acredita el
commit conjunto de contraseña/M08/ACTIVE. OpenAPI actualizado. Página muestra
«Cuenta activada correctamente. Ya puedes iniciar sesión» y enlace a `/acceso`,
sin autologin ni redirección al panel. GET administrativo refleja ACTIVE al refrescar.
Correo de invitación actualizado; Gmail y envío automático tras alta se conservan.

- Backend focal: **35 PASS** (HTTP/PostgreSQL11, correo3, OpenAPI21). Comprueba
  login401 antes del consumo y201 después, ausencia de sesión/cookies al consumir,
  versión única, auditoría, token concurrente/un uso, caducidad, correo cambiado,
  membership/propiedades inactivas o vacías, cuentas antiguas/DISABLED y rollback
  de contraseña/M08/estado/token ante fallo de auditoría; locks compartidos con login.
- Web focal: **18 PASS** (alta/invitación15 + destinatario3); últimas aserciones de
  mensaje/enlace/sin instrucciones administrativas verificadas al repetir esos3.
  Typecheck y `git diff --check`: PASS. Sin suites completas/build/Docker E2E.
- Java en copia temporal por permisos previos de target; PostgreSQL descartable
  existente18547. Primer intento sin pruebas HTTP por clave QA con formato erróneo;
  corregida a Base64 sintética, ejecución final PASS. Log:
  `/tmp/pms-staff-autoactivation-tests.log`. Envío interceptado, no entrega Gmail real.
- Pendiente manual: crear con correo real → Gmail → establecer contraseña → login;
  refrescar Usuarios y comprobar ACTIVE sin «Actualizar → Activar». EN_QA, sin
  cierre global de3B-2 ni cambios de estados independientes. Sin commit/push/PR.

## Cierre por aceptación del usuario — 2026-10-25

**MVP de invitación y activación Staff — COMPLETADA / PASS por aceptación del
usuario**, tras el último ajuste de navegación. No se atribuyen nuevas ejecuciones
manuales ni se amplía la evidencia automatizada histórica.

Confirmación mantiene el mensaje de cuenta activada y el enlace «Iniciar sesión»
con Next Link a `/acceso?from=staff-activation`. Esa marca de navegación hace que
el login no redirija automáticamente por una sesión ya abierta en este navegador;
no autentica, no elimina cookies ni altera el comportamiento normal de `/acceso`.
No se modificaron Backend/BFF/Gmail/credenciales. Solo revisión de cambio y
`git diff --check` PASS en esta iteración; sin tests/build/Docker/QA adicional.
Pendientes específicos no acreditados (lector de pantalla y demás verificaciones
no ejecutadas) conservados; sin cierre global de reactivación ni QA independientes.

## Extensión: reactivación y recuperación Staff MVP — 2026-10-25, EN_QA

Autorización explícita del usuario amplía el alcance anterior. Se reutilizan los
mismos GET/POST invitation, PATCH status y POST consume, sin DTO ni migración nuevos.
`activationReady` acepta SUSPENDED con evidencia M08 consumida, enviada, no revocada,
generación/correo vigentes y membership/rol/propiedades válidos; ya no exige que sea
un alta inicial. No se infiere evidencia a partir de password_hash ni historia.

Una suspensión efectiva ACTIVE→SUSPENDED revoca todos los flujos pendientes en la
misma transacción, conservando M08 ya acreditada. El no-op conserva la política de
no efectos secundarios. Sin M08, POST invitation explícito por administrador inicia
recuperación con generación nueva e invalida enlaces anteriores; un flujo revocado
no impide esa nueva recuperación por cooldown. Solo el nuevo enlace vigente puede
consumirse y activar de forma atómica con contraseña/M08/auditoría/revocación.
Evento de consumo/activación común: STAFF_INVITATION_CONSUMED y
STAFF_INVITATION_ACTIVATED, con actor destinatario, organización y correlación del
flujo; emisión administrativa sigue atribuida al actor solicitante. Reactivación
directa conserva STAFF_STATUS_CHANGED y expectedVersion. DISABLED/SUPER_ADMIN/
autoedición/scope permanecen protegidos. Gmail existente y Guest sin cambios.

UI: Acceso → «Invitación / Activación» consulta elegibilidad real bajo demanda.
Muestra «Reactivar» con confirmación o «Enviar invitación de recuperación». Una
mutación por usuario, sin retry;409 exige GET/revisión y503 conserva bloqueo hasta
GET. Éxito publica «Usuario reactivado» o «Invitación de recuperación enviada» e
invalida/refresca consultas activas de listado y detalle; tres columnas intactas.
La confirmación de suspensión ya explica los requisitos de reactivación.

Evidencia automatizada de esta extensión:
- Backend: HTTP/PostgreSQL **14 PASS** finales, OpenAPI21 PASS y correo3 PASS
  (**38 pruebas distintas**, ejecuciones focalizadas). Incluye M08, legacy, versión
  obsoleta, login, tokens anteriores/reemplazados, suspensión, DISABLED, autoedición,
  permisos, scope, rollback/auditoría y consumo concurrente. PostgreSQL descartable
  existente18547; envío interceptado, no correo Gmail real. Logs:
  `/tmp/pms-staff-reactivation-tests.log`, `/tmp/pms-staff-reactivation-http-final.log`.
- BFF/Web: **34 PASS**; regresiones focalizadas de confirmación/swipe **3 PASS**.
  Typecheck y `git diff --check` PASS. Sin suites completas/build/Docker E2E.
- Fixtures corregidas durante la validación: respuesta409 debe llevar status y
  application/problem+json; RECEPCION requiere una propiedad activa para representar
  una sesión válida sin STAFF_MANAGE (sin ella correctamente401). No se relajó código
  de seguridad para pasar pruebas.

QA manual pendiente:
1. Suspender un usuario activado mediante invitación. En Acceso, Reactivar →
   Volver no debe escribir; confirmar Reactivar debe mostrar ACTIVE y mensaje.
2. En un SUSPENDED antiguo sin M08, enviar recuperación. Abrir Gmail, establecer
   contraseña, comprobar ACTIVE y login normal (sin autologin).
3. Comprobar que un enlace previo a suspensión no funciona; solo el nuevo enlace
   explícito. DISABLED no ofrece reactivación/recuperación.
4. Confirmar actualización de listado/detalle, móvil, teclado y lector de pantalla.

EN_QA hasta aceptación manual de esta extensión. Cierre previo de invitación y
activación inicial conservado como histórico; no se cierra globalmente3B-2 ni
otras fases por arrastre. Sin commit/push/PR; cambios locales preservados.

### Ajuste UI: swipe derecho de recuperación — 2026-10-25, EN_QA

StaffAdminRow conserva los tres foregrounds y agrega backdrop izquierdo: arrastre
derecho revela recuperación, izquierdo conserva suspensión/baja. Un único estado
de lado/fila impide dos paneles abiertos; gesto contrario cierra sin ejecutar.
StaffOnboardingActions reutiliza useStaffOnboarding y GET de elegibilidad bajo
demanda: Reactivar/UserRoundCheck con confirmación o recuperación/Mail sin M08.
Acción ocupa todo el panel, icono sobre texto; mouse/touch/wheel horizontal y
alternativa de teclado conservados. Al confirmar se cierra el panel y refrescan
listado/detalle; 409/503 conservan recuperación explícita. Sin Backend/BFF nuevos.

Automatizado: **64 PASS /2 archivos** (staff-status-actions y staff-invitation),
typecheck y git diff --check PASS. Incluye nuevo arrastre derecho mouse/touch,
wheel/teclado/Escape, lados opuestos, iconos, confirmación/cancelación, envío único,
DISABLED,409/503 y clic de edición durante gesto. Los tests wheel son eventos
sintéticos, no una prueba física del touchpad. Sin suite completa/build/Docker.
Pendiente Firefox real/móvil/lector de pantalla: probar SUSPENDED con/sin M08,
arrastrar derecha, confirmar o enviar, cerrar a izquierda y verificar que un
segundo gesto izquierdo conserva Deshabilitar. Mantener EN_QA; sin commit/push.

## Cierre Reactivación MVP — 2026-10-25

**Reactivación MVP — COMPLETADA / PASS manual**, por aceptación explícita del
usuario para el flujo confirmado de reactivación, incluida su integración con
el swipe. No se atribuye al usuario la ejecución de escenarios adicionales.

Separación de evidencia:
- Manual: aceptación del usuario del flujo de reactivación MVP. El cierre previo
  de invitación/activación inicial permanece conservado.
- Automatizada histórica: Backend38 pruebas focalizadas distintas PASS; BFF/Web34
  PASS y últimas64 pruebas de gesto/acciones PASS, typecheck/diff PASS según las
  entradas anteriores. No sumar ejecuciones repetidas como pruebas distintas.
- Pendientes manuales explícitos: recuperación de cuentas antiguas sin M08,
  proveedor SMTP externo adicional, lector de pantalla y escenarios409/503 o
  dispositivos físicos no acreditados individualmente por el usuario. La cobertura
  automatizada no equivale a esas verificaciones manuales.

En esta preparación de commit/PR solo se revisaron cambios y se ejecutó
`git diff --check`; no se repitieron suites, builds ni Docker. Verificaciones
completas delegadas al CI del PR. Cambios ajenos Android y next-env.d.ts excluidos
y preservados. Sin cierre por arrastre de BE-006B/C, BE-014A ni QA2A/2B. No merge.
Las entradas EN_QA anteriores representan la evidencia histórica previa al cierre.

## Integración PR166 — 2026-10-25

Merge normal de origin/main0d1f4b7 en f4e0e44. Dos conflictos solo documentales
resueltos conservando ambos historiales; OpenAPI combinado22 PASS y typecheck/diff
PASS. Primera CI: Stack PASS; Web12 fallos por segundo argumento undefined al
callback legado; Backend6 fallos por conteos previos a migración012. Corrección
conserva API de gesto izquierdo y no monta recuperación no aplicable; cinco tests
de upgrade incorporan012 y siguen comprobando checksums/datos/idempotencia.
Verificación focal correctiva: Web105 PASS /3 archivos, migraciones23 PASS /5
clases, typecheck/diff PASS. Sin suites completas locales ni nueva QA manual.
Esperar nueva CI; aceptación manual previa no cambia. Android/next-env preservados.
