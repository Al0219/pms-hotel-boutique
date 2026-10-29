# Room Service real MVP — guía QA43

**Room Service: COMPLETADA / PASS técnico y manual confirmado por el usuario.**
Rama feature/android-room-service-real-mvp, worktree `/tmp/pms-room-service`,
base main8aed2f6/PR171. Commit, push normal y PR autorizados; sin merge.
**Último ajuste de feedback en Mis servicios: PASS técnico / EN_QA visual.**
Contrato: [Backend60](../../../backend/docs/60_ROOM_SERVICE_REAL_MVP.md).

## Preparación Fedora / Firefox / Expo Go

Reutilizar Guest/Staff y la **misma BD PMS real** del recorrido Housekeeping,
con variables locales seguras PMS_DATABASE_URL/USERNAME/PASSWORD y PMS_JWT_SECRET
ya configuradas. No copiar secretos a Git ni utilizar la PostgreSQL descartable
de tests. Arrancar Backend de **este worktree**; Liquibase aplicará la migración
aditiva005-operations-005 y seis productos por propiedad existente, sin recrear BD.
El agente no arrancó este servidor ni migró la BD del hotel.

Terminales separadas, con configuración/credenciales PMS exportadas:

```bash
cd /tmp/pms-room-service/backend
SERVER_PORT=18083 ./mvnw spring-boot:run
```

```bash
cd /tmp/pms-room-service/frontend/pms-hotel-web
PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18083 \
PMS_WEB_PUBLIC_URL=http://localhost:3003 \
NEXT_PUBLIC_USE_MOCK_API=false NEXT_PUBLIC_API_BASE_URL=/api \
npx next dev -p 3003
```

```bash
cd /tmp/pms-room-service/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:18083 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --port 8083 --clear
```

Reemplazar192.168.1.20 por IP LAN Fedora; teléfono en LAN controlada, Expo Go
SDK57 compatible. Emulador10.0.2.2:18083, nunca localhost del teléfono. Conservar
acceso local de desarrollo para18083/8083 sin exponer PostgreSQL. Fuera de LAN
controlada: HTTPS y ALLOW_LOCAL_HTTP=false. Firefox privado localhost:3003.
Estos puertos evitan reemplazar las instancias Housekeeping anteriores.

## Recorrido de referencia y escenarios adicionales

1. Guest real→estancia elegible con fecha actual/futura dentro de llegada/salida→
   Servicios→Room Service. Ver cuatro categorías y los seis productos. Seleccionar
   Café, cantidad2: vista previaQ40. Probar tope5 y carrito/notas. Elegir fecha y
   hora de bebidas válida con más30min, antes de salida si es departure. Confirmar.
2. Cuenta/Mis servicios e historial deben mostrar **un** pedido con Café×2, total
   Q40 y Solicitado. Cerrar/reabrir Expo Go: misma solicitud. Reintentar envío no
   debe crear otra fila. No debe aparecer como cargo al folio ni pago.
3. Tocar pedido OPEN antes de25min: carrito/fecha/hora/notas precargados; aumentar
   Café a3 y guardar. Mismo ID, Q60, un solo pedido. Probar fechas/horarios de
   desayuno/almuerzo/cena, productos incompatibles y salida12:00 sin extensión
   por late checkout simulado. Teléfono en otra zona debe conservar hora del hotel.
4. Firefox Staff→propiedad→Room Service: misma referencia/habitación si asignada,
   productos/cantidades, Q60 y hora/notas. Iniciar pedido y confirmar; Android,
   permaneciendo en Mis servicios, debe mostrar En proceso en unos10s más red.
   Completar y confirmar: fuera de Activos, en Completados y Todos, sin editar/
   cancelar ni completar Guest. Habitación física permanece igual.
5. En otro pedido que deba cancelarse: swipe→Cancelar pedido→confirmar. Fuera de
   Activos y en Todos como Cancelado; persistente al reabrir. No borrar filas.
6. Error/offline: sin éxito ficticio, preservar carrito y permitir retry; misma
   intención conserva key mientras el formulario vive. Cambiar estancia/cuenta
   o property/session Staff no debe mostrar datos anteriores. Staff que inicia
   mientras Guest edita provoca conflicto/solo lectura, sin sobrescritura.

Escenarios adversos/visuales/red y las reglas25/30min están cubiertos técnicamente,
pero solo se marcan PASS manual cuando el usuario confirme lo probado. Housekeeping
conserva su PASS histórico; la extracción de contexto/polling tiene regresión técnica.

## Evidencia automática focal

- Backend **59 PASS** únicos: RoomServiceRealIntegrationTests11,
  RoomServiceScheduleTests5, GuestHousekeepingIntegrationTests11,
  OpenApiContractIntegrationTests23, GuestRegistrationMigrationIntegrationTests2,
  UnifiedLoginMigrationIntegrationTests4 y tres métodos de upgrade/checksums/
  reaplicación de PublicBookingReceiptSchemaUpgradeTests, StaffAuthAuditAppendOnly
  y StaffAuthAuditAttribution. Sin sumar reruns. PostgreSQL17 descartable18555.
- Android **65 PASS** en room-service-real8, room-service28, housekeeping-status-
  refresh13 y housekeeping-real16. Snapshot de precio guardado también revalidado
  al editar frente a menú modificado. No se repiten suites completas.
- Web **58 PASS**:19 nuevos BFF/mapper/page/acciones/permisos/errores y39 de
  regresión navegación/logout. Typecheck Android/Web y ESLint focal sin warnings.
- OpenAPI81 operaciones/64paths/104schemas/15tags y paridad mappings; diff-check.
- Aviso no bloqueante de act en la suite mock Room Service; no se ocultó ni se
  añadió forceExit. No builds pesados locales ni Docker E2E.

Comandos focales usados (desde cada aplicación):

```bash
npm run typecheck
# Android
npm run test -- --runTestsByPath tests/room-service-real.test.tsx tests/room-service.test.tsx tests/housekeeping-status-refresh.test.tsx tests/housekeeping-real.test.tsx
# Web
npm run test -- src/modules/room-service/components/room-service-page.test.tsx src/app/api/staff/room-service/orders/route.test.ts
npm run test -- 'src/app/(private)/staff-admin-navigation.test.tsx' 'src/app/(private)/staff-shell-reports.test.tsx' src/modules/auth/components/staff-logout-navigation.test.tsx
```

Backend: ./mvnw -B --no-transfer-progress -Dtest=… test con las clases/métodos
citados y variables exclusivas de PostgreSQL descartable; reportes/logs/manifiesto
SHA256 de originales en `/tmp/room-service-preservation/`. La migración se probó
en vacío y upgrade conservando checksums/datos y reaplicación idempotente. No se
modifican migraciones ya aplicadas ni datos de la BD del hotel.

## Límites reales

Sin administración de catálogo, asignación, pagos/folio, push/WebSockets ni cola
offline persistente. Seis productos iniciales por propiedad ya existente; nuevas
propiedades necesitan provisión explícita (sin datos mock de fallback). Sin late
checkout real autorizado, se mantiene salida normal y no se admiten almuerzo/cena
en departure. Precios existentes del pedido conservan snapshot; nuevos productos
usan precios vigentes, siempre calculados por Backend. No publicación autorizada.

## Ajuste final de Mis servicios

Un solo control «Actualizar servicios» refresca ambas queries existentes; polling
y acciones se conservan. No se muestran vacíos ni controles por servicio.
«No tienes servicios registrados» requiere ambos listados resueltos/vacíos y ningún
otro servicio local; con historial se usa el mensaje del filtro correspondiente.
Carga, refetch, error u offline no producen vacíos falsos; los datos previos siguen
visibles y se identifican como última consulta disponible cuando falla la red.

Verificación adicional: 13 casos nuevos de feedback y 81 PASS en seis archivos
(feedback, Room Service real, acciones/refresco Housekeeping, servicios y Cuenta).
Incluye filtros, cambio de estado, navegación de edición y refresh único.
Typecheck y ESLint focal PASS. Los conteos se solapan con evidencia previa; no sumar.

QA visual pendiente: abrir Mis servicios sin servicios y con historial; alternar
Activos/Completados/Todos, probar un servicio vacío y otro con datos; comprobar
control único, carga/error sin falsos vacíos y conservación de swipe/edición.
El usuario confirmó PASS manual de Room Service; no del último ajuste visual.
