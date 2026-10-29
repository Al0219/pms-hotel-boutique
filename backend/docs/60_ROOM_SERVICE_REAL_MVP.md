# Room Service real MVP — contrato60

**COMPLETADA / PASS técnico y manual** para el recorrido Room Service, confirmado
por el usuario. Rama `feature/android-room-service-real-mvp`, base main8aed2f6
(PR171), worktree `/tmp/pms-room-service`. IMP-AND-0111 conserva su cierre UI/mock;
este contrato documenta la ampliación persistida. Publicación mediante commit,
push normal y PR autorizada; merge no autorizado.

Ajuste final de Mis servicios: feedback coordinado Housekeeping/Room Service,
un control «Actualizar servicios» y vacío global «No tienes servicios registrados»
solo cuando ambos listados y otros servicios están vacíos. Con historial y un
filtro vacío se conserva su mensaje general. Carga, error, offline o refetch
pendiente nunca presentan un vacío falso. Cards, acciones y polling se conservan.
**PASS técnico; revisión visual de este ajuste pendiente**, sin atribuir QA adicional.

## API, identidad y alcance

Sea `G=/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}` y
`S=/api/v1/properties/{propertyId}/service-requests/room-service`.

| Método / ruta | Regla y resultado |
| --- | --- |
| GET G/room-service-menu | GuestPrincipal activo y vínculo propio; catálogo persistido de la propiedad, incluye disponibilidad y precios menores GTQ. |
| GET G/room-service-orders | Mismo contexto propio; historial con todos los estados, líneas/precios snapshot, programación, notas, total y versión. |
| POST G/room-service-orders | Idempotency-Key16–100 alfanumérico/guiones.201 OPEN /200 replay del mismo intento. |
| PUT G/room-service-orders/{requestId} | expectedUpdatedAt y pedido completo;200 mismo ID actualizado/no-op. |
| POST G/room-service-orders/{requestId}/cancel | expectedUpdatedAt;200 CANCELLED/replay, sin borrar pedido ni líneas. |
| GET S | Staff activo, SERVICE_REQUEST_INTAKE u OPERATIONS_MANAGE y propiedad autorizada. |
| PUT S/{requestId}/status | Staff OPERATIONS_MANAGE, misma propiedad; expectedUpdatedAt y targetStatus IN_PROGRESS o DONE. |

No GET de detalle adicional: las listas incluyen toda la información necesaria.
BFF Web GET `/api/staff/room-service/orders?propertyId=…` y PUT
`/api/staff/room-service/orders/{requestId}/status?propertyId=…`: cookie Staff
HttpOnly, JSON allowlist, origen propio obligatorio en escritura, proyección de
respuesta y errores seguros. Nunca cookie Guest como Staff. Backend revalida
permiso/membership/scope; el BFF no sustituye autorización. UUID de ruta solo
selecciona, nunca prueba pertenencia.

GuestServiceContext extrae sin cambiar el SQL/locks ya probados en Housekeeping:
`guest_reservation_links`→reservation→stay con property coherente. Revalida
GuestPrincipal mediante GuestAuthService; propiedad, habitación y GuestProfile
se derivan de los registros, sin confundir GuestAccount con GuestProfile.
No acepta accountId, propertyId, roomId, precios ni totales del cliente. Cuerpos
cerrados, líneas únicas por producto, enteros1–5, máximo6 productos, notas
opcionales trim/max500, vacío→null.401 sesión/contexto JWT incorrecto;404 contexto
ajeno/inexistente indistinguible;400 datos/productos/programación inválidos;
403 permisos/scope Staff;409 versión/estado/cutoff/estancia o key conflict.
Respuestas private,no-store. OpenAPI generado:81 operaciones/64paths/104schemas/
15tags, paridad con mappings y audiencia Guest nativa/Staff; sin exclusiones nuevas.

Ejemplo de creación (IDs reales del GET catálogo, nunca códigos mock):

```json
{"serviceDate":"2030-01-02","deliveryTime":"09:00","items":[{"productId":"<UUID persistido>","quantity":2,"mealPeriod":"BEVERAGES"}],"notes":"Sin azúcar"}
```

Editar agrega expectedUpdatedAt exacto de la respuesta; cancelar solo envía ese
campo. No convertir el timestamp a Date para reenviarlo: conservar microsegundos.
Staff retorna el mismo pedido con su estado/version persistidos; sus cuerpos no
admiten notas/importe ni otras transiciones.

## Catálogo y precios

Migración aditiva **005-operations-005** crea tres tablas:

- room_service_products: property, código estable, nombre, periodos estructurados
  text[], unit_price_minor, GTQ, available y fecha de actualización. No stock físico.
- room_service_orders: PK=ServiceRequest.id, estancia, key, hashes inicial/actual
  de intento, fecha/hora, currency y total_minor. No segunda identidad/lifecycle.
- room_service_order_lines: producto, nombre y precio snapshot, periodo elegido,
  cantidad y total de línea; PK pedido/producto y checks de cantidades/importes.

ServiceRequest existente añade categoría ROOM_SERVICE mediante ampliación del
CHECK en el changeset nuevo, sin editar migraciones aplicadas. Mantiene OPEN,
IN_PROGRESS,DONE,CANCELLED y contexto/fechas/auditoría existentes. Unique(stay,key)
y FK compuesta a ServiceRequest(id,stay_id) evitan metadata incompatible; se añade
el índice único requerido en la tabla existente. No tablas de pagos ni folio.
Rollback está definido; después de crear pedidos no se debe intentar quitar la
categoría/tablas sin una estrategia de conservación de datos (CHECK impide
volver a la categoría anterior mientras existan solicitudes ROOM_SERVICE).

Datos iniciales por **cada propiedad existente al aplicar** la migración:

| Producto | Periodos | GTQ |
| --- | --- | ---: |
| Desayuno continental | BREAKFAST |75 |
| Desayuno típico | BREAKFAST |85 |
| Club sándwich | LUNCH,DINNER |90 |
| Hamburguesa de la casa | LUNCH,DINNER |95 |
| Café | BEVERAGES |20 |
| Jugo natural | BEVERAGES |25 |

Los seis valores actuales quedan autorizados como datos iniciales de este MVP;
no se implementa catálogo administrativo definitivo ni CRUD de menú. Una propiedad
creada después necesita provisión de catálogo: lectura vacía real, sin fallback.
IDs de producto son UUID persistidos; el adapter Android conserva fixtureKey como
nombre interno compatible del carrito, pero en real contiene ese UUID.

Backend obtiene productos/precios/disponibilidad exclusivamente de su property,
valida mealPeriod contra periodos del producto y bloquea filas de catálogo durante
la operación. Importes enteros en centavos, total calculado por servidor. Tras
crear, cambios del catálogo no alteran el pedido. En edición, productos que
permanecen conservan nombre/precio snapshot; nuevos usan los valores vigentes.
Android precarga esos precios guardados al editar; el total de carrito es una
vista previa y el historial/Staff presentan el total persistido. Producto no
disponible no puede añadirse ni confirmarse en una edición efectiva.

## Programación y responsabilidades

Se conservan cuatro categorías/carrito, cantidades y reglas del mock:

- BREAKFAST06:30 inclusive–11:30 exclusiva; LUNCH11:30–17:00; DINNER17:00–22:00.
- BEVERAGES06:30–23:00, incluido23:00. Todos los productos del carrito deben
  admitir su periodo elegido a la hora indicada; no mezclar comidas incompatibles.
- Fecha dentro de llegada/salida, reserva CONFIRMED y estancia RESERVED/IN_HOUSE.
  Inicio al menos30min después del reloj servidor, en properties.timezone.
- Salida normal12:00 del día departure. Sin late checkout persistido autorizado
  en este MVP: almuerzo/cena no se habilitan en departure, tal como el mock sin
  late checkout; bebidas no superan12:00. El estado session-only nunca lo extiende.
- Guest edita/cancela solo OPEN y estrictamente antes de due_at−25min, evaluando
  la programación persistida primero. Nueva programación exige30min; editar
  contenido de una programación sin moverla conserva la ventana de modificación25.
- Editar mantiene ID y recalcula due_at UTC, programa y líneas. Staff inicia OPEN
  y completa IN_PROGRESS; DONE/CANCELLED son solo lectura. Guest nunca marca DONE.

La zona del teléfono no autoriza horarios. GuestStay.timezone existente alimenta
los helpers compartidos de fechas; metadatos ausentes/incorrectos no habilitan
horarios basados en otra zona. Se reutilizan DatePicker/TimeWheelPicker/carrito.
Formatter IANA se cachea para el selector de1440 minutos; no cachea solicitudes.
Completar un pedido no escribe estados físicos de habitación, cargos, folio o pagos.

## Idempotencia, concurrencia y auditoría

Una transacción: sesión/vínculo y lock de stay/reservation/link → key → validación
si nuevo → productos/precios → ServiceRequest/metadata/líneas → audit. La misma
key y payload normalizado recuperan el mismo pedido, aunque el catálogo/estado o
el pedido hayan cambiado después. Payload distinto con key existente:409. El hash
inicial conserva el intento original y el actual reconoce PUT idéntico/no-op.
No se repite apertura, transición ni auditoría. No hay pago/cargo que duplicar.

Guest y Staff bloquean la misma fila ServiceRequest con PESSIMISTIC_WRITE y CAS
sobre updated_at existente. Ediciones concurrentes diferentes no se pisan; estado
actual y cutoff se revalidan dentro del lock. Cancelar CANCELLED o transicionar
al estado ya alcanzado es un replay sin auditoría extra. Se conservan notas en
el pedido; auditoría Guest registra actor autenticado, acción, fecha/hora y total,
sin texto de notas. Staff usa startProgress/complete y auditoría existentes.
Rollback de la operación revierte solicitud, líneas y auditoría conjuntamente.

## Android, Web y límites

DTO→Mapper→Domain→hook→UI. HTTP NativeGuestClient/session/secure credentials
existentes; EXPO_PUBLIC_USE_MOCK_API=false elige HTTP sin fallback. Mock mantiene
la UX y comportamiento frontend-only anteriores, sin exigir Guest login a sus
pruebas aisladas. Cuatro categorías, carrito/cantidades, calendarios, validaciones,
confirmación, errores y navegación se conservan; se habilita launcher y ruta real.

Cuenta/Mis servicios y Servicios/Mis servicios leen los pedidos persistidos.
Filtros Activos=OPEN/IP, Solicitados=OPEN, Completados=DONE, Todos incluyeCANCELLED;
Asignados no inventa asignación Staff. Edición precargada y cancelación swipe con
confirmación, no provider session-only ni éxito falso. Sin Guest completar.
Refresco10s solo visible/primer plano/sesión/estancia válidas y pedidos activos,
parado al finalizar/salir/cambiar contexto; foco/foreground actualizan de inmediato.
Hook extraído de Housekeeping sin cambiar su comportamiento y probado en regresión.
No WebSockets, push, polling global ni cola de pedidos offline persistida. Tras
respuesta incierta y cerrar formulario, consultar historial antes de iniciar otro.

Web `/room-service` reutiliza StaffShell/PropertySwitcher/DataTable/Button/
ConfirmDialog. Staff con INTAKE puede leer, solo OPS puede iniciar/completar.
Sin ALL_PROPERTIES implícito, tabla aislada por property/session, GET/PUT BFF
existentes de Staff transport y cache eliminada al logout; sin página de catálogo,
asignación de empleados, filtros avanzados ni automatización de habitaciones.

Evidencia/QA manual: [guía Android43](../../frontend/pms-hotel-android/docs/43_ROOM_SERVICE_REAL_MVP_QA.md).
