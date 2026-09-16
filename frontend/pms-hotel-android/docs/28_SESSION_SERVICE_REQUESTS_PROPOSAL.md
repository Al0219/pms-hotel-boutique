# 28 — Session Service Requests / IMP-AND-0112

**Contract:** **APPROVED**.
**Implementation:** **COMPLETED**.
**Automated QA:** **PASS** (`lint`, `typecheck`, 142 tests).
**Manual QA:** **PASS**.
**WEB-3 review:** **PASS**.

## Iteración QA — vehículos y edición session-only

Valet mantiene un `SessionVehiclesProvider` independiente del registro de servicios. `SessionVehicle` contiene únicamente marca, modelo, `platePrefix`, `plateBody`, color opcional y estado físico `PARKED` (`En parqueo`) o `WITH_GUEST` (`Conmigo`); sus IDs son frontend/session-only. La presentación deriva la placa como `${platePrefix} ${plateBody}`. El huésped registra primero su vehículo y selecciona únicamente vehículos `PARKED` sin una `VEHICLE_REQUEST` activa para `VEHICLE_REQUEST`.

`VEHICLE_REQUEST` representa la solicitud de preparar un vehículo propio del huésped. `TRANSFER` representa transporte gestionado por el hotel y no usa `SessionVehicle`. El éxito de una solicitud no cambia automáticamente el estado físico. `Marcar como recibido` cambia en la simulación `PARKED → WITH_GUEST` y completa únicamente la `VEHICLE_REQUEST` activa ligada por `sessionVehicleId`; `Entregar al valet` cambia `WITH_GUEST → PARKED` sin crear ni reactivar solicitudes.

Los tipos de servicio guardan detalles discriminados session-only cuando necesitan conservar su configuración. Housekeeping, Room Service, Vehicle Request y Transfer abren su editor funcional; Late check-out conserva fecha y extensión fijadas por el hotel y no presenta controles editables falsos. La finalización ocurre exclusivamente mediante el check de la card cuando llega el momento programado. `updateRequest` conserva `sessionRequestId` y `createdAtMs`; no crea una segunda entrada. No hay Backend, persistencia ni lifecycle autoritativo.

Para `HOTEL_ASSIGNED`, el editor modifica exclusivamente su representación session-only: `title` hasta 60 caracteres y `summary` hasta 150. No modifica el mensaje de Chat ni afirma una notificación al hotel.

La selección de un vehículo no equivale a solicitarlo. `Solicitar mi vehículo` abre una única superficie con dos estados internos: `VEHICLE_SELECTION` muestra solo los vehículos registrados y permite elegir únicamente `PARKED`; al elegir uno, sin cerrar la superficie ni mutar datos, `VEHICLE_CONFIGURATION` reemplaza la lista por vehículo, estado, hora y CTA. `Cambiar vehículo` regresa al selector en esa misma superficie. En edición de `VEHICLE_REQUEST`, se abre directamente la configuración con vehículo y `requestedTime` precargados.

Solo el éxito de la mutation ejecuta `addRequest` (o `updateRequest` en edición). Cuenta y `/services/requests` reutilizan la misma card: los tipos editables (`ROOM_SERVICE`, `VEHICLE_REQUEST`, `TRANSFER`) usan la card completa como target accesible de edición, sin botón visible `Editar`; los demás tipos no navegan al tocarse. Cada navegación transporta únicamente `editRequestId` y `returnTo` (`account` o `requests`) para volver al consumer de origen.

## Límites y validación frontend de formularios

Los controles productivos tienen un límite explícito de entrada: notas multiline de Housekeeping y Room Service `500`, Chat `1000`, marca/modelo de vehículo `40`, cuerpo de placa `6`, color `30`, código de reserva `32` y correo `254`. Los selectores de traslado son inputs de solo lectura controlados por el selector local y limitan su valor visible a `100`; no existe un destino textual libre en este MVP.

Las notas siguen aplicando `trim()` en submit y omiten el campo cuando son opcionales y quedan vacías. Chat conserva su protección existente contra mensajes cuyo `trim()` queda vacío. Required/formato se muestran inline después del intento de envío o de blur en placa; los errores se anuncian con texto vivo y se reutilizan como hint de accesibilidad.

El registro session-only de vehículos aplica `trim` a marca, modelo y color, y mayúsculas/trim al cuerpo de placa al guardar. El prefijo se elige exclusivamente del catálogo frontend `P`, `A`, `C`, `TE`, `U`, `TRC`, `M`, `MT`, `TC`, `O`, `CD`, `CC`, `MI`, `DIS`; no se escribe en el campo. El body tiene `maxLength={6}` y cumple `^\d{2,3}[A-Z]{3}$`. La identidad local es `platePrefix + normalizedPlateBody`: `P 123ABC` y `P 123abc` son duplicados; `C 123ABC` es válido como vehículo distinto. Esta es validación de formato frontend, no una consulta ni verificación SAT/Backend, no garantiza validez legal/registral y un Backend futuro podrá reemplazar el catálogo.

## Alcance implementado

`IMP-AND-0112` incorpora un registro temporal de solicitudes de servicios de la sesión Guest. El registro vive exclusivamente en memoria mientras el árbol Guest permanezca montado y se pierde al terminar o reiniciar el proceso.

No usa Backend, HTTP, AsyncStorage, SecureStore, SQLite, filesystem, NetInfo, cola offline, polling, notificaciones, WebSocket ni historial persistente.

## Arquitectura

El módulo transversal es `src/modules/service-requests/`. Contiene el modelo de presentación frontend/session-only, un `SessionServiceRequestsProvider` y un reducer local. El provider se monta una sola vez en `app/(guest)/_layout.tsx`, alrededor del stack Guest; por ello una misma instancia cubre Services, Housekeeping, Room Service, Valet, Chat, Cuenta y `/services/requests`.

React Context + `useReducer` es el store de esta fase. TanStack Query continúa siendo responsable únicamente de los Query/Mutation propios de cada feature y no almacena este registro. No se usa Zustand ni un provider por pantalla.

```text
Mutation mock exitosa / asignación Chat estructurada
  → addRequest(...)
  → SessionServiceRequestsProvider + reducer
  → preview de Cuenta y lista canónica de Servicios
```

El reducer ordena por `createdAtMs` descendente. `sessionRequestId` y `createdAtMs` son valores frontend/session-only: sirven para keys y orden local, y no son IDs ni timestamps Backend. La API pública expone `requests`, `addRequest(input)`, `updateRequest(sessionRequestId, input)`, `completeRequest(sessionRequestId)` y `removeRequest(sessionRequestId)`. `dedupeKey` es una clave local opcional para eventos estructurados de Chat. `completeRequest` conserva la entrada con estado `COMPLETED`; `removeRequest` elimina solo la representación local indicada. Ninguna de las dos operaciones cancela una solicitud real, Room Service, traslado o valet, no modifica vehículos fuera de la transición explícita de recepción y no ejecuta mutations ni operaciones Backend.

## Modelo de presentación

```ts
type SessionServiceRequestKind =
  | 'HOUSEKEEPING'
  | 'ROOM_SERVICE'
  | 'VEHICLE_REQUEST'
  | 'TRANSFER'
  | 'LATE_CHECKOUT'
  | 'HOTEL_ASSIGNED';

type SessionServiceRequestOrigin = 'SERVICES' | 'VALET' | 'CHAT';
type SessionServiceRequestStatus = 'REQUESTED' | 'ASSIGNED' | 'COMPLETED';

interface SessionServiceRequest {
  sessionRequestId: string; // frontend/session only
  kind: SessionServiceRequestKind;
  origin: SessionServiceRequestOrigin;
  title: string;
  summary?: string;
  status: SessionServiceRequestStatus;
  createdAtMs: number; // frontend/session only
  details?: SessionServiceRequestDetails; // configuración de edición, frontend/session only
}
```

La UI presenta `REQUESTED` como `Solicitado`, `ASSIGNED` como `Asignado por el hotel` y `COMPLETED` como una simulación frontend/session de cumplimiento. Las listas activas de Cuenta y `/services/requests` excluyen `COMPLETED`, sin borrarlo del state. No representa lifecycle Backend.

## Filtros, finalización y modificación

Cuenta es un preview: deriva `activeRequests` (`REQUESTED` y `ASSIGNED`) y muestra las tres entradas más recientes. `/services/requests` es el historial session-only filtrable; inicia en `Activos` y permite `Solicitados`, `Asignados`, `Completados` y `Todos`. `filterServiceRequests` es una utilidad pura que preserva el orden newest-first sin mutar el state. Las entradas `COMPLETED` no salen del store: son visibles en `Completados` y `Todos`, con estado `Completado`, y quedan de solo lectura.

Las cards activas muestran el check derecho de 48dp solo para una solicitud con programación estructurada. Antes de `completionEligibleAt` permanece disabled y no abre confirmación; después abre `ConfirmationModal`. Room Service, Vehicle Request y Transfer usan su hora puntual; Housekeeping usa el final de su franja; Late check-out usa `departure + checkoutUntil`. `HOTEL_ASSIGNED` sin programación no tiene check. Una `VEHICLE_REQUEST` confirma “Marcar como recibido”, cambia únicamente su vehículo vinculado `PARKED → WITH_GUEST` y completa su `sessionRequestId` exacto. Esta transición es una simulación frontend/session y no comunica un Backend.

Editar y eliminar una solicitud activa programada requiere que falten más de 25 minutos. `canModifyServiceRequest` centraliza el corte usando únicamente los datos locales disponibles: delivery/request time, inicio del slot de housekeeping o `scheduledAtMs` de transfer. Las solicitudes sin hora real siguen modificables. La misma guardia se aplica al reducer provider antes de actualizar o eliminar. El swipe conserva un reveal de media anchura medida y la acción destructiva ocupa esa mitad con fondo rojo.

No hay dedupe por `kind`: múltiples Housekeeping, Room Service, Transfer o Vehicle Request pueden coexistir con IDs session-only distintos. La protección de doble evento queda limitada a `dedupeKey` de Chat y a los guards de submit; completar, editar o eliminar una entrada afecta únicamente su `sessionRequestId`.

La programación de nuevas solicitudes de Housekeeping, Room Service y Vehicle Request usa los helpers puros compartidos y exige `scheduledAt >= now + 30 minutos` en selector, CTA y guard de submit. Cada una combina fecha local `YYYY-MM-DD` con su hora o slot, por lo que una hora temprana de un día futuro es válida. El corte de modificación sigue siendo independiente: `now < scheduledAt - 25 minutos`. Transfer conserva su fecha y hora completas y su validación propia de +30 minutos.

## Productores

Cada productor registra una entrada únicamente en el callback de éxito efectivo de su mutation; pending, error, offline, double tap y retries fallidos no agregan entradas.

| Productor | Entrada session-only tras éxito | Límites conservados |
| --- | --- | --- |
| Housekeeping | `Limpieza`; tipo y horario ya elegidos | No cambia `HousekeepingRequest` ni agrega IDs de Room/Stay/Reservation. Los catálogos QA de tipo/franja siguen frontend/mock provisionales. |
| Room Service | `Room Service`; suma de unidades y `Entrega {deliveryTime}` | No guarda carrito, fixture keys, precios, total monetario, notas, habitación ni IDs. |
| Valet | vehículo o traslado usando texto ya visible | No promueve referencias dummy, rutas, tarifas o IDs a datos de solicitud. |
| Services inline | Late check-out con fecha de salida y extensión hotel-defined | No trata `priceText` como importe ni copia el catálogo. |
| Chat | asignación hotelera estructurada, `HOTEL_ASSIGNED` / `CHAT` / `ASSIGNED` | No infiere asignaciones desde texto, regex ni keywords. |

Chat amplía aditivamente el fixture/domain con `serviceAssignment?: { assignmentKey; title; summary? }`. Los mensajes normales no registran nada; `assignmentKey` deduplica una asignación durante rerenders o refetches.

## Consumers y navegación

`/account` conserva `Mi estadía` y añade debajo el preview `Mis servicios`: muestra estado vacío `Aún no tienes servicios solicitados.`, hasta tres entradas más recientes y `Ver todos` cuando existe al menos una. La acción navega a `/services/requests`.

`/services/requests` es la lista canónica de solicitudes activas, titulada `Mis servicios`, con el mismo empty state y todas las solicitudes activas newest-first. Reutiliza `GuestNavigationShell`; `/services/*` mantiene activa la tab Servicios mediante el resolver existente. Su Back vuelve efectivamente a `/services`.

Las cards configurables son targets accesibles de edición y las activas admiten swipe horizontal izquierdo cuando aún pasan el cutoff. Late check-out presenta su detalle fijo sin abrir un formulario editable. La card conserva una anchura uniforme y se desplaza la mitad de su propia anchura para revelar una mitad completa de eliminación con icono de basurero. La acción solicita confirmación antes de invocar `removeRequest`. El preview de Cuenta no conserva una copia: deriva las solicitudes activas y muestra las tres más recientes, por lo que al eliminar o completar una entrada visible aparece automáticamente la siguiente disponible.

Late check-out conserva el flujo `mutation exitosa → addRequest`, pero el success es un overlay local de `/services`, no una pantalla o ruta. Se cierra con `X` o tocando el backdrop y restablece el formulario; no elimina la entrada ya registrada.

## Futuro Backend

Una fase futura podrá reemplazar el provider session-only por un boundary Backend y TanStack Query sin acoplar Cuenta a los objetos internos de Housekeeping, Room Service, Valet, Services o Chat. Esa fase debe definir por separado identidad, scope, permisos, persistencia, historial y estados autoritativos. Nada de ello se implementa en `IMP-AND-0112`.

## Datos canónicos

| Campo | Valor |
| --- | --- |
| ID / ruta | `IMP-AND-0112` / `MOB-23 /services/requests` |
| Estado de implementación | `COMPLETADA` |
| Dependencias | `IMP-AND-0107`, `IMP-AND-0103` completadas |
| Navegación | Servicios activa en `/services/requests`; no se duplica `GuestNavigationShell` |
| QA automática / manual / WEB-3 | PASS / PASS / PASS |

## Programación local de solicitudes

Las solicitudes programables creadas por el huésped guardan `serviceDate` local en formato `YYYY-MM-DD` junto con su hora (`deliveryTime`, `requestedTime`) o inicio de `timeSlot`. `getServiceDateTimeMs` combina ambos en hora local para la regla de creación `scheduledAt >= now + 30 minutos` y para el cutoff independiente de modificación/eliminación `now < scheduledAt - 25 minutos`. La fuente central `hotelStayPolicy.standardCheckoutTime = '12:00'` es la política frontend/mock actual del Hotel Boutique, no un valor de `ReservationStay` ni autoridad Backend; una futura configuración de propiedad/hotel podrá sustituirla. Housekeeping, Room Service, Vehicle Request y Transfer limitan fecha a hoy–`ReservationStay.departure` inclusive y, únicamente en departure, no superan las `12:00`; Housekeeping compara el final del slot. Late check-out es distinto: `serviceDate` siempre deriva de `ReservationStay.departure` y `checkoutUntil: '14:00'` proviene del fixture/domain hotel-defined, por lo que es una excepción aprobada y no muestra selector de fecha ni hora. Decoración especial fue retirada del módulo Android, sus producers, union y fixtures session-only.

Los launchers explícitos de creación restablecen únicamente su estado transitorio: `Registrar vehículo` abre marca, modelo, placa, color y estado con defaults limpios; `Solicitar traslado` abre destino, recogida, fecha, hora, pasajeros y estado de mutation de creación nuevos. `Editar vehículo` precarga y actualiza solo el registro de vehículo elegido por su `sessionVehicleId`; la edición de solicitudes sigue usando el `editRequestId` explícito de una card y preserva sus retornos `returnTo`. Las solicitudes ya creadas siguen en el provider session-only.

Las cards activas separan el cuerpo editable del check de 48dp situado a la derecha. Completion y eliminación usan `ConfirmationModal`; la eliminación vuelve a comprobar el cutoff al confirmar. Los summaries session-only incluyen fecha y hora/slot cuando existen; Late check-out muestra `fecha de salida · Hasta 14:00`. No se calculan total de estadía, saldo, folio, pagos ni cargos: una solicitud session-only no es una transacción financiera.

## UX regression IMP-AND-0113

Los submits Guest exitosos actualizan o crean la solicitud de sesión y redirigen a Cuenta con un notice transitorio de sesión Guest; cerrarlo descarta el notice sin navegación ni cambios de URL. El lifecycle existente no cambia. La regresión UX incluida en `IMP-AND-0113` fue validada con QA manual y revisión WEB-3 PASS; no altera el estado COMPLETADA de este contrato.
