# 04 — Navigation

Expo Router es el mecanismo de navegación Guest aprobado. La raíz técnica redirige a `/access`; al vincular la reserva, el flujo usa `router.replace('/account')`.

## Shell Guest vigente

`GuestNavigationShell` y `GuestNavigationMenuProvider` son la autoridad única para la footbar, la selección activa, el acceso flotante a Chat y el drawer Guest. La decisión vigente, frontend-first, es:

| Orden | Label | Ruta | Regla activa |
| --- | --- | --- |
| 1 | Inicio | `/account` | activa para `/account` y sus hijas |
| 2 | Servicios | `/services` | activa para `/services` y sus hijas |
| 3 | Valet | `/valet` | activa para `/valet` y sus hijas |
| 4 | Hotel | `/hotel` | activa para `/hotel` y sus hijas |

`/account` conserva su ruta técnica y los retornos de flows de éxito con `router.replace('/account')`; su representación en la shell es **Inicio**. No hay tab visible **Cuenta**.

Chat permanece disponible en `/chat`, sin tab seleccionada. La shell ofrece un botón flotante **Abrir chat**, de 48 × 48 dp y situado sobre la footbar, únicamente en `/account`, `/services`, `/valet` y `/hotel`. La acción usa `router.push('/chat')` para preservar el historial: Android Back o el gesto del sistema recuperan la ruta real de origen. Un deep link sin historial conserva el comportamiento nativo de Expo Router.

Las pantallas raíz `/account`, `/services`, `/valet` y `/hotel` comparten `GuestRootHeader`: título y botón de menú en una fila normal, alineada verticalmente y distribuida entre ambos extremos. Las rutas hijas de Servicios y Chat comparten `GuestChildHeader`, con Back y título en la misma altura visual; no muestran menú ni Chat flotante. `/chat` es una pantalla enfocada: no renderiza `GuestNavigationShell` ni footbar, y su Back usa la pila nativa para recuperar el origen real. El drawer se abre desde la derecha, usa backdrop y X para cerrar, y contiene exactamente Inicio, Mis servicios, Servicios, Valet y Hotel. No incluye Chat.

## Back stack y accesibilidad

Las tabs y los links del drawer usan `router.replace` y no acumulan destinos principales. Los launchers de una feature usan `router.push`; Back retorna a su raíz. La tab activa es un no-op.

La footbar usa `tablist`/`tab`, los controles de menú, drawer y Chat usan `button`, y los estados `selected`/`disabled` se derivan exclusivamente de `usePathname()`. No existe un store de navegación paralelo.

## Referencia V3 histórica

La footbar anterior `Servicios · Chat · Valet · Cuenta`, documentada por referencias Figma históricas de V3, queda **deprecada** como autoridad de navegación. No describe la shell productiva vigente. La migración a Inicio · Servicios · Valet · Hotel, Chat flotante y drawer es una decisión frontend-first de IMP-AND-0114; no atribuye nuevos nodos ni una actualización a Figma.

## Rutas de Servicios

`/services/housekeeping`, `/services/room-service`, `/services/amenities` y `/services/requests` conservan Servicios activa y Back hacia `/services`. Hotel es una sección independiente en `/hotel`; no existe `/services/hotel-info` ni un launcher permanente de Hotel dentro de Servicios.
