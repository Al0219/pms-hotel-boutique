# IMP-AND-0503 — Linked Reservations + Active Context

## Alcance implementado

- Guest Login establece únicamente una sesión de cuenta y reemplaza hacia `/reservations`.
- `/reservations` consulta reservas vinculadas por `accountId` con la clave `['guest', 'linked-reservations', accountId]` y es dueño de la decisión 0/1/N.
- Una reserva se selecciona como identidad mínima `reservationId/reservationStayId`; la pantalla no transporta datos de servicios, cargos ni credenciales.
- Access conserva el comportamiento de acceso temporal: establece contexto activo, nunca crea sesión y no borra una sesión existente.
- `StayService.getCurrentStay(context)` exige un contexto explícito. `useCurrentStay` usa `reservationContextKey(context)` y no consulta cuando el contexto del provider es nulo.
- Los providers locales Guest se remontan por `reservationStayId`, aislando solicitudes, vehículos, checkout y avisos sin ejecutar `queryClient.clear()` al cambiar de estadía.

## Guards

- Públicas: `/login`, `/access`.
- Sesión: `/reservations`, perfil y rewards.
- Contexto activo: account hub, checkout, factura, servicios y valet. Sin sesión se redirige a login; con sesión pero sin contexto, a reservations.
- Acceso temporal con contexto activo conserva las rutas contextuales. Profile y Rewards se ocultan del drawer cuando no existe sesión.

## Mock y determinismo

La estadía primaria continúa siendo `HB-2026-004281 / stay-2026-004281`, habitación 204, del 2026-08-28 al 2026-09-18. El mock contiene una segunda estadía mínima solo para verificar selección e aislamiento. No se añadió endpoint ni contrato Backend.

## Evidencia

La suite `linked-reservations.test.tsx` cubre selección múltiple, autoselección, cuenta vacía, error y offline. Las suites de Stay y consumidores usan contexto activo inyectado en vez de una query global.
