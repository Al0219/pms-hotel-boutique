# Traslados reales — MVP

Estado: **DoD PASS — técnico y QA manual final TODO PASS confirmado por el usuario**. Rama `feature/valet-transfers-real`, base origin/main `bbdcb53`.
Decisión del usuario: catálogo existente únicamente para Hotel Boutique Demo
(`3032709f-a48b-300b-b860-1110bc6f1f13`). Backend publica sus cinco lugares (Hotel,
La Aurora, Oakland, Centro Histórico, Cayalá) y coordenadas de demostración; otras
propiedades reciben catálogo vacío y no pueden crear traslados. No GPS/proveedor.

## V2 aprobada — cargos y limpieza

V1 conserva6/6 PASS manuales. V2 y ajustes posteriores: PASS técnico/manual final.
La decisión nueva reemplaza la ausencia de cargos de V1: catálogo de precios GTQ
Backend, nunca importe del cliente. GET G `/transfer-prices` expone rutas/precios.
Crear/editar guarda importe; ruta sin cambio conserva precio. Pending aparece como
estimado separado; DONE registra CHARGE y posting único dentro de la transacción
Staff, usando el patrón Room Service y el lock financiero. Solicitud Guest y confirmación Staff de checkout exigen servicios
cobrables resueltos y saldo verificable cero; cancelar no cobra. No proveedor/GPS/pago externo.

Migración aditiva012: precios Demo (Aeropuerto58/Oakland42/Centro78/Cayalá63 GTQ,
ambas direcciones), importe persistido y posting inmutable/único. Vistas contables
reutilizan Room Service. Solo pendientes de estancias elegibles sin documento se
migran a cobrables; histórico finalizado/documentado conserva NULL/no cargo y PDFs
inmutables. No se modifica011 ni se generan movimientos durante la migración.

Housekeeping por estancia: máximo2 al día local, mínimo8h entre inicios incluso
entre días; OPEN/IN_PROGRESS/DONE cuentan, CANCELLED no. Edición excluye propia.
Política central con lock de estancia protege concurrencia y canales Staff/Guest.
Nueva franja18:00–19:00 permite combinarla con10:00–11:00. Android replica validación
visual usando historial real; Backend autoritativo. QA y comandos: Android47.

## V1 — contrato histórico (facturación sustituida por V2)

## Reglas / persistencia

Categoría TRANSFER independiente de VALET y custodia. Migración aditiva
`005-transfers-011`: extensión del CHECK de categorías y `transfer_requests`, FK
solicitud/estancia, cuenta Guest, clave/hash inicial/actual y snapshot JSON de ruta.
Unicidad `(stay_id,guest_account_id,request_key)`. Solo se prueba en PG desechable.
No modifica migraciones aplicadas, vehículos, folios, cargos, pagos ni PDFs.

Cada recorrido tiene exactamente un extremo Hotel y otro PLACE del catálogo;
1–3 pasajeros enteros. Hora HH:mm en timezone de propiedad, dentro de la estancia
y hasta checkout normal12:00, con30min de anticipación del servidor. Usa las mismas
reglas existentes de servicios: editar/cancelar solo OPEN y antes de25min; cambiar
horario exige30min. Backend devuelve `canModify` y `modifiableUntil`. No-op/replay
no añade auditoría. Staff SERVICE_REQUEST_INTAKE/OPERATIONS_MANAGE consulta, solo
OPERATIONS_MANAGE transiciona OPEN→IN_PROGRESS→DONE; scope explícito de propiedad.
Guest nunca completa. Historial/cancelación soft, snapshot de ruta y auditoría.

Intake central comparte lock de estancia con checkout: OPEN CHECK_OUT o CHECKED_OUT
bloquea nuevas solicitudes409 CHECKOUT_REQUEST_PENDING; pedidos previos siguen
resolubles por Staff. Guest Auth/vínculo y cuenta propietaria revalidados también en
replay. CAS por updatedAt y locks serializan edición/cancelación/transiciones.
Estimación Android reutiliza el mock aprobado y se identifica como demostración;
no viaja como precio, reserva de conductor, cobro o compromiso de disponibilidad.

## API

G=`/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}`.
S=`/api/v1/properties/{propertyId}/service-requests/transfers`.

- G GET `/transfer-catalog`; GET/POST `/transfer-requests`.
- G PUT `/transfer-requests/{id}`; POST `/transfer-requests/{id}/cancel`.
- S GET; PUT `/{id}/status`.
- Crear: `{serviceDate,deliveryTime,originKey,destinationKey,passengers,notes}`;
  Idempotency-Key16–100 obligatoria. Editar agrega expectedUpdatedAt; cancelar solo
  expectedUpdatedAt. Status Staff: expectedUpdatedAt + IN_PROGRESS/DONE.
- Respuestas privadas/no-store; creación201/replay200; inválido400, auth401,
  permiso/scope403 Staff, ajeno404, conflicto409. Sin identidad/precio del cliente.
- Web BFF `/api/staff/transfers/requests[/{id}/status]`, cookie Staff, Origin en
  escritura y proyección allowlist; no usa autenticación Guest ni datos financieros.

Android HTTP usa NativeGuestClient sin fallback de solicitudes mock. Reutiliza
TransferModal/PlaceSelector extraídos de ValetScreen, fecha/hora, pasos1–3 y Maps.
Claves de intentos con resultado desconocido se guardan en SecureStore aisladas por
Backend/cuenta/reserva/estancia/payload; reintento no duplica. Query/caché y polling
scoped compartidos por Valet y Mis servicios. Contexto nuevo descarta formulario y
confirmación anterior. Web separa Vehículos/Traslados y mantiene ambas vistas montadas.

QA y comandos: [Android47](../../frontend/pms-hotel-android/docs/47_TRANSFERS_REAL_MVP_QA.md).
Sin commit/push/PR hasta PASS manual del usuario.
