# 04 — Navigation

Expo Router es el mecanismo de navegación Guest aprobado. La raíz técnica redirige a `/access`; el flujo actual de acceso temporal a una estadía usa `router.replace('/account')`. La separación futura Cuenta/Reserva/Contexto activo se congela en `32_AUTH_RESERVATION_CONTEXT_CHANGE_CONTROL.md`.

## Shell Guest vigente

`GuestNavigationShell` y `GuestNavigationMenuProvider` son la autoridad única para la footbar, la selección activa, el acceso flotante a Chat y el drawer Guest. La footbar presenta icono y label vertical compacto para cada tab. La decisión vigente, frontend-first, es:

| Orden | Label | Ruta | Regla activa |
| --- | --- | --- |
| 1 | Inicio | `/account` | activa para `/account` y sus hijas |
| 2 | Servicios | `/services` | activa para `/services` y sus hijas |
| 3 | Valet | `/valet` | activa para `/valet` y sus hijas |
| 4 | Hotel | `/hotel` | activa para `/hotel` y sus hijas |

`/account` conserva su ruta técnica y los retornos de flows de éxito con `router.replace('/account')`; su representación en la shell es **Inicio**. No hay tab visible **Cuenta**.

Chat permanece disponible en `/chat`, sin tab seleccionada. La shell ofrece un botón flotante **Abrir chat**, de 48 × 48 dp y situado sobre la footbar, únicamente en `/account`, `/services`, `/valet` y `/hotel`. La acción usa `router.push('/chat')` para preservar el historial: Android Back o el gesto del sistema recuperan la ruta real de origen. Un deep link sin historial conserva el comportamiento nativo de Expo Router.

Las pantallas raíz `/account`, `/services`, `/valet` y `/hotel` comparten `GuestRootHeader`: título y botón de menú en una fila normal, alineada verticalmente y distribuida entre ambos extremos. Las rutas hijas de Servicios, Cuenta y Chat comparten `GuestChildHeader`, con Back y título en la misma altura visual; no muestran menú ni Chat flotante. `/chat` es una pantalla enfocada: no renderiza `GuestNavigationShell` ni footbar, y su Back usa la pila nativa para recuperar el origen real. El drawer se abre desde la derecha, usa backdrop y X para cerrar, y presenta una superficie con iconos, feedback pressed y selección accesible. Su jerarquía vigente inicia con la acción `Perfil`, antes de headings; después presenta `ESTANCIA: Inicio, Mis servicios`; `BENEFICIOS: Rewards, Promociones`; `SERVICIOS: Servicios, Valet`; `HOTEL: Hotel`. No incluye Chat. Perfil, Rewards y Promociones son rutas hijas de Cuenta; Perfil se abre exclusivamente desde la primera acción del drawer y Rewards/Promociones desde BENEFICIOS, sin entrada en la footbar.

## Rutas de Cuenta

Las rutas de Checkout/Invoice son decisiones frontend-first. Las referencias Figma siguen siendo autoridad visual, pero estas rutas Expo no se atribuyen a Figma.

| Ruta | Rol | Navegación aprobada |
| --- | --- | --- |
| `/account` | raíz Inicio / Account Stay Hub | Muestra `GuestRootHeader` y `GuestNavigationShell`. El launcher usa `Check-out` antes de finalizar la estancia y `Ver factura` cuando existe snapshot de Checkout. Rewards se abre desde el drawer Guest. |
| `/account/checkout` | hija de Account | Muestra `GuestChildHeader` con título `Check-out`, Back `Volver` hacia `/account` y no muestra shell global, footbar, hamburger, drawer ni FAB Chat. Antes de departure no permite el check-out normal; tras finalizar muestra acceso a Factura. |
| `/account/invoice` | hija de Account | Muestra `GuestChildHeader` con título `Factura`, Back `Volver` hacia `/account` y no muestra shell global, footbar, hamburger, drawer ni FAB Chat. |
| `/account/rewards` | hija de Account | Se abre desde `BENEFICIOS > Rewards` en el drawer Guest. Muestra `GuestChildHeader` con título `Rewards`, Back `Volver a mi cuenta` hacia `/account` y no muestra shell global, footbar, hamburger, drawer ni FAB Chat. La tab Inicio se resuelve para el prefijo `/account/*`. |
| `/account/promotions` | hija de Account | Se abre desde `BENEFICIOS > Promociones` en el drawer Guest. Muestra `GuestChildHeader` con título `Promociones`, Back `Volver a mi cuenta` hacia `/account` y no muestra shell global, footbar, hamburger, drawer ni FAB Chat. Promotions no agrega una tab; su entrada es exclusiva del drawer. |
| `/account/profile` | hija focused de Account | Autorizada por `31_ACCOUNT_PROFILE_CHANGE_CONTROL.md` y ajustada por `32_AUTH_RESERVATION_CONTEXT_CHANGE_CONTROL.md`. Se abre exclusivamente desde la primera acción `Perfil` del drawer Guest. Muestra `GuestChildHeader`, no muestra shell global, footbar, hamburger, drawer ni FAB Chat y Back usa `router.dismissTo('/account')`. No agrega una tab ni un launcher adicional en `/account`. |

El lifecycle session-backed es `Account → Checkout live session read model → confirmación final → CheckoutSessionSnapshot congelado → Invoice`. Al resolver la mutation mock de Check-out, la app usa `router.replace('/account/invoice')`; la pantalla completada no queda navegable en la pila. Back desde Check-out antes del submit y Back desde Factura retornan de forma estable a `/account`; en entrada directa se usa el mismo destino seguro, sin depender del historial previo. No se crea una tab, footbar privada ni una raíz financiera adicional.

## Back stack y accesibilidad

Las tabs y los links del drawer usan `router.replace` y no acumulan destinos principales. Los launchers de una feature usan `router.push`; Back retorna a su raíz. La tab activa es un no-op.

La footbar usa `tablist`/`tab`, los controles de menú, drawer y Chat usan `button`, y los estados `selected`/`disabled` se derivan exclusivamente de `usePathname()`. No existe un store de navegación paralelo.

## Referencia V3 histórica

La footbar anterior `Servicios · Chat · Valet · Cuenta`, documentada por referencias Figma históricas de V3, queda **deprecada** como autoridad de navegación. No describe la shell productiva vigente. La migración a Inicio · Servicios · Valet · Hotel, Chat flotante y drawer es una decisión frontend-first de IMP-AND-0114; no atribuye nuevos nodos ni una actualización a Figma.

## Rutas de Servicios

`/services/housekeeping`, `/services/room-service`, `/services/amenities` y `/services/requests` conservan Servicios activa y Back hacia `/services`. Sus schedulers, y los de Valet/Transfer, restringen fechas a la ventana local inclusiva `max(ReservationStay.arrival, today) → ReservationStay.departure`. Con `CheckoutSessionSnapshot` presente, los launchers y rutas directas de Limpieza, Room Service y Amenidades bloquean creación; Late Checkout se bloquea desde Servicios. Mis servicios sigue disponible. Valet, Transfer, Chat y Hotel no se bloquean por este estado, pero Valet y Transfer no pueden exceder departure. Hotel es una sección independiente en `/hotel`; no existe `/services/hotel-info` ni un launcher permanente de Hotel dentro de Servicios.
