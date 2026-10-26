# Android ↔ Backend Guest MVP — COMPLETADA / PASS

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

Autorizado por Alan el 2026-10-25. Rama `feature/android-backend-mvp`, base
`origin/main` `5cc0d58`, PR #166 integrado. Owner Android/BD1: Alan. Revisión
cross-app de seguimiento; no sustituye QA manual. Este incremento extiende la
foundation 33–37 para transporte real; no cierra por arrastre sus QA previos ni
modifica el backlog histórico frontend-first.

## Alcance y contrato

Login Guest → resumen propio → listado de estancias vinculadas → selección
existente 0/1/N → Inicio con estancia PostgreSQL. Se conservan rutas, tokens
visuales, componentes y la separación Reservation/ReservationStay. Una reserva
puede aportar varias filas al selector. No se crea cuenta ni se vincula una
reserva por email desde Android.

[Contrato Backend](../../../backend/docs/56_ANDROID_GUEST_MVP_CONTRACT_QA.md).
Servicios HTTP implementan las interfaces existentes. DTO → mapper → Domain →
hook → UI; `StayService` conserva su DTO y `useCurrentStay` aplica su mapper.
`GuestAccountService` obtiene la proyección identidad (`key/emailText/displayName`)
del modelo Account canónico; el nombre visible es el email real, sin elegir un
perfil principal ni fabricar teléfono, consentimiento, preferencias o rewards.
El resumen se valida antes del listado; no añade campos visuales.

`EXPO_PUBLIC_USE_MOCK_API=true` mantiene la preview anterior. `false` selecciona
HTTP, sin fallback. Falta de URL produce error recuperable, nunca datos fixture.
Access temporal, Profile, Rewards, Chat, Hotel, servicios, Valet, Checkout e Invoice
conservan su código/pantallas pero muestran un estado explícito de función no
disponible en modo real antes de montar sus consumidores mock. No se presentan
operaciones locales como persistidas. El selector real permite logout incluso
con lista vacía/error, usando confirmación existente.

## Sesión nativa

- Access JWT Guest solo en memoria; nunca en Domain, params o TanStack.
- SecureStore guarda únicamente `{backend, refreshToken}` bajo una clave Guest
  propia. Nunca passwords, perfiles ni reservas. [Referencia Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
  Dependencia `~57.0.4` según `expo/bundledNativeModules.json` instalado, plugin de
  backup configurado. La app ya instalada necesita incorporar este módulo;
  Expo Go compatible lo incluye. No se generó APK en este incremento.
- Cold start bloquea contenido protegido durante restore, rota refresh y consulta
  `/me`. Después vuelve al selector; no restaura una estancia por intuición.
- Requests con `credentials: omit`, Bearer Guest y timeout15s; no cookies Web.
  Un401 produce un refresh compartido entre requests concurrentes y un único
  retry. Un segundo401/refresh401 limpia credencial, sesión, contexto y caché;
  Login muestra sesión expirada. Nunca se renueva con credenciales Staff.
- Red/5xx mantiene refresh y permite retry explícito; bootstrap offline muestra
  estado/reintentar antes de montar pantallas. No hay retry automático de refresh
  tras error de red: una rotación cuya respuesta se pierda puede requerir login.
- Logout confirma, revoca en Backend y borra SecureStore/contexto/caché. Fallo de
  red muestra aviso y conserva sesión para reintentar. No se persiste password;
  el formulario lo limpia tras éxito y no entra en variables de mutation.

## Fedora: preparar Backend y Metro

Requisito: cuenta Guest ACTIVE con password existente y vínculos persistidos.
Un Guest demo sin vínculos devuelve lista vacía correctamente. Crear una reserva
con email coincidente no basta: usar los flujos de vinculación verificada C3
existentes (registro verificado sobre reservas históricas u OTP autorizado),
nunca INSERT manual sobre la base de trabajo. No se requiere Firebase/Mailpit.

1. Obtener la IP privada de Fedora con `ip -4 -brief address`. Teléfono y Fedora
   deben estar en la misma LAN controlada, sin aislamiento de clientes Wi-Fi.
2. Desde raíz, publicar el Backend con el override opt-in. Reemplazar la IP:

```bash
export PMS_ANDROID_BIND_IP=192.168.1.20
export PMS_ANDROID_BACKEND_PORT=18081
docker compose -f compose.yaml -f compose.android-local.yaml up -d --no-deps --build backend
curl --fail http://192.168.1.20:18081/actuator/health
```

El comando recompila únicamente Backend cuando se vaya a desplegar el cambio;
no se ejecutó contra los servicios de trabajo durante la implementación. Usa
las variables locales existentes de Compose. No publicar PostgreSQL. Se eligió
18081 porque 8080 pertenece a otra aplicación en el entorno revisado. El override local publica por defecto en0.0.0.0 solo al incluir expresamente
ese archivo; configurar PMS_ANDROID_BIND_IP con la IP LAN limita la interfaz.
Para acceso solo desde emulador, usar127.0.0.1.

3. Si firewalld bloquea la LAN, permitir TCP18081 (Backend) y8081 (Metro) solo
   desde el teléfono/subred de QA en la zona de esa interfaz. No abrir toda la
   red ni desactivar el firewall. Sin necesidad de cambiar reglas si ya accede.
4. Desde `frontend/pms-hotel-android`, iniciar Expo:

```bash
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:18081 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true \
npx expo start --lan --clear
```

Escanear QR con Expo Go compatible con SDK57. El APK preview anterior mantiene
su bundle/configuración previa; no se transforma en cliente real por ejecutar
Metro. Para emulador usar `http://10.0.2.2:18081`; configurar PMS_ANDROID_BIND_IP=127.0.0.1 para acceso solo local. Nunca usar localhost del teléfono.

HTTP solo se admite con `__DEV__`, IP privada y opt-in explícito. Para producción,
red pública o APK distribuido: `EXPO_PUBLIC_API_BASE_URL=https://<BACKEND_HOST>`,
`EXPO_PUBLIC_ALLOW_LOCAL_HTTP=false`. La URL debe ser un origen sin path/query/
credenciales. No se habilitó cleartext global en Android ni se introdujo proxy
externo. El flujo nativo no necesita CORS; Web continúa usando su BFF.

## Prueba desde el teléfono

1. Abrir `/actuator/health` desde el navegador del teléfono para comprobar la LAN.
2. Abrir la app en modo real e iniciar sesión con una cuenta Guest propia.
3. Verificar listado:0 → vacío,1 → autoselección aprobada,N → escoger estancia.
4. En Inicio comprobar tipo de habitación, habitación o por asignar, llegada,
   salida y UUID de reserva contra PostgreSQL. Cambiar estancia desde el drawer
   y comprobar aislamiento. No confundir UUID con confirmationCode del selector.
5. Cerrar y volver a abrir la app: restaura sesión y exige selección según0/1/N.
6. Quitar conexión: errores/offline y retry, sin fixtures. Recuperarla y reintentar.
7. Esperar expiración del access o revocar la sesión desde un entorno QA:
   renovación si sigue vigente; sesión expirada/login si fue revocada.
8. Cerrar sesión desde el drawer (o selector); relanzar: no restaura sesión.

Consulta opcional de solo lectura mediante psql conectado de forma segura a la
base elegida; `guest_email` se pide en el prompt, sin volcar tokens/passwords:

```sql
\prompt 'Correo Guest de QA: ' guest_email
SELECT r.id AS reservation_id, s.id AS stay_id, r.confirmation_code,
       s.arrival, s.departure, s.status, rt.name AS room_type, room.code AS room
FROM guest_accounts a
JOIN guest_reservation_links l ON l.guest_account_id=a.id
JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=l.property_id
JOIN room_types rt ON rt.id=s.room_type_id AND rt.property_id=l.property_id
LEFT JOIN rooms room ON room.id=s.room_id AND room.property_id=l.property_id
WHERE a.email=:'guest_email' ORDER BY s.arrival,r.confirmation_code,s.id;
```

## Validación

Pruebas focalizadas Backend incluyen HTTP TCP real y PostgreSQL17 descartable,
no mocks de persistencia. Android cubre transporte/servicios, restore/expiración,
URL, concurrencia y regresión de login/selector/navegación/Stay. Comandos y
resultados finales: AlanHandoff. No suite completa ni builds de distribución.
QA del teléfono, hardware Back, SecureStore nativo y conectividad Fedora/Android
pendientes de ejecución y confirmación PASS por Alan; estado EN_QA.

Comandos reproducibles focales (Backend desde raíz, base aislada de Compose):

```bash
docker compose -p pms-android-mvp-qa -f backend/compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress \
  -Dtest=GuestAndroidMvpIntegrationTests,GuestAccountSummaryIntegrationTests,OpenApiContractIntegrationTests test
# Al terminar, solo el proyecto descartable:
docker compose -p pms-android-mvp-qa -f backend/compose.bd2-test.yaml down -v
```

Desde `frontend/pms-hotel-android`:

```bash
npm run typecheck
npm test -- --runTestsByPath \
  tests/android-backend-mvp.test.ts tests/android-native-session.test.tsx \
  tests/android-api-config.test.ts tests/guest-auth-foundation.test.tsx \
  tests/guest-login.test.tsx tests/linked-reservations.test.tsx \
  tests/stay-contract.test.ts tests/transport.test.ts \
  tests/guest-navigation.test.tsx tests/account-stay-hub.test.tsx
```

Desde raíz: `git diff --check`. Evidencia final: Backend42 pruebas distintas PASS;
Android105 PASS, typecheck/ESLint focal/diff PASS. Ejecución Backend de este agente:
`./mvnw -B --no-transfer-progress -Dtest=GuestAndroidMvpIntegrationTests,GuestAccountSummaryIntegrationTests,OpenApiContractIntegrationTests test`
en copia temporal con JDK25/release21 y PostgreSQL17 aislado; última repetición de
GuestAndroidMvp/OpenAPI32 PASS, sin sumarla como pruebas adicionales. No ejecutó
el Compose de distribución. Backend de trabajo y servicios existentes intactos;
PostgreSQL descartable creado por el agente eliminado tras las pruebas.

## Corrección posterior — reservas nuevas e históricas confirmadas (2026-10-25)

El [contrato57](../../../backend/docs/57_GUEST_BOOKING_LINK_RECOVERY.md) agrega
reconciliación propia antes del listado y refetch por focus al volver al selector.
Recupera las confirmadas elegibles sin crearlas ni pagarlas de nuevo. Backend
013 debe estar aplicado; fuente ACCOUNT reutiliza email_verified_at persistido
para cuentas anteriores, distinta de OTP/Google. El campo reservationStatus es
aditivo y compatible. [QA compartida Firefox/Android](../../pms-hotel-web/docs/70_GUEST_RESERVATIONS_REAL.md).
No cambia UI, navegación, SecureStore ni el modo mock explícito. EN_QA manual.

## Confirmación del recorrido y referencia visible — 2026-10-26

El usuario confirmó explícitamente PASS manual del recorrido real de reservas
Web/Android. Se registra esa aceptación; las entradas previas pendientes son
históricas. No se declara una nueva prueba manual ni aceptación del ajuste visual.

Inicio/Mi estadía muestra `Reserva · confirmationCode` del detalle Guest, propagado
por DTO → mapper → Domain → hook → UI. Backend incluye el código persistido de la
reserva; IDs internos y query keys no cambian. Campo ausente/null/blanco muestra
`Reserva · Referencia no disponible`; no se usa UUID ni un código inventado.
El chip conserva diseño/colores, maxWidth100%, una línea y ellipsis. Al cambiar de
estancia muestra la referencia de la nueva query o estado de carga/neutro, nunca
la anterior. Fixtures mock llevan sus referencias existentes explícitas.

Android36 pruebas focales distintas PASS (mapper8, presentación11, HTTP17),
typecheck/ESLint focal/diff PASS. Backend4 métodos de detalle/ownership/OpenAPI
PASS. Sin suites completas, builds pesados, commit, push o PR. Ajuste visual
**EN_QA**, pendiente de confirmación del usuario; evidencia en AlanHandoff.

## Incremento posterior: Housekeeping real (COMPLETADA / PASS funcional)

[Guía41](41_HOUSEKEEPING_REAL_MVP_QA.md) habilita Servicios, Limpieza y Mis
servicios con Backend real. El bloqueo general de servicios descrito arriba
es histórico del MVP Guest; los demás módulos siguen bloqueados en modo real.
No cambia el PASS manual del recorrido Guest anterior.

El usuario confirmó crear/consultar/reabrir sin duplicados. La mejora UX Staff
de tarjeta/modal conserva PASS técnico / EN_QA visual por separado.
