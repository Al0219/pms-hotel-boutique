# 29 — Amenidades / IMP-AND-0113

**Estado:** **COMPLETADA**.

**Automated QA:** **PASS** (`lint`, `typecheck`, 20 suites / 156 tests, `expo-doctor` 21/21, export Android).
**Manual QA:** **PASS**.
**WEB-3 review:** **PASS**.

Este documento registra el contrato frontend/mock aprobado para `IMP-AND-0113 — MOB-24 — Servicios / Amenidades`. No constituye contrato Backend.

## Confirmado

- La ruta es `/services/amenities`; Servicios permanece activa y Back vuelve a `/services` mediante el shell V3 existente.
- Amenidades es una solicitud de artículos para la habitación, no una pantalla informativa.
- El catálogo frontend/mock contiene únicamente: Toallas adicionales, Almohada adicional, Kit dental, Kit de aseo y Pantuflas.
- Cada línea usa `itemFixtureKey` frontend/mock y cantidad de 1 a 5. No hay precios, stock, SKU, cargos, folio, impuestos ni pagos.
- `AmenitiesRequest` contiene `serviceDate`, `deliveryTime`, líneas `{ itemFixtureKey, quantity }` y `notes?`. Las notas son multiline, máximo 500, aplican `trim()` y se omiten vacías. No contiene IDs de Stay, Reservation, Room ni Guest.
- `ReservationStay` se usa solo para presentar habitación; si `room === null` se muestra `Habitación por asignar`.
- La fecha está limitada a hoy–departure inclusive. La hora exige +30 minutos y, solo en departure, no supera `hotelStayPolicy.standardCheckoutTime`; esa política frontend/mock actual es `12:00` y no se duplica.
- `AMENITIES` es un kind frontend/session-only autorizado. Reutiliza múltiples requests, cutoff de 25 minutos, completion desde hora programada, `ConfirmationModal`, filtros e historial existentes.
- `TOWELS_AND_AMENITIES` fue retirado del flujo visible de Limpieza. Housekeeping conserva únicamente `FULL_CLEANING` y `LIGHT_CLEANING`; los artículos son responsabilidad de Amenidades.

## Flujo visual compartido

La experiencia presenta un flujo explícito **CATALOG → CART → SCHEDULE → CONFIRM**. El catálogo solo muestra artículos y el acceso accesible al carrito con badge de cantidad; el carrito conserva artículos y notas; la programación concentra fecha, hora y confirmación. Las tarjetas de catálogo reutilizan `ServiceCatalogItemCard`; no introducen precios ni disponibilidad fuera del mock vigente.

## Arquitectura frontend/mock

La implementación usa una ruta delgada `app/(guest)/services/amenities.tsx`, un módulo aislado `src/modules/services/amenities/`, catálogo local, TanStack Mutation y `MockAmenitiesService` con `Promise<void>`. El éxito registra `AMENITIES` en `SessionServiceRequestsProvider`, activa `GuestNoticeProvider` transitorio y navega a `/account`. El aviso se descarta con **Cerrar** o **Entendido**, sin navegación ni query param. Error y `NetworkError` permiten retry manual sin persistencia ni cola offline.

El summary usa fecha, hora y suma de quantities, por ejemplo `16 sep · 14:30 · 3 artículos`. El request no conserva el catálogo completo ni información financiera.

## Backend pendiente

No hay Backend, HTTP real, persistencia, disponibilidad operacional, precios, cargos, IDs Backend ni lifecycle autoritativo. Un Backend futuro debe definir identidad/scope, catálogo autoritativo, disponibilidad, permisos, persistencia y toda semántica financiera si llega a aplicar.

## UX regression IMP-AND-0113

El carrito usa swipe para eliminar con confirmación, sin CTA de edición permanente. Un draft o una edición modificada solicita confirmación antes de salir del módulo, pero las transiciones internas no. El éxito navega a Cuenta con aviso de una sola vez; el reintento se muestra únicamente ante error u offline. QA manual y revisión WEB-3: PASS.
