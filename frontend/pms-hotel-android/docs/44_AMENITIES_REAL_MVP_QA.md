# Amenidades real MVP — QA44

**Amenidades real MVP: COMPLETADA / PASS técnico y manual confirmado por el usuario.**
**Ajuste posterior Mis servicios/Inicio: PASS técnico / EN_QA visual.** Rama
`feature/amenities-real-mvp`, worktree `/tmp/pms-amenities`, base main`51d6e32`.
Contrato: [Backend61](../../../backend/docs/61_AMENITIES_REAL_MVP.md).
No commit/push/PR. Los cinco archivos originales fuera del worktree se conservan.
No se arrancó el servidor contra la BD del hotel durante la implementación;
las pruebas usan PostgreSQL17 descartable sin puerto publicado.

## Comandos mínimos: tres terminales

Java21, Node22, dependencias ya instaladas; usar la **misma BD y cuentas reales**
Guest/Staff del QA Housekeeping/Room Service. En la terminal Backend, conservar
exportadas las variables PMS_DATABASE_URL/USERNAME/PASSWORD, PMS_JWT_SECRET y la
configuración local de autenticación/OTP ya existente. No copiar secretos a Git.
Liquibase aplicará006 y provisionará cinco artículos por propiedad sin recrear BD.

```bash
cd /tmp/pms-amenities/backend
SERVER_PORT=18084 ./mvnw spring-boot:run
```

```bash
cd /tmp/pms-amenities/frontend/pms-hotel-web
PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18084 \
PMS_WEB_PUBLIC_URL=http://localhost:3004 \
NEXT_PUBLIC_USE_MOCK_API=false NEXT_PUBLIC_API_BASE_URL=/api \
npx next dev -p 3004
```

```bash
cd /tmp/pms-amenities/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:18084 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --port 8084 --clear
```

Reemplazar192.168.1.20 por la IP LAN de Fedora; teléfono y Fedora en la misma LAN
controlada, Expo Go compatible con SDK57 del proyecto. Abrir el QR en Expo Go y
`http://localhost:3004/amenities` en Firefox privado (iniciar sesión Staff cuando
lo solicite). Emulador:10.0.2.2:18084; no localhost del teléfono. Permitir acceso
local de desarrollo a18084/8084 sin publicar PostgreSQL. Fuera de LAN controlada,
usar HTTPS y deshabilitar ALLOW_LOCAL_HTTP. Los puertos separan este QA de los
servidores previos. Swagger: `http://localhost:18084/swagger-ui.html`.

## Recorrido mínimo manual

1. Guest real → seleccionar estancia CONFIRMED/RESERVED o IN_HOUSE con fechas
   actuales/futuras → Servicios → Amenidades. Ver exactamente los cinco artículos
   actuales en su orden. Buscar con/sin acentos. Agregar Toallas×2 y Kit dental×1;
   verificar carrito/badge, límites1–5, eliminar mediante swipe/confirmación,
   conservar notas al cerrar/reabrir carrito. Ningún precio o cargo visible.
2. Programar con más de30min y fecha dentro de estancia; si departure, hasta12:00.
   Confirmar. Cuenta/Mis servicios muestra **una** solicitud Solicitado con líneas,
   cantidades, fecha/hora y notas. Reabrir Expo Go/login/seleccionar misma estancia:
   sigue el mismo ID persistido, sin duplicado ni cargo al folio.
3. Abrir OPEN antes de25min: carrito, notas, fecha/hora precargados. Cambiar
   cantidad/notas/horario y guardar. Mismo ID, nuevo updatedAt. Crear otra solicitud
   y cancelarla por swipe/confirmación: sale de Activos y queda Cancelado en Todos.
   No hay acción Guest de completar ni edición/cancelación de IP/DONE/CANCELLED.
4. Firefox Staff, misma propiedad → Amenidades: misma referencia/habitación o
   Por asignar, artículos×cantidades/notas/fecha/hora. Iniciar solicitud y confirmar.
   Mantener Android en Mis servicios: En proceso en unos10s más red. Completar y
   confirmar: desaparece de Activos y aparece Completado en Completados/Todos.
5. Recepción con SERVICE_REQUEST_INTAKE puede leer, sin botones de gestión;
   OPERATIONS_MANAGE puede iniciar/completar. Cambiar propiedad o cerrar sesión
   no muestra datos/confirmaciones de la anterior. ALL_PROPERTIES pide elegir hotel.
6. Probar Cuenta y Servicios/Mis servicios. Un solo Actualizar servicios; sin datos
   en las tres fuentes y ningún otro servicio, un solo No tienes servicios
   registrados. Con historial pero filtro vacío, mensaje del filtro. Asignados no
   inventa asignación. Housekeeping y Room Service conservan su funcionamiento.

## Variantes y fallos

- Fecha anterior/luego de estancia, entrega con29min, departure12:01 y late
  checkout simulado: rechazados; timezone del teléfono diferente no desplaza la
  hora del hotel.12:00 inclusive y30min exactos se prueban de forma determinista
  en AmenitiesScheduleTests para evitar carreras del reloj manual.
- Cutoff: OPEN a25min o menos no admite cambios/cancelación; entre30 y25min puede
  editar contenido manteniendo horario. Mover horario requiere nuevamente30min.
- Dos sesiones editan el mismo ID: una gana, otra409 y debe actualizar. Staff
  empieza mientras Guest edita/cancela: un solo ganador, sin sobrescribir estado.
- Modo avión al enviar: no hay aviso de éxito ni copia local; al reconectar,
  Reintentar conserva la key del mismo intento. Si hubo respuesta incierta y se
  cerró el formulario, revisar historial antes de iniciar una solicitud nueva.
- Error/vacío del catálogo real: estado y retry, sin mostrar fixture. Desconexión
  al refrescar: conserva tarjetas válidas y mensaje de última consulta; no anuncia
  vacío. Foco/foreground refresca; polling se detiene en background/al salir y
  cuando todos los registros son terminales.
- Otro Guest/estancia no puede consultar, editar o cancelar esa solicitud. Staff
  fuera de scope no puede leer/gestionar. JWT Guest no autentica endpoints Staff.
- Provisión de propiedades futuras, idempotencia, integridad de migración,
  replays, timestamps y ausencia de efectos financieros se validan automáticamente
  con fixtures aisladas, sin crear propiedades de prueba en la BD del hotel.

## Comprobación SQL opcional, solo lectura

Ejecutar en el cliente PostgreSQL local ya configurado, sin mostrar credenciales:

```sql
SELECT p.code, count(c.id) AS articulos
FROM properties p LEFT JOIN amenities_catalog c ON c.property_id=p.id
GROUP BY p.id,p.code ORDER BY p.code;

SELECT sr.id, p.code AS propiedad, r.confirmation_code, sr.status,
       a.service_date,a.delivery_time,l.item_name,l.quantity
FROM service_requests sr JOIN amenities_requests a ON a.id=sr.id
JOIN properties p ON p.id=sr.property_id
JOIN reservations r ON r.id=sr.reservation_id
JOIN amenities_request_lines l ON l.request_id=a.id
WHERE sr.category='AMENITIES' ORDER BY sr.created_at DESC,l.item_name;

SELECT action,actor_type,count(*) FROM reservation_audit_events
WHERE action LIKE 'AMENITIES_%' GROUP BY action,actor_type ORDER BY action;
```

## Validación automatizada reproducible

```bash
cd /tmp/pms-amenities
# PostgreSQL descartable; no reutiliza la BD del hotel.
docker compose -p pms-amenities-test -f backend/compose.bd2-test.yaml run --rm verify
```

```bash
cd /tmp/pms-amenities/frontend/pms-hotel-android
npm run lint
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform android
```

```bash
cd /tmp/pms-amenities/frontend/pms-hotel-web
npm run lint
npm run typecheck
npm test -- --maxWorkers=2
npm run build
```

Focalizadas: Backend AmenitiesRealIntegrationTests, AmenitiesScheduleTests,
AmenitiesMigrationIntegrationTests y OpenApiContractIntegrationTests; Android
amenities-real, amenities y guest-services-feedback; Web módulos/rutas amenities.
Upgrade prueba main51d6e32→006, checksums previos/datos HK/RS intactos y
reaplicación no-op. El resto de pruebas de migración mantiene sus comprobaciones
históricas y suma el changeset nuevo. No afirmar QA manual hasta confirmación.

## Evidencia técnica final

- Backend verify Java21/PostgreSQL17:1144 tests,0 fallos/errores/omitidos, BUILD
  SUCCESS. Incluye47 pruebas focales iniciales y upgrade específico desde main.
- Android:54 suites/527 tests PASS; focales finales2 suites/29 tests PASS, con
  un escenario adicional de respuesta retardada al cambiar cuenta/estancia.
  Lint/typecheck PASS, Expo Doctor21/21, export Android PASS. La suite completa
  emite advertencias act/handles de tests; no se usa forceExit para ocultarlas.
- Web:344 archivos/2622 tests PASS con maxWorkers2, lint/typecheck/build PASS.
  La ejecución inicial sin limitar workers tuvo timeouts de carga; el resultado
  completo con concurrencia acotada es PASS, sin modificar pruebas por timeout.
- Migraciones antiguas intactas; sus tests de upgrade conservan checksums, datos,
  append-only y no-op y suman006. OpenAPI88/70/112/15, paridad sin exclusiones.
- Hash SHA-256 de los cinco originales5/5 PASS; mismo estado Git original.
  Implementaciones Housekeeping/Room Service intactas. Sin commit/push/PR.

Logs locales en `/tmp/pms-amenities-*.log`; OpenAPI y reportes Java en
`/tmp/pms-amenities/backend/target/`. QA manual real no ejecutado por el agente.

## Ajuste UX Mis servicios / Inicio — QA visual pendiente

El usuario ya confirmó PASS técnico y manual del núcleo Amenidades. Este ajuste
solo cambia presentación y conserva los datos/reglas/transporte/sincronización
existentes. Verificar en el mismo Expo Go/worktree y Backend ya usados arriba:

1. Inicio y Servicios→Mis servicios, con solicitudes de Limpieza, Room Service
   y Amenidades: las tres cards inicialmente colapsadas deben tener igual altura,
   resumen de una línea, estado y chevron derecho. Artículos/notas largas no deben
   aumentar la altura colapsada. Revisar también texto grande y TalkBack.
2. Abrir cada chevron: detalles dentro del listado, sin navegar. Abrir otra card
   (de otro tipo o del mismo) cierra la anterior; tocar de nuevo contrae. Ver
   artículos/cantidades/notas, y precios/total únicamente en Room Service. Editar
   sigue disponible cuando corresponde y swipe conserva su confirmación.
3. Cambiar filtros y refrescar con el único control. Actualizar desde Staff una
   solicitud OPEN→IN_PROGRESS→DONE: Android se sincroniza a10s, conserva la
   expansión mientras la card siga visible y retira acciones no elegibles. Los
   registros terminales permiten consultar detalles sin edición/completar Guest.
4. Inicio: no aparecen «Mi estadía» ni «Tu reserva vinculada». Habitación, tipo,
   fechas, salida y referencia permanecen; comprobar Check-out/Ver factura y
   navegación. Los estados de carga/error/offline no se modifican.

Mismos despliegues de presentación en modo mock, sin modificar reglas de sus
acciones de edición/completado/cancelación. Las demás clases de servicio conservan
sus controles anteriores. No atribuir PASS visual hasta confirmación del usuario.

Pruebas de este ajuste: `npm run lint`, `npm run typecheck`, `npm test`:54 suites/
533 pruebas PASS. Focales: `npm test -- --runTestsByPath
tests/guest-services-feedback.test.tsx tests/account-stay-hub.test.tsx
tests/service-request-details.test.tsx`. Logs en `/tmp/pms-amenities-ux-*.log`.
Los tests completos emiten advertencias de act/handles; no se usa forceExit.
Sin commit, push ni PR.

Resultado final del ajuste: focalizadas3 suites/35 tests PASS; suite completa
54/533 PASS; lint/typecheck/export Android y `git diff --check` PASS. Cinco
archivos locales originales preservados por SHA-256. Sin cambios en la lógica
funcional de los servicios. QA visual del ajuste continúa pendiente.

## Pauta UX vigente — 2026-10-27: chevron según desbordamiento

Este ajuste actualiza la pauta visual anterior. La interacción vigente es
**tocar el cuerpo para editar**, según permisos/estado/cutoff, y **swipe para
eliminar/cancelar**, con su confirmación existente. El chevron es un objetivo
independiente: únicamente expande/contrae y aparece cuando el contenido natural
medido excede la altura colapsada. No agrega acciones dentro de la expansión.
Una sola card expandida por listado; contenido completo inline y sin límites de
líneas. Ancho y escala de fuente participan del layout nativo, no del número de
artículos ni de la longitud de strings. Las acciones mock de completado ya
existentes conservan su control exterior, independiente de la expansión.

QA visual mínimo, en los servidores/Expo Go de este worktree ya indicados:

1. Mis servicios con Housekeeping/Room Service/Amenidades: verificar altura común
   colapsada. Una solicitud corta sin notas que quepa completa no tiene chevron;
   notas/artículos/títulos que excedan el alto sí lo tienen. Probar pantalla
   estrecha/ancha, rotación y texto grande, con TalkBack. No debe haber controles
   decorativos enfocables ni texto reducido para forzarlo a caber.
2. Chevron: despliega todo el contenido dentro del listado, sin navegar a edición
   ni añadir botones. Abrir otra card cierra la anterior; volver a tocar contrae.
   Tocar el cuerpo edita cuando corresponde, incluso expandido. DONE/CANCELLED
   permiten leer el contenido sin editar ni cancelar.
3. Deslizar una card colapsada y otra expandida: se conserva la confirmación de
   eliminar/cancelar. Comprobar filtros, Actualizar servicios único y actualización
   Staff→Android10s con los estados y permisos existentes.

Validación: focales8 suites/103 pruebas PASS; completo55/538 PASS; lint/typecheck
PASS; `git diff --check` PASS. Focales medidos en
`tests/service-request-overflow.test.tsx` más regresiones Guest reales/mock.
Logs `/tmp/pms-amenities-overflow-*.log`. Las medidas nativas se inyectan en tests;
la geometría y accesibilidad en dispositivo quedan EN_QA visual. Sin commit/push/PR.

Export Android del ajuste vigente: PASS. Cinco originales SHA-2565/5 intactos.
