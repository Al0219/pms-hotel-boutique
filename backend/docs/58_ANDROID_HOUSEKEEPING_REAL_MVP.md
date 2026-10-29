# Android Housekeeping real MVP — contrato y QA

Ampliación posterior: [acciones reales EN_QA](59_HOUSEKEEPING_REAL_ACTIONS_MVP.md). El estado y las
limitaciones de solo lectura de este documento describen el alcance previo PR168.

Estado funcional: **COMPLETADA / PASS manual del usuario** (2026-10-26): creación
real desde Android, consulta Firefox Staff, persistencia al cerrar/reabrir Expo Go
y ausencia de duplicados. Mejora UX Staff: **PASS técnico / EN_QA visual**;
la confirmación anterior no acredita QA visual de la nueva tarjeta/modal.
Rama `feature/android-housekeeping-real-mvp`, base main a98250f, PR167 integrado.
Commit/push normal/PR autorizados en el cierre; **no fusionar**. No se atribuyen
pruebas manuales nuevas al agente ni escenarios adicionales al usuario.

## HTTP y autorización

Sea `G=/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/housekeeping-requests`.

| Método/ruta | Contrato |
| --- | --- |
| POST G | Bearer Guest nativo existente. `Idempotency-Key` obligatorio, 16–100 caracteres alfanuméricos/guiones. 201 creado / 200 replay. |
| GET G | Bearer Guest. Solicitudes persistidas de la estancia, todos los estados; incluye notas y programación, por lo que no hace falta otro detalle HTTP. |
| GET `/api/v1/properties/{propertyId}/service-requests/housekeeping` | Bearer Staff vigente; `SERVICE_REQUEST_INTAKE` **u** `OPERATIONS_MANAGE` y membership/scope de propiedad, reutilizados de StaffServiceRequestService. Solo lectura. |
| GET `/api/staff/housekeeping/requests?propertyId=…` (Web BFF) | Solo cookie Staff HttpOnly existente. Proyecta campos permitidos, errores seguros y `private, no-store`; no acepta cookie Guest como sesión Staff. |

Identidad exclusivamente de GuestPrincipal revalidado por GuestAuthService. SQL
resuelve `guest_reservation_links` → reserva → estancia y propiedad coherentes.
Los UUID de ruta solo seleccionan contexto; no autorizan. El body no admite
propertyId, roomId, guestAccountId ni campos desconocidos. Propiedad, habitación
y booking GuestProfile se obtienen del registro autorizado; no se confunde
GuestAccount con GuestProfile. `created_by` conserva su semántica FK Staff y se
deja null para Guest. La auditoría Guest identifica la cuenta autenticada.

Body (sin identidad):

```json
{"serviceDate":"2030-01-02","timeSlot":"10:00–11:00","cleaningType":"FULL_CLEANING","notes":"Silencio, por favor"}
```

Notas omitidas/null/solo espacios → null; demás notas con trim, máximo500
caracteres (también límite HTTP del campo recibido). Respuesta Guest: `id`,
`reservationId`, `stayId`, `serviceDate`, `timeSlot`, `cleaningType`, `notes`,
`status`, `createdAt`. Sin actores, perfiles, credenciales ni datos de terceros.
Lectura Staff añade propiedad, referencia real y habitación nullable; no PII de
cuenta. Respuestas exitosas `private, no-store`. OpenAPI generado prueba rutas,
esquemas, límites, Bearer, audiencia, errores y cobertura de mappings.

Errores:400 datos/fecha/franja/notas/key inválidos;401 sesión inválida o de otro
contexto;404 estancia inexistente/ajena/combinación incorrecta indistinguible;
409 estancia no elegible o misma key con distinto payload. Staff403 si falta
permiso/scope. Android no presenta éxito ante rechazo.

## Programación MVP

Ampliación autorizada en contrato59: franjas09:00–10:00,10:00–11:00,11:00–12:00,
12:00–13:00 y14:00–15:00, con FULL_CLEANING como único tipo real. Default10:00
cuando es válido. No es catálogo administrativo definitivo; otros tipos siguen
solo mock/QA. Reglas de fecha/checkout/anticipación y zona de propiedad conservadas.

Reserva CONFIRMED y estancia RESERVED o IN_HOUSE; se rechazan CANCELLED,
NO_SHOW, CHECKED_OUT y reservas no confirmadas. Fecha inclusiva entre llegada y
salida; inicio al menos30 minutos después del reloj del servidor. Se construyen
los instantes usando `properties.timezone`, nunca la zona del teléfono como
autoridad. El final no supera12:00 del día de salida, política normal existente
acotada a este MVP; no se acepta una extensión local de late checkout como
permiso Backend. La validación de fecha/horario de la UI se conserva como ayuda;
la decisión final es del servidor. Habitación puede estar por asignar, como en
la estancia existente. Limpieza incluida, sin cargos, pagos ni folios nuevos.

## Persistencia, reintentos y auditoría

Se reutilizan ServiceRequest y ServiceRequestService.openRequest; categoría
HOUSEKEEPING, prioridad MEDIUM y estado inicial OPEN. Migración **aditiva**
`005-operations-004` agrega `service_date`, `time_slot`, `cleaning_type` y
`guest_request_key`, todos nullable para solicitudes históricas. CHECK exige
metadatos completos en solicitudes Guest estructuradas. Unique(stay_id,
guest_request_key) protege reintentos; sin nuevas tablas ni payloads ocultos en
texto. `detail` contiene únicamente notas y `due_at` el inicio convertido a UTC.

Transacción única: sesión/contexto → bloqueo de estancia/reserva/vínculo propio
→ buscar key → validar programación si es nuevo → abrir y guardar programación
→ auditoría. Reintentos concurrentes serializados; misma key/payload normalizado
recupera la solicitud sin repetir apertura/auditoría, incluso después del horario
o checkout. Payload distinto con la misma key:409. Se devuelve el estado actual
de esa misma solicitud. La respuesta inicial usa precisión de PostgreSQL.
Se conserva REQUEST_OPENED del servicio existente y se añade
HOUSEKEEPING_REQUESTED con actor GUEST, sin notas en audit. Rollback conjunto
verificado. No se escribe hk_room_states, DND ni ocupación.

## Android y Staff Web

DTO → mapper → Domain → hook → UI. HttpHousekeepingService reutiliza
NativeGuestClient/FetchTransport y renovación nativa existente, sin cookies Web.
`EXPO_PUBLIC_USE_MOCK_API=false` selecciona HTTP sin fallback; true conserva el
mock y su historial session-only. Submit conserva key por intento/payload en el
formulario, sin retry automático; doble clic bloqueado. Tras crear, invalida la
query y usa confirmación/navegación existentes. Al reabrir se consulta Backend.

Cuenta/Mis servicios muestran tarjetas persistidas de solo lectura, separadas
del provider local. OPEN=Solicitado, IN_PROGRESS=En proceso, DONE=Completado,
CANCELLED=Cancelado. No botones locales de editar/cancelar/completar. Queries
incluyen cuenta/reserva/estancia; no placeholder de otro contexto y se refrescan
al recuperar foco o pulsar Actualizar. Cambiar estancia remonta el formulario.
Filtros: Activos=OPEN/IN_PROGRESS, Solicitados=OPEN, Completados=DONE;
Cancelado se ve en Todos; las solicitudes Guest no son servicios asignados.

El guard habilita solo Servicios, Limpieza y Mis servicios además del MVP
anterior. El launcher real no monta catálogo/mock de upselling. Otros servicios
siguen bloqueados en real y conservan su comportamiento mock.

Staff Web: sexta tarjeta «Limpiezas solicitadas» en Housekeeping para
OPERATIONS_MANAGE. Cuenta solo OPEN/IN_PROGRESS de la respuesta real de la
propiedad autorizada. Abre modal «Solicitudes de limpieza» con todos los estados,
referencia/habitación, tipo, fecha/franja, notas y actualización explícita. Una
query sirve a contador y tabla; abrir/cerrar no duplica llamadas. Reutiliza Modal
(foco, Escape, retorno al disparador) y DataTable con scroll; grid6/3/2 y tabla
fija inferior retirada. Sin polling nuevo; se pausa el refresco automático del
tablero físico mientras la modal está abierta. Cambiar sesión/propiedad cambia
key y desmonta la consulta previa. HTTP mantiene también SERVICE_REQUEST_INTAKE,
sin ampliar permisos. Este ajuste de presentación no altera los endpoints.

## Validación y pendientes

Resultados finales y comandos: [guía Android](../../frontend/pms-hotel-android/docs/41_HOUSEKEEPING_REAL_MVP_QA.md).
Pruebas focalizadas de Guest/Staff, persistencia, seguridad, fecha/zona horaria,
notas, idempotencia concurrente, rollback, migraciones y OpenAPI; Android HTTP,
UI/queries/contextos/mock; BFF/mapper/presentación Staff. No se ejecutan suites
completas, builds pesados ni Docker E2E. PostgreSQL17 de pruebas descartable,
separado de la base del hotel. No se despliega ni modifica la base de trabajo.

Pendientes: QA visual final Firefox de tarjeta/modal y responsive/teclado/foco,
CI de publicación y variantes manuales no confirmadas (red/errores, sesión,
validaciones adversas y cambios de contexto). El recorrido funcional ya recibió
PASS manual explícito; no se extrapola a esas variantes. No implementados: transiciones/edición/cancelación Guest, gestión de
empleados, notificaciones, pagos, catálogo administrativo ni servicios ajenos.
El estado real se lee si Operations lo cambia por sus servicios existentes;
este MVP no agrega HTTP/UI de escritura Staff. El intento de envío no se guarda
como cola offline: tras salir de un formulario con respuesta incierta, consultar
Mis servicios antes de iniciar un pedido nuevo.
