# IMP-AND-0304 — QA Loyalty / Profile

## Matriz automática

| Área | Evidencia | Resultado |
| --- | --- | --- |
| Profile canónico | profile, account-profile-contract | Display/edit, validación, save, estados y dirty guard | PASS |
| Rewards | rewards | Ledger read-only, balance, loading/error/offline/empty y navegación | PASS |
| Promotions | promotions | Eligibility, vigencia, stacking y estados honestos | PASS |
| Account scope | account-stay-hub, linked-reservations | Datos account-scoped independientes de A/B | PASS |
| Access temporal | access, guest-navigation | Profile, Rewards y cambio de estadía restringidos | PASS |
| Navegación | guest-navigation | Drawer, Back y confirmación de descarte | PASS |

## Límites y seguridad

Profile sigue siendo la única pantalla/ruta canónica. La revisión no halló duplicación de profile services/queries, DTOs o fixtures consumidos desde UI, persistencia prohibida, tokens, secretos ni logs sensibles en los módulos revisados. Rewards permanece read-only y account-scoped; Promotions conserva su scope documentado.

## Defectos y correcciones

La QA manual reabrió temporalmente `IMP-AND-0304` para corregir los siguientes defectos. La validación automática posterior queda PASS; la tarea vuelve a `EN_QA` y no se completa hasta revalidación física.

| ID | Defecto / causa raíz | Corrección | Regresión automática | Estado |
| --- | --- | --- | --- | --- |
| QA-AND-0304-01 | Android Back solo resolvía roots Guest; las rutas hijas devolvían `false` al handler y podían cerrar la app. | `GuestNavigationMenuProvider` ahora usa una tabla explícita de hijos aprobados hacia su parent. Chat recupera stack mediante `router.canGoBack()` o hace fallback seguro a `/account`. Las pantallas de servicios cierran primero pickers, sheets, modals o flujo interno. | `guest-navigation` cubre Checkout, Mis servicios, Rewards, Promociones, Limpieza, Room Service, Amenidades y Chat; `chat` cubre Back visual con stack y fallback. | Pendiente revalidación manual en Android. |
| QA-AND-0304-02 | Los branches cortos post-checkout no ocupaban el espacio restante entre header y footbar. | Housekeeping, Room Service y Amenidades usan un body `flex: 1` exclusivo de estado corto, con `GuestNavigationShell` como sibling final fuera del body. | `checkout-post-checkout`, `room-service` y `amenities` verifican la estructura/flex; la posición física queda para Expo Go. | Pendiente revalidación manual en Android. |

## Warnings y manual QA

Jest puede emitir avisos existentes de `act(...)` y open handles. Pendiente revalidar en dispositivo: Android hardware Back desde las ocho rutas, recuperación de origen/fallback de Chat, y footbar inferior de los estados post-checkout de Limpieza, Room Service y Amenidades.

## Limitación frontend-first

No se agrega persistencia local o Backend ficticio. Cambiar A/B no debe borrar Profile/Rewards, pero datos reservation-scoped locales no prometen persistencia.
