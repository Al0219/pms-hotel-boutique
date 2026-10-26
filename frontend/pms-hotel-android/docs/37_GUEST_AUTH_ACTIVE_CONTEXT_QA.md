# IMP-AND-0504 — QA Guest Auth / Active Reservation

## Matriz automática

| Journey | Evidencia | Resultado |
| --- | --- | --- |
| Cold start y guards | guest-auth-foundation, navegación | Session/context nulos redirigen según contrato | PASS |
| Login | guest-login | Validación, errores, retry, Access y 0/1/N handoff | PASS |
| Reservas vinculadas | linked-reservations | Multiple, auto-select, empty, cambio A→B y Back Android | PASS |
| Contexto Stay | stay-contract, account-stay-hub | Claves por reservation/stay y contexto desconocido seguro | PASS |
| Navegación, dirty y logout | guest-navigation | Drawer, logout, Back de roots y guard dirty | PASS |
| Access temporal | access | Contexto sin sesión y drawer restringido | PASS |
| Aislamiento reservation-scoped | service-requests, valet, checkout integration | Providers remounted por reservationStayId | PASS |

## Escenarios manuales pendientes

- Teclado Android, eye-password y gesture Back en dispositivo.
- Cambio A→B y datos visuales de B en Inicio.
- Drawer temporal y confirmación de logout en dispositivo.

## Defectos y correcciones

No se detectaron defectos productivos en esta ronda. El selector consume Back sin navegar y el cambio de estadía conserva la sesión mientras cambia únicamente ActiveReservationContext.

## Warnings no bloqueantes

Jest puede informar handles abiertos y avisos act(...) de timers o actualizaciones asíncronas existentes. No son fallas funcionales del journey.

## Limitaciones frontend-first

No existe persistencia Backend. Un request local puede no reaparecer después de logout/login o de A→B→A. No se agrega almacenamiento local para ocultar esta limitación.

## Extensión Android ↔ Backend (2026-10-25)

El [incremento real38](38_ANDROID_BACKEND_MVP.md), autorizado separadamente,
reutiliza estos contratos/UI y extiende transporte y persistencia de sesión solo
en modo API real. Las limitaciones frontend-first anteriores describen el modo
mock; no son autoridad para endpoints Backend. QA físico permanece EN_QA.

## Cierre del MVP real — 2026-10-26

COMPLETADA / PASS por confirmación manual explícita del usuario para login Guest,
reservas reales, vinculación, selección y referencia visible. Escenarios manuales
no confirmados individualmente permanecen pendientes; ver cierre vigente en
[Android38](38_ANDROID_BACKEND_MVP.md). No atribuye QA adicional al agente ni
cierra por arrastre el backlog o las variantes de hardware/accesibilidad.
