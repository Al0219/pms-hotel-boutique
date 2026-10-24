# Check-in y checkout Staff — contrato Backend y Web

Estado: reglas de negocio y alcance financiero APPROVED por José el 2026-10-22.
La aclaración del docente conserva pagos públicos simulados y excluye el PSP real
del alcance académico actual. No quedan decisiones abiertas sobre qué deuda
bloquea el checkout. José autoriza implementar Backend y vínculo simulado con
folio al indicar «prosigue». Transporte Backend CONFIRMED para este incremento;
implementación Backend con validación técnica PASS y QA manual PASS confirmado
por José el 2026-10-22.
José autoriza proseguir con BFF/botones Web; integración EN_PROGRESO en
feature/staff-stay-lifecycle-web. Evidencia propia y recorrido en
[Web66](../../frontend/pms-hotel-web/docs/66_STAFF_STAY_LIFECYCLE_QA.md).
José autoriza commit/push del incremento conjunto; cierre integral pendiente
del gate Web general y checks de GitHub. No implica aprobación del QA separado
del contrato53. Las notas de entrega posteriores conservan el registro histórico.
Fuente canónica: [decisión de alcance académico](../../docs/11_ARCHITECTURAL_DECISIONS.md#alcance-académico--pagos-públicos-simulados-y-saldo-de-checkout-staff).

Owner José; coordinación colaborativa Juan (Reservations/Folio) y Alan
(seguridad/BFF). Acuerdo en `docs/staff-stay-lifecycle-contract`; implementación
Backend en `feature/staff-stay-lifecycle`, conservando los documentos del acuerdo.
Base publicada
`9abea00`, posterior a contratos [49](49_STAFF_RESERVATIONS_READ_CONTRACT.md),
[50](50_STAFF_INITIAL_ROOM_ASSIGNMENT_CONTRACT.md),
[52](52_ROOM_READINESS_CONTRACT.md) y
[53](53_CHECKOUT_HOUSEKEEPING_CONTRACT.md). Extensión del detalle Staff existente
IMP-WEB-0302 según contrato50; no se crean IDs de backlog ni se modifica XLSX.

## Reglas aprobadas

- Actuar sobre una ReservationStay, conservando Reservation y sus otras stays.
  Botones por estadía en el detalle de la reserva, con confirmación y loading.
- Sesión Staff vigente, RESERVATION_MANAGE actual y PROPERTY autorizada,
  comprobados en Backend antes de consultar recursos. No acceso Guest ni
  mutaciones ALL_PROPERTIES. Actor exclusivamente de la sesión Staff.
- Check-in: padre CONFIRMED, stay RESERVED y fecha local de la propiedad en
  `[arrival, departure)`. No adelantar llegada ni extender la estancia desde
  esta operación. Room asignada, misma propiedad/tipo, INSPECTED actual,
  sin conflictos físicos ni OOO/OOS vigentes superpuestos al período reservado.
  Revalidar bajo bloqueo; DND sigue siendo independiente de limpieza.
  Otra stay todavía IN_HOUSE impide entregar esa Room, incluso si pasó su fecha
  prevista de salida o su padre se canceló sin cascada. No altera ATS: ocupación
  física y disponibilidad vendible siguen siendo conceptos distintos.
- Checkout: stay IN_HOUSE. Se permite salida anticipada con confirmación,
  conservando fechas y cargos originales; no genera descuentos/devoluciones.
  **El saldo pendiente bloquea el checkout**, aprobado expresamente por José.
  No cerrar folios, capturar pagos ni emitir facturas como efecto de esta acción.
- Al completar checkout, Room asignada pasa a DIRTY con el motivo del contrato53.
  Transición, limpieza y auditoría se confirman o revierten juntas. Un rechazo
  financiero no modifica stay, HK, inventario ni movimientos contables.
- Reutilizar las lecturas actuales e invalidar detalle/listado, Habitaciones y
  Housekeeping después del éxito. UI no anticipa éxito ni decide el saldo final.

## Alcance académico y fuente del saldo

José informa que el docente excluyó pagos públicos reales por el tiempo requerido
para desarrollarlos. Se conserva SimulatedPaymentGatewayAdapter; aprobar un pago
en este recorrido no implica comunicación bancaria ni débito real. No exigir
un PSP real ni conciliación de proveedor para habilitar el incremento académico.
Esta aclaración no elimina la validación de saldo aprobada para checkout Staff.

`FolioService.balanceOf` obtiene la suma firmada de movimientos: CHARGE aumenta
deuda, PAYMENT la reduce y ADJUSTMENT compensa el original. No usar status del
folio, importe del catálogo, garantía visual ni confirmación de reserva como
prueba de pago. El saldo proviene de unidades menores y moneda del folio.

`Folio` permite vínculo a Reservation y opcionalmente a ReservationStay, además
de COMPANY/MASTER. La decisión aprobada evalúa toda la reserva, sin distribuir
artificialmente deuda entre sus N stays. `PublicBookingServiceImpl` y
`ReservationBookingServiceImpl` en la base9abea00 no abrían folios ni registraban
CHARGE/PAYMENT: el primero guarda una referencia de pago simulado y su
snapshot/recibo público. Eso no demuestra un saldo contable cero.

Reglas financieras aprobadas expresamente por José:

| Situación | Regla aprobada |
| --- | --- |
| Varias stays/folios de una reserva | Evaluar todos los folios vinculados a la reserva dentro de su propiedad; cualquier saldo positivo bloquea cada salida |
| Crédito en otro folio | No compensar deudas entre folios ni monedas automáticamente |
| Falta folio o información contable verificable | Bloquear por saldo no verificable; no interpretar ausencia de movimientos como prueba de pago |

La referencia a un MASTER de grupo no prueba por sí sola que tenga responsabilidad
sobre esta stay; routing/direct bill y excepciones de crédito no se habilitan aquí.
No usar solo el folio individual de una stay para omitir deuda compartida de la
reserva. Un bloqueo financiero deja la stay IN_HOUSE y la limpieza sin cambios.

SimulatedBookingFolioService integra solo nuevas reservas: dentro del callback
transaccional del recibo público existente, abrir Folio GUEST ligado a la reserva,
registrar CHARGE por el total que calculó el servidor y PAYMENT por el mismo monto
aprobado por el simulador. Descripción y referencia SIM conservan ese origen; no
hay débito bancario. Folio OPEN, sin reparto arbitrario entre stays ni cierre.
Si falla cualquier paso, revertir también la reserva, movimientos y recibo.

El replay público devuelve el snapshot original sin ejecutar este callback:
no duplica movimientos ni añade folios a reservas históricas. Estas últimas
permanecen bloqueadas si no tienen información contable verificable; este
incremento no hace backfill ni inventa importes. Integrar saldo no requiere PSP
real, datos de tarjeta, nuevas migraciones ni reescritura de historial.

Lecturas financieras Staff existentes exigen FOLIO_PAYMENT_OPERATE (contrato29 y
AD-02). Mostrar importes/folios requiere ese permiso además del de reservas; no
ampliar sus lectores por conveniencia. Una validación interna puede rechazar sin
revelar importes. Estos POST realizan únicamente esa comprobación interna y
requieren RESERVATION_MANAGE; no exponen saldo, movimientos ni nuevas lecturas
financieras. No conceden FOLIO_PAYMENT_OPERATE al usuario por ejecutar checkout.

## Transporte Backend confirmado — implementación autorizada

Dos POST bajo `/api/v1/reservations/{reservationId}/stays/{stayId}`:
`/check-in?propertyId={uuid}` y `/check-out?propertyId={uuid}`.
BFF interno confirmado e implementado en el incremento Web: mismos sufijos bajo
`/api/staff/reservations`. Validación y estado de entrega en Web66.
Una sola property UUID explícita; UUIDs de ruta y relación reserva/stay/Room
verificados en consultas scoped. Rechazar query duplicada/extra y campos JSON
desconocidos; errores de JSON/tipos/formato no realizan transiciones.

Request JSON: `{expectedStatus, expectedUpdatedAt, expectedRoomId}`.
Estado esperado RESERVED o IN_HOUSE según acción; updatedAt UTC exacto leído del
Backend, sin truncarlo en JavaScript, máximo40 caracteres. expectedRoomId UUID o
null; omitirlo equivale a null y no coincide con una stay asignada. UUIDs de rutas
y expectedRoomId estrictos de36 caracteres; no UUID abreviados.
GET Staff agrega updatedAt por stay al contrato49. El BFF lo incluye en su
allowlist y conserva el texto exacto en DTO/domain. Backend y Web se despliegan
juntos; una respuesta upstream sin versión válida se rechaza, sin inventar un
token. No usar Date/toISOString para reconstruirlo con menos precisión.
No recibir actor, saldo, permiso, fechas o estado objetivo libres del cliente.

Reutilizar LocalOperationService ([contrato21 local](21_BD2_LOCAL_IDEMPOTENCY_CONTRACT.md)):
Idempotency-Key obligatoria; hash de versión/acción/IDs/expectativas validadas.
Definición de operación del servidor con RESERVATION_MANAGE. Mismo contexto y
payload devuelven el recibo inmutable original sin repetir callbacks/audit;
payload distinto devuelve409. Revalidar sesión/permisos/scope también en replay.
El recibo no constituye una lectura actual ni repite validaciones de negocio del
éxito ya confirmado. Fallo/rollback no deja recibo de éxito.

200 JSON: `{operationId, propertyId, reservationId, stayId, status,
completedAt}`. status es el resultado de esa operación, IN_HOUSE/CHECKED_OUT;
completedAt proviene del recibo y se devuelve ISO-8601 UTC. Posteriormente
refrescar detalle para ver el estado actual; no mezclarlo con el replay histórico.

Errores con ProblemDetail saneado:400 request inválido;401 sesión
Staff ausente/revocada/Guest;403 permiso/scope insuficiente;404 recurso ausente
dentro del scope o relación reserva/stay incorrecta;409 versión/estado inválido,
fecha no admitida, limpieza/bloqueo/conflicto físico, saldo pendiente o no
verificable, clave reutilizada con otro payload. Diferenciar causas seguras
mediante código para UI; no publicar PII, movimientos ni errores upstream.
Infraestructura no disponible produce error sin declarar checkout exitoso.

Códigos409: STALE_STAY, RESERVATION_NOT_CONFIRMED, OUTSIDE_ARRIVAL_DATES,
ROOM_NOT_ASSIGNED, ROOM_TYPE_MISMATCH, ROOM_UNAVAILABLE, ROOM_BLOCKED,
ROOM_NOT_INSPECTED, OUTSTANDING_BALANCE, BALANCE_UNVERIFIABLE e
IDEMPOTENCY_KEY_REUSED. La UI debe explicar el bloqueo y refrescar datos; un
rechazo no significa que se haya cobrado o devuelto dinero.

Backend Bearer Staff. El BFF usa la cookie Staff HttpOnly existente y valida
Origin configurado y application/json. Cache-Control private,no-store. Renovación
Staff existente acotada a401; sin retry ciego por transporte,409 o5xx. Ante
respuesta incierta, conservar la clave de operación para resolver el resultado.

## Consistencia, auditoría y aceptación previstas

FolioTransactionGuard serializa por PROPERTY + Reservation los escritores del
FolioService y la validación de checkout, incluida creación de folios vinculados;
folios independientes usan su propio ID. Advisory lock transaccional PostgreSQL
con namespace PMSF; colisiones de hash solo agregan espera, no autorizan recursos.
No serializar reservas independientes de una propiedad: conservar la concurrencia
del booking en diferentes RoomTypes. El MASTER comercial ligado solo a Group no
forma parte del alcance financiero de una reserva ni cambia en este incremento.

Orden Staff: recibo local → guard financiero de la reserva → fila Reservation →
fila Stay → Room si aplica. Releer estado/versión tras esperar y excluir la propia
stay de conflictos físicos. Queries scoped de lock usan subconsulta de Property
para no bloquear su fila y entrar en ciclo con FOR SHARE del booking público.
FolioService conserva sus cambios anteriores de la misma transacción antes de
refrescar un header cacheado. Sus vínculos siguen creándose por el servicio
existente; no se introduce un escritor nuevo de routing/reasignación de folios.

Reutilizar servicios existentes con contexto Staff confiable para eventos de
entrada/salida y limpieza; no atribuirlos a SYSTEM ni duplicar los eventos por
envolver la primitiva interna actual. Mantener SYSTEM para sus callers internos
históricos. Correlación de operación, actor, propiedad, before/after, motivo y
tiempo; append-only. Sin PAN/CVV ni cambios de montos históricos.

Pruebas previstas: auth/revocación/property/Guest, N stays, límites locales de
fecha, Room no lista/bloqueada/conflicto, doble acción y replay, stale detail,
saldo positivo/cero/crédito por regla aprobada, datos contables ausentes,
concurrencia con postings/alta de folio, rollback incluido audit/HK y regresión
ATS. OpenAPI real `/v3/api-docs` en el mismo incremento HTTP; BFF, mappers,
UI/accesibilidad/loading/error/refetch y build Web. Verify Backend Java21/PG17
sin exclusiones y QA manual PASS de José antes de COMPLETADA.

## Entrega documental

La evidencia905 PASS pertenece a9abea00/contrato53; no es una ejecución de estas
APIs. Validación propia del incremento54 se registra en AlanPlan/AlanHandoff.
Mantener EN_QA hasta QA manual PASS de José. Sin commit/push/merge ni actualización
del Docker3001 autorizados en esta implementación Backend.

Validación final: ./mvnw -B verify946 PASS,0 failures/errors/skipped,107 reportes,
BUILD SUCCESS/JAR,16:42 min, Java21/PostgreSQL17 aislados. Incluye40 casos lifecycle
y17 OpenAPI. Paridad53 operaciones/42 paths/63 schemas/13 tags. Primer full tuvo
un fallo de content-type en OpenAPI; anotaciones corregidas y repetición íntegra
PASS sin excluir pruebas ni cambiar límites. Detalle de las ejecuciones en
AlanHandoff; evidencia local ignorada en backend/target/staff-lifecycle-*.

## QA manual Backend / preparación de Web

Entorno con esta rama, Staff RESERVATION_MANAGE y PROPERTY autorizada. El recorrido
de API siguiente permite comprobar Backend desde Swagger/Postman; la integración
de botones/BFF y su despliegue se documenta en Web66. No atribuir al stack habitual
una versión que no se desplegó.

1. Crear reserva pública simulada para hoy en timezone del hotel: comprobar una
   reserva, sus N stays, un Folio GUEST OPEN, CHARGE/PAYMENT exactos y saldo0.
2. Preasignar una Room disponible e INSPECTED con el endpoint existente. Leer
   GET detalle Staff y conservar stayId, roomId y el texto updatedAt exacto.
3. POST check-in con Idempotency-Key nueva y el siguiente cuerpo, sustituyendo
   timestamp/UUID por los leídos; verificar IN_HOUSE y auditoría del Staff activo.

```json
{
  "expectedStatus": "RESERVED",
  "expectedUpdatedAt": "2026-10-22T18:00:00.123456Z",
  "expectedRoomId": "11111111-1111-1111-1111-111111111111"
}
```

4. Releer detalle; POST check-out con expectedStatus IN_HOUSE y nueva clave usando
   la versión actual. Ver CHECKED_OUT, Room DIRTY y motivo de salida en HK;
   fechas, importe, otras stays y folio OPEN intactos. Repetir exactamente clave y
   cuerpo devuelve el recibo original sin más movimientos/eventos.
5. En fixtures autorizadas de QA, un cargo pendiente o folio sin movimientos
   bloquea la salida sin ensuciar ni modificar la stay; crédito de otro folio no
   lo compensa. No publicar una API de postings no acordada para facilitar el QA.
6. Probar fecha futura, Room no inspeccionada, sesión Guest/revocada, property
   ajena y detalle desactualizado. Confirmar errores sin falsa entrada/salida.
   Registrar NO EJECUTABLE cuando falten fixtures, sin atribuir PASS manual.
