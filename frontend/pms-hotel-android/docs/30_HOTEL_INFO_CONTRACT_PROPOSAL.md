# 30 — Hotel / IMP-AND-0114

**Estado de implementación:** **COMPLETADA**.

**DoR:** **PASS**.

**Automated QA:** **PASS**.

**Manual QA:** **PASS**.

**WEB-3 review:** **PASS**.

## Arquitectura vigente

`IMP-AND-0114 — MOB-25 — Hotel` implementa una pantalla estática e independiente en `/hotel`, bajo `src/modules/hotel`. Hotel no es hija de Servicios, no mantiene Servicios activa y no existe la ruta obsoleta `/services/hotel-info` ni un launcher permanente dentro de Servicios.

`GuestNavigationShell` gobierna la footbar Inicio · Servicios · Valet · Hotel y el acceso flotante a Chat; `GuestNavigationMenuProvider` gobierna el drawer derecho. `/account` conserva su ruta técnica y se representa como Inicio. Las cuatro rutas raíz usan `GuestRootHeader`, con hamburger arriba a la derecha y Chat FAB.

Chat es una pantalla enfocada: usa `GuestChildHeader`, Back basado en `router.back()` y no renderiza `GuestNavigationShell`, footbar, hamburger ni un FAB duplicado. Las pantallas hijas usan `GuestChildHeader` con Back, sin hamburger ni Chat FAB. El drawer contiene Inicio, Mis servicios, Servicios, Valet y Hotel; X y backdrop lo cierran. Esta migración es una decisión frontend-first; las referencias Figma históricas no contienen una migración equivalente ni se les atribuyen nodos nuevos.

## Perfil frontend/mock de demostración

El contenido central `HotelProfile` se limita a datos de demostración:

- Hotel Boutique;
- indicador visible **Datos de demostración**;
- descripción de estadía boutique;
- check-in 15:00, check-out 12:00 y recepción 24 horas;
- Wi‑Fi `HotelBoutique_Guest` / `demo-guest-2026`;
- contacto `+502 0000-0000` y `recepcion@hotel-demo.local`;
- dirección de demostración pendiente de configuración;

Los datos son exclusivamente frontend/mock. No constituyen configuración real de una propiedad, catálogo Backend ni fuente operativa. Hotel no presenta catálogo de servicios ni CTA: todas sus cards son informativas y no realizan acciones.

## Límites

La pantalla no consulta ni presenta `ReservationStay`, no crea ni actualiza `SessionServiceRequest`, no tiene Query, Mutation, loading/error/offline, finanzas, persistencia, IDs de Backend ni transporte HTTP. Tampoco implementa llamadas, email, mapa, copiado de Wi‑Fi o deep links.

Una integración futura debe definir propiedad/scope, fuente operativa, permisos, actualización, contratos y transporte antes de reemplazar el fixture.
