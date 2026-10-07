# C3 — Guest Auth con Google OIDC y BFF

**Actualización aprobada AUTH-UNIFIED-01 (2026-10-06):**
[Contrato vigente](44_UNIFIED_LOGIN_CONTRACT_QA.md): login tradicional universal correo electrónico + contraseña;
Guest/Staff separados, Google solo Guest e invitado público. Guest password solo
para cuentas con credential existente; sin registro/recuperación/cambio/MFA.
`/acceso` tiene un formulario único en http://localhost:3001. Las decisiones y
pruebas de simulación/registro anteriores se conservan como contexto histórico;
no representan el login vigente. UI/BFF nunca exponen JWT al JavaScript.


**Estado:** APPROVED
**Fecha:** 2026-09-29

## Flujo y responsabilidades

```text
Browser -> Next.js BFF -> Spring Boot -> Google / PostgreSQL
```

1. `GET /api/auth/guest/google` en Next.js llama al Backend para crear una
   transacción OIDC y redirige al navegador a Google.
2. Google redirige a
   `/api/auth/guest/google/callback` de Next.js con `code` y `state`.
3. El BFF entrega ambos valores al Backend. El Backend valida la transacción,
   canjea el código, valida firma, `iss`, `aud`, `nonce`, expiración y
   `email_verified=true` del ID token de Google.
4. El Backend crea o resuelve `GuestAccount`/`GuestIdentity`, crea la sesión
   Guest y devuelve tokens solo al BFF.
5. Next.js coloca las cookies y redirige al destino local seguro. El navegador
   nunca lee tokens ni secretos de Google.

El Backend genera y conserva `state`, `nonce` y PKCE; los tres son de un solo
uso y expiran en 10 minutos. El BFF no interpreta ni acepta datos de Google
como identidad confiable.

## Configuración de despliegue

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
PMS_WEB_PUBLIC_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
PMS_RESERVATION_LINK_OTP_HMAC_KEY
```

Desarrollo configura `GOOGLE_REDIRECT_URI` y `PMS_WEB_PUBLIC_URL` con el
mismo host y puerto local; por defecto usan
`http://localhost:3001/api/auth/guest/google/callback` y
`http://localhost:3001`. Producción usa
`https://{GUEST_WEB_HOST}/api/auth/guest/google/callback`; el host real queda
pendiente de despliegue. Secretos nunca se versionan ni se devuelven en API.

## Cuenta y sesión Guest

`GuestAccount` guarda UUID, correo verificado, estado y timestamps.
`GuestIdentity` es agnóstica al proveedor y guarda `provider=GOOGLE` y el
`providerSubject` (`sub`), único por proveedor. No persiste nombre, apellidos
ni fotografía de Google. `GuestAccount` no es `GuestProfile` ni membership
administrativa.

Las cookies BFF son host-only, `HttpOnly`, `SameSite=Lax` y `Secure` en HTTPS:

| Cookie | TTL | Path |
| --- | --- | --- |
| `pms_guest_access` | 15 minutos | `/` |
| `pms_guest_refresh` | 7 días | `/api/auth/guest/refresh` |

El refresh es opaco, hasheado, de una familia y rota en cada uso. Guest y Staff
no comparten tokens, sesiones, refresh tokens, audiencias, cookies ni logout.

## Vínculo de reservas históricas

La regla aprobada es `confirmationCode` + correo Google verificado + OTP
hasheado enviado al correo de la reserva. El OTP dura 10 minutos, es de un solo
uso, tiene 5 intentos y reenvío mínimo de 60 segundos. Las respuestas externas
son genéricas y no revelan si existe la reserva ni su correo.

El Backend ya implementa el desafío, el vínculo autorizado y las rutas Guest
BFF-only de [BE-013B](31_BD1_HISTORICAL_RESERVATION_OTP_BACKEND_QA.md).
`ReservationLinkVerificationPort` usa el lookup interno seguro de Reservations;
el BFF Web del flujo OTP y la entrega real por Resend siguen pendientes de
integración/verificación. La clave HMAC de OTP debe configurarse en el entorno
de ejecución; el [preflight BE-016A](32_BD1_PRESENTATION_GOOGLE_RESEND_PREFLIGHT.md)
explica cómo comprobarlo sin revelar secretos.

## Endpoints Backend BFF-only

- `POST /api/v1/guest-auth/google/start`
- `POST /api/v1/guest-auth/google/exchange`
- `GET /api/v1/guest-auth/session`
- `POST /api/v1/guest-auth/refresh`
- `DELETE /api/v1/guest-auth/session`

Los endpoints están pensados para la red privada BFF→Backend. El contrato no
expone tokens en una respuesta consumida directamente por JavaScript.

## Addendum BE-005-AUTH-API-01 — me/logout compatibles

Implementación autorizada por el usuario el 2026-10-05; EN_QA hasta QA manual
PASS. GET `/api/v1/guest-auth/me` reutiliza GET session y devuelve la misma
GuestSessionResponse (guestAccountId/sessionId/email/context=GUEST), sin tokens,
GuestProfile ni permisos Staff. POST `/api/v1/guest-auth/logout` reutiliza DELETE
session y responde 204 sin cuerpo; ambos requieren Bearer Guest vigente.
GET/DELETE session permanecen compatibles, deprecated exclusivamente en OpenAPI.
Google start/exchange siguen siendo el único login Guest. Refresh conserva su
ruta/cookie pms_guest_refresh; ningún cambio en OIDC, JWT, sesiones, cookies BFF
o auditoría. Sin endpoint Guest login local.
[Contrato/evidencia](40_EXPLICIT_AUTH_ENDPOINTS_INCREMENT.md) y
[QA específica](41_EXPLICIT_AUTH_ENDPOINTS_QA.md).

## Addendum BE-004-ACCOUNT-SUMMARY-01 — resumen propio real

Implementación end-to-end autorizada por el usuario el 2026-10-06; entrega
separada de BE-005-AUTH-API-01 y EN_QA hasta QA manual final. GET
/api/v1/guest-auth/account/summary obtiene identidad exclusivamente de
GuestPrincipal vigente. GuestAccount, perfiles asociados explícitamente y
vínculos OTP persistidos de la reserva son las fuentes autorizadas.
BFF GET /api/auth/guest/account/summary usa cookie Guest HttpOnly, sin
accountId del browser ni tokens JS. No muta cuenta/perfil/vínculo ni introduce
permisos Staff. Ausencia de perfiles/estancia próxima es válida; no infiere
titularidad por correo/perfil compartido. Rewards/finanzas/promociones/mensajes
quedan fuera del contrato real. [Contrato y QA 42](42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md).

## Límite final del login password — AUTH-UNIFIED-01

Staff, Guest y fachada usan email required/NotBlank, formato email, máximo 50
tras trim/lowercase; password required/NotBlank, máximo 50, intacta (sin trim,
lowercase ni complejidad nueva). HTML/validación Web, BFF, DTOs, servicios y
OpenAPI alineados; format email/password y password writeOnly. El máximo de login
no reduce GuestAccount.email varchar(320) ni credential.password_hash varchar(255).
BCrypt(12) sin cambios. Google Guest/OIDC permanece independiente de este límite
para las credenciales del login tradicional. AUTH-UNIFIED-01 COMPLETADA tras QA
manual PASS de Alan (2026-10-06) en http://localhost:3001, incluido Guest demo,
límites50, aislamiento, Google Guest completo y continuar como invitado.
Cierre y alcance: [guía44](44_UNIFIED_LOGIN_CONTRACT_QA.md).
