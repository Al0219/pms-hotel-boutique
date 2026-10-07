# 13 — Auth and Sessions

Decisión aprobada AUTH-UNIFIED-01 (2026-10-06): `/acceso` es la única pantalla de
login, con correo electrónico y contraseña universal, Google exclusivamente Guest
 y continuar como invitado. No selector de tipo de cuenta antes de validar password.

Browser POST /api/auth/login → Backend POST /api/v1/auth/sessions. Backend valida
ambos contextos; solo uno válido inicia sesión; ambos requieren elección explícita.
El selector mantiene password solo en memoria transitoria y reenvía en cuerpo para
revalidar; editar las credenciales elimina selector. El BFF devuelve solo
context/contexts/authenticated, conserva JWT/refresh en cookies HttpOnly existentes:
pms_staff_* y pms_guest_*; Secure y SameSite=Lax vigentes. No auth por rol elegido
por el cliente, ni JWT raw en JS/storage. Rutas sintéticas pms_session y su hook sin
consumidores se retiran para que no haya una segunda lógica de autenticación.

GuestAccount/GuestIdentity/password credential != GuestProfile. Staff mantiene
roles/permisos/membership/property scope y su sesión separada. Google OIDC sigue
start/callback/exchange con state/nonce/PKCE de servidor y cookies Guest.
Invitado navega sin crear cuenta/sesión y conserva carrito/search state.

Correo/password inválido o cuenta inactiva/sin credential → mismo error genérico;
backend indisponible → estado recuperable. Contraseña no persiste en localStorage,
sessionStorage, logs, URL ni caches de Query; se borra tras resultado definitivo.
Campos admiten password manager, autocomplete, paste y teclado.

Contrato final: email required/type=email/maxLength=50, trim antes de validar y
lowercase para lookup; password required/type=password/maxLength=50, sin trim,
lowercase ni normalización. NotBlank rechaza vacío/solo espacios, sin alterar
espacios de una contraseña no vacía. Browser y BFF comparten validación de entrada;
el servicio Web rechaza bypass programático antes de fetch. Formato email común
con Backend, incluyendo rechazo de puntos consecutivos y dominios con guion bajo.
Backend DTO y servicios
validan también; OpenAPI email/password maxLength=50, formats y writeOnly vigentes.
No complejidad nueva, cambios de hash BCrypt(12), reducción de columnas ni migration.

Puerto público canónico http://localhost:3001; Docker raíz publica solo Web,
Backend/PostgreSQL internos. dev/start usan 3001 y fallan ante conflicto.
Registro público/forgot/reset/change password/MFA pendientes; ninguna UI simula
que estén disponibles. QA integrado Docker raíz; AUTH-UNIFIED-01 COMPLETADA tras
QA manual PASS de Alan (2026-10-06) en http://localhost:3001: Staff demo/qa_staff,
Guest demo, dashboard, aislamiento, F5/restauración, logout/Atrás, límites50,
Google Guest completo, invitado y puerto canónico.
[Contrato/QA](../../../backend/docs/44_UNIFIED_LOGIN_CONTRACT_QA.md).

## Corrección de QA: guard y restauración Staff (2026-10-06)

Guest y Staff conservan providers, cookies y caches independientes. Guest usa
`["guest-session"]`; Staff usa `["auth", "staff", "session"]` tanto en `/acceso`
como en el guard privado. Guest 401 significa Guest signed-out; no altera Staff.
Los requests BFF con withAuth=false no emiten logout mediante el interceptor global.

El contrato Staff sigue devolviendo username como identidad interna; email solo
cambió el input de login. El mapper acepta el permiso contractual
SERVICE_REQUEST_INTAKE (changeset aplicado 003/006). Su ausencia en la lista Web
provocaba DomainMappingError incluso con HTTP200, presentado antes como sesión
ausente. Un DTO inválido ahora falla cerrado con error de carga recuperable.

Bootstrap Staff: GET session; solo ante 401, un POST refresh y un retry GET.
Un segundo 401 o refresh 401 termina en signed-out; transporte/503 es error de
carga, no sesión ausente. La rotación concurrente se comparte solo dentro de Staff.
No refresh loop ni dependencia de focus; la revalidación 200 actualiza la UI.
Session/refresh Staff llevan Cache-Control: no-store y no convierten Backend 5xx
en 401. Cookies HttpOnly/Secure/SameSite y contratos Backend quedan preservados.

El guard muestra loading inicial, conserva la última identidad válida durante
background refetch/transporte, y bloquea tras 401 definitivo. Logout confirmado
cancela lecturas Staff y publica null únicamente en su cache. Focus sigue activo
para Staff; no se cambiaron las opciones globales ni las opciones Guest.

QA automático: 24 regresiones añadidas, incluyendo dashboard/PrivateLayout reales,
orden Guest/Staff, 401→200, no flicker, refresh/retry acotado, logout aislado y
contraseña con espacios intacta. Firefox aislado contra Docker 3001 verifica login,
Guest401, F5, focus, restauración conservando refresh y logout. Alan confirmó QA
manual PASS de dashboard, aislamiento y F5/restauración; COMPLETADA.

## Logout explícito Staff — salida pública (2026-10-06)

Después de DELETE BFF exitoso: mostrar transición de salida, cancelar la consulta
Staff, publicar null en auth/staff/session, cancelar/eliminar caches Staff de
private-09/reservations/rooms y router.replace("/"). Guest session/datos y queries
públicas permanecen intactos. No QueryClient.clear, push, window.location ni delays.
El fallo conserva sesión/cache/ruta y muestra error para reintentar.

La transición solo aplica a logout explícito confirmado, para no mostrar el guard
mientras Next cambia a Home. Acceso directo sin Staff sigue bloqueado por el guard.
No router.refresh: los layouts no autorizan mediante datos SSR cacheados; el guard
consume la consulta Staff actual. Firefox real confirma que Atrás hacia dashboard/
calendario sigue bloqueado y Staffsession401, con Guest coexistente200 conservado.
Se verifica replace manteniendo history.length, URL exacta http://localhost:3001/
y ausencia de «Sesión Staff requerida» en Home. Alan confirmó logout desde ambas
rutas y Atrás sin recuperar sesión Staff PASS; COMPLETADA.
