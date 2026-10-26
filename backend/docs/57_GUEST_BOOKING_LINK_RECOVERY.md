# Corrección MVP — reserva Guest confirmada y vínculo recuperable

## Cierre vigente — COMPLETADA / PASS (2026-10-26)

El usuario confirmó explícitamente PASS manual del recorrido Web/Android y del
ajuste visual del código de confirmación. Se cierra únicamente el alcance MVP:
login Guest, reservas reales, vinculación segura, selección de estancia y
referencia visible. No se atribuyen pruebas manuales nuevas al agente.

Permanecen pendientes las variantes no confirmadas individualmente: expiración/
renovación/revocación y errores de logout, cold start/SecureStore tras reinicio,
fallos de red/5xx, listas vacías y otras variantes de selección/cambio, lector de
pantalla/teclado/Back/escala de fuente y conectividad HTTPS fuera del entorno
validado por el usuario. Su cobertura automatizada no equivale a QA manual.
No se cierran otros incrementos Auth/Staff/Housekeeping ni tareas del backlog.
Las menciones previas EN_QA son evidencia histórica; este es el estado del MVP.

Autorización de Alan2026-10-25; rama feature/android-backend-mvp con el trabajo
Android previo preservado. Estado COMPLETADA / PASS para el alcance MVP confirmado; ver cierre vigente.
Owner Alan; revisión cross-app de seguimiento. No cierra QA anteriores.

## Diagnóstico de solo lectura

En la base de trabajo se observó como última reserva `[referencia local omitida]`, CONFIRMED,
property HB-GT-DEMO, una estancia y ningún guest_reservation_link. El titular
booking_guest_id existe y su email normalizado coincide con una GuestAccount
ACTIVE con email_verified_at persistido, pero sin guest_email_verifications.
No se atribuye esa referencia al usuario sin que confirme su código; demuestra
el caso reproducido: una reserva existente sin vínculo no es una reserva inexistente.
No se imprimieron correos, passwords ni tokens ni se modificaron esas filas.

Configuración en ejecución comprobada: Web PMS_BACKEND_INTERNAL_URL=
http://backend:8080; Backend PMS_DATABASE_URL=jdbc:postgresql://postgres:5432/pms_hotel.
Android solo tiene .env.example sin URL real y no se encontró Metro ejecutándose;
no puede afirmarse qué servidor usa un APK instalado. Debe apuntar al mismo
servicio Backend, publicado por compose.android-local.yaml, no a otro8080.

## Flujo y transacciones

1. PublicBookingServiceImpl/recibo/pago/confirmación originales no se modifican.
   El BFF público conserva payload y Idempotency-Key exactos, nunca reenvía
   Authorization ni cookies Staff/browser al endpoint público.
2. Tras construir la respuesta201 confirmada, si existe cookie access Guest,
   el BFF solicita reconciliación autenticada con Bearer de esa cookie.
   Sin Guest se conserva el flujo anónimo. Un401/503/timeout/error de vínculo
   nunca reemplaza201 ni cambia el recibo o repite una creación/pago.
3. Un POST propio recupera vínculos en transacción REQUIRES_NEW. Identidad solo
   GuestPrincipal validado por Backend; no acepta accountId/email/reservationId
   como autoridad. Sin campos de cliente necesarios ni selección de propiedad.
4. Recupera todas las reservas CONFIRMED con bookingGuest.email normalizado igual
   al correo verificado actual de la cuenta. Respeta propiedad coherente, profile
   owner si existe y todos los vínculos persistidos; nunca UPDATE/DELETE/transfiere.
5. Reutiliza la prueba inmutable existente de ese email. Para cuentas anteriores
   sin fila de prueba, copia exclusivamente su email_verified_at server-owned a
   una prueba source=ACCOUNT, claramente distinta de REGISTRATION/GOOGLE. No envía
   correo ni declara que ocurrió un OTP/Google nuevo.
6. Lock de cuenta FOR NO KEY UPDATE serializa recuperaciones sin bloquear los
   KEY SHARE de claves foráneas. Reutiliza el adaptador C3 con locks estables r/g,
   INSERT ON CONFLICT y auditoría GUEST_RESERVATION_LINKED solo cuando insertó.
   Fallo de evidencia/vínculo/auditoría revierte solo la recuperación.
7. Web/Android reconcilian antes de listar. Por ello también recuperan reservas
   confirmadas previamente o con respuesta de vínculo perdida, sin volver al pago.
   GET conserva semántica de solo lectura. Repetir recuperación no duplica links,
   evidencia ACCOUNT, auditorías de éxito, reservas, estancias ni pagos.

La vinculación histórica original de registro/Google sigue incluyendo sus estados
aprobados. El nuevo método de recuperación limita a CONFIRMED; no se cambian OTP,
registro, Google, sesiones, permisos o ámbitos Staff.

## Contrato HTTP

Nuevo POST `/api/v1/guest-auth/account/reservations/reconcile`:

- Bearer Guest vigente; identidad y cuenta verificada recalculadas en Backend.
- Sin request body requerido, IDs, email ni property scope aportados por cliente.
-204 sin cuerpo también si no hay candidatos; no revela reservas de terceros.
-401 Guest ausente/inválido/revocado/cuenta no activa. Staff rechazado.
-503 recuperación temporalmente no disponible; no altera confirmaciones/pagos.
- Cache-Control:no-store. Sin Idempotency-Key adicional: unicidad/locks existentes.
- Auditoría append-only existente y correlación con prueba de verificación.

Reutiliza GET `/api/v1/guest-auth/account/reservations` y
`/{reservationId}/stays/{stayId}` del contrato56. El listado agrega
`reservationStatus` persistido, distinto del status de cada estancia; el campo es
aditivo y Android conserva compatibilidad. No se crean APIs de reserva duplicadas.
OpenAPI valida POST/seguridad/códigos, esquema actualizado y paridad de mappings.

BFF Web:

- GET `/api/auth/guest/account/reservations`: allowlist y Bearer solo de cookie
  Guest HttpOnly; ignora query/Authorization/IDs de cuenta del browser.
- POST misma ruta +`/reconcile`: mismo origen PMS_WEB_PUBLIC_URL, cookie Guest,
  sin body reenviado ni IDs;204/401/403/503 seguros.
- GET `/{reservationId}/stays/{stayId}`: UUIDs válidos, pertenencia en Backend,
  respuesta allowlisted incluidos roomType/room;404 ajeno/inexistente.
- Cookies/tokens no se devuelven a JS; private,no-store; errores sanitizados.

## Persistencia y compatibilidad

Solo changeset aditivo `003-guest-account-evidence-013`: amplía la restricción de
source de guest_email_verifications para ACCOUNT. No crea tablas ni cambia filas
existentes, timestamps de cuentas, passwords o evidencia histórica. No se modifica
ninguna migración aplicada; constraints de registration_id, triggers append-only,
FKs e historia continúan. Total30 changesets. Tests de upgrade conservan asserts de
checksums/datos/idempotencia y exigen explícitamente013. No backfill masivo.

## Clientes y QA

Web conserva mock explícito. Mis reservas, /cuenta/reservas, historial y detalle
usan proyecciones Backend en real; no invocan historia provisional ni fabrican
ocupantes, política o titular. Agrupan N estancias por reserva, muestran estado
de reserva y estancia y consultan el detalle real. Queries account-scoped,
refresh Guest deduplicado y retry único401; último401 delega al controller de
sesión canónico. Checkout confirmado invalida reservas/summary Guest; recuperar
vínculos también invalida summary. Focus/refetch recupera cambios posteriores.

Android reconcilia antes del listado y refetchea al volver por focus sin cancelar
una petición ya en curso. UI, guards y selección0/1/N existentes conservados.

[Guía de comprobación Firefox/Android](../../frontend/pms-hotel-web/docs/70_GUEST_RESERVATIONS_REAL.md).
Solo pruebas focalizadas, typecheck, ESLint y diff-check; no suite completa,
builds de distribución ni Docker E2E. PostgreSQL de pruebas descartable separado
de la base real. Comandos/resultados finales en AlanHandoff.
