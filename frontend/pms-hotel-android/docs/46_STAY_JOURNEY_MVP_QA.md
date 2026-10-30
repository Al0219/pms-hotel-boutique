## Cierre final — PASS manual completo confirmado por el usuario

PASS para Check-in/Check-out, solicitudes de servicio, folio/pagos, PDF, navegación
Guest y Web Staff. Se conservan los 12/12 PASS manuales previos; el PASS actual
confirma el recorrido completo, incluido PDF y los últimos cambios visuales/demos.
DoD completo, sin bloqueos conocidos. Rama `feature/stay-checkout-payments-mvp`, PR
pendiente de CI. No merge.

# Stay Journey MVP — Android HTTP y QA integrado

Estado: **PASS técnico / EN_QA manual**. Rama `feature/stay-checkout-payments-mvp`.
Contrato: [Backend64](../../../backend/docs/64_STAY_JOURNEY_MVP.md).
No commit/push/PR. No migración ni despliegue sobre la base del hotel.

## Refinamiento visual PDF y recuperación de demos — EN_QA

Se conservan los12/12 PASS manuales previos. El PDF nuevo adapta el diseño HTML
anterior: monograma HB, verde institucional, referencia/fechas/estancia, tabla,
pagos/totales y aviso no fiscal. Solo cambia el renderer de primera emisión;
archivos emitidos siguen devolviendo sus bytes/SHA originales. Sin migración nueva.
Hotel/Perfil/Rewards/Promociones restauran sus componentes/fixtures existentes,
identificados como demostración. Perfil demo sin edición/guardado/consentimiento;
no se altera Auth, estancia, servicios ni finanzas HTTP. Sin pantallas Próximamente.

Validación:19 Backend PASS (diseño/paginación, concurrencia/inmutabilidad y restart),
JAR verify; PDF renderizado/revisado y texto/A4/paginación verificados con Poppler.
Android:83 casos acreditados por etapas (7 suites/72 PASS y Perfil11 PASS en
recheck; se corrigió una aserción textual del test nuevo). Navegación HTTP, perfil
demo sin mutaciones y pantallas/archivo original cubiertos; lint/typecheck/export
Android PASS. Evidencia `visual-*.log` en `/tmp/pms-stay-session2`.
Sin cambios Web/API/migraciones ni despliegue. Actualizar solo Backend QA después de
preflight/respaldo verificado del bloque siguiente, usando `--no-deps backend`;
reiniciar Expo con los mismos comandos HTTP. No reconstruir Web ni reseed.
Manual nuevo: inspeccionar un documento **nuevo** y recuperar uno ya emitido sin
cambios; navegar las cuatro vistas demo/regresar conservando estancia y comprobar
que Perfil no guarda cambios. No repetir los12 casos anteriores.

## Cierre de pendientes — PASS técnico / EN_QA manual

**12/12 PASS manual anteriores confirmados por el usuario, conservados.** No se
repiten ni acreditan por inferencia los cambios nuevos. La iteración parcial queda
resuelta con PDF binario original persistido y bloqueo visual de servicios.

- Backend010: PDF original bytea, SHA-256 e identidad del snapshot único por estancia;
  primera emisión explícita POST document-file con lock/PK, trigger inmutable y
  auditoría. GET devuelve siempre los mismos bytes. Snapshot anterior sin archivo:
  404 hasta primera emisión elegible; no se atribuye persistencia a un PDF local.
- Android/Web emiten y recuperan ese mismo archivo; Visualizar/Compartir/Descargar
  no generan otro PDF. Sin Actualizar documento. Emisión exige checkout confirmado,
  saldo verificable/cero y pedidos cobrables resueltos; lectura autorizada persistente.
- Gate Android HTTP por estancia en Room Service/Amenidades/Housekeeping/Valet,
  aviso uniforme y creación bloqueada con checkout OPEN/CHECKED_OUT. Backend
  central serializa creación/salida; historial, resolución Staff y pagos disponibles.
- Hotel, Rewards/Promociones y regreso conservan contexto; Chat oculto, módulo
  conservado. Iconos compartidos semánticos y confirmación adaptable/busy.

### Evidencia técnica de esta continuación

Logs locales: `/tmp/pms-stay-session2/document-*.log`. No sumar corridas solapadas.

| Área | Evidencia ejecutada / resultado |
| --- | --- |
| Backend documentos/OpenAPI | `document-backend-recheck.log`:44 PASS; `document-last-scope.log`:15 PASS finales; `document-migration-last.log`:1 PASS. `document-backend-last.log`:47 PASS y1 baseline de fixture fallido, corregido y vuelto a ejecutar en migration-last. JAR/verify PASS. |
| Regresión Backend | `document-backend-final.log`:111 casos lifecycle/folio/Valet/Room Service/Housekeeping/Amenidades PASS;3 errores JDBC Instant en casos PDF se corrigieron a Timestamp y se repitieron con éxito en recheck. |
| Persistencia real | StayDocumentRestartIntegrationTests:2 PASS, nuevo contexto Spring/pool recupera bytes idénticos; upgrade008→009/010, reaplicación e históricos sin cambios PASS. Bases técnicas aisladas, nunca QA manual/hotel. |
| Integración HTTP real | `document-http-final.log` y `document-bridge-final-backend.log`:1 PASS por runner; NativeGuestClient→Backend/PostgreSQL→BFF Next producción. Emisión Guest/Staff concurrente, SHA-256 igual en ambos, reintentos, restore, cargos/pagos y aislamiento. |
| Android | `document-android-full-final.log`:62 suites/631 PASS, bridge opcional separado. Regresión posterior45 PASS; `document-native-view-last.log`:16 PASS de última edición. Gate/menú/contexto, materialización original sin Print, errores y doble clic cubiertos. Jest termina normalmente, sin forceExit. |
| Web | `document-web-final-tests.log`:40 archivos/212 PASS; `document-web-view-last.log`:5 PASS finales de emisión/Blob/acciones, elegibilidad y doble clic. |
| Calidad | Lint/typecheck de ambos clientes; build Web y export Android HTTP; Expo Doctor21/21; OpenAPI27 PASS (129 operaciones/105 paths/154 schemas/16 tags); git diff --check. PDF validado con pdfinfo y pdftotext, texto no fiscal/acentos legibles. |

Avisos existentes de act en tests de servicios, errores de visor intencionados en
negativos, Mockito/JDK y NO_COLOR. No equivalen a errores de la suite ni a QA de
pantalla/visor físico. No se usa forceExit para ocultar handles.

### Actualizar exclusivamente QA existente (sin ejecutar reseed)

010 **no aplicada aún al QA manual**. Solo se probó en PostgreSQL técnico aislado.
El siguiente despliegue aplica Liquibase automáticamente. Primero preflight y backup
QA verificado; si cualquier comando falla, detenerse. Estos comandos no se han
usado para desplegar esta continuación ni modifican la base habitual.

```bash
set -euo pipefail
cd /tmp/pms-stay-contract
export PMS_STAY_QA_LAN_IP=10.34.49.253
backend/scripts/stay-qa.sh preflight
qa_compose=(docker compose --env-file /dev/null -p pms-stay-manual-qa -f compose.stay-qa.yaml)
# Detener escritores QA durante respaldo/despliegue; PostgreSQL permanece activo.
"${qa_compose[@]}" stop backend web
umask 077
qa_backup="/tmp/pms-stay-manual-qa/pre-010-$(date +%Y%m%d-%H%M%S).dump"
"${qa_compose[@]}" exec -T postgres pg_dump -U pms_stay_qa -d pms_stay_qa -Fc > "$qa_backup"
# Verifica archivo legible/completo, sin restaurarlo sobre ninguna base.
test -s "$qa_backup"
"${qa_compose[@]}" exec -T postgres pg_restore --list < "$qa_backup" > "$qa_backup.list"
"${qa_compose[@]}" exec -T postgres pg_restore --file=/dev/null < "$qa_backup"
sha256sum "$qa_backup" > "$qa_backup.sha256"
sha256sum -c "$qa_backup.sha256"
"${qa_compose[@]}" up -d --build --wait --no-deps backend web
"${qa_compose[@]}" exec -T postgres psql -U pms_stay_qa -d pms_stay_qa -v ON_ERROR_STOP=1 -c "SELECT id,exectype FROM databasechangelog WHERE id='005-stay-document-files-010'; SELECT count(*) FROM stay_document_files;"
```

No continuar si el respaldo no se verifica. `pg_restore --file=/dev/null` comprueba
lectura del archivo completo; no certifica un ensayo de restore SQL en otra base.
No down -v, seeder ni modificación de reservas existentes. Si cambia la IP LAN,
usar la IP privada real tanto en Compose como Expo. Detener Metro anterior (Ctrl+C):

```bash
cd /tmp/pms-stay-contract/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://10.34.49.253:18089 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --clear --port 8082
```

### Nuevas comprobaciones manuales mínimas — pendientes

1. Solicitar salida: cuatro servicios bloqueados con aviso; historial, pagos y
   seguimiento siguen accesibles; Staff resuelve solicitudes anteriores.
2. En estancia elegible generar Web→visualizar/compartir Android; en otra elegible,
   Android→visualizar/descargar Web. Reintentar/doble clic, reabrir sesión/app y
   reiniciar Backend QA conservando volumen: mismo ID/SHA-256/PDF original. No
   crear otra emisión ni regenerar documentos históricos para repetir el caso.
3. Hotel→Inicio/Servicios y menú/perfil/Rewards/Promociones: misma estancia/sesión,
   destinos válidos, Próximamente donde corresponde y Chat ausente.
4. Teléfono pequeño/fuente ampliada: botón salida e iconos sin recortes; Web modal
   compacto sin párrafos retirados, visor/descarga accesibles.

El caso1 exige estancia IN_HOUSE con solicitud nueva válida; no modificar SQL ni
resetear una estancia terminada para obtenerla. Las carreras y dos estancias ya
están cubiertas técnicamente; no repetir los12 PASS manuales anteriores.

## Registro histórico de iteraciones anteriores

Los comandos/estados siguientes describen sesiones anteriores. Para esta entrega
usar únicamente el bloque de actualización QA de arriba: **no ejecutar seeder**.

## Refinamientos finales de formularios — EN_QA manual

**Resultado confirmado por el usuario: 8/8 PASS manual de las correcciones UX
anteriores.** Se conserva ese resultado; estos cuatro refinamientos requieren una
nueva confirmación manual y mantienen EN_QA.

- MM/AA inteligente idéntico en Android/Web:2→02/,226→02/26,12→12/,139→01/39,
  0126→01/26. Admite borrar/corregir y distingue Backspace de pegado para no alterar
  el año ni atrapar el separador. Validación de vigencia con fecha real conservada.
- Titular filtra al escribir/pegar: letras Unicode, espacios y puntos, máximo40;
  mínimo3 y validación final. PAN/CVV siguen exclusivamente locales.
- Importe inválido: solo «Debe ingresar un importe entre Q. 0.00 y Q. {saldo}.»;
  saldo Backend con2 decimales, también al actualizarlo. Continúa importe>0,
  máximo2 decimales y<=saldo; sin cambios en reglas/revalidación Backend.
- Seleccionar Tarjeta abre inmediatamente el modal, con X accesible y sin pago al
  abrir. Mantiene borrador de importe/concepto de efectivo; el importe editado en
  tarjeta se conserva en el flujo. Sin botón adicional. Confirmar registra una sola
  operación; pendientes/reintentos conservan la referencia. Efectivo sin tarjeta.

Técnico: Web188 PASS/38 archivos; Android63 PASS/4 suites con detectOpenHandles,
salida normal sin forceExit. Lint/typecheck de ambos clientes PASS. Builds Web y
export Android verificados; git diff --check PASS. Evidencia local:
`/tmp/pms-stay-session2/forms-*.log`. Sin cambios Backend/contratos/migraciones,
sin reinicializar ni escribir en PostgreSQL QA o base habitual, sin publicación.

Actualizar únicamente Web en el QA actual (Backend/PostgreSQL conservados):

```bash
cd /tmp/pms-stay-contract
PMS_STAY_QA_LAN_IP=10.34.49.253 docker compose --env-file /dev/null -p pms-stay-manual-qa -f compose.stay-qa.yaml up -d --build --wait --no-deps web
```

Detener Metro anterior con Ctrl+C y reiniciar Android HTTP real:

```bash
cd /tmp/pms-stay-contract/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://10.34.49.253:18089 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --clear --port 8082
```

QA manual pendiente: comprobar los cinco ejemplos MM/AA y edición/pegado, titular
con números/símbolos/tildes/puntos, aviso de importe y saldo actualizado, Tarjeta→
modal inmediato/X/confirmación única y Efectivo sin campos de tarjeta. No ejecutar
seeder ni reiniciar el recorrido para estos ajustes. No commit/push/PR.

## Ajustes UX anteriores — 8/8 PASS manual confirmado

Inicio oculta Checkout hasta IN_HOUSE confirmado; sin botón Actualizar estancia.
Checkout usa pull-to-refresh y conserva referencias pendientes incluso tras cerrar
el modal/actualizar. Folio ticket TIPO/CARGO/PRECIO, totales Backend sin recálculo.
Room Service muestra fecha/hora de entrega solicitada persistidas del pedido;
si solo existe referencia histórica, muestra Room Service sin inventar datos/UUID.
PDF mantiene su snapshot y detalles; no se alteran documentos ni movimientos previos.

Android/Web Staff: solo Visa4242424242424242, MM/AA vigente hasta10 años, CVV123,
titular Unicode3–40 normalizado e importe positivo<=saldo. Máscaras editables,
errores por campo, prefijo Q. y único Confirmar; sin escenarios ni aprobación al
escribir. PAN/CVV nunca salen del formulario. Recuperación mantiene key/payload.
Web elimina el panel de entrada/salida separado: solicitudes y confirmación
contextual en acciones existentes; salida disabled con causa concreta hasta saldo0
verificable/sin pedidos. Check-in no depende de deuda. Folio y pagos reúne Efectivo
por el flujo61 y Tarjeta de prueba; sin dos formularios activos simultáneamente.

Pruebas: Backend92 PASS +OpenAPI/verify/JAR; Web486 en regresión amplia y20 en
layout/acciones/folio final; Android69 en regresión y14 HTTP UI finales con
--detectOpenHandles, terminación normal sin forceExit. Corridas solapadas, no sumar.
Lint/typecheck Android/Web, build Web, export Android y diff-check PASS. PDF conserva
sus pruebas; logs de fallos nativos intencionales en pruebas negativas no son fallos.
Evidencia `/tmp/pms-stay-session2/ux-*.log`. Sin migraciones nuevas ni escritura de
esta iteración en base habitual o QA manual; pruebas PG en proyecto desechable.

Para aplicar al QA existente, conservar volumen/datos y no ejecutar el seeder:

```bash
cd /tmp/pms-stay-contract
export PMS_STAY_QA_LAN_IP=10.34.49.253
backend/scripts/stay-qa.sh preflight
docker compose --env-file /dev/null -p pms-stay-manual-qa -f compose.stay-qa.yaml up -d --build --wait --no-deps backend web
```

Detener Metro anterior con Ctrl+C; volver a ejecutar el comando Expo de abajo con
--clear. Verificar manualmente Inicio RESERVED/pending→IN_HOUSE, gesto de actualización,
ticket, errores/máscaras/abono/total, X/recuperación; Web sin panel redundante,
solicitudes contextuales, efectivo sin tarjeta y salida bloqueada→habilitada.
Correcciones anteriores:8/8 PASS manual confirmado. Los cuatro refinamientos
indicados arriba permanecen EN_QA hasta confirmación del usuario.

## Evidencia de sesión2 (2026-10-29)

- Android: suite completa **60 suites /581 pruebas PASS**,1 escenario HTTP opcional
  omitido en la corrida normal y ejecutado por separado PASS. Salida normal sin
  `--forceExit`. Focal nueva15 PASS también con `--detectOpenHandles`, sin handles
  reportados. Warnings existentes de `act` en Valet/Amenidades y logs de errores
  PDF provocados deliberadamente por sus pruebas; no fallos ni procesos colgados.
- Backend: **87 PASS**, verify/JAR y OpenAPI27 PASS incluidos. Lifecycle40,
  Journey8, migración009 upgrade/reaplicación1, Room Service11. PostgreSQL desechable
  del proyecto `pms-stay-mvp-qa`; ninguna base del hotel o examen utilizada.
- Bridge TCP real: `StayJourneyNativeBridgeIntegrationTests` + Android
  `tests/integration/stay-journey-http.test.ts` PASS. NativeGuestClient/FetchTransport,
  Backend, PostgreSQL y BFF Next reales. Check-in/checkout, pago Android→Web,
  pago Web→Android, respuesta descartada después de commit + replay, DONE repetido
  sin doble cargo, deuda/pedidos409, ajeno404, logout401, restore y documento idéntico.
  Asserts SQL: saldo0, Room DIRTY,3 PAYMENT,2 CHARGE,1 documento,2 requests DONE.
  No es prueba de teléfono físico ni de un visor PDF nativo.
- Android lint/typecheck, Expo Doctor21/21 y export Android **PASS**. Export HTTP
  sin mock; su URL de compilación de prueba no es un endpoint desplegado.
- Web: regresión focal24 archivos/96 pruebas PASS; lint/typecheck/build PASS.
  Android regresión final de Checkout/Invoice/Account:8 suites/55 PASS después de
  los últimos ajustes de presentación PDF y validación del almacenamiento.
- Evidencia local: `/tmp/pms-stay-session2/`. Backend/Web de sesión1 conservan su
  evidencia en `/tmp/pms-stay-session1/`; no sumar corridas solapadas como casos nuevos.

Capas: HTTP cerrado → mapper con scope estricto → hook por cuenta/reserva/estancia
→ UI. Fecha local/versión exacta Backend; refresco cada10s mientras la pantalla está
activa, además de foco/actualización manual. Cambiar estancia/logout desmonta la UI
anterior. Requests no completan estancia. Finanzas solo para responsable Backend.

Pago: solo3 tarjetas sintéticas visibles; número/Luhn/MM-AA/CVV ficticio/nombre e
importe validados localmente. Solo amount/currency/instrumentToken viajan. SecureStore
conserva key+payload permitido antes de enviar; scope de Backend/cuenta/reserva/estancia.
Timeout/401/403/404 conserva intento;400/409 definitivo permite revisar/reintentar.
APPROVED/DECLINED/ERROR se anuncian únicamente después del recibo persistido.

Histórico, sustituido por010: el PDF local se construía desde GET document.
Ahora el definitivo se recupera por GET document-file con identidad binaria estable;
no se regenera desde el snapshot en el cliente. Resumen previo es provisional sin botón PDF. No envío de correo,
FEL, PSP ni cálculo desde precios/solicitudes locales. Mocks solo con flag true.

## Entorno QA aislado activo — 29/10/2026

**Usar este entorno, no reconstruir ni cambiar fechas de la instalación habitual.**
Compose independiente [compose.stay-qa.yaml](../../../compose.stay-qa.yaml), proyecto
`pms-stay-manual-qa`. No extiende compose.yaml y usa `--env-file /dev/null`.
PostgreSQL `pms_stay_qa`/usuario `pms_stay_qa`, volumen propio
`pms-stay-manual-qa_stay-qa-postgres`; nunca utiliza
`pms-hotel-boutique_pms-hotel-postgres`. PG no publica puertos y permanece en una
red interna; Backend/Web/Mailpit tienen además una red de acceso exclusiva QA.
Preflight valida configuración efectiva **antes** de iniciar servicios/migraciones.

Backend LAN `http://10.34.49.253:18089` (también loopback para scripts), Web
`http://localhost:3302`, Mailpit `http://127.0.0.1:18090`. Imágenes/contenedores
propios. No se cargan secretos habituales ni se envía correo externo: SMTP exige
AUTH/STARTTLS, certificado QA con SAN mailpit y truststore local, sin desactivar TLS.
Certificados/config efectiva/resultados están fuera de Git en `/tmp/pms-stay-manual-qa`.

| Uso | Cuenta sintética | Contraseña solo QA |
| --- | --- | --- |
| Android Guest | guest.demo@example.test | PmsDemoLocal2026! |
| Web Staff para recorrido completo | stay.admin@example.test | StayQaAdminOnly2026! |
| Staff recepción, negativos de OPERATIONS_MANAGE | staff.demo@example.test | PmsDemoLocal2026! |

Abrir Web en **ventana privada**, separada del PMS habitual: los cookies no distinguen
puertos de localhost. Seleccionar propiedad **Hotel Boutique Demo**, GTQ,
`America/Guatemala`. En Android hacer logout de otra instalación antes de usar la
nueva URL; no reutilizar sus tokens. Reloj QA: **Sistema / SYSTEM**. No cambiar reloj
SO ni usar presets antiguos como autorización; GET journey/state confirma la fecha
real del Backend `2026-10-29`.

**Reserva manual preparada:** `YNG35F7GN3`, habitación **201**, llegada
**2026-10-29**, salida **2026-10-30**; estado RESERVED, Room INSPECTED.
Reserva `2d73735b-1488-479f-bf81-2625a0dbf19e`, estancia
`e6c2f9b4-71e9-45c5-8ee6-f1d9d09a989b`. Guest responsable verificado y vínculo OTP
CONSUMED. Cargo alojamiento real de **Q650.00**, proveniente de cotización/creación
Staff55; no SQL financiero. Esta reserva no se consumió por el smoke.

**Reserva smoke:** `EYETRWEHFL`, habitación202, mismas fechas; ya CHECKED_OUT, Room
DIRTY, saldo0, documento `6cdeaba2-12e4-4e2f-a866-39c23df816c1`.
La reserva smoke sirve para recuperar un documento previo; no iniciar el recorrido
manual en ella. Ambas se crearon por Staff creation-options/POST reserva, se
asignaron por API después de DIRTY→CLEAN→INSPECTED y se vincularon por challenge/OTP
real capturado en Mailpit. Guest verificado usa el bootstrap demo existente, sin
alterar Auth. No se insertaron links, solicitudes ni movimientos a mano.

Configuración QA imprescindible: el bootstrap demo crea su Property después de
Liquibase; por eso el catálogo Room Service allí empezaba vacío. El script configura
**solo QA** copiando exactamente los productos/precios GTQ ya aprobados por005 a esa
Property (idempotente, sin modificar los originales ni inventar importes). No hay
API de edición de catálogo en este MVP. Reserva, folio, habitación, vínculos y
operaciones siguen sus flujos reales. No se modifica ninguna migración aplicada.

Comandos reproducibles, desde el worktree (los servicios ya están iniciados):

```bash
cd /tmp/pms-stay-contract
export PMS_STAY_QA_LAN_IP=10.34.49.253
backend/scripts/stay-qa.sh preflight
backend/scripts/stay-qa.sh start
# Reutiliza las reservas guardadas; no duplica ni reinicia el recorrido manual.
python3 backend/scripts/stay-qa-seed.py --smoke
```

La IP debe corresponder a la Wi-Fi del equipo/teléfono; si cambia, exportar la IP
privada correcta antes del start. El preflight rechaza IP pública/loopback. No cargar
el .env principal, no emplear puertos8080/18085/3001 del PMS habitual ni del examen.
Fixtures de fechas fijas: el script rechaza ejecutar otro día; no adelanta/retrasa
relojes ni cambia fechas existentes para esquivar validaciones.

Expo Go SDK57, misma Wi-Fi; puerto Metro separado8082:

```bash
cd /tmp/pms-stay-contract/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://10.34.49.253:18089 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --clear --port 8082
```

Escanear QR → logout/login Guest QA → selector de estancia → `YNG35F7GN3` →
control flotante QA → **Sistema** → Account. No usar localhost/127.0.0.1 en el teléfono.
Si hay firewall Wi-Fi, habilitar únicamente el acceso LAN necesario a18089 y8082;
no cambiar credenciales ni usar mocks para resolver conectividad.

Detener únicamente QA conservando volumen y registros:

```bash
cd /tmp/pms-stay-contract
PMS_STAY_QA_LAN_IP=10.34.49.253 docker compose --env-file /dev/null -p pms-stay-manual-qa -f compose.stay-qa.yaml stop
```

No ejecutar down -v. Inicio posterior con start conserva la base. Mantener archivos
`manual.json`/`smoke.json` de `/tmp/pms-stay-manual-qa` para recuperar IDs y reintentos.
No ejecutar --smoke como reinicio de una prueba fallida a mitad de un pago; conservar
su referencia y revisar estado. Después de PASS, el script solo recupera documento.

Evidencia actual: cuatro servicios healthy; preflight PASS;009 EXECUTED solo en el
PG QA seleccionado por estos comandos;2 vínculos OTP CONSUMED. Smoke HTTP/BFF real
PASS, reintentos sin duplicar, DECLINED/ERROR sin PAYMENT,1 cargo Room Service tras
DONE repetido, bloqueo por deuda/pedidos, pago Android/API→Web y Web→Guest/API,
checkout anticipado y documento idéntico al hacer login nuevamente. Esto **no** es
PASS manual de Android físico ni del visor PDF. Reinicio real de PostgreSQL/Backend/Web
QA PASS: mismo documento recuperado,2 reservas,2 PAYMENT en smoke,1 posting Room
Service y1 documento; manual RESERVED/INSPECTED con único CHARGE Q650. URL LAN
/actuator/health responde UP y firewall existente permite18089/8082; sin cambios de
firewall. Preflight adicional rechaza IP pública y no admite sobrescribir DB vía
PMS_DATABASE_URL ambiental. Logs `start.log`, `seed.log`, `persistence.log` y
`smoke-result.json` fuera de Git. No se alteró la base habitual en esta preparación.

## QA manual pendiente — registrar resultado del usuario

1. Login Guest responsable verificado, elegir reserva estándar GTQ/una estancia.
   En fecha local solicitar entrada; Web ve OPEN. Room INSPECTED y Staff confirma;
   Android muestra IN_HOUSE al actualizar o en10s. Antes de arrival no permite pedirla.
2. Solicitar checkout anticipado con deuda: OPEN, nunca salida local. Web rechaza
   con deuda; Room Service pendiente también bloquea con saldo0. DONE genera un
   cargo único; repetir actualización no lo duplica. Otros servicios no se suman.
3. Android: tarjeta4242424242424242/CVV123/MM-AA futuro/nombre de prueba.
   Rechazar tarjeta ajena, fecha vencida, CVV/importe inválidos. Abono aprobado se
   ve en Web; no se aprueba al escribir y no hay selector de escenarios. Pago Web
   o efectivo recibido actualiza Android. Doble clic o
   pérdida de red exige recuperar la misma operación, no introducir otra key.
4. Con saldo0/pedidos resueltos, Staff confirma salida: Android CHECKED_OUT, Room
   DIRTY y documento con mismos movimientos/totales/referencia que Web.
5. Generar, visualizar y compartir PDF en Android; comprobar aviso no fiscal,
   cargos/pagos/saldo0 y fechas. Cerrar app, login, seleccionar reserva anterior,
   recuperar documento y regenerar el PDF con la misma referencia/cifras.
6. Cambiar estancia y logout: no muestra cifras anteriores. Cuenta ajena/no
   responsable no ve ni paga finanzas; Staff sin permiso/property tampoco.
7. Back, scroll/teclado del formulario, cierre de modal, reanudación y sesión
   caducada: sin éxito falso, sin completar estancia ni perder referencia pendiente.

Sin PASS manual hasta confirmación explícita. Si falla conectividad, comprobar
IP/puerto y firewall LAN; no confundir Expo Metro con Backend ni habilitar mocks.
