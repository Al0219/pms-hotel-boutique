# Reservas Guest reales compartidas Web / Android — COMPLETADA / PASS

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

[Contrato Backend57](../../../backend/docs/57_GUEST_BOOKING_LINK_RECOVERY.md).
Corrección autorizada2026-10-25, feature/android-backend-mvp. Cambios locales y
MVP Android anterior preservados. Sin commit/push/PR. QA manual del MVP confirmado por el usuario.

## Qué cambia

El BFF de creación sigue admitiendo reservas anónimas y conserva key/payload.
Si hay sesión Guest, después del201 intenta recuperar los vínculos compatibles
mediante POST propio autenticado. El201 es definitivo aunque ese paso falle.
No pide accountId/email/reservationId al navegador para vincular.

Mis reservas reconcilia y obtiene el listado Backend real, agrupado por reserva
con N estancias. Muestra confirmationCode, propiedad, estado de reserva y de cada
estancia, fechas/habitación y detalle real de tipo de habitación. Reutiliza
estilos/componentes existentes; no muestra historial provisional, política ni
ocupantes sin fuente Backend. Mock sigue disponible solo con flag explícito.

Service devuelve DTO → mapper valida/agrupa a Domain → hook account-scoped → UI.
La identidad HTTP permanece en cookie HttpOnly/BFF. No se pasan tokens a React,
query keys, storage o params. Detalle y listado carecen de selección de cuenta.
Reconcile exige Origin de PMS_WEB_PUBLIC_URL. Un401 puede renovar Guest una vez;
fallo401 definitivo actualiza el controlador de sesión. Error/red muestra retry,
nunca fixtures. Queries refrescan al volver/focus y tras confirmar/recuperar.

## Misma base de datos: requisito operativo

La instancia Web inspeccionada usa http://backend:8080 y ese Backend usa
jdbc:postgresql://postgres:5432/pms_hotel. La URL Android del teléfono no pudo
verificarse desde el workspace: solo existe .env.example sin URL real y no había
Metro en ejecución. No se debe afirmar que un APK previo ya usa esta instancia.

Primero arrancar **Backend y Web con estos cambios**. Backend debe aplicar013 y
exponer las rutas56/57. Los contenedores ya ejecutándose no reciben el código
por iniciar Metro; esta tarea no hizo despliegue/rebuild ni modificó su base.
Reutilizar la configuración local de Compose; para publicar el mismo Backend
al teléfono, desde raíz:

```bash
export PMS_ANDROID_BIND_IP=192.168.1.20  # reemplazar por la IP privada de Fedora
export PMS_ANDROID_BACKEND_PORT=18081
# Al desplegar, usar la configuración Compose existente más este override:
# docker compose -f compose.yaml -f compose.android-local.yaml up -d --build backend web
```

El comando de despliegue se muestra para el operador y no se ejecutó en esta
tarea, que excluye builds pesados. No copiar reservas a otra base ni insertar
vínculos manualmente. No publicar PostgreSQL. Mantener los secretos locales
existentes y PMS_WEB_PUBLIC_URL coincidente con el origen Firefox (localhost3001
en la configuración actual).

Desde frontend/pms-hotel-android, en LAN local controlada:

```bash
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:18081 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true \
npx expo start --lan --clear
```

Para emulador,10.0.2.2:18081. Fuera de desarrollo local, HTTPS y
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=false. Un APK preview anterior conserva sus flags;
usar Expo Go compatible o una app que incluya los cambios/módulos. No usar
localhost del teléfono, otro Backend8080, ni el perfil mock de EAS como modo real.

## Comprobación mínima: reserva existente

1. En Firefox iniciar sesión con la cuenta Guest legítima. Abrir `/mis-reservas`.
   Automáticamente POST reconcile → GET list. La cuenta verificada recupera sus
   reservas CONFIRMED por email del titular, sin volver a crear/pagar. En Network,
   esperar204 y200; si404/503, comprobar Backend/migración/versiones/configuración.
2. La última reserva observada era `[referencia local omitida]`, CONFIRMED sin vínculo y con email
   compatible con una cuenta verificada anterior. Es un caso diagnóstico; el
   código exacto del usuario no fue confirmado. Comprobar su propio código.
3. Abrir su reserva/estancia y anotar UUID de reserva, UUID estancia, fechas y
   habitación/tipo. No tomar un profileId o email como autorización.
4. Iniciar sesión en Android con la misma cuenta y contra el mismo Backend.
   Volver al selector refresca y recupera vínculos. Una estancia puede
   autoseleccionarse; con varias, escoger. Comparar los mismos UUIDs/datos.

## Reserva nueva y reintentos

1. Con Guest autenticado, crear desde Web una reserva usando el **mismo correo
   verificado** como titular; no se fuerza ese email si se reserva para otra persona.
2. Tras confirmación, abrir Mis reservas: debe aparecer el confirmationCode real.
   En Android volver al selector: debe aparecer la misma reserva/estancia.
3. F5/focus/repetir consulta debe conservar un vínculo. No volver a pagar para
   recuperar visibilidad. Errores del vínculo conservan201 y se recuperan en la
   próxima consulta/retry.
4. Cuenta distinta no ve ni toma la reserva. Email diferente no la vincula. Un
   vínculo previo de otra cuenta o profile owner ajeno se conserva sin transferencia.
5. Sin sesión se puede reservar como antes; no se inventa una cuenta. Tras login
   legítimo, la recuperación aplica las mismas reglas de verificación/propiedad.

Contraste opcional en psql **solo lectura**, usando conexión local segura:

```sql
\prompt 'Código de confirmación propio: ' booking_code
SELECT r.id, r.confirmation_code, r.status, r.property_id, r.booking_guest_id,
       s.id AS stay_id, s.arrival, s.departure, s.status AS stay_status,
       l.guest_account_id IS NOT NULL AS linked,
       (SELECT count(*) FROM folio_movements m JOIN folios f ON f.id=m.folio_id
        WHERE f.reservation_id=r.id AND m.kind='PAYMENT') AS payment_count
FROM reservations r
JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=r.property_id
LEFT JOIN guest_reservation_links l ON l.reservation_id=r.id AND l.property_id=r.property_id
WHERE r.confirmation_code=:'booking_code';
```

N filas pueden ser N estancias de **una** reserva. No equivale a pagos duplicados.
No guardar passwords, cookies, tokens, OTP ni credenciales de QA en capturas/docs.

## Evidencia automatizada

Pruebas focales de creación/replay/vinculación, no transferencia, concurrencia,
auditoría fallida/rollback solo de vínculo, migración limpia/upgrade/checksums,
listado/detalle BFF/UI, modo mock, refresh e invalidación. Comandos y resultados
finales en backend/docs/AlanHandoff.md. PostgreSQL de pruebas aislado; no Docker
E2E, suite completa o builds. Firefox físico, APK/Expo del teléfono y comparación
manual final siguen pendientes; no se marca COMPLETADA.

Resultados finales: Backend43, Web72 y Android25 pruebas distintas PASS, sin sumar
repeticiones. Typecheck Web/Android, ESLint focal y diff-check PASS. QA física sigue
pendiente. OpenAPI68 operaciones/53 paths/89 schemas. Comandos ejecutados:

```text
# En copia temporal Backend y contra PostgreSQL QA descartable; ./mvnw -B --no-transfer-progress:
-Dtest=GuestReservationRecoveryIntegrationTests,GuestRegistrationMigrationIntegrationTests,UnifiedLoginMigrationIntegrationTests,PublicBookingReceiptSchemaUpgradeTests,OpenApiContractIntegrationTests test
-Dtest=GuestReservationRecoveryIntegrationTests,StaffAuthAuditAttributionIntegrationTests#upgradeKeepsLegacyRowsChecksumsAndTriggerAndReapplicationIsNoOp,StaffAuthAuditAppendOnlyIntegrationTests#upgradePreservesLegacyDataAndChecksumsAndReapplicationIsNoOp,PublicBookingServiceIntegrationTests#happyPathPersistsOneConfirmedReservationAndTheApprovedSnapshot+concurrentIdenticalKeyWaitsThenReplaysWithoutAnotherPayment test
-Dtest=GuestRegistrationIntegrationTests#oneAndManyHistoricalMatchesIgnoreStatusAndUseOneLinkPerReservation+foreignLinkIsNeverTransferred+manualOtpAndAutoLinkCanRaceWithoutDuplicatingOrTransferringOwnership test
```

Web (desde frontend/pms-hotel-web):

```bash
npm run typecheck
npm test -- src/modules/account/components/real-guest-reservations.test.tsx \
  src/lib/bff/guest-reservations.test.ts src/app/api/v1/public/bookings/route.test.ts \
  src/modules/checkout/components/public-real-checkout.test.tsx \
  src/modules/account/components/reservation-link.test.tsx \
  src/modules/account/mappers/public-account-contracts.test.ts
```

Android (desde frontend/pms-hotel-android):

```bash
npm run typecheck
npm test -- --runTestsByPath tests/android-backend-mvp.test.ts \
  tests/linked-reservations.test.tsx tests/android-reservations-focus.test.tsx
```

Los comandos Backend deben apuntar exclusivamente a PostgreSQL descartable:
los fixtures de integración escriben datos sintéticos. Nunca usar la base de
trabajo para ejecutar esos tests. No se guardan credenciales QA ni tokens.

## Aceptación manual del recorrido — confirmación recibida 2026-10-26

El usuario confirmó PASS manual del recorrido real de reservas Web/Android.
Este registro sustituye el pendiente de QA de ese recorrido, sin atribuir
pruebas manuales adicionales. El ajuste visual posterior de la referencia en
Inicio Android permanece EN_QA pendiente de confirmación; no reabre ni amplía
la aceptación del recorrido ni modifica código Web.
