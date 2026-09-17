# Android Module Catalog

All future Android modules are owned by ANDROID-1.

| Module | Cross-app Web domain to review |
| --- | --- |
| navigation | Shell Guest transversal: footbar Inicio · Servicios · Valet · Hotel, Chat flotante y drawer. WEB-3 is reviewer principal. |
| hotel | Perfil de Hotel frontend/mock en `/hotel`; no es submódulo de Servicios. |
| auth | auth, account, profile |
| stay | stays, reservations, rooms |
| services | concierge, housekeeping |
| messaging | messaging, concierge |
| valet | parking-valet |
| account | account, profile, guests |
| service-requests | registro de sesión Guest para solicitudes aprobadas |
| checkout | folio, payments |
| invoice | folio, receivables |
| rewards | rewards |
| promotions | promotions |
| profile | profile, guests |
| shared-ui | shared |
| offline | data and remote-state policy |

These conceptual modules do not authorize Android project code, contracts, or screens before the stack and relevant backlog task are approved.

## Account / Profile contracts — IMP-AND-0201

Submódulo contractual `src/modules/account/profile`, bajo Account. Separa `GuestAccount` de `GuestProfile`; el fixture frontend/mock, mapper, service boundary y hooks Query/Mutation preparan lectura y actualización session-only de preferencias y Marketing SMS. No crea UI, ruta, launcher, navegación ni persistencia. IMP-AND-0201 está `COMPLETADA`; ver `19_ACCOUNT_PROFILE_CONTRACT_PROPOSAL.md`.

## Profile UI canónica — IMP-AND-0202

`IMP-AND-0202` es la única implementación productiva de Profile y está `EN_PROGRESO`. Pertenece a Account, reutiliza la foundation de `src/modules/account/profile` y tendrá la ruta hija `/account/profile`, con la primera acción `Perfil` del drawer y Back estable hacia `/account`. `IMP-AND-0303` queda absorbida: no crea UI, ruta, domain, service, Query/Mutation ni otra fuente de verdad. Las decisiones están en `31_ACCOUNT_PROFILE_CHANGE_CONTROL.md` y `32_AUTH_RESERVATION_CONTEXT_CHANGE_CONTROL.md`.

## Navigation shell — IMP-AND-0114

`src/modules/navigation` owns the shared Guest shell. `/account` is visually **Inicio**, `/services` and its children remain Servicios, `/valet` and its children remain Valet, and `/hotel` is Hotel. Chat is available only through the shell floating action and has no active tab. The drawer contains navigation links only and derives no guest identity or room data.

## Hotel — IMP-AND-0114

Módulo aislado `src/modules/hotel`, ruta `/hotel`. Consume un perfil central frontend/mock, sin Query, Mutation, `ReservationStay`, `SessionServiceRequest`, finanzas ni Backend. La UI usa estados neutrales cuando falta información configurada. Es una pantalla exclusivamente informativa. Ver `30_HOTEL_INFO_CONTRACT_PROPOSAL.md`.

## Rewards — IMP-AND-0301

Módulo aislado `src/modules/rewards`, ruta hija `/account/rewards`. La entrada está en `BENEFICIOS > Rewards` del drawer Guest; no aparece en Account/Inicio ni agrega una tab. La hija usa `GuestChildHeader` sin shell global y Back seguro hacia `/account`. El flujo es DTO local → mapper → domain → `RewardsService`/`MockRewardsService` → TanStack Query → UI. Los valores de nivel, progreso, beneficios y métricas son texto frontend/mock y no representan IDs, saldo, puntos ni moneda Backend. No hay fetch, persistencia, mutation ni Promotions. Las referencias Figma orientan la UI; la arquitectura y contratos aprobados prevalecen ante una implementación literal incompatible. IMP-AND-0301 está `COMPLETADA`; ver `21_REWARDS_CONTRACT_PROPOSAL.md`.

## Promotions — IMP-AND-0302

Módulo aislado `src/modules/promotions`, ruta hija `/account/promotions`. Se abre desde `BENEFICIOS > Promociones` en el drawer Guest y usa `GuestChildHeader`, sin shell global, drawer ni tab propia; Back vuelve de forma segura a `/account`. El flujo DTO local → mapper → domain → `PromotionsService`/`MockPromotionsService` → TanStack Query → UI muestra promociones ya determinadas como aplicables. `Ver detalles` usa estado local de presentación y un modal informativo; no realiza una operación comercial. No hay Backend, fetch, persistencia, mutation, engine de elegibilidad, pricing, stacking, cupón ni aplicación de promoción. IMP-AND-0302 está `COMPLETADA`; ver `22_PROMOTIONS_CONTRACT_PROPOSAL.md`.

## Checkout / Invoice — IMP-AND-0203

Módulo aislado `src/modules/checkout`, con DTOs locales, mappers y boundary/mock. Sus rutas hijas son `/account/checkout` y `/account/invoice`; `/account` conserva la navegación global y las hijas usan `GuestChildHeader` sin footbar. Folio es un read model vivo de la sesión actual: Room Service, Late Checkout y Transfer aportan importes estructurados; Transfer conserva metadata estimada y participa en `checkoutTotal`. El snapshot congela ese total para Invoice. Los schedulers de servicios aplican la ventana local `max(arrival, today) → departure`. El snapshot además habilita los gates de creación de servicios de estancia y el launcher Ver factura. No hay Backend, pagos, fiscalidad ni persistencia. IMP-AND-0203 está `COMPLETADA`; ver `20_CHECKOUT_FOLIO_CONTRACT_PROPOSAL.md`.

## Services / Housekeeping — IMP-AND-0110

Submódulo aislado `src/modules/services/housekeeping`, ruta `/services/housekeeping`. Boundary/mock propio y TanStack Mutation; reutiliza la query pública existente de Stay y el shell V3. IMP-AND-0110 COMPLETADA con QA manual y revisión WEB-3 PASS. Ver `26_HOUSEKEEPING_CONTRACT.md`.

## Services / Room Service — IMP-AND-0111

Submódulo aislado `src/modules/services/room-service`, ruta `/services/room-service`. Query/mock de menú, Mutation de pedido, carrito local con reducer puro y hora de entrega frontend/mock mediante `TimeWheelPicker` compartido en modo libre; reutiliza Stay solo para habitación visual y el shell V3. IMP-AND-0111 COMPLETADA; ver `27_ROOM_SERVICE_CONTRACT_PROPOSAL.md`.

## Session Service Requests — IMP-AND-0112

Módulo transversal `src/modules/service-requests`, montado una vez en el árbol Guest. Expone un registro Context + reducer solo de sesión para los productores Services, Housekeeping, Room Service, Valet y Chat; Cuenta consume un preview y `/services/requests` muestra la lista canónica. No incorpora persistencia, Backend ni TanStack Query como store. IMP-AND-0112 está IMPLEMENTADA y `EN_QA`; ver `28_SESSION_SERVICE_REQUESTS_PROPOSAL.md`.
