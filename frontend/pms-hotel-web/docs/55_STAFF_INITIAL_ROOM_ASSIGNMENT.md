# Staff — Asignación inicial de habitación física

Estado vigente del incremento real: **COMPLETADA**; Alan confirmó QA manual
PASS de asignación física y estados operativos el 2026-10-08 y autorizó el cierre.
Contrato y evidencia en [Backend50](../../../backend/docs/50_STAFF_INITIAL_ROOM_ASSIGNMENT_CONTRACT.md)
y [QA61](61_STAFF_RESERVATION_OPERATIONAL_STATUS_QA.md). Las secciones iniciales
conservan el escenario frontend histórico; el contrato real y su límite sin
sobrescritura/reasignación se describen en «Incremento real autorizado por Alan».

Incremento frontend autorizado por José en Reservation Detail (IMP-WEB-0302,
WEB-3/reviewer WEB-4, dependencia IMP-WEB-0301). La fila del XLSX requiere N stays
distinguibles, detalle y pruebas RTL/visual; no tiene una fila específica de
asignación inicial. No se crea un ID ni se modifica el backlog. Usa el diseño
Staff existente; sin Node ID inventado. Rama `feature/staff-new-reservation`.

## Recorrido

Desde `/reservas/{reservationId}`, cada estadía reservada sin habitación presenta
«Asignar habitación» si la sesión tiene RESERVATION_MANAGE o SUPER_ADMIN. La app
resuelve propiedad y sesión desde sus providers; cambiar contexto remonta el
detalle y aborta el comando anterior. No se interpreta ALL_PROPERTIES como un ID.

El diálogo muestra tipo y fechas de esa estadía, número/piso y estado operativo
de habitaciones del mismo tipo. Se elige y confirma una habitación concreta;
la respuesta actualiza el detalle y el Centro de Reservas, incluidos los casos
«1 de 2 habitaciones asignadas» y «Habitaciones asignadas».

No cambia Reservation/Stay IDs, fechas, tarifa, status, finanzas ni occupancy
declarada. No confirma una reserva pendiente, genera pago o cargo, crea una
GuestAccount ni consume inventario vendible una segunda vez. La ocupación por
fechas y el estado operativo ACTIVE/OOO/OOS siguen siendo conceptos distintos.
El tablero de habitaciones conserva su proyección operativa; asignar una reserva
futura no marca la habitación como ocupada en este momento.

## Contrato y escenario local

UI → Hook → Service → DTO → Mapper → Domain. Usa únicamente el contrato
**provisional MSW** GET/PUT
`/__mock/staff-reservations/{propertyId}/{reservationId}/stays/{stayId}/room-assignment`.
PUT contiene solo `room_id`. Está bloqueado con NEXT_PUBLIC_USE_MOCK_API=false.
No se presume un endpoint real a partir de `ReservationStayService.assignRoom`.

El escenario admite una asignación inicial en reservas PENDING/CONFIRMED y stays
RESERVED sin room. Conserva el catálogo propio de GT-HB-01; no copia inventario ni
UUIDs de propiedades reales. Los nuevos bookings conservan RoomType ID internamente.
Para fixtures anteriores, el tipo se resuelve solo si su nombre tiene una única
coincidencia exacta en ese catálogo; si falta o es ambiguo, se bloquea la asignación.
Los IDs físicos históricos de esos fixtures se contrastan también por su número
dentro de la misma propiedad para detectar conflictos; esto no es un mapper Backend.

Solo ACTIVE es seleccionable en este escenario; OOO/OOS aparecen bloqueadas con
su motivo. OOS sigue contando en ATS: no se modifica la regla de venta existente.
La política operativa definitiva y los registros fechados/HK quedan pendientes del
contrato Backend, no se certifica disponibilidad real con este snapshot local.

Conflictos: reservas de escenario PENDING/CONFIRMED/NO_SHOW_PENDING y sus stays
RESERVED/IN_HOUSE asignadas con solapamiento [arrival, departure). Se permite
reutilizar una habitación cuando otra estadía sale exactamente en el check-in de
la siguiente. Revalida tipo, estado y fechas al guardar, sin await entre la última
validación y la inserción; dos comandos concurrentes no asignan la misma habitación
a estadías superpuestas. Un PUT idéntico devuelve la misma asignación; intentar
sobrescribirla exige el flujo separado de Room Move y devuelve conflicto aquí.

Una proyección en memoria contiene las asignaciones: no muta snapshots financieros
ni receipts de creación. GET de detalle/listado incorpora esa proyección. Reload
reinicia el escenario; no hay persistencia Backend ni auditoría sensible real.

## UX y aislamiento

- Carga, error/reintento, sin candidatos, candidato bloqueado, conflicto al guardar
  y resultado confirmado por el mock. No muestra éxito ante error.
- Selección explícita; confirmar requiere un candidato válido y se bloquea mientras
  consulta/guarda. Doble click no duplica PUT. ESC/cierre bloqueados durante submit.
- Reusa Modal con foco/trampa de teclado; cancelar restaura foco, asignar anuncia
  el resultado y enfoca el encabezado del detalle.
- Cache de opciones por sesión/propiedad/reserva/stay. Invalida solo reservas y
  opciones de esa propiedad; cancela requests al abandonar el contexto. Logout
  limpia la cache Staff correspondiente sin cambiar identidades Guest/Staff reales.

## Handoff Backend

Confirmar ruta HTTP y DTOs antes de integrar. Backend debe autorizar sesión/permiso
y property scope, validar pertenencia Reservation/Stay/Room/RoomType y operatividad
para el período, impedir solapamientos de forma transaccional, mantener replay sin
cargos adicionales y registrar su auditoría. Devolver la asignación y proporcionar
read models consistentes para refrescar detalle/listado. El método Java interno por
sí solo no confirma esas validaciones ni un contrato HTTP público.

No se modificó Backend, migraciones, credenciales, workflows ni login público.
Referencias: [Staff core](52_PRIVATE_STAFF_CORE.md), [Nueva reserva](53_PRIVATE_STAFF_NEW_RESERVATION.md),
[vista previa](54_STAFF_FRONTEND_PREVIEW.md).

## Validación

- Vitest: 43 archivos / 239 pruebas aprobadas de Reservas, Habitaciones, layout
  y provider Staff. Incluye asignación independiente de N stays, scope, conflictos,
  replay, estado OOO/OOS modificado tras consultar, fechas sin solapamiento y
  concurrencia. Se comprueba que ATS, finanzas, fechas y estado no cambian.
- UI: permisos y modo real bloqueados, loading/error/retry, selección inválida,
  conflicto actualizado, doble click, cierre bloqueado durante submit y abandono
  sin publicar éxito tardío. El detalle y listado reflejan asignación parcial/completa.
- `npm run lint`, `npm run typecheck`, `npm run build` y `git diff --check`: aprobados.
- Chrome en vista previa, sin Backend ni identidad BFF inyectada: crear dos stays,
  asignar 101/102, comprobar candidato ya ocupado, detalle/listado y salida al inicio.
  Sin excepciones; diálogo a 320/390/768/1440 px dentro del viewport y sin overflow.
- Next dev sufrió un fallo interno de caché Turbopack durante las comprobaciones.
  Se reinició; Next regeneró su caché y el recorrido completo volvió a pasar.
  No se cambió configuración/dependencias para ocultarlo; servidor en puerto 3001.

Esta validación acredita el escenario frontend, no integración transaccional real.
Sin commit/push de este incremento.

## Incremento real autorizado por Alan — 2026-10-08

El detalle real se conecta ahora al [contrato Backend50](../../../backend/docs/50_STAFF_INITIAL_ROOM_ASSIGNMENT_CONTRACT.md).
Usa BFF con ambos flags y candidatos PostgreSQL; transacción/audit Staff y
RESERVATION_MANAGE/property se validan en Backend. El escenario MSW descrito arriba
permanece aislado para tests históricos; su replay no define el PUT real, que
rechaza cualquier stay ya asignada con409. Se refrescan detalle/listado y la
consulta real de stays usada por Habitaciones. Estado **COMPLETADA**; QA manual
de asignación física PASS confirmado por Alan el 2026-10-08. No XLSX ni ID nuevos,
sin Room Move/extension adicionales. Cierre documental, sin repetir tests ni
modificar código; sin commit/push/merge.

## Badges operativos derivados — 2026-10-08

La lectura real aplica [la proyección de estados visibles](61_STAFF_RESERVATION_OPERATIONAL_STATUS_QA.md)
en listado/detalle y filtro. Asignación parcial de padre CONFIRMED conserva
Confirmada; completar stays RESERVED elegibles muestra Asignada después del
refresco real, sin cambiar Reservation.status ni travelState. Padre PENDING
continúa Pendiente. Los estados de comando/Backend permanecen intactos; asignación
y estados operativos quedan COMPLETADAS tras QA manual PASS confirmado por Alan.
