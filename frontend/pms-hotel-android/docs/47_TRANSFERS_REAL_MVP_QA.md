# Traslados reales — QA

## Cierre — DoD PASS

Usuario confirma **QA manual final: TODO PASS**, incluidos todos los ajustes. Se
conservan6/6 +3/4 +3/3 como evidencia histórica; la confirmación final cierra los
pendientes manuales. Último ajuste: quitar solo las etiquetas «Ejemplo» de Hotel,
sin cambiar datos, diseño ni comportamiento.43 pruebas focalizadas/3 suites PASS,
lint/typecheck y git diff --check PASS. Logs /tmp/transfers-final-hotel-*.log.
Backend105 PASS y verify/OpenAPI; Web204 PASS y lint/typecheck/build; Android87
PASS y export del incremento previo conservados, sin repetir suites aprobadas.
Sin bloqueos locales conocidos. Autorizados commits por componente, push y PR a
main; no merge ni cambios de bases. CI se verifica en el PR.

## Evidencia histórica por iteración

V1: **6/6 PASS manual confirmados por el usuario**, conservados.
V2 (cargos y límites de limpieza): **PASS técnico / EN_QA manual**. Contrato Backend66.
Evidencia técnica local: `/tmp/transfers-*.log`. Pruebas Backend incluyen ambas
direcciones, datos inválidos, propiedad sin catálogo, Guest ajeno, permisos Staff,
CAS, replay/concurrencia y cancelación contra inicio Staff, checkout concurrente,
cutoff y ausencia de cargos; regresión Valet/Amenidades/Stay Journey/OpenAPI.
Clientes verifican formulario reutilizado, historial/edición/cancelación, reintento
con misma key/remontaje, checkout, scopes, BFF y gestión Staff. Resultado técnico: PASS. No repetir suites/manuales anteriores del PMS.

## Actualizar únicamente QA existente

No se despliega automáticamente. Usar PostgreSQL del proyecto `pms-stay-manual-qa`
con volumen propio, nunca la instalación habitual. No ejecutar seeder ni down -v.
Primero detener escritores QA y verificar respaldo; abortar ante cualquier fallo:

```bash
set -euo pipefail
cd /tmp/pms-transfers
export PMS_STAY_QA_LAN_IP=10.34.49.253
backend/scripts/stay-qa.sh preflight
qa=(docker compose --env-file /dev/null -p pms-stay-manual-qa -f compose.stay-qa.yaml)
"${qa[@]}" stop backend web
umask 077
mkdir -p /tmp/pms-stay-manual-qa
backup="/tmp/pms-stay-manual-qa/pre-transfers-$(date +%Y%m%d-%H%M%S).dump"
"${qa[@]}" exec -T postgres pg_dump -U pms_stay_qa -d pms_stay_qa -Fc > "$backup"
test -s "$backup"
"${qa[@]}" exec -T postgres pg_restore --list < "$backup" > "$backup.list"
"${qa[@]}" exec -T postgres pg_restore --file=/dev/null < "$backup"
sha256sum "$backup" > "$backup.sha256"
sha256sum -c "$backup.sha256"
"${qa[@]}" up -d --build --wait --no-deps backend web
"${qa[@]}" exec -T postgres psql -U pms_stay_qa -d pms_stay_qa -v ON_ERROR_STOP=1 -c "SELECT current_database(); SELECT id,exectype FROM databasechangelog WHERE id IN ('005-transfers-011','005-transfer-billing-012'); SELECT count(*) FROM transfer_requests;"
```

La comprobación del archivo completo no equivale a un ensayo de restore SQL.
Liquibase aplica migraciones aditivas pendientes de main, incluidas011 y012 de Traslados. Antes de arrancar, preflight debe validar
proyecto/base/volumen QA. No ejecutar estos comandos contra otra instalación.
Se conserva todo el volumen QA. Si cambia la IP Wi-Fi, cambiarla en ambos comandos.
Web QA: http://localhost:3302 (ventana privada). Credenciales sintéticas existentes
QA46; usar Guest vinculado a una estancia IN_HOUSE/RESERVED elegible de Demo.
Crear una nueva reserva por flujos Staff si las anteriores ya terminaron; no resetearlas.

Detener Metro anterior con Ctrl+C y abrir Expo Go (misma Wi-Fi):

```bash
cd /tmp/pms-transfers/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://10.34.49.253:18089 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --clear --port 8082
```

## Manual V1 — 6/6 PASS confirmados (no repetir)

1. Valet→Solicitar traslado: Hotel→uno de los cuatro destinos, fecha/hora válida,
   1–3 pasajeros. Estimación marcada demo/Maps; enviar crea OPEN en Mis servicios
   y Web/Parking-Valet→Traslados. Ningún cambio en ubicación/solicitudes de vehículos.
2. Destino Hotel + punto de recogida: persiste recorrido inverso. Editar cantidad,
   horario/ruta antes del cutoff conserva ID. Cancelar conserva histórico.
3. Staff INTAKE consulta sin acciones; OPERATIONS_MANAGE inicia y completa. Guest
   ve actualización automática y pierde edición después de iniciar/cutoff.
4. Reintento/doble pulsación/respuesta perdida: misma solicitud; restaurar sesión
   y cambiar estancia no mezcla datos. Propiedad sin catálogo no admite solicitudes.
5. Solicitar checkout bloquea crear traslados; historial/pagos siguen disponibles y
   Staff resuelve los previos. En V1 completar/cancelar no agregaba cargos al folio; V2 modifica esta regla expresamente.

No prometer conductor, tiempo real ni transporte confirmado por una estimación.
Sin commit/push/PR hasta confirmación manual explícita.

## Resultado técnico V1 — histórico

- Backend:89 PASS en8 clases (11 de Traslados, Valet/custodia, Amenidades,
  Stay Journey, upgrade/reaplicación e integridad de migraciones y OpenAPI).
  Verificación posterior de endpoints/OpenAPI:38 PASS; corridas solapadas, no sumar.
  Maven verify/JAR PASS; inventario OpenAPI136 operaciones/111 paths/165 schemas.
- Android:93 PASS/6 suites con detectOpenHandles; salida normal sin forceExit.
  Lint/typecheck y export HTTP Android PASS. Reutilización del modal mock acreditada
  también por regresión de Valet. Avisos act existentes; no fallo de la suite.
- Web:47 PASS/9 archivos, incluyendo BFF, permisos, proyección, gestión y regresión
  Parking/Valet. Lint/typecheck/build PASS. Sin dependencias nuevas.
- git diff --check PASS; sin despliegue ni migración de QA manual/base habitual.
  Solo se utilizaron PostgreSQL técnico tmpfs y esquemas desechables de pruebas.

Los casos manuales V1 fueron confirmados por el usuario: 6/6 PASS. No se acredita teléfono físico
ni conductor/transportista. Sin commit/push/PR.

## V2 — cargos y limpieza: PASS técnico / EN_QA

- Backend:102 PASS/12 clases, Maven verify/JAR y OpenAPI PASS
  (137 operaciones/112 paths/166 schemas/16 tags).
- Android:97 PASS/9 suites, salida normal con detectOpenHandles; lint/typecheck y
  export HTTP PASS. Avisos act existentes, sin fallo ni forceExit.
- Web:204 PASS/41 archivos; lint/typecheck/build PASS. git diff --check PASS.
- Evidencia: /tmp/transfers-v2-{backend,native,web}-final.log y logs de lint,
  types/build/export del mismo prefijo. Solo PG técnico desechable; sin despliegue.
- Migración012: catálogo GTQ Backend, snapshots de importe, posting único y vistas
  contables compartidas con Room Service. Upgrade/reaplicación e integridad probados.
  Solo traslados OPEN/IN_PROGRESS de estancias elegibles sin documento reciben precio
  retrocompatible. DONE/CANCELLED/estancias cerradas y PDFs previos no se recobran.

### Manual V2 pendiente — únicamente cambios nuevos

1. Valet sin textos/botón eliminados; arrastrar actualiza vehículos y solicitudes.
2. Traslado Demo Hotel→Aeropuerto: Q58.00 Backend como estimado pendiente fuera
   del saldo. Checkout bloqueado mientras pendiente; CANCELLED no genera deuda.
3. Staff completa una vez: CHARGE con ruta, fecha e importe; Android/Web muestran
   nuevo saldo, pago lo liquida y documento nuevo incluye el cargo una sola vez.
   Reintento/doble clic no duplica; documento histórico permanece idéntico.
4. Limpiezas10:00 y18:00 admitidas. Tercera diaria y separación menor8h rechazadas,
   también entre días. Editar excluye la propia; CANCELLED libera el cupo y DONE cuenta.

Concurrencia (creación/completado/checkout), aislamiento, precio autoritativo y
posting único tienen evidencia automatizada en TransferBillingIntegrationTests y
HousekeepingLimitsIntegrationTests. Sin commit/push/PR; conservar6/6 manuales V1.

## Corrección checkout + selector — PASS técnico / EN_QA manual

Causa: la solicitud Guest conservaba la regla previa que admitía deuda; Staff ya
validaba confirmación. Ahora ambos reutilizan requireCheckoutReady bajo el lock
financiero, sin reconciliar/cobrar al rechazar. Replay devuelve el recibo original.
Android bloquea acción por saldo, pendientes, unposted o contabilidad no verificable.
Selector: solo IN_HOUSE/RESERVED por defecto, IN_HOUSE primero y llegada ascendente;
embudo abre modal con estado/historial/rango inclusivo de estancia, limpieza;
buscador por nombre de hotel disponible, referencia y fechas ISO/DD/MM/AAAA.
El DTO actual no expone titular de reserva: no se inventa ni se hace lookup ajeno.

Evidencia: /tmp/transfers-checkout-backend-final.log:105 PASS/5 clases (27 OpenAPI),
verify/JAR PASS. /tmp/transfers-checkout-native-final.log:59 PASS/6 suites,
terminación normal; lint/typecheck/export Android HTTP PASS. Sin cambios de cliente
Web ni migración nueva, sin despliegue ni modificación de QA/base habitual.

Manual nuevo mínimo (conservar6/6 V1 y resultados anteriores):
1. Saldo positivo sin traslado: Guest no permite enviar; Staff rechaza. Sin cambios.
2. Saldo cero + traslado OPEN/IN_PROGRESS: checkout bloqueado. Completarlo genera
   deuda y continúa bloqueado; pagar permite solicitar y confirmar salida.
   DONE sin posting también rechaza409, acreditado automáticamente sin mutación.
3. Selector: activas antes de pendientes; finalizadas solo en historial. Buscar hotel,
   llegada/salida, combinar estado/rango y limpiar; cambiar estancia conserva sesión.
   Volver/cerrar filtros no altera la estancia actual.

Reconstruir solo Backend QA con el preflight/respaldo del bloque anterior y servicio
backend (Web no cambia); reiniciar Metro con el comando HTTP existente. No reseed.

## Cards de Traslados + Hotel — PASS técnico / EN_QA manual

Usuario confirma resultados anteriores **6/6 + 3/4 + 3/3 PASS**; se conservan tal
como fueron reportados, sin inferir el cuarto caso del grupo3/4.
Traslados reutiliza SwipeToDelete: tap edita cuando Backend/cutoff permiten;
swipe y acción accesible cancelan con confirmación; estados no modificables abren
detalle de solo lectura. Se conserva versión, protección de doble envío y refresh.
Hotel conserva cards/estilos; usa useCurrentStay + listado Guest autenticado para
hotel/habitación/fechas/estado/referencia, sin datos anteriores al cambiar estancia.
WiFi/contacto/dirección proceden del mock central y se rotulan «Ejemplo».

Verificación:87 PASS/6 suites (transfers-real, hotel, hotel-real,
guest-services-feedback, guest-navigation, service-request-details). Lint, typecheck,
export Android HTTP y git diff --check PASS. Logs /tmp/transfers-cards-hotel-*.log.
Sin cambios Backend/BD/migraciones/despliegue/commit/push/PR en esta iteración.

Manual nuevo: tap traslado editable; swipe + confirmar cancelación; tap en iniciado/
completado/fuera de cutoff abre detalle sin acciones; cambiar estancia A→B y abrir
Hotel comprueba nombre/habitación/fechas/estado y ausencia de textos eliminados;
WiFi/contacto/ubicación conservan contenido genérico. Actualizar únicamente Expo
con el comando HTTP de esta guía; no reconstruir Backend/Web para estos ajustes.

Cierre de integración: main9c7bd4e incorporado en feature sin modificar main.
Conflictos solo Plan/Handoff, resueltos conservando ambas entradas. Backend57 PASS
(OpenAPI27, cancelación Staff18, facturación Traslados12), verify/JAR PASS; inventario
139/114/170/16. PostgreSQL técnico tmpfs; QA manual/base habitual intactos.

## PR185 — CI: expectativas y sincronización de pruebas

Reproducción:1 fallo Backend (checkout y slot18–19) y7 Android (6 fixtures sin
statusLabel y1 assertion del importe antes de cargar folio). Cambios solo tests:
late slot rechaza en departure, fixtures IN_HOUSE y espera journey-financial-summary.
Se mantienen finalizadas ocultas, scope, navegación y bloqueo financiero productivos.
Focalizadas:5 Backend y30 Android PASS. Suites completas:1344 Backend PASS/1345 total
(verify/JAR),666 Android PASS/667 total (66 suites, salida normal, sin forceExit).
Un bridge opcional por entorno permanece condicionado en cada runner como antes;
no se añadieron skip ni exclusiones. Lint/typecheck/diff-check PASS. Evidencia:
/tmp/transfers-ci-{repro,focused,full}-{backend,android}.log y lint/types Android.
PASS manual anterior conservado. Sin cambios productivos, migraciones ni bases.
