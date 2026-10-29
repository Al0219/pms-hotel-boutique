# ANDROID-BACKEND-MVP — contrato Guest nativo y lecturas propias

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

Autorización explícita del usuario2026-10-25 para definir acceso Android seguro
reutilizando Guest Auth, Account y Reservations. Estado COMPLETADA / PASS para el alcance MVP confirmado. Base5cc0d58/PR166;
branch feature/android-backend-mvp. Owner Alan, revisión cross-app de seguimiento.
No altera las decisiones de dominio C1/C3 ni permisos Staff. Amplía su audiencia
BFF a cliente Android nativo para las operaciones enumeradas. Google y registro
continúan BFF-only; browser JS nunca recibe credenciales.

## Transporte y endpoints reutilizados

| Método y ruta bajo `/api/v1/guest-auth` | Auth/request | Respuesta |
| --- | --- | --- |
| POST `/sessions` | `{email,password}` validación Guest vigente |201 `GuestAuthResponse`, no-store |
| GET `/me` (y alias `/session`) | Bearer JWT Guest |200 `GuestSessionResponse` |
| POST `/refresh` | Cookie BFF `pms_guest_refresh` **o** header nativo `X-Guest-Refresh-Token` |200 tokens rotados, no-store;401 inválido |
| POST `/logout` (y DELETE `/session`) | Bearer Guest |204; revoca sesión y refresh Guest |
| GET `/account/summary` | Bearer Guest |200 resumen propio, private/no-store |

Login no crea cuentas. Tokens/sesiones, BCrypt, TTL15min/7d, hash/rotación del
refresh y logout reutilizan exactamente los servicios existentes. Android omite
cookies: access solo memoria, refresh en Expo SecureStore asociado al origen
Backend. El Backend rechaza refresh con Cookie y header a la vez o header nativo
con Origin. No acepta refresh nativo en query ni JSON. No cambia cookies Web ni
BFF, Google, registro, sesiones Staff o tablas. Usar HTTPS fuera de LAN local
controlada. Header sensible debe redactarse igual que Authorization/Cookie en
cualquier proxy/log de despliegue; no lleva ejemplos en OpenAPI.

## Lecturas nuevas, sin mutaciones

| Método y ruta | Request |200 | Errores |
| --- | --- | --- | --- |
| GET `/account/reservations` | Sin accountId/propertyId; Bearer Guest |Array `GuestLinkedStay`, una fila por estancia |401 |
| GET `/account/reservations/{reservationId}/stays/{stayId}` | UUIDs ruta, Bearer Guest |`GuestStay` |400 UUID inválido;401 sesión;404 inexistente/no propio/combinación inválida |

`GuestLinkedStay`: reservationId, stayId, confirmationCode, propertyName,
arrival, departure, roomCode nullable, status persistido. Incluye todas las fechas
y estados; orden arrival,confirmationCode,stayId. Una reserva con N estancias da
N filas. Sin paginación nueva en este MVP. Lista vacía válida.

`GuestStay`: id, reservationId, confirmationCode, roomType{id,name}, room{id,code} nullable,
arrival, departure, status persistido. No hay reserva/estancia ficticia ni Room
creada por la consulta. Campos siempre presentes; room=null si no asignada.
Sin email/GuestProfile, acompañantes, finanzas, notas internas, auditoría ni
permisos administrativos. `Cache-Control: no-store, private` en ambas lecturas.

GuestPrincipal activo es la única autoridad de identidad. Se revalida con el
servicio Guest; SQL consulta desde guest_reservation_links con guest_account_id
autenticado y joins por reservation/property/stay. Identificadores elegidos por
cliente no autorizan otras cuentas; params accountId desconocidos se ignoran.
No se autoriza por email ni GuestProfile asociado, incluso si coinciden.
JWT Staff rechazado. Un Guest tampoco habilita endpoints Staff. Pertenencia y
property scope se validan antes de devolver filas, sin filtrar datos globales
en Java. Port Guest y adapter Reservations reutilizan tablas existentes.

GET es solo lectura; sin side effects, nueva auditoría, idempotency key,
transacciones financieras, cambios de propiedad/vínculos o migraciones.
OpenAPI generado declara guestBearerAuth, audiencia guest-bff-or-native y las
alternativas OR de refresh. Google/registro/Staff conservan audiencia previa;
paridad completa de mappings sin exclusiones nuevas.

## Pruebas y límites

`GuestAndroidMvpIntegrationTests`: PostgreSQL17 real descartable, 0/N estancias,
room nula/asignada, privacidad, cuenta ajena, email/perfil sin vínculo,
combinación reserva/estancia, sesión revocada/cuenta deshabilitada/Staff/anon,
refresh ambiguo/Origin y HTTP TCP login→me→summary→list→stay→rotación→logout→401.
`GuestAccountSummaryIntegrationTests` protege regresión; OpenApiContractIntegrationTests
comprueba documento real, esquemas, audiencias, security y mappings.

[Guía Expo/Fedora, SQL de contraste y QA Android](../../frontend/pms-hotel-android/docs/38_ANDROID_BACKEND_MVP.md).
No se escribe en la base de trabajo para fabricar una vinculación. QA físico y
confirmación del usuario pendientes; no declara COMPLETADA la tarea ni cierra
QA previos. Sin commit, push, PR, suite completa o build pesado de distribución.

## Corrección posterior — reservas Guest, EN_QA (2026-10-25)

[Contrato57](57_GUEST_BOOKING_LINK_RECOVERY.md) reutiliza las lecturas existentes,
agrega POST account/reservations/reconcile y reservationStatus al listado.
Solo GuestPrincipal, correo verificado persistido y CONFIRMED; sin transferencia.
Migración aditiva013 habilita procedencia ACCOUNT desde email_verified_at para
cuentas anteriores sin prueba; no inventa OTP/Google ni crea tablas. Transacción
independiente, auditoría/locks/ON CONFLICT existentes. Web confirma primero y
recupera después; Web/Android reconcilian antes de listar. La confirmación/pago
nunca se repite o revierte por fallo de vínculo. Amplía el alcance inicial del
MVP56; no modifica migraciones aplicadas ni cierra QA previos. OpenAPI con paridad.

## Ajuste de referencia Android — 2026-10-26

GET propio de estancia incorpora confirmationCode desde la Reservation persistida;
campo requerido string en GuestStay/OpenAPI, sin alterar IDs, pertenencia ni cache.
Android acepta ausencia/null/blanco durante compatibilidad y muestra texto neutro,
nunca un UUID como código. Cambio de estancia conserva la separación de queries.
El usuario confirmó PASS manual del recorrido real Web/Android; este ajuste visual
permanece EN_QA y no tiene nueva prueba manual atribuida. Cuatro comprobaciones
Backend focales PASS de detalle/ownership y documento generado/paridad.

## Extensión compatible de programación Housekeeping (contrato59)

GET Guest estancia propia agrega timezone IANA requerido, derivado de la
propiedad autorizada. No cambia identidad, scopes, IDs ni otros datos de estancia.
Android lo consume para programación/fechas de Housekeeping sin asumir zona del
teléfono. Contrato59/guía42 registran cinco franjas autorizadas y QA pendiente.
