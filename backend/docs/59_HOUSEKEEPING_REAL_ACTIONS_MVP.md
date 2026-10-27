# Housekeeping real: edición Guest y ciclo Staff — contrato59

Compatibilidad: main859ef21 (PR169) integrado mediante merge normal; las
aserciones de privacidad Guest se conservan junto a timezone requerido.

**EN_QA** (2026-10-26). Rama `feature/housekeeping-real-actions-mvp`, base
`main`03e476e con PR168 integrado; worktree `/tmp/pms-housekeeping-actions`.
Implementación autorizada explícitamente por el usuario. El PASS manual anterior
corresponde a creación/lectura/persistencia/sin duplicados; **no acredita** el
QA de las franjas ampliadas. Acciones reales con PASS manual confirmado;
publicación autorizada, no merge.

## Ampliación de franjas y cierre de acciones — 2026-10-26

**Acciones reales: PASS manual confirmado por el usuario**: edición Android,
cancelación por swipe, inicio/finalización Firefox Staff, persistencia,
actualización de estados y restricciones. **Horarios/fechas ampliados: EN_QA
manual**, con evidencia técnica focal registrada abajo. No se extrapola el PASS.

Cinco franjas autorizadas para este MVP: `09:00–10:00`, `10:00–11:00`,
`11:00–12:00`, `12:00–13:00`, `14:00–15:00`. No constituyen catálogo
administrativo definitivo. Tipo real único: `FULL_CLEANING`.
Default10:00–11:00 cuando es válido; si no, primera franja válida. Fecha futura
dentro de estancia conserva la elección válida; al invalidarse usa otra o informa
sin disponibilidad. Checkout: fin máximo12:00; otros días admiten las cinco.

Backend whitelist y parsing de inicio/fin; due_at se calcula desde la franja y
properties.timezone, creación/nueva programación con30min. Cutoff25min contra
la programación persistida antes de editar/cancelar. Cambiar franja conserva ID
y key, recalcula due_at y no duplica solicitud/auditoría. Concurrencia/aislamiento
se conservan. El esquema existente ya admite los valores: sin migraciones nuevas.
GuestStay añade timezone de la propiedad autorizada para Android. Helpers de
programación admiten zona IANA explícita; mock conserva su cálculo anterior.
Sin metadata válida la UI no habilita opciones calculadas con la zona del teléfono.
Servidor es autoridad definitiva; no automatiza habitaciones ni cambia ciclo Staff.

Publicación del incremento completo autorizada: commit convencional, push normal,
PR hacia main, sin merge. Cinco archivos originales ajenos preservados por hash.

## API y responsabilidades

`G=/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/housekeeping-requests`.

| Operación | Body y resultado |
| --- | --- |
| PUT G/{requestId} | `expectedUpdatedAt`, `serviceDate`, `timeSlot`, `cleaningType`, `notes` opcionales.200 solicitud persistida con el mismo ID. |
| POST G/{requestId}/cancel | `expectedUpdatedAt`.200 solicitud CANCELLED, sin borrar fila. |
| PUT /api/v1/properties/{propertyId}/service-requests/housekeeping/{requestId}/status | Staff: `expectedUpdatedAt`, `targetStatus` IN_PROGRESS o DONE.200 `{id,propertyId,status,updatedAt}`. |
| PUT /api/staff/housekeeping/requests/{requestId}/status?propertyId=… | BFF Web de la operación Staff: cookie Staff HttpOnly, origen propio obligatorio, campos y respuesta proyectados. |

Se reutilizan POST/GET Guest y GET Staff del [contrato58](58_ANDROID_HOUSEKEEPING_REAL_MVP.md).
Las respuestas Guest agregan `updatedAt` y `modifiableUntil` (instante UTC del
inicio del servicio menos25min). El listado Staff agrega `updatedAt`. Cliente
debe devolver el timestamp **exacto** recibido, sin convertirlo a Date ni perder
microsegundos. Bodies cerrados, sin campos de identidad; respuestas privadas/no-store.

GuestPrincipal activo se revalida y SQL resuelve vínculo persistido→reserva→estancia,
con propiedad coherente. ID de ruta selecciona, nunca autoriza. Solicitud ajena,
estancia ajena o combinación incorrecta devuelven404 indistinguible. Staff/Guest
no intercambiables:401. Staff necesita OPERATIONS_MANAGE **y** scope de la
propiedad; SERVICE_REQUEST_INTAKE conserva exclusivamente lectura en esta API.
Scope/permiso denegado403, request fuera de propiedad autorizada404.

## Reglas y concurrencia

- Guest solo modifica OPEN, reserva CONFIRMED y estancia RESERVED/IN_HOUSE.
  Momento servidor estrictamente anterior a `due_at -25min`; exactamente en el
  límite se rechaza409. `due_at` proviene de la fecha/franja y zona de la propiedad.
- Editar mantiene ID/contexto/key original. Cinco franjas de la ampliación y
  `FULL_CLEANING`; fecha entre llegada/salida, fin hasta12:00 del checkout. Una
  programación nueva mantiene anticipación30min; notas sobre la programación
  existente pueden editarse hasta el cutoff25min. Notas trim, vacío→null, max500;
  nunca se acepta la hora/zona del teléfono como autoridad.
- Cancelar transiciona OPEN→CANCELLED. Repetición ya CANCELLED devuelve la misma
  fila incluso después del cutoff, sin nueva transición/auditoría. No DELETE.
- Staff solo OPEN→IN_PROGRESS→DONE. Repetir el estado ya alcanzado es un no-op
  sin auditoría adicional; DONE/CANCELLED no admiten otra transición.
- Transacciones, bloqueo de fila `PESSIMISTIC_WRITE` y CAS sobre `updated_at`
  existente protegen solicitudes. Guest además bloquea estancia/reserva/vínculo
  como en creación; versiones obsoletas o estados/cutoff inválidos409. Un PUT
  idéntico Guest es no-op, incluso si el primer resultado se perdió; no evita
  las comprobaciones de estado/cutoff/vínculo. No crea solicitudes ni pagos.
- Auditoría Guest HOUSEKEEPING_EDITED/CANCELLED con actor de sesión; edición
  registra fecha y `notesChanged`, sin contenido de notas. Staff reutiliza
  startProgress/complete de ServiceRequestService con actor Staff auditado.
- **No se modifica hk_room_states ni DIRTY/CLEAN/INSPECTED**, DND o asignaciones.
  Sin tablas, migraciones ni dependencias nuevas; ServiceRequest persistido
  es la fuente de verdad. No API Guest para DONE.

400 body/fecha/franja/notas inválidos;401 sesión;403 permisos Staff;404 recurso
no disponible;409 conflicto de versión/estado/cutoff/estancia. Fallos transaccionales
no confirman éxito. Cliente conserva formulario o permite refrescar/reintentar.

## Integración y verificación

Android conserva DTO→mapper→Domain→hook→UI, formulario y diseño. En real, OPEN
editable antes del cutoff: tocar precarga el formulario con Guardar cambios;
swipe abre ConfirmationModal «Cancelar solicitud». Mutations HTTP reutilizan
sesión nativa y refrescan queries persistidas, sin provider session-only ni
copias optimistas. Cancelado desaparece de Activos y permanece en Todos.
IN_PROGRESS/DONE/CANCELLED son de solo lectura Guest. Cuenta/Mis servicios y
Servicios/Mis servicios comparten origen/cache por cuenta/reserva/estancia y
refresco al recuperar foco. Mock conserva edición/eliminación/completado simulados.

Staff conserva tarjeta/modal/tabla y una query para contador OPEN+IN_PROGRESS y
todos los estados. Acciones contextuales confirmadas, sin éxito optimista;
tras guardar refresca tabla/contador.409 exige actualización, otros errores
permiten reintento. Cambiar propiedad/sesión desmonta el contexto y aborta la
mutación pendiente en cliente. Backend siempre vuelve a autorizar.

OpenAPI real: **74 operaciones /58 paths /96 schemas /15 tags**, paridad con
mappings. Tests estructurales cubren nuevas rutas, audiencias, schemas y errores.
Resultados y pasos manuales en [guía Android42](../../frontend/pms-hotel-android/docs/42_HOUSEKEEPING_REAL_ACTIONS_QA.md).

Pendientes: QA manual de las cinco franjas/fechas y zona de teléfono distinta,
variantes adversas no confirmadas y visual/responsive/foco no acreditado. No se
atribuye PASS de estos escenarios al usuario. No asignación de empleados,
notificaciones, polling de red, Room Service ni automatización de habitaciones.
