# Cancelación Staff — MVP con penalización y ajustes simulados

Estado: CONTRATO CONFIRMADO por José el 2026-10-29: 10% del alojamiento
original y excedente como saldo a favor; faltante como deuda. Redondeo explícito
HALF_UP al centavo conforme a la propuesta confirmada. Implementación EN_QA; aceptación manual del owner pendiente.
Solicitud del 2026-10-29; rama feature/staff-reservation-cancellation desde
origin/main b11efa7. Owner José, revisión colaborativa BD1/BD3 y WEB-4.
Tareas BD2-LC-001 e IMP-WEB-0303 (XLSX, hoja2/fila48, sin modificar el archivo).

## Fuentes y diagnóstico

- Reglas globales04: Policy → Penalty/Refund → status → release → audit.
- Documentos 19/20: LC-D01 estaba pendiente. La decisión actual confirma solo
  este MVP; no existe una política persistida individualmente por reserva.
- Contrato61: el incremento de registro de pagos admite abono/total y excluía
  reversos/refunds/ajustes. La nueva solicitud autoriza ampliar este alcance
  para la cancelación simulada, sin introducir un segundo ledger ni un PSP real.
- Contratos49/54/64/65: lectura Staff scoped, ciclo por stay e identidad separada.
- El dominio permite cancelar Reservation y ReservationStay por separado; no
  ofrece el flujo Staff completo de autorización, preview, finanzas y auditoría.
- El componente Web provisional supone penalizaciones/devoluciones y no es un
  contrato Backend. RatePlan tampoco guarda una política versionada que permita
  deducir importes desde las condiciones presentadas en la web.

## Contrato confirmado: reglas y transporte

Reserva directa PENDING/CONFIRMED, todas las stays RESERVED, antes de cualquier
entrada. Cancelación total, no parcial ni no-show/salida anticipada. Motivo
obligatorio,255 caracteres tras validación; preview vigente y confirmación.
RESERVATION_MANAGE y FOLIO_PAYMENT_OPERATE, sesión Staff activa y PROPERTY explícita
antes de datos/recibos. No cambios de roles; no se compensan pagos ni se hacen
reembolsos bancarios/simulados, por lo que no se elude PAYMENT_REFUND_VOID.

Se admite un GUEST/OPEN folio con moneda coincidente y un único CHARGE original,
sin ajustes previos, acompañado por recibo de creación pública o Staff. Ambas
altas crean atómicamente ese cargo; al ser append-only, no se puede sustituir.
Un segundo cargo, múltiples folios, una reserva comercial/histórica incompleta o
un contexto financiero ambiguo bloquean la operación para revisión. No se usa
la descripción de un movimiento ni una tarifa actual para identificar alojamiento.

Se compensa el cargo original completo mediante ADJUSTMENT vinculado al CHARGE,
y se registra un CHARGE nuevo por 10%, redondeado una vez a la unidad monetaria
menor (HALF_UP). Si el redondeo da cero no se inserta un movimiento cero. No se
borran/modifican originales. Los PAYMENT permanecen intactos: saldo final =
penalización - pagos anteriores. Positivo es deuda; negativo es crédito, nunca
una devolución. Sin conversión, impuestos inventados ni cierre/reapertura de folio.

Ejemplo: alojamiento Q1,000/pago Q400 → penalización Q100/crédito Q300;
pago Q50 → deuda Q50. El saldo a favor queda en el folio de la reserva, sin
transferencia automática a otras reservas o cuentas.
Todo el efecto es atómico: compensación, penalización, padre/stays CANCELLED,
audit STAFF y recibo. Fechas, roomId histórico, inventario físico, limpieza,
GuestProfile/GuestAccount, solicitudes del huésped y recibos anteriores intactos.
El ATS se libera por los estados; no se elimina Room ni se ensucia una habitación
que no llegó a utilizarse.

| Método Backend | BFF Web | Contrato |
| --- | --- | --- |
| GET /api/v1/reservations/{id}/cancellation-preview?propertyId=UUID | /api/staff/reservations/{id}/cancellation-preview |200 preview coherente; bloqueo o recibo original si ya cancelada; sin escrituras |
| POST /api/v1/reservations/{id}/cancellation?propertyId=UUID | /api/staff/reservations/{id}/cancellation |200 recibo inmutable, también replay; Idempotency-Key obligatorio |

Body POST cerrado: expectedFingerprint (64 hex) y reason (1–255, trim, UTF-8 sin
NUL). Hasta4096 bytes; no aceptar actor, importes, porcentaje o scope en el body.
Preview contiene IDs/referencia, policyCode STAFF_PRE_ARRIVAL_TEN_PERCENT_V1,
penaltyPercent10, canCancel, blockingCode/fingerprint nullable, stayCount,
financial nullable y completed nullable. Finance expone folioId/currency y
accommodationMinor/paidMinor/penaltyMinor/balanceAfterMinor/dueMinor/creditMinor.
Minor units exactas limitadas al entero seguro JS; el navegador no calcula la tasa.
Resultado: operationId/propertyId/reservationId/status CANCELLED/policyCode,
completedAt UTC, staysCancelled, financial y reason. Sus importes son snapshot
del instante de cancelación; consultar Folio para movimientos posteriores.

Respuesta privada/no-store.401 sesión inválida/Guest,403 permisos/property,
404 reserva ajena/inexistente dentro del scope,400 formato/cuerpo inválido,
409 STALE_PREVIEW/ALREADY_CANCELLED/STAY_NOT_RESERVED/UNSUPPORTED_RESERVATION/
FINANCIAL_REVIEW_REQUIRED/IDEMPOTENCY_KEY_REUSED,500 fallo técnico saneado.
Identidad de operación: Staff/property/STAFF_RESERVATION_CANCEL/key; payload
reservationId/fingerprint/reason normalizado. Reautorizar incluso el replay.
Recibo local referencia el snapshot del evento append-only: nunca reconstruir
el resultado con tarifas/saldos actuales. Sin tabla, módulo o dependencia nueva.

Bloqueo común de finanzas por reserva → padre → stays en orden estable; relectura
y fingerprint de estados/asignaciones/fechas/versiones/ledger antes de escribir.
Carreras con pagos, asignación y check-in no aplican un preview obsoleto.
Frontend Service→DTO→Mapper→Domain→Hook→UI; Staff cookies y Same Origin para
mutar; allowlist de respuestas. Modal existente y callbacks/foco estables.
Sin éxito optimista. Error incierto conserva cuerpo/clave para verificar; tras
confirmación se refrescan detalle/listado/calendario/habitaciones/disponibilidad,
folios e historial Guest. No ampliar el flujo mock ni suponer garantías de PSP.

## Aceptación y validación previstas

Scope/permisos/Guest/revocación; N estancias y liberación ATS; estados no elegibles;
preview obsoleto; reintentos/carrera/rollback; bloqueo concurrente con check-in;
movimientos originales intactos, cálculo/compensación/penalización/saldos exactos
y auditoría única con motivo. OpenAPI real y verify
Backend completo. Web: preview obligatorio, errores, doble submit, recuperación
incierta, refresco, teclado y móvil. QA real en3001 y aceptación manual del owner
antes de marcar COMPLETADA. Sin commit/push por esta preparación.

## Recorrido de QA manual

1. Crear una reserva nueva desde la web pública o desde Staff, con fechas futuras.
2. Ingresar como Recepción o SuperAdmin, abrir Reservas y su detalle; seleccionar
   **Cancelar reserva**. Revisar el alojamiento original, pagos, penalización
   del 10% y saldo resultante antes de escribir un motivo y confirmar.
3. Comprobar **Cancelación registrada**, todas las estadías canceladas y su
   disponibilidad liberada. En **Folio y pagos**, verificar la compensación del
   alojamiento y el cargo de penalización, sin modificar el pago original.
4. Reabrir **Ver cancelación**: recibo y motivo consultables, sin otra acción de
   cobro. Un pago completo conserva el excedente como crédito; sin pagos queda
   deuda; un abono puede producir deuda o crédito según lo ya pagado.
5. Consultar la reserva pública con su correo y referencia: debe aparecer
   cancelada. Una reserva con una estadía iniciada o un folio ambiguo debe
   bloquearse; no se infieren penalizaciones para registros históricos incompletos.

Evidencia automatizada y capturas fuera de Git:
`%TEMP%/pms-staff-cancellation-qa`. Datos de QA y movimientos financieros
conservados; nunca se eliminan para limpiar una demostración.

## Evidencia y límites del cierre técnico

- Backend Java 21/PostgreSQL 17: 31 pruebas nuevas PASS. Regresión completa en
  lotes complementarios: 149 clases ejecutables, 1,294 pruebas PASS, cero omitidas;
  724 previamente aprobadas con el mismo código de producción y 570 en el lote
  final con `verify` y selección explícita de las clases restantes. `TestConnections`
  es una utilidad sin pruebas. No se modificaron POM, workflow ni exclusiones.
- Web: 25 pruebas nuevas PASS, incluidas recuperación de respuesta perdida,
  recuperación del recibo mediante consulta y cancelación de una petición pendiente
  después de conocer el resultado. TypeScript, ESLint y build Docker PASS.
- QA real en `localhost:3001`: reserva pública pagada, consulta por correo/código,
  cancelación Reception, reserva Staff sin pago y con abono, deuda/crédito,
  consulta SuperAdmin y móvil. 40 comprobaciones Staff PASS y 15 de lectura final
  PASS. Los movimientos originales y el inventario previo permanecen intactos.
- La suite Web global de referencia (3,003 pruebas antes de añadir los tres
  últimos casos) tuvo nueve timeouts de 5 s; al repetir secuencialmente quedaron
  cuatro en archivos existentes: `staff-admin.test.tsx`, `reservation-list.test.tsx`,
  `room-board.test.tsx` y `real-room-assignment.test.tsx`. Los tres primeros también
  fallan usando la pantalla de detalle publicada, sin la nueva entrada de
  cancelación; asignación fluctúa alrededor del límite. No se cambiaron estos
  tests ni se aumentaron tiempos. No se declara la suite Web global en verde.
- El cambio previo del usuario en `staff-admin.test.tsx` se conserva byte a byte
  y separado de esta entrega; las comparaciones usaron su versión publicada en
  una copia temporal. QA manual del owner aprobado; pendiente estabilización de
  esas pruebas existentes antes del cierre global de CI. Publicación autorizada.
- Corrección visual aprobada: «Saldo a favor del cliente» en recibo y folio Guest;
  diálogo limitado al alto disponible, contenido desplazable y acciones visibles.
  14 tests UI PASS, TypeScript/ESLint/build PASS y 23 comprobaciones de navegador
  PASS en cinco tamaños: rueda, teclado y gestos táctiles, sin escrituras de negocio.
