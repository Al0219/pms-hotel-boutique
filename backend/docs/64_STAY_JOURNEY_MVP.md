## Cierre final — PASS manual confirmado

El usuario confirma PASS manual completo del MVP: check-in/out, pagos, PDF original,
servicios, navegación e interfaces. VAL/flujo financiero conforme a este contrato;
sin bloqueos conocidos. El diseño PDF actual aplica solo a emisiones nuevas; bytes
históricos quedan inmutables. Referencia operativa y evidencia: QA46 / AlanHandoff.

# Stay Journey MVP — decisiones, API y handoff

Estado: **PASS técnico y PASS manual confirmados por el usuario; DoD completo**.
Rama `feature/stay-checkout-payments-mvp`, worktree `/tmp/pms-stay-contract`, base
`ba70022` (main posterior a PR180). Preparado para PR a main; sin merge. Auditoría previa conservada
en `/tmp/pms-stay-audit/AUDIT_AND_CONTRACT_PROPOSAL.md`; no se amplía esa auditoría.

## Decisiones aplicadas

- Reutiliza lifecycle54. Guest solicita CHECK_IN desde arrival según timezone de
  propiedad; Staff confirma con los botones existentes o realiza entrada presencial.
  Solicitar no cambia la estancia. No exige Room lista para solicitar; sí para entrar.
- CHECK_OUT admite solicitud anticipada durante IN_HOUSE y con deuda. Staff solo
  confirma con contabilidad verificable y **saldo exactamente cero**. Se preservan
  Room INSPECTED al entrar, DIRTY al salir, CAS, permisos, locks y auditoría.
- Finanzas MVP: una estancia, un folio GUEST, GTQ, sin grupo empresarial. Casos no
  soportados devuelven409. No hacer backfill financiero ni interpretar folio vacío
  como saldo0. No cerrar el folio automáticamente ni compensar créditos/refund.
- Room Service DONE postea su total persistido una sola vez; vínculo order/movement
  único PostgreSQL. Estado/audit/cargo confirman o revierten juntos. OPEN/IN_PROGRESS
  cobrables y DONE sin posting bloquean checkout. Importe0 no postea ni bloquea.
  Pedidos cobrados no se reabren/cancelan para alterar deuda. Amenidades, Valet,
  Housekeeping, Late Checkout mock y estimaciones no se cobran.
- Pedidos DONE anteriores: acción Staff explícita «Contabilizar pedidos entregados»,
  repetible sin duplicación; GET nunca contabiliza. Requiere FOLIO_PAYMENT_OPERATE.
- Guest financiero exige sesión activa, link propio **y** email verificado de cuenta
  igual al booking Guest persistido, con guest_account_id compatible si existe.
  Se revalida en Backend, también en replay; link/UUID solo no conceden finanzas.
- Pagos simulados: abonos/total sobre saldo real, sin sobrepago. Solo token sintético;
  APPROVED genera PAYMENT y recibo; DECLINED/ERROR persisten intento sin PAYMENT.
  Guest tiene actor GUEST; nunca se introduce su UUID en el FK Staff created_by.
- Tokens permitidos: demo_visa_approved, demo_mastercard_approved,
  demo_amex_approved, demo_card_declined, demo_gateway_error. Validación de número
  allowlisted/longitud/Luhn/MM-AA/CVV ficticio/titular local en formulario aislado.
  No PAN/CVV/expiry en HTTP, almacenamiento, logs ni telemetría. Los formularios Android/Web Staff usan solo Visa ficticia4242424242424242,
  CVV123, MM/AA vigente hasta10 años, titular Unicode3–40 e importe<=saldo.
  Confirmar solicita APPROVED sin selector; Backend conserva los recibos/resultados
  autorizados y revalida importe/saldo. PAN/CVV permanecen locales.
- Checkout guarda snapshot JSON inmutable del ledger, totales y solicitudes,
  asociado de forma única a stay/operación. Recuperable después; no recalcula al
  cambiar datos. Texto: «Documento informativo — sin validez fiscal».
  El PDF definitivo se emite explícitamente desde Backend y se persiste mediante010.
  Sin FEL/PSP. Ambos clientes recuperan los mismos bytes; no regeneran el PDF real.

## Cierre de pendientes — PDF original y bloqueo de servicios

010 agrega `stay_document_files`: PK/FK document_id al snapshot único por estancia,
PDF bytea, SHA-256, created_at y trigger que rechaza UPDATE/DELETE. No hace backfill
ni modifica snapshots/históricos. Los PDF locales antiguos nunca se presentan como
originales ya almacenados: requieren primera emisión explícita desde su snapshot.

G y S conservan sus bases y permisos. **GET /document-file** recupera
`{documentId,pdfBase64,sha256,createdAt}`;404 si no se emitió. **POST /document-file**
con cuerpo vacío/{} emite una vez o devuelve el original; sin datos de contenido
cliente. Checkout confirmado, snapshot y saldo verificables/cero, sin pedidos
cobrables pendientes. La identidad del documento actúa como referencia idempotente;
lock de fila más PK evita duplicados Guest/Staff concurrentes. GET nunca genera.
Formato PDF A4 paginado con tipografía WinAnsi para el MVP español/GTQ, límite8MB.
Se registra el actor en la primera emisión y no se reauditan reintentos. Respuestas
privadas/no-store, mismos controles de responsable financiero y propiedad.

Android/Web consultan estado del archivo y muestran Generar solo si es elegible;
una vez emitido, Visualizar/Compartir o Descargar consumen los mismos bytes. No hay
nuevo PDF en Expo Print/navegador en modo HTTP. Cachés de dispositivo son copias.

La creación central de servicios adquiere lock de la estancia compartido con la
solicitud de salida; revalida el estado persistido antes de crear cualquier servicio
asociado. OPEN CHECK_OUT o CHECKED_OUT devuelve409 `CHECKOUT_REQUEST_PENDING`.
El rechazo no crea pedidos/cargos. Historial, transiciones de pedidos anteriores,
finanzas y archivo siguen disponibles; el bloqueo no se propaga a otras estancias.
No se añade una cancelación/rechazo de checkout inexistente: se conservan sus estados
aprobados OPEN/DONE. Android consulta estado Backend por cuenta/estancia, bloquea
creación sin fallback mock y conserva historial. Hotel/menú mantienen contexto;
Hotel/Perfil/Rewards/Promociones reutilizan sus vistas demo identificadas; edición
no integrada deshabilitada y ningún dato Backend se sustituye. Chat sigue oculto.

## API implementada

G=`/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/journey`.
S=`/api/v1/properties/{propertyId}/stay-journey/{reservationId}/{stayId}`.

| Método/sufijo | Guest | Staff |
| --- | --- | --- |
| GET /state | Stay con updatedAt exacto, fecha local servidor y requests; sin finanzas | — |
| GET /requests | Link propio | RESERVATION_MANAGE + property |
| POST /requests | {kind:CHECK_IN/CHECK_OUT,expectedUpdatedAt}; key obligatoria | — |
| GET /summary | Responsable financiero verificado | FOLIO_PAYMENT_OPERATE + property |
| POST /payments | Responsable financiero verificado | FOLIO_PAYMENT_OPERATE + property |
| GET /document | Snapshot propio persistido;404 antes del checkout | FOLIO_PAYMENT_OPERATE + property |
| GET /document-file | PDF original almacenado;404 antes de emisión explícita | FOLIO_PAYMENT_OPERATE + property |
| POST /document-file | Emisión única elegible o recuperación del original | FOLIO_PAYMENT_OPERATE + property |
| POST /reconcile | — | Contabilizar DONE históricos desde total persistido |

POST payments JSON cerrado `{amount:"30.00",currency:"GTQ",instrumentToken:"demo_visa_approved"}`.
Idempotency-Key alfanumérica/guiones16–100 para pagos/solicitudes.200 para recibo
nuevo/replay. Payload distinto con misma clave409. Resultado de pago contiene
operationId,folioId,result,amount,currency,movementId nullable,completedAt.
Summary proyecta la descripción Room Service desde service_date/delivery_time del
pedido enlazado al posting; no modifica movimientos ni snapshots emitidos.
Summary contiene stay,folioId,currency,balance,charges,payments,adjustments,
verifiable,pendingOrders,unpostedOrders,movements,requests,documentId,disclaimer.
Dinero decimal como texto; payments es total positivo, adjustments conserva signo.
Documento `{id,issuedAt,snapshot}`. Usar su ID y fecha; no referencia local inventada.
Solicitudes OPEN→DONE, una OPEN por stay/kind; confirmación presencial resuelve la
OPEN compatible en la misma transacción. No hay API de finalización Guest.

400 inválido/campos desconocidos;401 sesión;403 permiso/property Staff;
404 recurso/finanzas ajenos;409 estado/versión/key/saldo/no soportado/pedidos.
5xx/timeout es resultado desconocido: conservar la misma key y payload. No crear
otra operación para sustituirla. No tratar200 DECLINED/ERROR como aprobación.
Sin query extra; máximo2048 bytes en writes. Respuestas privadas no-store.
Staff BFF `/api/staff/stay-journey/{reservationId}/{stayId}/{action}?propertyId=...`;
cookie Staff, Origin y JSON cerrado. Pago presencial61 mantiene su ruta y formulario.

## Migración / rutas de implementación

Nueva `005ServiceOperations/009-stay-journey.yaml`: requests, intentos simulados,
vínculo Room Service→movimiento y snapshots. No modifica migraciones aplicadas.
Upgrade/reaplicación se ensayan en PG desechable con ledger previo no vacío.
**No se aplicó a la base del hotel.** Respaldar y verificar antes de desplegar allí.

Backend: StayJourneyService/RoomServiceBillingService, Guest/StaffStayJourneyController,
StaffStayLifecycleService, ServiceRequestServiceImpl y FolioService.
Web: módulo `stay-journey`, BFF indicado, ReservationDetail, demo-card y hooks de
invalidation/cache. Formulario recibido y simulado separados. Pending key/payload
sintético en sessionStorage aislado por actor/property/reservation/stay; sin PAN/CVV.

## Sesión2 — Android implementado

NativeGuestClient → HttpStayJourneyService → DTO/mapper estricto → hook por cuenta/
reserva/estancia → Account/Checkout/Invoice reales. GET state aporta fecha local y
versión exacta; solicita entrada/salida sin completar estancia. Actualiza por foco,
foreground/10s y manual. Resumen financiero exclusivamente Backend; logout/cambio de
estancia desmontan datos/acciones previos. GuestRouteGuard conserva Auth/contexto.

Formulario sintético con validaciones locales y abono/total; solo token/importe/GTQ
viajan. Key y payload permitido en SecureStore antes del POST, con scope Backend/
cuenta/reserva/estancia. Resultado desconocido/sesión caducada conserva operación;
replay no crea otro pago. Sin constructor/fallback mock en HTTP. Mocks solo flag true.

Documento definitivo recuperado por ID/snapshot servidor después de reinicio/login;
ExpoInvoiceDocumentService materializa los bytes originales descargados y abre/comparte
el archivo. La generación local queda únicamente para mocks; cifras no calculadas localmente.
Sin documento definitivo: resumen provisional, sin acción PDF. Sin correo/FEL/PSP.
QA, evidencia y comandos seguros de arranque/Expo en
[Android46](../../frontend/pms-hotel-android/docs/46_STAY_JOURNEY_MVP_QA.md).

## QA manual pendiente (no PASS)

1. Reserva estándar con booker email del Guest verificado: solicitar entrada en
   fecha local y confirmar Staff con Room INSPECTED; también entrada presencial.
2. Fecha futura/room no lista: petición futura rechazada; Staff no entrega habitación
   bloqueada/sucia. Guest no completa entrada/salida por llamadas Staff.
3. Pedir salida antes de departure con deuda: OPEN persistida, stay IN_HOUSE.
4. Room Service OPEN/IP cobrable bloquea; DONE crea un cargo del total guardado,
   repetir no duplica. Catálogo editado no cambia cargo. Cancelado/estimado/no cobrable
   no agrega deuda. DONE histórico requiere acción explícita de contabilización.
5. Pago parcial y total, formato/Luhn/fecha/CVV/titular inválidos; solo sintéticas.
   APPROVED registra un PAYMENT; DECLINED/ERROR ninguno. Presencial sigue funcionando.
6. Cortar respuesta después del envío y recargar: misma key/carga/recibo, sin doble
   pago. Dos sesiones concurrentes no sobrepagan ni confirman checkout dos veces.
7. Checkout con deuda/no verificable/escenario no soportado rechaza sin HK/audit
   de éxito. Al saldo0, confirma y Room DIRTY exactamente una vez.
8. Documento recuperable con cargos/pagos/saldo0 y aviso no fiscal. Cambiar catálogo/
   perfil después no altera el snapshot. Reabrir app debe permitir recuperar PDF.
9. Cuenta vinculada sin responsabilidad financiera, Guest ajeno y Staff sin scope/
   permiso no obtienen datos ni pagan. Cambiar cuenta/propiedad/estancia no mezcla datos.
10. Teclado, foco/ESC, móvil y lector de pantalla; mocks no alimentan finanzas HTTP.

Comandos focales desde raíz:

```bash
docker compose -p pms-stay-mvp-qa -f backend/compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress \
  -Dtest=StayJourneyMvpIntegrationTests,StayJourneyMigrationIntegrationTests,StaffStayLifecycleIntegrationTests,StaffFolioHttpIntegrationTests,RoomServiceRealIntegrationTests,ValetMigrationIntegrationTests,AmenitiesMigrationIntegrationTests,OpenApiContractIntegrationTests verify
npm --prefix frontend/pms-hotel-web run lint
npm --prefix frontend/pms-hotel-web run typecheck
# Desde frontend/pms-hotel-web:
# npm test -- src/modules/stay-journey src/app/api/staff/stay-journey src/modules/payments src/modules/reservations src/modules/folio src/modules/room-service
npm --prefix frontend/pms-hotel-web run build
git diff --check
```

Resultados de sesión1 en AlanHandoff:107 casos Backend acreditados por etapas,
última regresión19 PASS; Web431 en regresión amplia y35 de seguridad finales
(incluyen un caso nuevo, no sumar como si todos fueran distintos), lint/typecheck/
build PASS. OpenAPI27 PASS. Sin suites Android en
esta sesión; sin aceptación manual ni publicación. Pruebas usan proyecto Docker
pms-stay-mvp-qa, nunca la instalación PostgreSQL del hotel.


Sesión2: Backend87 focales PASS (incluye27 OpenAPI), verify/JAR PASS; Android60
suites/581 pruebas PASS,1 HTTP opcional omitido allí y ejecutado separado PASS.
Bridge NativeGuestClient real→Backend→PostgreSQL→Next BFF PASS; asserts SQL
saldo0/Room DIRTY/3 PAYMENT/2 CHARGE/1 snapshot/2 solicitudes DONE. Restore Guest
recupera documento idéntico. No equivale a prueba de teléfono/visor PDF físico.
Android15 focales con detectOpenHandles PASS y terminación normal sin forceExit;
regresión final55 PASS. Web96 focales, lint/typecheck/build PASS. Android lint/
typecheck/Doctor21 y export Android PASS. Avisos existentes: act Valet/Amenidades,
logs negativos PDF, Mockito/agente JDK/NO_COLOR. Sin handles abiertos reportados.
Instalación PMS detenida y volumen PG17 identificado solo lectura; proyecto examen
no tocado. QA manual continúa EN_QA; no migración/despliegue hotel ni publicación.
