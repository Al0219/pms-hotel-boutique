# Housekeeping Android real — QA MVP

**Housekeeping funcional: COMPLETADA / PASS manual del usuario.** Confirmados:
crear limpieza real en Android, consultarla desde Firefox Staff, persistencia al
cerrar/reabrir Expo Go y ausencia de duplicados. **Mejora UX Staff: PASS técnico /
EN_QA visual**; falta comprobar la nueva tarjeta/modal en Firefox. No se atribuye
ese QA visual al usuario ni pruebas manuales adicionales al agente.

Incremento separado de IMP-AND-0110 de UI, sin modificar la fila del XLSX. Rama
`feature/android-housekeeping-real-mvp`, base main a98250f con PR167 integrado.
Worktree `/tmp/pms-android-housekeeping`. Árbol original y cinco archivos locales
preservados, incluidos Expo/EAS/next-env.d.ts. Commit, push normal y PR autorizados
para este cierre; **no fusionar**.

[Contrato HTTP/persistencia y límites](../../../backend/docs/58_ANDROID_HOUSEKEEPING_REAL_MVP.md).
No dependencias nuevas. Conservar Expo SDK57 y la configuración real del MVP.

## Preparar Fedora sin reemplazar servicios de trabajo

Las pruebas automáticas usan otra BD descartable. Para QA manual, ejecutar el
Backend de **este worktree** con la configuración local segura del hotel y la
misma PostgreSQL que contiene la reserva real. No usar accidentalmente la BD de
otro proyecto en localhost5432: en el entorno inspeccionado ese puerto pertenece
a examen_postgres; PostgreSQL PMS es pms-hotel-boutique-postgres-1 y no tiene
puerto host publicado.

Conservar/exportar desde tu configuración local existente
`PMS_DATABASE_PASSWORD`, `PMS_JWT_SECRET` y las demás variables requeridas por el
Backend. No copiarlas a Git ni pegarlas en logs. En Docker local rootful puede
obtenerse solo la IP interna, sin publicar PostgreSQL:

```bash
cd /tmp/pms-android-housekeeping/backend
PMS_HK_PG_IP=$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' pms-hotel-boutique-postgres-1)
PMS_DATABASE_URL="jdbc:postgresql://${PMS_HK_PG_IP}:5432/pms_hotel" \
PMS_DATABASE_USERNAME=pms_app SERVER_PORT=18082 ./mvnw spring-boot:run
```

Usar18082 evita reemplazar el Backend anterior18081 y el otro proyecto8080.
Ajustar URL/credenciales si PostgreSQL PMS está en otro entorno. Liquibase aplica
el changeset aditivo al iniciar este Backend; no borrar volúmenes ni recrear la
BD. El agente no ejecutó este arranque ni migró la BD del hotel. Si la IP interna
no es accesible desde tu host, usar el acceso de desarrollo PMS ya configurado,
conservando la misma BD; no abrir puertos globales ni cambiar al otro proyecto.

Web de este worktree, terminal separada:

```bash
cd /tmp/pms-android-housekeeping/frontend/pms-hotel-web
PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18082 \
PMS_WEB_PUBLIC_URL=http://localhost:3002 \
NEXT_PUBLIC_USE_MOCK_API=false NEXT_PUBLIC_API_BASE_URL=/api \
npx next dev -p 3002
```

Firefox privado: `http://localhost:3002`. Así no se reemplaza Web3001 ni sus
cookies de trabajo. Iniciar sesión Staff Operations y seleccionar la propiedad
correcta; Housekeeping → tarjeta Limpiezas solicitadas → modal Solicitudes de
limpieza → Actualizar solicitudes.

Android (Expo Go compatible SDK57), terminal separada, IP LAN real de Fedora:

```bash
cd /tmp/pms-android-housekeeping/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:18082 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --clear
```

Sustituir192.168.1.20 por la IP de Fedora (`ip -brief address`). Teléfono y Fedora
en LAN controlada; comprobar primero `/actuator/health` desde el navegador del
teléfono. Firewalld debe permitir solo al teléfono/subred Backend18082 y
Metro8081. No se han cambiado reglas del firewall. Emulador:10.0.2.2:18082.
Nunca localhost del teléfono. Fuera de desarrollo local controlado, usar origen
HTTPS y `EXPO_PUBLIC_ALLOW_LOCAL_HTTP=false`.

## Recorrido funcional aceptado y reproducción / variantes pendientes

1. Android: login Guest real → elegir reserva vinculada/estancia CONFIRMED con
   estado RESERVED o IN_HOUSE. Verificar su referencia de reserva.
2. Servicios → Limpieza. Mantener FULL_CLEANING /10:00–11:00; elegir fecha dentro
   de estancia cuyo inicio tenga al menos30min de anticipación en la zona de la
   propiedad. Si hoy ya pasó el horario, elegir otro día de la estancia.
3. Escribir notas, enviar una vez y comprobar confirmación. Inicio y Mis servicios
   deben mostrar solicitud persistida y «Solicitado». No deben existir acciones
   locales de editar/cancelar/completar ni cargos.
4. Firefox Staff → propiedad de esa reserva → Housekeeping → tarjeta Limpiezas
   solicitadas → modal Solicitudes de limpieza → Actualizar solicitudes. Comparar referencia, habitación o Por asignar, fecha/franja,
   notas y estado. Verificar que no cambió el estado físico de habitación.
5. Cerrar/reabrir Android, restaurar sesión y seleccionar la estancia: la solicitud
   sigue en Mis servicios. Cambiar estancia/cuenta: no debe verse la anterior.
6. Sin red, comprobar error recuperable, sin éxito falso. Reintentar el mismo
   envío conservando formulario: mismo identificador, sin otra fila. Si se cerró
   el formulario tras una respuesta incierta, consultar Mis servicios antes de
   crear un pedido nuevo. La clave se conserva dentro del intento de formulario,
   no como cola offline persistida.
7. Probar fecha fuera de estancia/slot agotado, notas largas y acceso ajeno en un
   entorno QA con fixtures propios; no alterar reservas ajenas ni datos del hotel.
   Backend rechaza estancias CANCELLED/NO_SHOW/CHECKED_OUT.

Lectura SQL opcional en la **BD PMS** (referencia introducida por prompt, no una
reserva inventada ni IDs de otra cuenta):

```sql
\prompt 'Referencia propia de QA: ' confirmation
SELECT r.confirmation_code, room.code AS room, sr.id, sr.category, sr.service_date,
       sr.time_slot, sr.cleaning_type, sr.status, sr.due_at, sr.created_at
FROM service_requests sr
JOIN reservations r ON r.id=sr.reservation_id AND r.property_id=sr.property_id
LEFT JOIN rooms room ON room.id=sr.room_id AND room.property_id=sr.property_id
WHERE r.confirmation_code=:'confirmation' AND sr.category='HOUSEKEEPING'
ORDER BY sr.created_at DESC;
```

OPEN=Solicitado, IN_PROGRESS=En proceso, DONE=Completado, CANCELLED=Cancelado.
No se agregan herramientas HTTP para cambiar estados Staff en este alcance;
la consulta refleja cualquier transición persistida por Operations existente.

## Evidencia automática

Resultados finales: **Backend52 PASS** (7 clases, corridas focales separadas,
sin sumar repeticiones); **Android87 PASS** (6 archivos); **Web21 PASS** (3 archivos).
Todos los últimos reportes tienen0 failures/errors/skipped. Android/Web
`npm run typecheck` PASS; ESLint de16 archivos Android y12 Web con
`--max-warnings=0` PASS; `git diff --check` PASS, también whitespace de archivos
nuevos. El runner Android final salió0 tras el aviso de temporizadores/open
handles de las pruebas existentes; no se añadió forceExit ni se ocultaron avisos.

Backend: GuestHousekeepingIntegrationTests11, GuestHousekeepingScheduleTests3,
ServiceRequestServiceIntegrationTests5, StaffServiceRequestServiceIntegrationTests4,
OpenApiContractIntegrationTests23, GuestRegistrationMigrationIntegrationTests2,
UnifiedLoginMigrationIntegrationTests4. Base vacía, upgrade, checksums preservados
e idempotencia Liquibase comprobados. Los dos cambios de conteos históricos
reflejan únicamente el changeset aditivo nuevo.

Reproducción focal Android (comando ejecutado):

```bash
npm run test -- --runTestsByPath tests/housekeeping-real.test.tsx tests/housekeeping.test.tsx tests/service-requests.test.tsx tests/services.test.tsx tests/account-stay-hub.test.tsx tests/android-native-session.test.tsx
```

Web (comando ejecutado):

```bash
npm run test -- src/modules/housekeeping/components/guest-cleaning-requests.test.tsx src/modules/housekeeping/components/staff-housekeeping-page.test.tsx src/app/api/staff/housekeeping/requests/route.test.ts
```

Backend se ejecutó con PostgreSQL17 descartable en127.0.0.1:18552, JVM25/release21;
no sobre la BD del hotel. Selectores focales usados en corridas separadas con
`./mvnw -B --no-transfer-progress -Dtest=… test`, cuyos reportes actuales suman52
métodos únicos. Un primer pase detectó precisión de timestamp y audiencia
OpenAPI; ambos corregidos y revalidados, sin debilitar aserciones.
El generado real contiene71 operaciones/55 paths/92 schemas/15 tags y coincide
con mappings de aplicación; sin exclusiones nuevas.

Archivos por alcance:

- Backend: GuestHousekeepingController/Service, StaffHousekeepingRequestsController,
  extensión StaffServiceRequestService, ServiceRequest/Repository, security matcher
  Staff, OpenAPI y `005ServiceOperations/004-guest-housekeeping.yaml`/include.
- Android: HousekeepingService/HTTP/DTO/mapper/Domain/hooks y tarjetas read-only;
  formulario existente, Services launcher, guard y composiciones Cuenta/Mis servicios.
- Web: BFF Staff requests, DTO/mapper/model/service/hook y sección DataTable
  GuestCleaningRequests; composición de StaffHousekeepingPage.
- Pruebas y documentación: suites citadas, límites de contrato58, baseline39,
  AlanPlan/AlanHandoff, guías Android26/38/41 y README Housekeeping Web.

Logs, reportes resumidos, lista de archivos y manifiesto SHA-256 de originales
se conservan en `/tmp/housekeeping-mvp-preservation/`.
El usuario confirmó únicamente el recorrido funcional descrito arriba. Pendientes:
QA visual final de tarjeta/modal, responsive6/3/2, scroll y teclado/foco; variantes
manuales no confirmadas de red, sesión, fechas/zona horaria, autorización adversa
y cambios de cuenta/propiedad/estancia. No se marca PASS por cobertura automática.
CI se consultará al publicar; no fusionar antes de completar el QA visual.

## Mejora UX Staff incluida en el cierre

Sexta tarjeta «Limpiezas solicitadas» = OPEN+IN_PROGRESS de la propiedad Staff.
Modal «Solicitudes de limpieza» reutiliza DataTable/Modal, muestra también DONE y
CANCELLED y refresca contador/tabla con una sola query. No tabla fija inferior,
ni escrituras de estado. Estados de loading/vacío/error/reintento, Escape y foco
cubiertos técnicamente; QA visual no acreditado todavía.

Evidencia UX existente:21 PASS en guest-cleaning-requests.test.tsx y
staff-housekeeping-page.test.tsx; typecheck Web, ESLint focal y diff-check PASS.
No sumar esos21 a Web Housekeeping21 como si fueran pruebas únicas: son grupos
de validación de fases distintas con solapamientos. No se repiten suites para
preparar el commit/PR.
