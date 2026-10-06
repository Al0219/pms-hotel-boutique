# Stack local integrado del PMS

El entorno canónico es compose.yaml de la raíz: postgres + backend + web.
Los Dockerfiles y BFF existentes implementan esta arquitectura; no se necesita
levantar otra instancia Backend para Google ni para Swagger/Staff.

## Preparar .env

Desde la raíz, copiar .env.example solo si no existe un .env. Conservar los
valores propios ya configurados; no versionar .env ni imprimir su contenido.

```sh
test -f .env || cp .env.example .env
```

Completar antes del primer arranque:

| Variable | Configuración local |
| --- | --- |
| PMS_WEB_PORT | 3001 en el ejemplo; puerto host de Web |
| PMS_BACKEND_PORT | 8081 por defecto; puerto host de Backend/Swagger |
| PMS_WEB_PUBLIC_URL | http://localhost:3001; origen Web, sin path |
| NEXT_PUBLIC_USE_MOCK_API | false para Staff y Google reales por BFF; cambiarlo requiere reconstruir Web |
| PMS_POSTGRES_PASSWORD | Contraseña exclusiva de la BD local; mantenerla si el volumen ya fue inicializado |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Cliente OAuth Web de desarrollo; completar solo en .env, Backend server-side |
| GOOGLE_REDIRECT_URI | http://localhost:3001/api/auth/guest/google/callback, exacto y autorizado en Google |
| PMS_BOOTSTRAP_ADMIN_USERNAME / EMAIL / PASSWORD | Tres valores juntos para provisionar Staff mediante bootstrap existente, o todos vacíos |
| PMS_JWT_SECRET / PMS_RESERVATION_LINK_OTP_HMAC_KEY | Configuración propia de desarrollo si se requiere continuidad JWT/OTP; nunca usar claves de producción |

El origen del callback debe coincidir literalmente con PMS_WEB_PUBLIC_URL.
Si Web usa otro puerto, ajustar PMS_WEB_PORT, PMS_WEB_PUBLIC_URL y
GOOGLE_REDIRECT_URI juntos y registrar el callback en Google. En modo Testing,
la cuenta que probará Google debe estar autorizada como Test user en el proyecto.
Ver también el [preflight de proveedores](../backend/docs/32_BD1_PRESENTATION_GOOGLE_RESEND_PREFLIGHT.md).

Para Staff local reproducible, reemplazar las tres variables bootstrap vacías
del .env con este bloque **opcional y sintético**, antes del primer arranque:

```dotenv
PMS_BOOTSTRAP_ADMIN_USERNAME=local_staff
PMS_BOOTSTRAP_ADMIN_EMAIL=local_staff@example.test
PMS_BOOTSTRAP_ADMIN_PASSWORD=PMS-Local-Disposable-Only!2026
```

Cuenta exclusiva del stack local de desarrollo; no reutilizar su contraseña
fuera de este entorno. No hay contraseña predeterminada en aplicación/Compose:
sin opt-in no se crea Staff. El bootstrap existente crea SUPER_ADMIN con rol,
membership y auditoría existentes; reiniciar no duplica ni cambia la contraseña
de un username existente. Si el .env ya define Staff, usar esa cuenta local sin
sobrescribirla. No se requiere buscar usuarios de fixtures ni poblar tablas a mano.

## Arrancar y comprobar

```sh
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

Esperar postgres/backend/web healthy. Abrir Web en PMS_WEB_PUBLIC_URL; con el
ejemplo, http://localhost:3001. Swagger está en
http://localhost:8081/swagger-ui/index.html; usar PMS_BACKEND_PORT si se cambió.
`/v3/api-docs` y `/v3/api-docs/swagger-config` deben responder 200.

Web BFF usa **http://backend:8080**, configurado en Compose. Backend usa
**jdbc:postgresql://postgres:5432/pms_hotel** en la red Docker. Los host ports
sirven para abrir Web/Swagger desde Fedora; no se usan entre contenedores.
PostgreSQL no está publicado al host. Google/Resend y sus secretos se envían
solo al Backend; Web recibe únicamente el origen público y URL interna Backend.

Validación sin imprimir configuración expandida ni secretos:

```sh
docker compose --env-file .env config --quiet
docker compose --env-file .env exec -T web node -e "fetch(process.env.PMS_BACKEND_INTERNAL_URL+'/actuator/health').then(r=>{console.log('BFF a Backend HTTP',r.status);if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
```

## Staff en Swagger y Web/BFF

Swagger: POST `/api/v1/staff-auth/login` con las credenciales locales del .env
(o local_staff si se optó por el bloque sintético). Esperado: 201. Copiar el
accessToken únicamente para la herramienta local; **Authorize → bearerAuth**,
pegar su valor sin prefijo Bearer. GET `/api/v1/staff-auth/me` → 200, identidad/
permissions/memberships C2. POST `/api/v1/staff-auth/logout` → 204; GET me con
el mismo Bearer → 401. Quitar el Bearer revocado antes de repetir login.
No añadir estas credenciales como example/default al documento OpenAPI.

El BFF conserva sus rutas compatibles: POST `/api/auth/staff/session` crea
cookies y responde `{authenticated:true}`; GET de esa ruta devuelve C2 sin tokens;
POST `/api/auth/staff/refresh` rota cookies; DELETE `/api/auth/staff/session`
revoca y borra cookies Staff. Probar desde el mismo origen Web mediante navegador
o cliente local; los access/refresh permanecen HttpOnly. Staff y Guest usan
cookies y sesiones independientes. La [guía QA](../backend/docs/41_EXPLICIT_AUTH_ENDPOINTS_QA.md)
detalla los pasos y comprobaciones de aliases/legacy.

## Google Guest por Web/BFF

1. Abrir `/acceso` en el Web de este stack → Continuar con Google. Con mocks
   desactivados, el enlace real llama `/api/auth/guest/google`. También se puede
   abrir esa ruta Web directamente.
2. El BFF pide Google start a backend:8080 y redirige a Google. Autorizar la
   cuenta de prueba; Google retorna a GOOGLE_REDIRECT_URI en **Web**.
3. Next.js callback canjea code/state contra **ese mismo Backend** por la URL
   interna, coloca cookies Guest HttpOnly y redirige a `/cuenta` usando
   PMS_WEB_PUBLIC_URL. No copiar/canjear otra vez el code ya usado por el BFF.
4. Verificar GET `/api/auth/guest/session` → 200, context=GUEST sin tokens;
   POST `/api/auth/guest/refresh` → 200 `{refreshed:true}`; DELETE session → 204
   y GET session posterior → 401. Staff debe seguir activo en su sesión separada.
5. En Network, el login de la aplicación pasa por Web/BFF; el exchange no sale
   desde browser JS hacia el host Swagger. No debe existir access/refresh en
   JSON cliente ni local/sessionStorage. Confirmar flags HttpOnly y SameSite=Lax
   de cookies Guest, con Secure bajo HTTPS; no compartir valores en evidencia.

Un start 307 a Google y un callback inválido rechazado comprueban el transporte,
pero el consentimiento y retorno Google válidos requieren QA manual del usuario.
No presentar ese preflight como login Google completado. Si la credencial Google
falta o el callback/Test user no está autorizado, corregir la configuración de
desarrollo y recrear el stack; no cambiar la autenticación a correo/contraseña.

## Tests y parada

Los tests no usan el .env raíz ni el volumen persistente integrado. Desde backend/:

```sh
docker compose -p pms_integrated_verify -f compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress verify
docker compose -p pms_integrated_verify -f compose.bd2-test.yaml down
```

Ese archivo conserva exclusivamente verify + PostgreSQL tmpfs, sin bootstrap
Staff fijo. El QA aislado histórico se conserva en compose.auth-manual-qa.yaml;
los puertos 18085/18086 no son el entorno para flujos integrados normales.

Desde la raíz, parar el stack manteniendo los datos locales:

```sh
docker compose --env-file .env down
```

El volumen pms-hotel-postgres persiste; `down -v` lo elimina y se reserva para un
reset intencional de esa BD. No usarlo durante la validación de un volumen existente.
BE-005-AUTH-API-01 permanece EN_QA hasta confirmar el flujo manual final.
