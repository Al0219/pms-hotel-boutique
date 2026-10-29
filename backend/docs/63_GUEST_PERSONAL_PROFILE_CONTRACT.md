# 63 — Perfil personal y cuenta Guest

Estado: APROBADO por José el 2026-10-28; implementación EN_QA, pendiente de QA manual del usuario y gate Web general.
IMP-WEB-0204, extensión del resumen42 e historial62. Owner José/WEB-2;
review colaborativo BD1/Guest y BD3/Reservations. Rama feature/guest-personal-profile.
El usuario confirma guardado real y amplía la revisión a historial y navegación.

## Perfil y límites

GET/PUT /api/v1/guest-auth/account/profile; BFF /api/auth/guest/account/profile.
Guest JWT/sesión/cuenta activos, sin IDs de cuenta/perfil/property del cliente.
GET devuelve {guestAccountId,email,profile:null|Details}; nunca crea datos.
PUT cerrado (máximo4KiB también en Backend nativo): firstName/lastName requeridos (1–80), phone E.164 opcional (+ y8–15
cifras), country opcional (80), preferredLanguage es|en|null, bedType KING|QUEEN|
TWIN|null, roomVibe QUIET|EXTERIOR_VIEW|NEAR_ELEVATOR|null, floorPreference
HIGH|LOW|null, version y expectedUpdatedAt. Cadenas se recortan; vacías opcionales
se normalizan a null. Contacto no cambia el email de acceso, que es solo lectura.

Details añade profileId, version y updatedAt ISO-8601 UTC. Primer PUT usa
version0/expectedUpdatedAt null; siguientes comparan versión y updatedAt exactos.
409 conserva borrador y exige recargar si existe conflicto. Repetir el mismo
contenido es idempotente sin perfiles/auditorías duplicados. 200 lectura/guardado,
400 formato/campos extra,401 sesión inválida/Staff,409 conflicto,503 persistencia.
BFF exige origen same-origin en PUT, Guest cookie y JSON cerrado de hasta4KiB;
respuestas privadas no-store y allowlist, sin JWT al JavaScript.

Datos demográficos en un GuestProfile propio nuevo; tabla explícita
 guest_personal_profiles designa uno por cuenta y guarda preferencias. FK compuesta
verifica titularidad. No selección arbitraria entre N perfiles, ni asociación
por correo, ni edición de perfiles históricos. Perfiles usados por reservas u
ocupantes no se modifican por esta API. Bloqueo de cuenta/perfil serializa alta y
actualización. Auditoría append-only de actor/acción/versión/UTC, sin copiar PII.
Migración nueva004-010; ninguna migración aplicada se modifica.

Sin cambio de contraseña/correo, documentos, foto subida, marketing,
consentimientos ni ExternalIdentity. Preferencias son solicitudes, no garantías.

## Cuenta, historial y detalle

Reutilizar enlaces persistidos, reconciliación verificada y listado existentes.
Búsqueda por referencia/hotel y filtro por estado persistido, no fecha del navegador.
GET /api/v1/guest-auth/account/reservations/{reservationId}/summary, mediante BFF
same-origin equivalente: misma proyección visual62, autorizada por vínculo propio
cuenta/reserva/property en SQL; nunca solo email.200,400UUID,401,404indistinguible.
N estancias, fotos editoriales por tipo, fechas/noches/estados/asignación/hotel,
fecha/canal y monto original si existe receipt; no saldo/PII/ledger inventados.
Navegación: resumen, perfil, historial, vinculación, reservar y cierre Guest.
Facturas/rewards/promociones/mensajes sin contrato Guest no se simulan como reales.

## Aceptación y QA

Cuenta con0/N perfiles previos, propia/ajena, creación/recarga/cancelar, validación,
conflicto y reintentos; aislamiento Guest/Staff/logout y auditoría inmutable.
Reservas/finanzas/perfiles históricos intactos. OpenAPI, tests y esquema vigente;
capas Service→DTO→Mapper→Domain→Hook→UI. QA automatizado y navegador3001;
permanece EN_QA hasta confirmación manual del usuario. Sin commit/push autorizados.


### Compatibilidad de autocompletado público

El checkout autenticado consume la designación personal63 y el correo propio de
sesión; no summary.profileId ni una selección de perfiles históricos. Copia solo
contacto en campos vacíos y no editados, sin documento ni IDs de persistencia.
Un error permite completar manualmente. Alta de reserva sigue creando sus propios
datos históricos, sin mutar ni reutilizar el perfil personal como bookingGuest.


## Evidencia de este incremento

Backend completo1186 PASS, OpenAPI/upgrade incluidos. Lint, typecheck y builds
PASS. Web focal144:141 PASS;3 timeouts en casos existentes, consulta pública
pasa en recheck y2 casos de vinculación también fallan en HEAD. La comparación
Staff3 casos reproduce sus fallos en HEAD; no se alteraron sus fuentes/tests.
La ejecución general Web es parcial/interrumpida, no un PASS de CI global.
Chrome real3001:27 PASS, sin errores JS/API500 ni pagos, con escritura/recarga y
actualización de la cuenta demo.16 reservas/16stays/30 movimientos conservados y
hashes históricos idénticos.1 nuevo perfil personal,3 auditorías y migración36.
Sin nuevas cuentas, credenciales, datos financieros ni asociaciones históricas.

Recheck final de navegación/cierre de sesión:10/10 PASS en3001, sin escrituras;
una sola acción canónica de logout, campos required/readonly y móvil correctos.
