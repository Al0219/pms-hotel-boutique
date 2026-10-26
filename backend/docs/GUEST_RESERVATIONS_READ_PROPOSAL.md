# Historial real del huésped — contrato aprobado

Corrección solicitada por José el 2026-10-25: confirmación pública → Mis reservas,
sin entrar a Staff ni presentar el prototipo como si fuera un historial real.
Base main0d1f4b7; rama fix/public-my-reservations-flow. Android permanece aparte.
Aprobado explícitamente por José el 2026-10-25 («sí lo apruebo»), incluyendo
lectura propia, conexión al OTP C3 existente y presentación del historial real.
No autoriza añadir datos financieros ni cambiar la política de auto-vinculación.

## Hallazgos y alcance

- GuestReservationsPage redirige antes de terminar la restauración Guest.
- GuestAccessPage restaura Staff incluso con retorno explícito a Mis reservas.
- El historial antiguo usa /account/history?accountId y DTO de mock; Backend solo
  confirma GET /api/v1/guest-auth/account/summary, no el historial completo.
- Reutilizar C3 y AUTH-GUEST-REG-HISTORY-01: links persistidos tras verificación,
  sin crear cuenta al reservar, vincular por correo no verificado ni usar Staff.

## Lectura aprobada

Backend, solo sesión Guest vigente, identidad revalidada desde GuestPrincipal:

- GET /api/v1/guest-auth/account/reservations?page=0&size=20.
  page entero >=0; size 1..50. Respuesta: guestAccountId, page, size, totalElements,
  items. Orden estable createdAt descendente, reservationId descendente.
- GET /api/v1/guest-auth/account/reservations/{reservationId}.
  Respuesta: guestAccountId y reservation con la misma proyección que un item.
- Proyección: reservationId, confirmationCode, status del dominio vigente,
  propertyId, propertyName, propertyTimeZone, bookingGuestName nullable y stays:
  reservationStayId, roomTypeId, roomTypeName, arrival, departure y status vigente.
  No inventar importes, políticas, ocupantes, notas internas ni pagos.
  stays es un array; no fabricar estancias para un contenedor pendiente vacío.
- Solo guest_reservation_links propios autorizan consultar Reservation y sus
  N stays. Sin seleccionar accountId/propertyId desde el cliente ni filtrar a
  posteriori resultados globales. Una propiedad inactiva no oculta su historial.
- 200 real, incluido vacío;400 formato/query inválidos;401 sin sesión Guest
  activa o con JWT Staff;404 idéntico para reserva inexistente o ajena.
  Cache-Control private,no-store; sin escrituras, migraciones ni permisos nuevos.
- BFF same-origin /api/auth/guest/account/reservations y /{reservationId};
  exclusivamente cookies Guest HttpOnly, sin tokens en JS. Errores técnicos503.

## Vinculación y experiencia

Conectar el formulario al C3 existente mediante BFF Guest para challenges y verify,
con Origin/JSON estricto,202 neutro y204 tras verificación real. No exponer OTP,
simular envío ni trasladar links ajenos. Mantener límites de C3 sin inventar TTLs.
Tras verificar, refrescar exclusivamente historial/resumen de esa sesión Guest.
Registro con correo verificado y Google nuevo conservan su auto-link ya aprobado.
Reservas creadas después de ese registro pueden necesitar OTP manual; no cambiar
silenciosamente la política del alta anónima J6 ni el login para auto-vincularlas.

Mis reservas y su detalle usarán el estilo crema/serif/oliva de Public01, estados
de carga/error/vacío honestos y navegación Guest. Login universal sin retorno
Guest conserva su comportamiento Staff. Ningún cambio a la app ni al inventario.

## Validación prevista

Regresión con Staff y Guest coexistentes, restauración Guest, retorno de login,
reservas reales vinculadas, vacío auténtico, N stays, paginación, bloqueo de
lecturas ajenas y JWT Staff, OTP fallido/exitoso y ausencia de éxito simulado.
OpenAPI del nuevo transporte, tests Backend/PostgreSQL y pruebas Web pertinentes;
QA integrado sin enviar correos a terceros ni alterar la BD habitual del usuario.

## Evidencia del incremento (EN_QA)

Backend verify completo1049 PASS (Java21/PostgreSQL17), incluidas12 pruebas del
historial y22 de OpenAPI. Web lint/typecheck/build y recorrido real de navegador
16/16 PASS; entrega OTP sustituida solo en QA, sin correos externos. Alcance y
timeouts de la suite general local registrados en Web70 y AlanHandoff; no se
declara CI Web general/remoto aprobado. QA manual del owner pendiente.
