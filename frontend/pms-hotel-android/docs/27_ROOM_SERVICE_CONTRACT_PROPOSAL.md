# 27 — Room Service / MOB-22

**Tarea:** `IMP-AND-0111` — Servicios / Room Service.

**Contract:** **APPROVED**.
**Implementation:** **COMPLETED**.
**Automated QA:** **PASS**.
**Manual QA:** **PASS**.
**WEB-3:** **PASS**.

## Alcance aprobado para Android frontend-first

El MVP autorizado es `/services` → launcher **Room Service** → **CATALOG** → **CART** → **SCHEDULE** → confirmación → submitting → success. El catálogo concentra productos y el carrito accesible con badge; CART contiene el resumen, cantidades, total y nota opcional, mientras SCHEDULE concentra fecha, hora y confirmación. Las tarjetas de catálogo reutilizan `ServiceCatalogItemCard`. La ruta es `/services/room-service`; conserva Servicios activa, reutiliza `GuestNavigationShell` y Back vuelve a `/services`.

No hay frame V3 específico de MOB-22. Esta ausencia no bloquea el MVP aprobado: la pantalla adopta tokens y patrones Android V3 existentes y queda sujeta a QA visual manual. No se declara equivalencia con un frame Figma inexistente.

## Datos mock/frontend aprobados

El menú es una única fixture central `roomServiceMenuFixture`, detrás de `RoomServiceService.getMenu()`. Sus `fixtureKey` son identidades locales de fixture/test, no IDs Backend ni SKUs.

| Categoría | Producto | Precio frontend/mock |
| --- | --- | --- |
| Desayunos | Desayuno continental | Q 75 |
| Desayunos | Desayuno típico | Q 85 |
| Comidas | Club sándwich | Q 90 |
| Comidas | Hamburguesa de la casa | Q 95 |
| Bebidas | Café | Q 20 |
| Bebidas | Jugo natural | Q 25 |

No hay descripciones aprobadas y la UI no las inventa. `priceAmount` usa enteros en quetzales solo para este mock; no define contrato monetario Backend, impuestos, fees, descuentos, propina, pago ni cargo de habitación.

Las categorías exactas son `Desayunos`, `Comidas` y `Bebidas`. La UI permite filtrarlas desde la misma fuente de menú.

## Carrito, total y nota

El carrito es estado local de la feature mediante reducer puro. Permite múltiples productos, agregar, incrementar, decrementar, eliminar y derivar total. La cantidad mínima efectiva es 1: decrementar una línea en 1 la elimina. La cantidad máxima frontend/mock es 5 por producto/línea; el reducer rechaza estados inválidos sin aplicar clamp silencioso.

No se almacena subtotal ni total en el estado. Se deriva de `priceAmount × quantity`; para el MVP `total = subtotal`, sin componentes monetarios adicionales. La UI presenta únicamente `Total`.

El resumen no permanece bajo el catálogo. Un icono de carrito fijo, accesible y dentro de Safe Area abre CART con las líneas, controles de cantidad/eliminación, total y nota. El paso SCHEDULE concentra entrega y CTA; volver desde SCHEDULE conserva el carrito y la nota.

Existe una sola nota multiline opcional de pedido dentro del panel. Antes del submit se aplica `notes.trim()`; se omite si queda vacía y se conservan saltos internos. No existen notas por producto.

## Estadía y entrega

`ReservationStay` se reutiliza solo para presentar contexto visual: `Habitación {number}` o exactamente `Habitación por asignar` cuando `room === null`. No es una segunda fuente de verdad.

La entrega se programa con fecha local `serviceDate` (`YYYY-MM-DD`) y `deliveryTime` `HH:mm`. El panel usa `ServiceDatePicker` y el `TimeWheelPicker` compartido en `mode="time"`; permite hora `00`–`23` y minuto `00`–`59`, sin catálogo de slots, horario laboral ni disponibilidad. Cancelar conserva la selección previa. La UI y el guard de submit exigen `>= now + 30 minutos`, fecha inclusiva `serviceDate <= ReservationStay.departure` y, únicamente en departure, `deliveryTime <= 12:00`. `12:00` es una política frontend/mock del Hotel Boutique, no un valor de `ReservationStay` ni contrato Backend; una futura configuración hotel/property podrá sustituirla. Late checkout hasta `14:00` conserva su excepción independiente. Esta programación es frontend/session-only y no define timezone ni semántica temporal Backend.

## Request y boundary

La forma frontend/mock es:

```ts
interface RoomServiceRequest {
  items: readonly {
    itemFixtureKey: string;
    quantity: number;
  }[];
  serviceDate: string;
  deliveryTime: string;
  notes?: string;
}
```

`serviceDate` usa `YYYY-MM-DD` local y `deliveryTime` usa `HH:mm`. El request no contiene precio, total, categoría, habitación, IDs de Stay/Reservation/Room/Property, payment, status, request ID ni lifecycle. La asociación Backend futura continúa sin definir.

`RoomServiceService` es un boundary cohesivo y sustituible:

```ts
getMenu(): Promise<RoomServiceMenu>
submitRequest(request: RoomServiceRequest): Promise<void>
```

`MockRoomServiceService` no usa HTTP, no persiste y no crea pedido, ticket de cocina, acknowledgement ni entidad Backend.

## Estado y arquitectura

TanStack Query es la autoridad server-like del menú mock: loading, success, generic error y `NetworkError`/offline con retry manual. TanStack Mutation es la única autoridad server-like del submit: configured, submitting, success tras resolver la Promise, generic error y offline con retry manual. El carrito, la nota, `serviceDate` y `deliveryTime` permanecen tras fallo; `isPending` y un guard `useRef` evitan doble submit. No hay éxito optimista, cola offline, NetInfo ni sync.

La implementación aislada vive en `src/modules/services/room-service/`:

```text
domain/     menu, carrito puro y request frontend
data/       fixture central, mock y RoomServiceService
presentation/ hooks Query/Mutation, pantalla y estilos
```

No se crearon DTOs o mappers sin transformación real, Zustand ni Context global.

## Presentación, accesibilidad y navegación

- Launcher accesible **Room Service** en Servicios usa `router.push('/services/room-service')`; es una card de navegación con chevron decorativo, igual que Limpieza. El único upsell inline actual es Late check-out.
- La flecha Back y el icono de carrito fijo están dentro de Safe Area, fuera del scroll. Back tiene label `Volver a servicios` y usa `router.dismissTo('/services')`; carrito tiene label `Abrir carrito`.
- Categorías usan tabs accesibles y selección visible; agregar, incrementar, decrementar y eliminar incluyen labels con el nombre del producto.
- Carrito, nota, entrega, CTA, retry y controles de header tienen roles, estados disabled cuando corresponde y test IDs estables.
- Carrito vacío es estado local con copy `Aún no has agregado productos.` y CTA disabled. El CTA también queda disabled sin `deliveryTime`; no es un Empty remoto.

## Estados visibles

| Área | Estados implementados |
| --- | --- |
| Estadía de contexto | loading, generic error/retry, offline/retry, success con habitación nullable |
| Menú | loading, success, generic error/retry, offline/retry |
| Pedido | configured, submitting, success, generic error/retry, offline/retry |

Al resolver la mutation, Room Service registra o actualiza primero la `SessionServiceRequest` y navega a `/account`. Cuenta muestra la confirmación **Solicitud enviada**, `Tu solicitud fue registrada correctamente.` y el CTA **Entendido**. No implementa tracking, detalle persistido, estado operacional ni `IMP-AND-0112 — Mis solicitudes`.

## Fuera de alcance

Backend/HTTP real, persistencia, pago, room charge, impuestos, fees, descuentos, propina, imágenes remotas, stock, variantes, extras, cocina, kitchen ticket, tracking, notificaciones, NetInfo, cola offline, sync, reglas operativas de horario, delivery slots, timezone Backend, Web e `IMP-AND-0112`.

## Evidencia y pendientes

Las suites Room Service cubren header, panel cerrado/abierto, carrito vacío, persistencia local, cantidades, total, notas, selector libre de hora, `deliveryTime`, payload sin IDs, habitación nullable, Query, Mutation, doble submit, retry y navegación. Esta iteración obtuvo `npm run lint` PASS, `npm run typecheck` PASS, `npm run test` PASS (16 suites / 101 tests), `npx expo-doctor` PASS (21/21), `npx expo export --platform android` PASS y Metro inició en el puerto 8082 y se detuvo correctamente.

QA manual y revisión de implementación WEB-3 completaron PASS. Una fase posterior deberá definir catálogo/API Backend, scope, pricing operacional, disponibilidad y lifecycle sin convertir este mock en contrato Backend.

Room Service conserva `serviceDate` local (`YYYY-MM-DD`) con `deliveryTime`; fecha y hora se validan como datetime completo. La fecha futura conserva una hora válida y la nueva solicitud inicia en la hora válida más cercana.

## UX regression IMP-AND-0113

El carrito elimina líneas mediante `SwipeToDelete` compartido y confirmación; no tiene CTA permanente de edición. Los cambios o carritos pendientes avisan solo al abandonar el flujo, no al transitar entre catálogo, carrito y programación. Un envío exitoso navega a Cuenta y muestra el aviso de una sola vez. La regresión UX incluida en `IMP-AND-0113` fue validada con QA manual y revisión WEB-3 PASS; no altera el estado COMPLETADA de este contrato.

### Cantidades frontend/mock

Cada producto de Room Service tiene cantidad mínima `1` y máxima `5` por línea. Es una regla frontend/mock y no representa stock ni límite de Backend. Varias líneas pueden alcanzar `5` independientemente.
