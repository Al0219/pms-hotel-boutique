# Housekeeping real actions — guía QA42

## Corrección final: refresco de estados Android — COMPLETADA / PASS

Rama `fix/android-housekeeping-status-refresh`, worktree
`/tmp/pms-housekeeping-refresh`, base main566c7f0/PR170 fusionado.
El recorrido Housekeeping previo tiene PASS técnico/manual confirmado por el
usuario. **Este refresco automático tiene PASS técnico (54 pruebas) y PASS manual
confirmado explícitamente por el usuario.** No se atribuyen pruebas manuales
adicionales al agente ni se extrapola la confirmación a otros módulos.

Único cambio funcional: useHousekeepingRequests mantiene su query key
`['guest-housekeeping', accountId, reservationId, reservationStayId]` y activa
refetchInterval de10s cuando hay sesión Guest vigente, estancia seleccionada,
modo real, pantalla enfocada, AppState active y alguna OPEN/IN_PROGRESS.
Se pausa durante la consulta compartida y se reinicia desde su resultado, evitando
cadencias duplicadas entre vistas de la misma query. Sin retries automáticos:
error de red mantiene el último dato en cache con estado de error, y el siguiente
intento queda en la cadencia normal; no se inventan estados.

Al finalizar/cancelar todas, perder foco, cambiar contexto o cerrar sesión, el
polling se detiene. useFocusEffect conserva la lectura al enfocar; al regresar
a primer plano vuelve a consultar inmediatamente solo si está enfocada. Botón
manual y presentación/filtros existentes intactos. Refrescos de fondo no ponen
la query nuevamente en isPending ni muestran loaders completos. No store nuevo,
provider session-only, focusManager global ni sincronización de otros servicios.
AppState listener y timers de QueryObserver se limpian al desmontar. Mock no
instala este listener ni ejecuta consultas/polling reales.

Verificación focal: **54 PASS** en housekeeping-status-refresh (13 nuevas),
housekeeping-real-actions, housekeeping-real y housekeeping (41 de regresión).
Typecheck Android, ESLint focal --max-warnings=0 y git diff --check PASS.
Sin suites completas/builds; Backend/Web/PostgreSQL/contratos/endpoints/mocks
funcionales sin cambios. Cinco archivos originales intactos por SHA256; logs en
`/tmp/housekeeping-refresh-preservation/`. Cierre autorizado: commit
`fix(android): auto-refresh housekeeping request status`, push normal y PR hacia
main. No fusionar; revisar conflictos y los cuatro workflows remotos. En este
cierre solo se revisan diff/preservación y whitespace; no se repiten las54
pruebas ni builds tras una actualización exclusivamente documental.

Guía de reproducción (refresco con PASS manual confirmado):

1. Conservar Backend y Firefox Staff actuales. Ejecutar Expo Go desde este
   worktree con EXPO_PUBLIC_USE_MOCK_API=false y la URL Backend ya configurada
   (IP LAN de Fedora o HTTPS, nunca localhost del teléfono). Si se usa HTTP LAN
   controlado, mantener EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true. Recargar Metro/Expo.
2. Guest con estancia seleccionada y solicitud OPEN: permanecer en Cuenta→Mis
   servicios; Firefox Staff Iniciar limpieza. Sin navegar ni tocar Actualizar,
   debe mostrar En proceso dentro de unos10s más latencia de red. Repetir en
   Servicios→Mis servicios.
3. Staff completar: desaparece de Activos, aparece en Completados y sigue en
   Todos, sin editar/cancelar. No reiniciar Expo ni navegar fuera para actualizar.
4. Enviar Android a segundo plano, cambiar estado desde Staff y volver: consulta
   inmediata. Dejar todas finalizadas, salir de pantalla, cambiar estancia/cuenta
   o cerrar sesión: no debe seguir consultando ese contexto ni filtrar tarjetas.
5. Desconectar/reconectar red: sin éxito ficticio ni ráfaga de reintentos; volver
   a primer plano o pulsar Actualizar permite recuperar la lectura real.

Comandos ejecutados desde frontend/pms-hotel-android:

```bash
npm run test -- --runTestsByPath tests/housekeeping-status-refresh.test.tsx tests/housekeeping-real-actions.test.tsx tests/housekeeping-real.test.tsx tests/housekeeping.test.tsx
npm run typecheck
npx eslint --max-warnings=0 src/modules/services/housekeeping/presentation/hooks/useHousekeepingRequests.ts tests/housekeeping-status-refresh.test.tsx tests/housekeeping-real-actions.test.tsx
```

Los apartados siguientes conservan la evidencia histórica del incremento anterior;
sus restricciones de no polling quedan ampliadas únicamente para Housekeeping
visible con solicitudes activas según este ajuste autorizado.

Compatibilidad: main859ef21 (PR169) integrado mediante merge normal; las
aserciones de privacidad Guest se conservan junto a timezone requerido.

**EN_QA; PASS técnico.** El usuario ya confirmó creación Android→PostgreSQL→Staff,
persistencia al reabrir y ausencia de duplicados en PR168. Edición/cancelación/inicio/finalización y restricciones tienen PASS manual
confirmado; horarios ampliados y QA visual no acreditado siguen pendientes.

## Ampliación de franjas y cierre de acciones — 2026-10-26

**Acciones reales: PASS manual confirmado por el usuario**: edición Android,
cancelación por swipe, inicio/finalización Firefox Staff, persistencia,
actualización de estados y restricciones. **Horarios/fechas ampliados: EN_QA
manual**, con evidencia técnica focal registrada abajo. No se extrapola el PASS.

Cinco franjas autorizadas para este MVP: `09:00–10:00`, `10:00–11:00`,
`11:00–12:00`, `12:00–13:00`, `14:00–15:00`. No constituyen catálogo
administrativo definitivo. Tipo real único: `FULL_CLEANING`.
Default10:00–11:00 cuando es válido; si no, primera franja válida. Fecha futura
dentro de estancia conserva la elección válida; al invalidarse usa otra o informa
sin disponibilidad. Checkout: fin máximo12:00; otros días admiten las cinco.

Backend whitelist y parsing de inicio/fin; due_at se calcula desde la franja y
properties.timezone, creación/nueva programación con30min. Cutoff25min contra
la programación persistida antes de editar/cancelar. Cambiar franja conserva ID
y key, recalcula due_at y no duplica solicitud/auditoría. Concurrencia/aislamiento
se conservan. El esquema existente ya admite los valores: sin migraciones nuevas.
GuestStay añade timezone de la propiedad autorizada para Android. Helpers de
programación admiten zona IANA explícita; mock conserva su cálculo anterior.
Sin metadata válida la UI no habilita opciones calculadas con la zona del teléfono.
Servidor es autoridad definitiva; no automatiza habitaciones ni cambia ciclo Staff.

Publicación del incremento completo autorizada: commit convencional, push normal,
PR hacia main, sin merge. Cinco archivos originales ajenos preservados por hash.

Contrato: [Backend59](../../../backend/docs/59_HOUSEKEEPING_REAL_ACTIONS_MVP.md).
Branch `feature/housekeeping-real-actions-mvp`, worktree `/tmp/pms-housekeeping-actions`,
base main03e476e. Cinco cambios originales preservados por hashes; commit/push/PR ahora autorizados, no merge.

## Fedora, Firefox y Expo Go

Reutilizar la configuración segura y **la misma BD PMS real** del QA anterior.
Arrancar Backend y Web desde este worktree; no desde el anterior. No tocar
volúmenes, servicios ajenos ni credenciales, ni usar la PostgreSQL descartable
de pruebas automáticas. Variables y acceso a BD: [guía41](41_HOUSEKEEPING_REAL_MVP_QA.md#preparar-fedora-sin-reemplazar-servicios-de-trabajo),
sustituyendo su worktree por `/tmp/pms-housekeeping-actions`. Este incremento no
requiere migración nueva. Conservar/exportar secretos existentes fuera de Git.

En terminales separadas (Backend con conexión PMS y secretos ya exportados):

```bash
cd /tmp/pms-housekeeping-actions/backend
SERVER_PORT=18082 ./mvnw spring-boot:run
```

```bash
cd /tmp/pms-housekeeping-actions/frontend/pms-hotel-web
PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18082 \
PMS_WEB_PUBLIC_URL=http://localhost:3002 \
NEXT_PUBLIC_USE_MOCK_API=false NEXT_PUBLIC_API_BASE_URL=/api \
npx next dev -p 3002
```

```bash
cd /tmp/pms-housekeeping-actions/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:18082 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --clear
```

Sustituir IP por la LAN de Fedora; teléfono en red local controlada, Expo Go
compatible SDK57. Emulador:10.0.2.2; nunca localhost del teléfono. Fuera de LAN
controlada usar HTTPS y ALLOW_LOCAL_HTTP=false. Reutilizar reglas de acceso LAN
existentes para18082/8081; no abrir PostgreSQL. Firefox privado localhost:3002.

## Recorrido de acciones con PASS manual confirmado

1. Android: Guest real→misma estancia autorizada→crear solicitud para un día de
   la estancia,10:00–11:00, con más30min de anticipación. Mis servicios debe
   mostrar una sola tarjeta Solicitado. Tocar: datos precargados, cambiar notas
   y Guardar cambios. Solo tras éxito debe confirmar; actualizar/reabrir verifica
   las notas persistidas, mismo ID y ninguna solicitud extra.
2. Sobre una OPEN con más25min: swipe→Cancelar solicitud. Volver sin confirmar
   no cambia nada; confirmar la lleva a Cancelado, fuera de Activos y presente
   en Todos. Cerrar/reabrir mantiene cancelación. No aparece Completar Guest.
3. Otra OPEN: Firefox Staff Operations→propiedad→/housekeeping→Limpiezas solicitadas.
   Iniciar limpieza y confirmar: En proceso. Android actualizar/volver refleja
   ese estado y no admite editar/cancelar. Staff Marcar como completada y
   confirmar: Completado; contador disminuye y Android muestra Completado.
   Comparar antes/después el estado físico de habitación: no debe cambiar.
4. Desconectar red durante edición/cancelación: no éxito falso, datos conservados
   y reintento/actualización disponibles. Si Staff inicia mientras Guest edita,
   Guest recibe conflicto/estado actualizado sin sobrescribir ni duplicar.
5. Cambiar estancia/cuenta Android y propiedad/sesión Staff: no aparecen registros
   del contexto anterior. INTAKE sin OPS no puede transicionar por API; backend
   rechaza solicitudes ajenas y versiones obsoletas. Cutoff exacto25min rechaza
   cambios, pero cancelación repetida ya aplicada no agrega auditoría.
6. Revisar Firefox modal/confirmación con teclado/Escape/foco y móvil/tablet;
   actualizar tabla/contador, filas DONE/CANCELLED solo lectura. Mocks true deben
   conservar su comportamiento previo y no llamar a mutations reales.

No adelantar reloj del teléfono para probar permiso servidor; para límites
controlados usar fixtures de tests en BD descartable. No editar datos reales
manualmente. El reloj local solo anticipa deshabilitado UI; Backend decide.

## QA manual mínimo pendiente de programación

- Hora de propiedad08:00:09:00 válida y default10:00;08:45:09:00 deshabilitada.
- Día no checkout13:00:14:00 válida; mañana dentro de estancia muestra las cinco.
- Cambiar fecha conserva franja válida; checkout deshabilita12:00 y14:00; después
  de salida no seleccionable. Si no queda franja, CTA deshabilitado/aviso claro.
- Editar09:00→14:00, cerrar/reabrir y consultar Staff: misma solicitud, nueva
  franja persistida; cutoff sigue tomando el inicio anterior para autorizar.
- Repetir con teléfono en zona distinta a propiedad; fechas y franjas deben
  mantener la zona del hotel. No alterar reloj servidor ni datos reales a mano.

## Evidencia automática focal

- Backend **55 PASS**: HousekeepingRealActionsIntegrationTests11, HousekeepingSlotScheduleTests5,
  HousekeepingActionRuleTests2, GuestHousekeepingIntegrationTests11,
  GuestHousekeepingScheduleTests3, OpenApiContractIntegrationTests23.
  PostgreSQL17 descartable18554, esquema aislado, sin usar BD del hotel.
- Android **78 PASS**: housekeeping-real-scheduling, housekeeping-real-actions, housekeeping-real,
  housekeeping y service-requests (regresión de helpers compartidos). HTTP real/versión, swipe/confirmación, edición/reintento/offline,
  carrera Staff, refresco, filtros y mocks.
- Web previo **50 PASS**; regresión afectada de franjas **22 PASS** (no sumar): tarjeta/modal/acciones/query compartida, composición Staff,
  BFF lectura y BFF transición (cookies/origen/scope/body/errores/proyección).
- Typecheck Android/Web, ESLint focal sin warnings y git diff --check.
- Sin suites completas, builds pesados ni Docker E2E. No QA manual del agente.

Comandos ejecutados desde cada app:

```bash
npm run typecheck
# Android
npm run test -- --runTestsByPath tests/housekeeping-real-scheduling.test.tsx tests/housekeeping-real-actions.test.tsx tests/housekeeping-real.test.tsx tests/housekeeping.test.tsx tests/service-requests.test.tsx
# Web
npm run test -- src/modules/housekeeping/components/guest-cleaning-requests.test.tsx src/modules/housekeeping/components/staff-housekeeping-page.test.tsx src/app/api/staff/housekeeping/requests/route.test.ts 'src/app/api/staff/housekeeping/requests/[requestId]/status/route.test.ts'
```

Backend (con variables apuntando exclusivamente a PostgreSQL descartable):

```bash
./mvnw -B --no-transfer-progress -Dtest=HousekeepingRealActionsIntegrationTests,HousekeepingActionRuleTests,HousekeepingSlotScheduleTests,GuestHousekeepingIntegrationTests,GuestHousekeepingScheduleTests,OpenApiContractIntegrationTests test
```

ESLint: solo los .ts/.tsx modificados/nuevos de cada app, --max-warnings=0.
Logs/manifiesto de preservación: `/tmp/housekeeping-actions-preservation/`.
Limitaciones: cinco franjas MVP y FULL_CLEANING, sin cola offline persistente ni acciones Staff fuera
del ciclo autorizado. No borrar filas, Guest DONE, Room Service ni nuevas dependencias.
