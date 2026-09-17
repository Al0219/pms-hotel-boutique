# 31 — Account/Profile Change Control

## Decisión aprobada

`IMP-AND-0202 — Implementar cuenta/perfil` es la única implementación productiva de Profile. `IMP-AND-0303 — Implementar perfil final` queda **absorbida por IMP-AND-0202** y no debe implementar otra pantalla, ruta, domain, service, Query/Mutation ni fuente de verdad.

La causa es el solapamiento explícito en el backlog: 0202 exige display/edit de Profile con estados y submit; 0303 exige layout/edit/states reutilizando el mismo Account/Profile Domain. Ambas dependen de `IMP-AND-0201`, ya integrada en `main`. Dos implementaciones producirían una duplicación incompatible.

## Ownership y navegación

- Ownership: `Account`.
- Ruta canónica: `/account/profile`.
- Entry point único: drawer Guest, `CUENTA → Perfil`.
- No hay launcher/card adicional en `/account`.
- No hay tab nueva, entrada bajo BENEFICIOS ni mezcla con Rewards/Promotions.
- La estructura del drawer pasa a `ESTANCIA: Inicio, Mis servicios`; `CUENTA: Perfil`; `BENEFICIOS: Rewards, Promociones`; `SERVICIOS: Servicios, Valet`; `HOTEL: Hotel`.
- Profile es una hija focused de Account con `GuestChildHeader`, sin shell global, footbar, hamburger, drawer propio ni Chat FAB.
- Back usa `router.dismissTo('/account')` para un retorno estable, sin depender del historial accidental.

## Alcance canónico de IMP-AND-0202

0202 consume exclusivamente la foundation de 0201: `useAccountProfile`, `useUpdateAccountProfile`, `GuestAccount` y `GuestProfile`. Implementará la visualización read-only de nombre, correo y teléfono; preferencias editables de Profile; Marketing SMS; loading, data, error, offline, retry, edición, dirty state, submit, pending, success y errores de mutation.

La identidad/contacto sigue read-only. No se amplía la mutation, no hay actualización optimista y no se afirma guardado remoto ni persistencia permanente. El mock session-only permite una UX frontend-first sin Backend.

La salida con cambios sin guardar requiere una confirmación de descarte o continuación de edición. Si no hay cambios, Back no se bloquea.

## Estrategia de pruebas de 0202

- Query loading/data/error/offline y retry.
- Identidad read-only, preferencias y Marketing SMS.
- Dirty state, submit disabled sin cambios, pending y prevención de doble submit.
- Success, error/offline de mutation, retry y ausencia de optimistic update.
- Confirmación de cambios sin guardar.
- Drawer `CUENTA → Perfil`, Back hacia `/account`, sin quinta tab.
- Accesibilidad, teclado/scroll y regresiones de Account, Rewards y Promotions.

## Impacto de backlog

- `IMP-AND-0202`: `READY`; DoR PASS.
- `IMP-AND-0303`: mantiene el estado permitido `PENDIENTE` con la nota **ABSORBIDA POR IMP-AND-0202 — NO IMPLEMENTAR**. No se usa un estado nuevo porque el XLSX canónico solo contiene `PENDIENTE`, `READY` y `COMPLETADA`.
- `IMP-AND-0304`: sustituye la dependencia `IMP-AND-0303` por `IMP-AND-0202`; sigue PENDIENTE hasta que 0202 complete.
- `IMP-AND-0204`: conserva las dependencias `IMP-AND-0202, IMP-AND-0203`.

## Límites

Esta decisión no implementa ruta, pantalla, controles, drawer productivo, hooks, domain ni tests nuevos. No crea Backend, transporte, auth, persistencia, pricing ni otra feature para justificar 0303.
