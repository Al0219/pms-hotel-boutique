# Historial Guest — contrato original sustituido durante integración

El25/10 José aprobó un listado propio paginado y detalle por reserva en esta
rama. El26/10 autorizó integrar main y conservar el contrato compartido que ya
utilizan Web/Android, evitando dos mappings para el mismo GET. La implementación
paginada de esta rama se retira; no se altera el contrato de Android.

Las fuentes vigentes son [contrato56](56_ANDROID_GUEST_MVP_CONTRACT_QA.md) y
[recuperación57](57_GUEST_BOOKING_LINK_RECOVERY.md):

- GET /api/v1/guest-auth/account/reservations devuelve una lista de estancias
  propias vinculadas; Web agrupa N estancias por reserva sin inventar campos.
- GET /{reservationId}/stays/{stayId} revalida pertenencia en Backend y devuelve
  el detalle de la estancia, tipo y habitación nullable.404 ajeno/inexistente.
- POST /reconcile recupera vínculos compatibles solo con sesión Guest y prueba
  de correo verificado persistida. No recrea reservas ni pagos y no acepta
  identidad seleccionada por el cliente; lectura GET sigue siendo de solo lectura.
- Se reutilizan servicios, adaptadores SQL, BFF y hooks de main. No hay
  GuestReservationHistoryController ni segundo mapping ni cambio de migraciones.
- El flujo manual OTP C3 continúa separado, con su BFF Guest HttpOnly,202 opaco,
  verificación204 y espera mínima de reenvío60s; no hay OTP simulado en producción.

Se conservan la presentación pública crema/oliva, el acceso Guest contextual y
las pruebas de aislamiento, N estancias, campos privados, errores y C3. Las
aserciones de paginación se sustituyen por pruebas del contrato compartido;
no se deshabilitan tests ni se modifican límites para ocultar errores.

Estado de la integración y evidencia final en AlanPlan/AlanHandoff y Web70.
