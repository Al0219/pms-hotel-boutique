# BE-013B-BACKEND-01 — QA manual del vínculo OTP Backend

Esta entrega publica dos rutas Guest BFF-only bajo
`/api/v1/guest-auth/reservation-links`: `POST /challenges` devuelve `202` con
`requestId` opaco; `POST /verify` devuelve `204` al vincular o `422` genérico
si el desafío no sirve. JWT Staff, Guest ausente o sesión revocada no autorizan
estas rutas. La propiedad y la identidad proceden de la reserva/cuenta, no del
request. El BFF Web y Resend real requieren integración separada.

Desde `backend/`, con Docker disponible:

```bash
docker compose -p pms_bd1_otp -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress \
  '-Dtest=ReservationLinkOtpIntegrationTests,ReservationLinkServiceIntegrationTests' test
docker compose -p pms_bd1_otp -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
docker compose -p pms_bd1_otp -f compose.bd2-test.yaml down -v
```

La primera ejecución debe pasar 13 pruebas: lookup silencioso, emisión y
verificación, replay, cuenta/sesión, correo, expiración, cinco intentos,
cooldown, límite por código, timeout de entrega, concurrencia, append-only y
autorización HTTP. La segunda debe pasar 321 pruebas y terminar con
`BUILD SUCCESS` y cero failures/errors/skipped. `down -v` elimina solo el
proyecto aislado de QA.

La prueba HTTP usa un `EmailSender` simulado y un JWT Guest de prueba. No
demuestra entrega real por Resend ni flujo de cookies/Network del BFF. Esa
comprobación corresponde a BE-016B y al consumidor Guest Web.

## Prueba manual en Postman

Importar [`BD1-Backend-APIs.postman_collection.json`](../postman/BD1-Backend-APIs.postman_collection.json)
en Postman. En las variables de la colección, establecer `baseUrl` al Backend
de pruebas y poner temporalmente un JWT Guest vigente en `guestAccessToken`.
Esta API es BFF-only: el JWT debe proceder de una sesión Guest autorizada;
no usar un JWT Staff. Escribir en `confirmationCode` una referencia histórica
que pertenezca al correo Google verificado de esa cuenta. No guardar tokens ni
OTP reales en el JSON del repositorio ni exportar la colección después de usarla.

1. Ejecutar **01 — Solicitar desafío OTP**. Debe responder `202` con un UUID
   `requestId`; la colección lo conserva para la siguiente solicitud. Incluso
   una referencia desconocida responde `202`, sin revelar si existe.
2. Esperar el correo OTP en el buzón autorizado, introducir sus ocho dígitos en
   la variable `otp` y ejecutar **02 — Verificar OTP y vincular reserva** antes
   de diez minutos. Debe responder `204` sin cuerpo.
3. Repetir la verificación con el mismo `requestId`: debe responder `422`
   genérico por uso único. La aserción de Postman espera `204` para el flujo
   exitoso, por lo que esta ejecución negativa marcará esa aserción como
   fallida de forma esperada.

La prueba manual en vivo exige Backend con Google Guest Auth, envío de correo y
`PMS_RESERVATION_LINK_OTP_HMAC_KEY` configurados. La colección permite probar
las rutas directas; el flujo completo de cookies y BFF Web sigue pendiente de
su integración. No usar `Run collection` para el flujo OTP, porque la segunda
solicitud necesita el código recibido por correo.
