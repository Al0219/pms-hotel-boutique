# Alta real de reservas desde Recepción

Estado: **APPROVED** por José al confirmar el flujo y autorizar «prosigamos».
Implementación EN_QA; QA manual de José PASS, gate general/CI pendiente.
José autoriza priorizar frontend y backend de reservas tomadas por Staff/Super
Admin, con asignación de habitación, y pospone discrepancias FO/HK por tiempo.
Rama `feature/staff-reservations-real`, base origin/main53b3e09. Owner José;
coordinación Juan (reservas/folio) y Alan (seguridad), sin duplicar sus motores.
Contrato técnico CONFIRMED para este incremento; no autoriza pagos nuevos.

## Base revisada (main53b3e09, antes del incremento)

- `/reservas/nueva`, formulario, validación, cotizaciones y revisión ya existen,
  pero Web53 usa transporte provisional y bloquea el alta con mocks=false.
  El Centro real no habilita hoy ese recorrido.
- ReservationBookingService crea GuestProfile/Reservation/N ReservationStay con
  admisión de inventario; no crea GuestAccount. Su auditoría interna usa SYSTEM:
  una fachada Staff debe aportar actor confiable, sin cambiar el recorrido público.
- Contratos49/50/52/54 ya permiten leer, asignar Room y hacer check-in/checkout.
  DIRTY impide asignar; CLEAN/sin seguimiento permiten preasignación, mientras
  entregar exige INSPECTED. Crear o asignar no hace check-in.
- LocalOperationService, FolioService y los locks de inventario/folio existen.
  RatePlan no tiene inventario. Hay política GTQ autoritativa compartida por el
  catálogo y booking públicos; no confundir sus códigos con UUIDs de RatePlan.
- El dominio RoomType actual no expone capacidad. No conservar capacidades
  ficticias del mock como si fueran una validación Backend confirmada.

## Recorrido aprobado e implementado

1. Centro de Reservas → Nueva reserva, PROPERTY elegida desde sesión activa.
2. Fechas desde hoy según timezone del hotel, huésped principal y cantidad de
   habitaciones. Capturar nombre/apellidos sin inferir GuestAccount ni ocupantes.
3. Consultar tipos, disponibilidad y tarifa real en Backend; escoger un mismo
   tipo/tarifa para N habitaciones en esta primera entrega. Reutilizar la política
   GTQ pública para mantener coherencia con el recorrido del cliente, sin cargos
   o impuestos inventados ni precios editables enviados como autoridad por UI.
4. Revisar y crear: CONFIRMED con stays RESERVED, un
   folio Guest y cargo inicial de alojamiento pendiente, sin PAYMENT ni PSP.
5. Abrir el detalle persistido y usar la asignación existente por stay. Para un
   cliente que llega hoy, asignar una Room apta y ejecutar el check-in separado.
   Checkout mantiene el bloqueo de saldo aprobado; el alta no salda la reserva.

## Transporte del incremento

- GET `/api/v1/reservations/creation-options` con query exacta propertyId UUID,
  arrival/departure YYYY-MM-DD y rooms entero positivo.200: propertyId, arrival,
  departure, rooms, nights, currency y options; cada opción roomTypeId,
  roomTypeName, ratePlanId (código GTQ vigente, no UUID), availableRooms,
  nightlyMinor y totalMinor (todas las habitaciones/noches, centavos enteros).
- POST `/api/v1/reservations?propertyId={uuid}` con JSON exacto arrival, departure,
  rooms, roomTypeId, ratePlanId, currency, clientTotalMinor, guest y notes nullable.
  guest: firstName/lastName obligatorios hasta80, email obligatorio hasta320,
  phone obligatorio hasta32 con mínimo7 dígitos. notes máximo300. Sin capacidad
  inventada ni ocupantes implícitos; este formulario no captura su distribución.
- POST201 nuevo o replay: operationId, propertyId, reservationId y completedAt UTC.
  Es recibo histórico, no estado actual ni recibo de pago. Enlazar detalle49 para
  consultar referencia/estado actual y asignar50; entrada/salida54 separadas.
- BFF same-origin bajo `/api/staff/reservations` con los mismos sufijos/query.
  No usar el POST público para representar una operación Staff.
- Sesión Staff vigente, permiso RESERVATION_MANAGE existente (Recepción,
  Gerencia, Super Admin), PROPERTY explícita autorizada antes de leer SQL.
  ALL_PROPERTIES no admite alta. Actor exclusivamente de la sesión.
- Alta con Idempotency-Key mediante LocalOperationService: mismo Staff/property/
  operación/cuerpo recupera recibo original; cuerpo diferente devuelve conflicto.
  Recibo estable identifica la reserva; detalle posterior muestra estado vigente.
  BFF usa cookie Staff HttpOnly, Origin, JSON estricto y no-store; no tokens en JS.
- Backend vuelve a verificar fechas, propiedad activa, tipo/tarifa, precio y ATS
  dentro de admisión transaccional. Un fallo revierte perfiles, reserva, stays,
  cargo, auditoría y recibo. Reintentos y doble clic no duplican efectos.
- La contabilidad inicial aprobada pertenece exclusivamente a esta alta;
  no concede operaciones financieras generales a Recepción. No cobrar ni marcar
  pagado para permitir artificialmente el checkout.

Errores400 entrada/fecha/clave inválida;401 sesión Staff;403 permiso/property;
404 propiedad/tipo dentro del scope no disponible;409 NO_AVAILABILITY,
PRICE_CHANGED, RATE_CONFIGURATION_UNAVAILABLE o IDEMPOTENCY_KEY_REUSED;
500 BOOKING_FAILED saneado y sin escrituras parciales. BFF conserva4xx conocidos
y traduce errores técnicos/DTO/transporte a503. Backend y BFF private,no-store.

## Alcance y aceptación

- Backend Reservations: fachada/autorización, request/response/controller,
  atribución Staff del booking existente, recibo local y cargo inicial aprobado.
  Reutilizar Inventory; no migraciones ni dependencias previstas.
- Web Reservations: adaptar service/DTO/mapper/hook/UI existente y habilitar el
  CTA; BFF scoped y refresco de lista/detalle/disponibilidad. Sin fetch en UI ni
  escribir reservas locales para simular una integración real.
- OpenAPI del incremento, contratos y AlanPlan/AlanHandoff. Web53 se actualizará
  distinguiendo su implementación histórica del transporte real.
- PostgreSQL/HTTP: autorizaciones, scope cruzado, fechas locales, N stays,
  capacidad sin fuente no inventada, ATS0/concurrencia, rollback/audit, rechazo
  de precios manipulados, replay y ausencia de pago/GuestAccount implícitos.
- Web: formulario/revisión, conflictos/reintento, cambio sesión/property, éxito
  solo tras respuesta persistida y navegación a asignación/check-in existentes.
  Verify Backend, checks Web y QA manual del usuario antes de COMPLETADA.

Discrepancias, room move, extensión, pagos nuevos y cambios de permisos quedan
fuera de este incremento. Cierre técnico pendiente del gate general/CI.

## Evidencia del incremento

Backend: verify general1031, un timeout HTTP de Swagger; repetición dirigida95
PASS (13 alta Staff,62 HTTP público y20 OpenAPI). Web: lint/typecheck/build PASS;
última repetición63/64, timeout5s del recorrido mock heredado. No declarar CI
general PASS: los detalles y la comparación con main están en Web69 y AlanHandoff.
Navegador real25 comprobaciones PASS; SQL confirma un cargo, cero pagos y un
recibo por reserva. Entorno3001 actualizado para QA, sin reservas de prueba en su
BD. José confirma QA manual PASS («todo funciona», 2026-10-23) y autoriza commit
y push. Gate general/CI pendiente; sin merge ni nueva tarea.
