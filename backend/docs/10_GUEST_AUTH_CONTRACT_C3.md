# C3 — Guest Auth con Google OIDC y BFF

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
```

Desarrollo configura `GOOGLE_REDIRECT_URI` y `PMS_WEB_PUBLIC_URL` con el
mismo host y puerto local; por defecto usan
`http://localhost:3000/api/auth/guest/google/callback` y
`http://localhost:3000`. Producción usa
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

La implementación del desafío requiere una consulta interna segura de
`confirmationCode` y correo de contacto. Reservations y
`ReservationLinkService.verifyLink` ya existen; `ReservationLinkVerificationPort`
sigue vacío y su resultado actual no incluye property ni correo de entrega.
`EmailSender`/Resend también existen, pero no hay desafío OTP ni asociación
autorizada. La propuesta para completar el puerto, persistencia y BFF está en
[BE-013A-01](30_BD1_HISTORICAL_RESERVATION_OTP_CONTRACT_PROPOSAL.md).
Esta actualización registra el estado del código; no cambia la regla C3 aprobada.

## Endpoints Backend BFF-only

- `POST /api/v1/guest-auth/google/start`
- `POST /api/v1/guest-auth/google/exchange`
- `GET /api/v1/guest-auth/session`
- `POST /api/v1/guest-auth/refresh`
- `DELETE /api/v1/guest-auth/session`

Los endpoints están pensados para la red privada BFF→Backend. El contrato no
expone tokens en una respuesta consumida directamente por JavaScript.
