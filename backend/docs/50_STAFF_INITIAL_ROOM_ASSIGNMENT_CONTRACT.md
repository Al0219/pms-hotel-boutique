# Asignación inicial real de habitación — Staff

Estado: **COMPLETADA**; QA manual de asignación física PASS confirmado por Alan
el 2026-10-08, con cierre documental autorizado. Incremento autorizado expresamente por Alan el 2026-10-08:
asignar desde detalle de Reserva, solo room=null, misma propiedad/RoomType,
disponibilidad [arrival, departure), excluir OOO/OOS superpuestos, sin
sobrescritura, transacción/auditoría Staff y refresco de detalle/Habitaciones.
Owner integración/QA: Alan; revisión colaborativa Juan BD3, BD2 Inventory y
José WEB-3/WEB-4. No crea un ID de backlog ni altera XLSX. Extiende el detalle
IMP-WEB-0302 existente; las lecturas reales dependientes están COMPLETADAS según
AlanPlan, contrato49 y cierre Habitaciones. La fila XLSX sigue siendo la
planificación histórica frontend; autorización y reglas de este incremento
provienen de esta solicitud y del dominio vigente.

## Contrato HTTP

GET y PUT `/api/v1/reservations/{reservationId}/stays/{stayId}/room-assignment?propertyId={uuid}`.
BFF interno same-origin: mismos sufijos bajo `/api/staff/reservations`.
Staff Bearer activo, RESERVATION_MANAGE vigente y PROPERTY explícito; resolver
membership/scope antes de consultar. Guest no habilita esta operación. BFF usa
solo cookie pms_staff_access HttpOnly; PUT exige Origin configurado por
PMS_WEB_PUBLIC_URL y application/json. Refresh Staff compartido: solo401, una
rotación y un retry; no retry automático ante transporte/409/5xx.

PUT cuerpo exacto `{ "room_id": "UUID de habitación candidata" }`.
200 `{property_id,reservation_id,stay_id,room_id,number}`.
GET200 `{property_id,reservation_id,stay_id,arrival,departure,room_type_id,
room_type,can_assign,reason,rooms}`; cada room contiene
`{room_id,number,floor:null,operational_status:"ACTIVE",selectable:true,reason:null}`.
Las candidatas incluyen solo habitaciones disponibles, de la misma property y
RoomType. floor no tiene fuente y permanece null. ACTIVE aquí expresa ausencia
de bloqueo durante ese período, no limpieza, ocupación actual ni estado persistido
nuevo. Lista vacía válida. Stay no elegible: can_assign=false, reason y rooms=[].
El esquema generado usa nombres StaffRoomAssignmentPreview/Candidate/Result
para evitar colisiones con otros contratos.

Elegibilidad preserva dominio/recorrido existente: padre PENDING/CONFIRMED,
stay RESERVED, room=null. No habilita check-in, Room Move, extensión ni cambios
de finanzas/fechas/tarifas/estados. No consume ATS una segunda vez.

Errores:400 parámetros/cuerpo inválidos o extras;401 Staff ausente/inválido/revocado
(incluido Guest);403 permiso/property no autorizado;404 stay fuera de reserva,
reserva/stay/room fuera de property o inexistentes;409 stay no elegible, asignado,
tipo distinto, habitación ocupada o OOO/OOS superpuesto. Sin PII ni errores upstream
en respuestas BFF. Todas las respuestas BFF y datos Backend private,no-store.

## Consistencia, concurrencia e historial

Un comando transaccional bloquea la stay y después la Room con PESSIMISTIC_WRITE.
Revalida después del lock de Room: ninguna stay RESERVED/IN_HOUSE de padre no
CANCELLED con arrival < departure solicitada y departure > arrival solicitada.
También excluye registros OOO **y OOS**, no liberados, con el mismo solapamiento.
Una salida exactamente en la llegada siguiente se permite; bloqueos liberados o
fuera del período no impiden asignación. Consultar ATS no certifica Room física.

El lock compartido de Room serializa comandos de este adapter sobre distintas
stays; el lock de stay impide sobrescritura concurrente con distintas habitaciones.
Los métodos internos históricos de BD3 no se convierten en APIs de reasignación;
no exponer otro escritor HTTP ni usar escrituras SQL externas concurrentes como
parte de este flujo. No se incorpora una API de creación/liberación OOO/OOS en
este incremento; cualquier futuro escritor operativo debe coordinar el lock Room.

Asignación y evento append-only RESERVATION_STAY_ROOM_ASSIGNED se guardan en la
misma transacción, con actor STAFF/staffUserId activo, propertyId, entidad
RESERVATION_STAY/stayId, before roomId=null, after roomId/reservationId, reason,
correlation UUID y tiempo generado por AuditService. Fallo/rollback no deja
asignación ni audit parcial. No recibe actor desde el cliente.

Todo PUT sobre stay ya asignada, incluso el mismo roomId, devuelve409 y no duplica
eventos. No sobrescribe ni reasigna; retry tras respuesta perdida debe refrescar
detalle para verificar estado. La regla room=null de este incremento sustituye
el replay de éxito del escenario mock, que permanece aislado en tests históricos.

## Web y guía de QA manual

El detalle real usa BFF con ambos valores del flag mock; el worker excluye GET/PUT
reales antes de MSW. Mantiene Service → DTO → Mapper → Domain → Hook → UI.
Después de200 invalida detalle/listado, candidatas y estadías reales de Habitaciones;
la ocupación se sigue proyectando según la fecha elegida, sin forzar IN_HOUSE.
Permisos, doble click, loading/error/empty, conflicto/refetch y aborto al salir del
contexto mantienen los controles del diálogo existente. Move/extension/cancel
siguen con su disponibilidad previa.

Gate manual: NEXT_PUBLIC_USE_MOCK_API=false, stack con esta rama y reserva pública
persistida, Staff RESERVATION_MANAGE y property autorizada.

1. Abrir detalle real con room=null: elegir candidata y confirmar; contrastar en
   PostgreSQL room_id y un solo evento audit Staff; estados/fechas/tarifa intactos.
2. En reserva N stays, asignar una: las otras siguen sin asignar. No mostrar acción
   sobre stay asignada; un PUT idéntico u otra Room devuelve409.
3. Abrir Habitaciones en una fecha de la stay: ver asociación por roomId y salida
   de Sin asignar; revisar detalle sin recargar browser. Fecha externa al período
   mantiene proyección correcta.
4. Candidatas excluyen otra propiedad/tipo, RESERVED/IN_HOUSE superpuesto y ambos
   OOO/OOS no liberados. Checkout exclusivo y bloqueos liberados/fuera de fechas
   sí permiten candidata. Datos faltantes: NO EJECUTABLE manual, no inventar fixtures
   productivas ni declarar PASS; tests aislados cubren estas variantes.
5. Cambiar candidata entre preview y submit mediante otra sesión autorizada:
   conflicto sin éxito falso. Verificar Guest/anónimo401, property403 y ausencia
   de tokens en JavaScript; refresh Staff mantiene Guest separado.

### Cierre confirmado — 2026-10-08

Alan confirmó QA manual **PASS para asignación física** y autorizó marcar el
incremento COMPLETADA. Aceptación/DoD PASS con la evidencia técnica previa y la
confirmación manual del owner; no es una nueva ejecución del agente ni un resultado
individual HTTP/SQL atribuido a cada paso de la guía. Las variantes sin fixtures
manuales conservan su cobertura automatizada y sus límites, sin inventar datos.
El cierre conjunto incluye estados operativos, availability pública y Demo por
defecto, documentados en las guías Web enlazadas desde AlanHandoff.
Sin sobrescritura/reasignación ni otras mutaciones añadidas por este cierre.
Sin commit/push/merge. Evidencia automatizada y limitaciones: AlanHandoff.

## Evidencia técnica final

Backend focalizados29/full verify848 PASS (Java21/PostgreSQL17 desechable,
ninguna exclusión); concurrencia sobre misma Room y misma stay, rollback de
asignación/audit, auth/scope, bloqueos OOO/OOS, límites exclusivos y OpenAPI.
Web focalizados395/62 archivos y full1720/288 archivos PASS; recorrido RTL real
con mocks=false verifica una de N stays y refresco de proyección de Habitaciones.
BFF, transporte/refresh, worker boundary, permisos y regresiones históricas PASS.
Typecheck/lint/build mocks=false y diff-check PASS. OpenAPI46 operaciones/35 paths/
56 schemas/13 tags, mappings/refs consistentes. Evidencia técnica de la entrega
EN_QA, separada del QA manual PASS posteriormente confirmado por Alan. Este cierre
solo actualiza documentación y ejecuta diff-check; no repite suites ni OpenAPI.
