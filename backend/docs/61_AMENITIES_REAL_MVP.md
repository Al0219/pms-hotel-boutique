# Amenidades real MVP — contrato61

**COMPLETADA / PASS técnico y manual confirmado por el usuario.** Ampliación real autorizada por el usuario el 2026-10-26 sobre
IMP-AND-0113 (UI/mock COMPLETADA, ANDROID-1 / WEB-3, dependencias 0107/0103
cerradas). Backend: Alan; revisión cross-app colaborativa. Base `origin/main`
`51d6e32`, rama `feature/amenities-real-mvp`, worktree `/tmp/pms-amenities`.
Sin commit, push ni PR. Ajuste UX posterior de Mis servicios/Inicio en EN_QA
visual, separado del cierre manual del núcleo Amenidades.

## API confirmada para este incremento

La instrucción del usuario autoriza esta ampliación persistida, conservando las
reglas y UX mock de [Android29](../../frontend/pms-hotel-android/docs/29_AMENITIES_CONTRACT_PROPOSAL.md).
Se reutilizan GuestServiceContext, ServiceRequest/ServiceRequestService,
repositorio con locks, AuditService, autenticación Guest/Staff y permisos
existentes de los contratos59/60; no hay un lifecycle paralelo.

Sea `G=/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}` y
`S=/api/v1/properties/{propertyId}/service-requests/amenities`.

| Método / ruta | Autorización y resultado |
| --- | --- |
| GET G/amenities-catalog | Guest activo y estancia vinculada propia. Catálogo persistido de su propiedad, en orden visual; cada artículo tiene UUID, code y name. |
| GET G/amenities-requests | Mismo contexto; historial con todos los estados, artículos/nombres snapshot/cantidades, notas, programación y versión. |
| POST G/amenities-requests | Idempotency-Key de 16–100 caracteres alfanuméricos/guiones; 201 OPEN o 200 replay del mismo intento. |
| PUT G/amenities-requests/{requestId} | expectedUpdatedAt exacto y solicitud completa; 200 mismo ID actualizado/no-op. |
| POST G/amenities-requests/{requestId}/cancel | Solo expectedUpdatedAt; 200 CANCELLED/replay. No borra historial. |
| GET S | Staff activo, SERVICE_REQUEST_INTAKE u OPERATIONS_MANAGE, propiedad autorizada explícita. |
| PUT S/{requestId}/status | Staff OPERATIONS_MANAGE, misma propiedad; expectedUpdatedAt y targetStatus IN_PROGRESS o DONE. |

Respuestas `private, no-store`; 400 cuerpo/catálogo/cantidades/programación
inválidos; 401 sesión ausente, revocada o contexto JWT equivocado; 403 permiso o
scope Staff denegado; 404 recurso ajeno/inexistente indistinguible; 409 versión,
key/payload, estado/cutoff o estancia no elegible. Guest usa Bearer nativo;
Staff usa Bearer interno desde su BFF. No acepta identidad/property/room del
cliente, precios, cargos ni lateCheckout. UUID de ruta selecciona, no autoriza.

Ejemplo (itemId se obtiene del GET de catálogo de esa estancia):

```json
{"serviceDate":"2030-01-02","deliveryTime":"09:00","items":[{"itemId":"<UUID persistido>","quantity":2}],"notes":"Entregar en puerta"}
```

PUT agrega expectedUpdatedAt tal cual se recibió, conservando microsegundos;
POST cancel solo envía ese campo. Líneas únicas, enteros1–5, entre1 y5 líneas.
Notas opcionales trim/max500, vacías→null. Cuerpos cerrados incluyendo líneas:
fracciones, precios o identidades adicionales se rechazan, no se ignoran.

## PostgreSQL y provisión

Migración **aditiva005-operations-006**, sin editar changesets aplicados:

- `amenities_catalog`: UUID, property_id, code, name, display_order;
  UNIQUE(property_id,code). No campos financieros, stock ni disponibilidad simulada.
- `amenities_requests`: PK=ServiceRequest.id, stay_id, key, hash inicial/actual,
  fecha/hora; UNIQUE(stay_id,request_key) y FK compuesta a ServiceRequest(id,stay_id).
- `amenities_request_lines`: request_id, item_id, item_name snapshot y quantity;
  PK(request_id,item_id), FKs y CHECK cantidad1–5.

Amplía CHECK y enum Category con AMENITIES, conservando los estados existentes
OPEN/IN_PROGRESS/DONE/CANCELLED. La función SQL
`provision_amenities_catalog(property UUID)` inserta idempotentemente los cinco
artículos de la UX: Toallas adicionales, Almohada adicional, Kit dental, Kit de
aseo y Pantuflas, en ese orden. Se ejecuta para **todas las propiedades existentes**
al migrar y mediante trigger AFTER INSERT para **propiedades futuras**, dentro de
su misma transacción. UUIDs persistidos distintos por propiedad; códigos estables
no son identificadores HTTP. ON CONFLICT no reescribe nombres ni duplica filas.
Sin inicialización lazy en un GET, procesos de bootstrap ni fallback mock.

Los artículos se resuelven y bloquean FOR SHARE por propiedad al crear/editar;
ningún UUID de otra propiedad puede agregarse. Una edición conserva el nombre
snapshot de artículos que permanecen. No implementa CRUD de catálogo ni cobros,
folio, pagos, asignaciones Staff o cambios físicos de habitación.

Rollback SQL definido. Después de registrar solicitudes, no retirar la migración
sin una estrategia de conservación del historial: el CHECK previo impide quitar
AMENITIES mientras existan esas solicitudes. No se ejecuta rollback en la BD real.

## Reglas de programación y concurrencia

GuestServiceContext revalida GuestAccount/sesión y vínculo persistido, Reservation,
ReservationStay y Property coherentes; deriva Room y GuestProfile sin confundirlos
con GuestAccount. Para crear/mutar: reserva CONFIRMED y stay RESERVED/IN_HOUSE.
La historia permanece consultable después de finalizar la estancia.

Fecha entre llegada y salida inclusivas; entrega al menos30min después del reloj
Backend, interpretada en `properties.timezone`. En departure el límite normal es
**12:00 inclusive**. No se acepta late checkout session-only, ni por campos del
cliente. Horas locales inexistentes/ambiguas por DST se rechazan. No se añaden
ventanas de comidas a Amenidades.

Edición/cancelación Guest solo OPEN y **estrictamente antes de due_at−25min**
persistido, comprobado dentro del lock. Reprogramar requiere30min; cambiar solo
contenido conserva la ventana25min si fecha/hora no se mueven. Guest no completa
solicitudes; Staff solo OPEN→IN_PROGRESS→DONE. DONE/CANCELLED son de lectura.

Creación: transacción sesión/vínculo/lock stay+reservation+link → búsqueda key →
validación si nuevo → catálogo → ServiceRequest/metadata/líneas → auditoría.
Misma key+payload normalizado (orden de líneas/notas) recupera el ID/estado actual,
incluso después de editar/cancelar/cambiar elegibilidad. Payload distinto:409.
Hash inicial conserva el intento y hash actual reconoce PUT idéntico/no-op.
Sin duplicar apertura, transición, líneas o auditoría.

Guest y Staff bloquean la misma ServiceRequest con PESSIMISTIC_WRITE y CAS
expectedUpdatedAt; dos ediciones diferentes no se pisan, start vs cancel tiene un
solo ganador. Repetir CANCELLED o estado Staff ya alcanzado es replay sin audit
extra. Listas Guest/Staff usan una transacción de lectura REPEATABLE_READ para
no mezclar líneas anteriores con una versión nueva durante una edición concurrente.

Audit Guest AMENITIES_REQUESTED/EDITED/CANCELLED conserva actor autenticado,
property/entity, estado o programación/artículos/cantidades, sin texto de notas.
Staff reutiliza REQUEST_STARTED/REQUEST_COMPLETED y actor Staff. Rollback revierte
solicitud, líneas y auditoría juntos; auditoría existente permanece append-only.

## Android y Web Staff

Android conserva catálogo→carrito→programación, cantidades1–5, búsqueda, notas,
fechas, selector horario, swipe/confirmaciones, errores y navegación de la UX.
Mock permanece aislado y disponible. `EXPO_PUBLIC_USE_MOCK_API=false` selecciona
HTTP NativeGuestClient y catálogo Backend sin fallback; error/vacío son reales.
El campo interno itemFixtureKey del carrito lleva el UUID persistido en modo real.
DTO→mapper→domain→hooks→UI; no red directa ni DTO crudo en pantalla.

Edición precargada por historial propio y versión congelada con el draft; un
refetch no concede una versión nueva al borrador viejo. Horarios usan timezone
persistida y checkout normal, ignorando late checkout simulado. Conflicto no
produce éxito falso. No hay cola offline ni persistencia local de intentos;
si se cierra un formulario con resultado incierto, consultar historial antes de
iniciar una solicitud nueva. Reintento manual del mismo intento conserva key.

Cuenta/Mis servicios y Servicios/Mis servicios incorporan Amenidades reales sin
copias session-only. Activos=OPEN/IP, Solicitados=OPEN, Completados=DONE,
Todos incluye CANCELLED; Asignados no inventa asignación. **Un solo** botón
Actualizar servicios refresca las tres consultas una vez, con fetch deduplicado.
Vacío general solo tras lecturas exitosas/vacías de todas las fuentes; con
historial y filtro vacío conserva su mensaje. Error/offline/refetch no anuncian
vacío falso ni ocultan tarjetas válidas de la última consulta.

Reutiliza useGuestServiceRequests: polling10s solo visible, foreground, sesión/
estancia válidas y solicitudes activas; foco/foreground refrescan de inmediato,
se detiene al salir, cambiar contexto o quedar todos terminales. Cache por cuenta/
reservation/stay, limpieza de sesión existente y confirmación desmontada al
cambiar estancia. Sin cambios de implementación en Housekeeping/Room Service.

Web `/amenities`: StaffShell/PropertySwitcher, DataTable, Button y ConfirmDialog.
Solo propiedad concreta; consulta por sesión/property y limpieza al logout.
INTAKE lee; OPS inicia/completa. Tabla con reserva/habitación, artículos×cantidad,
fecha/hora, notas y estado. Sin precios ni cargos.
BFF GET `/api/staff/amenities/requests?propertyId=…` y PUT
`/api/staff/amenities/requests/{requestId}/status?propertyId=…`: cookie Staff
HttpOnly, origen propio requerido al escribir, UUID/scope/cuerpo allowlist,
proyección de respuesta y errores seguros; nunca utiliza cookie Guest. Backend
revalida permiso, membership, propiedad y versión. Sin éxito optimista.

OpenAPI generado y paridad mappings: **88 operaciones /70 paths /112 schemas /
15 tags**, sin exclusiones nuevas; incluye auth/audiencias, campos, límites,
headers y errores. Evidencia `backend/target/openapi-generated.json` y conteos.

QA, pruebas y comandos: [Android44](../../frontend/pms-hotel-android/docs/44_AMENITIES_REAL_MVP_QA.md).

## Ajuste de presentación posterior — 2026-10-26

PASS manual del núcleo confirmado por el usuario. Mis servicios reutiliza una
card con cabecera uniforme/compacta, chevron y detalles inline, una abierta por
listado; Inicio retira los dos textos solicitados. Conserva callbacks, reglas,
swipe, filtros, refresh y polling, sin cambios funcionales ni HTTP/DB/OpenAPI.
Ajuste visual aún EN_QA, ver QA44.

Ajuste UX vigente2026-10-27: altura colapsada uniforme, chevron condicionado a
desbordamiento real medido y expansión inline única sin botones añadidos. Tocar
el cuerpo conserva edición y swipe conserva cancelación. Reglas/contratos/DB y
polling sin cambios. QA visual pendiente, pauta actual al final de QA44.
