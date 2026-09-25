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
