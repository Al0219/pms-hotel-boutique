# Valet real MVP — QA45

**QA/DoD: PASS.** PASS visual Web Staff y funcional11/11 confirmados por el usuario;
pendientes específicos cerrados con evidencia automatizada según autorización
posterior. Ver «Cierre de pendientes específicos» al final. No se declara15/15 manual.
Integración a main por PR; sin autorización de merge.
Worktree `/tmp/pms-valet`, rama `feature/valet-real-mvp`, base main `909a12c`.
Contrato: [Backend62](../../../backend/docs/62_VALET_REAL_MVP_DECISIONS.md).
Sin commit/push/PR. El agente no arrancó contra la BD del hotel; las pruebas
usan PostgreSQL17 descartable sin puerto publicado.

## Preparación: tres terminales

Java21/Node22 y las mismas cuentas/BD del QA Amenidades. Guest con reserva
CONFIRMED y estancia propia RESERVED/IN_HOUSE con fechas actuales/futuras;
Staff OPERATIONS_MANAGE de la misma propiedad y sesión Recepción con
SERVICE_REQUEST_INTAKE. Conservar variables locales PMS_DATABASE_URL/USERNAME/
PASSWORD, PMS_JWT_SECRET y configuración OTP existentes; no copiar secretos.
Liquibase aplicará007 y008 aditivas, sin recrear BD. Revisar primero el preflight de contrato62 si ya existen vehículos007. Si faltan dependencias, `npm ci` en cada
frontend usando su lockfile, sin cambiar versiones.

```bash
cd /tmp/pms-valet/backend
SERVER_PORT=18085 ./mvnw spring-boot:run
```

```bash
cd /tmp/pms-valet/frontend/pms-hotel-web
PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18085 \
PMS_WEB_PUBLIC_URL=http://localhost:3005 \
NEXT_PUBLIC_USE_MOCK_API=false NEXT_PUBLIC_API_BASE_URL=/api \
npx next dev -p 3005
```

```bash
cd /tmp/pms-valet/frontend/pms-hotel-android
EXPO_PUBLIC_USE_MOCK_API=false \
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:18085 \
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true npx expo start --lan --port 8085 --clear
```

Reemplazar192.168.1.20 por la IP LAN de Fedora; teléfono en la misma LAN de QA,
Expo Go compatible SDK57. Emulador:10.0.2.2:18085. Firefox:
`http://localhost:3005/parking-valet`; Swagger:18085/swagger-ui.html.
No usar reloj simulado para reglas Backend: prevalecen reloj/tz del servidor.

## Recorrido y aceptación

1. Android real → Valet → Registrar: Toyota/Yaris, P/123abc, Azul, En parqueo.
   Debe normalizar123ABC y conservar datos/ID al reiniciar sesión y seleccionar
   misma estancia. Duplicar con casing distinto falla; C123ABC es otra placa.
   Requeridos vacíos, placa inválida y límites40/40/30 fallan.
2. Editar sin solicitudes conserva ID; ubicación no es editable. Solicitar abre
   selector→configuración con fecha/hora; elegir vehículo no crea solicitud.
   Programar más de30min, dentro de estancia, departure hasta12:00.
3. Confirmar: una tarjeta Valet Solicitado en Cuenta/Mis servicios y Servicios/
   Mis servicios; vehículo sigue PARKED. No hay check Guest de completar ni
   acción Guest para retornar. Reabrir conserva solicitud desde PostgreSQL.
4. Máximo una OPEN/IN_PROGRESS por vehículo; editar datos del vehículo se bloquea
   mientras está activa. Otro vehículo admite su propia solicitud. Desde tarjeta
   OPEN antes del cutoff25min se edita horario con mismo requestId, vehículo fijo
   y nueva versión. Reprogramación vuelve a requerir30min.
5. Cancelar por swipe/confirmación conserva historial CANCELLED y ubicación
   PARKED; permite luego editar vehículo y crear otra solicitud. Cambiar sus
   datos no reescribe snapshot de solicitudes anteriores.
6. Staff misma propiedad: buscar placa/marca/modelo/reserva/habitación; filtrar
   fecha/estado y limpiar filtros. Iniciar con confirmación → IN_PROGRESS/PARKED.
   Android en Mis servicios refleja En proceso automáticamente en unos10s+red.
7. **Confirmar entrega al huésped** solo tras entregar físicamente: DONE y
   WITH_GUEST juntos. Android quita Activos, conserva Completados/Todos. No
   permite nueva solicitud mientras ubicación WITH_GUEST.
8. Staff **Confirmar retorno al parqueo** tras recibir físicamente: PARKED,
   solicitud anterior sigue DONE. Actualizar Valet Android o volver a foco para
   consultar ubicación; ahora permite otra solicitud. Retorno no reabre historia.
9. Recepción INTAKE lee sin acciones. Sin permisos no consulta; ALL_PROPERTIES
   pide elegir hotel. Cambio de propiedad/logout elimina datos/diálogos previos.
10. Se preservan Housekeeping/Room Service/Amenidades, cards, expansión/swipe/
    filtros y vacío coordinado de cuatro fuentes. Error/offline no anuncia vacío
    falso. Traslados reales muestran no disponible; sin reserva mock ni tarifa.

## Fallos, límites y concurrencia

- Dos submits de sesiones distintas al mismo vehículo:201/409, una activa; mismo
  intent retry devuelve mismo ID/auditoría única. No probar solo doble tap bloqueado.
- Staff start vs Guest edit/cancel: un ganador; otro409 y actualizar. El draft
  conserva su versión original aunque llegue refetch Staff. Dos entregas producen
  una transición; retry de retorno viejo no cambia custodia de un ciclo posterior.
- Modo avión al enviar: sin éxito ni copia local. Retry del mismo intento conserva
  key. Si se cerró con respuesta incierta, consultar Mis servicios antes de crear.
- Cutoff25min exactos o menos bloquea editar/cancelar;29min de anticipación,
  fecha fuera de estancia y departure12:01 fallan. No late checkout simulado.
  Timezone distinta del teléfono no desplaza la hora del hotel.
- Otro Guest/estancia no lee/muta; Staff fuera de scope tampoco. Guest Bearer no
  autentica Staff. Background/salir detiene polling; foco/foreground refrescan.

## SQL opcional, solo lectura

Usar cliente PostgreSQL ya configurado; reemplazar referencia por la del QA:

```sql
SELECT sr.id,r.confirmation_code,sr.status,v.location,q.active,
       q.service_date,q.delivery_time,q.vehicle_snapshot
FROM valet_requests q JOIN service_requests sr ON sr.id=q.id
JOIN reservations r ON r.id=sr.reservation_id
JOIN valet_vehicles v ON v.id=q.vehicle_id
WHERE r.confirmation_code='<referencia real de QA>' ORDER BY sr.created_at;

SELECT vehicle_id,count(*) FROM valet_requests WHERE active
GROUP BY vehicle_id HAVING count(*)>1;
-- Cero filas.
```

Verificar audit de REQUEST_STARTED/COMPLETED, VALET_DELIVERED/RETURNED y acciones
Guest sobre IDs del QA, sin mostrar tokens, cookies o datos de otros huéspedes.
No ejecutar UPDATE manual en datos reales. Los tests fuerzan rollback de entrega
para demostrar atomicidad de solicitud/vehículo/auditoría.

## Pruebas técnicas reproducibles

Desde raíz: `docker compose -p pms-valet-qa -f backend/compose.bd2-test.yaml run --rm verify`.
Focal Backend: `mvn -B --no-transfer-progress -Dtest=ValetRealIntegrationTests,ValetMigrationIntegrationTests,OpenApiContractIntegrationTests test`
dentro del servicio verify. Android: `npm run typecheck`, `npm run lint`,
`npm test -- --watch=false`, `npx expo export --platform android`.
Web: `npm run typecheck`, `npm run lint`, `npm test -- --maxWorkers=2`, `npm run build`.
Raíz: `git diff --check`. Evidencia `/tmp/pms-valet-*.log`, backend/target/
surefire-reports y openapi-generated.json. Resultados finales en AlanHandoff.

Registrar PASS/FAIL por paso y entorno; solo el usuario confirma QA manual PASS.

## Hallazgos del QA manual — corrección de navegación y composición Staff

**Estado: EN_QA.** Ambos hallazgos fueron reportados por el usuario; sus
correcciones técnicas no constituyen PASS manual. No commit/push/PR.

### H1 — Valet Android termina en selección de estadías

**Causa raíz comprobada en código:** `app/(guest)/valet.tsx` ya elegía
RealValetScreen en HTTP, pero `GuestRouteGuard` omitía `/valet` de su allowlist
real. Con contexto activo mostraba la pantalla genérica «Función no disponible»,
cuyo botón Volver conduce al selector. Sin contexto, la redirección al selector
sí correspondía, pero no conservaba el destino: LinkedReservationsScreen enviaba
siempre a `/account`, tanto en selección automática como explícita/cambio.
Los tests anteriores de Valet montaban la pantalla sin el guard global y no
cubrían esta combinación de ruta/layout/contexto.

**Corrección:** habilitar exclusivamente `/valet` en el guard real y conservar
`returnTo=/valet` al pasar por login y selección. La continuación acepta solo
esa ruta interna literal; ignora URLs externas, arrays y rutas arbitrarias.
La selección sin continuación conserva `/account` como destino habitual.

`ActiveReservationContextProvider` continúa en memoria, sin inventar ni elegir
una estancia fuera de la lista vinculada. `useCurrentStay` continúa deshabilitado
sin contexto y usa HttpStayService en real/MockStayService en mock; la identidad
de la respuesta HTTP debe coincidir con reservation/stay seleccionados.
GuestAuthSessionProvider mantiene restore nativo antes de montar hijos y limpieza
al expirar; el guard mantiene autenticación y limpieza del contexto sin sesión.
El layout Guest se remonta por stay y los queries de Valet incluyen cuenta/
reserva/stay. No se cambiaron estos mecanismos para evitar el selector.

**Regresión:** `tests/valet-navigation-real.test.tsx` usa Expo Router real, el
entrypoint Valet, GuestRouteGuard, layout Guest, providers, login y selector.
Cubre entrada directa con contexto, selección múltiple y automática, login sin
sesión, cambio confirmado de estancia y vuelta a Valet, respuestas tardías del
contexto anterior, política mock y rechazo de continuaciones no permitidas.
Se mantienen las regresiones de sesión nativa, linked reservations y Valet real.

**Repetir manualmente:**

1. Iniciar sesión real, seleccionar una estancia y pulsar Valet en la barra
   inferior y en el drawer: abre Valet directamente; no aparece el selector ni
   «Función no disponible». Volver a Inicio y a Valet conserva la misma estancia.
2. Con sesión restaurada y sin contexto seleccionado, abrir `/valet`: aparece
   selector; elegir una estancia vinculada y continuar debe terminar en Valet.
   Con una sola estancia, la selección automática termina en Valet. Con cero,
   conservar el vacío real; no inventar estancia ni consultar vehículos.
3. Sin sesión, abrir `/valet`: exige login y luego selección si corresponde;
   después continúa a Valet. Credenciales inválidas/restore offline no montan
   Valet. No debe alternar continuamente entre login/selector/Valet.
4. Desde Valet cambiar estadía, confirmar otra en el selector y volver a Valet:
   solo vehículos/solicitudes de la nueva estancia, sin formularios o avisos de
   la anterior. Cancelar el cambio conserva contexto previo. El flujo habitual
   de Cambiar estadía sin continuación sigue regresando a Inicio.
5. Repetir entrada con mock habilitado: conserva el módulo mock y su UX, sin
   solicitudes HTTP reales. No mezclar esta comprobación con el QA persistido.

### H2 — Parking/Valet Web no coincide con los módulos operativos

**Causa raíz:** la pantalla real importaba `parking-valet-center.module.css`,
propio del mock. Usaba solamente `.page`: su header sin clase no recibía la
regla tipográfica `.header h1`; el h2 quedaba sin jerarquía explícita y ambas
tablas aparecían directamente en la página, sin paneles ni separación operativa.
Actualizar y las acciones usaban variantes/tamaños distintos a Amenidades/
Room Service. Cambiar únicamente la fuente no resolvía la composición.

**Corrección:** CSS Module específico para la página real, alineado con los
módulos operativos: cuerpo Inter y títulos Lora mediante tokens, H1 adaptable,
subtítulos jerárquicos, cabecera con Actualizar outline y dos paneles separados
para solicitudes y custodia/retorno. Espaciado, superficies, bordes, radios y
colores usan tokens existentes; las acciones de tabla usan Button pequeño.
OperationalRequestTable conserva búsqueda/filtros/estados; DataTable de custodia
conserva semántica y añade viewport horizontal enfocable para móvil/teclado.
StaffShell, PropertySwitcher, permisos, hooks, BFF y confirmaciones no cambian.
El CSS del mock permanece aislado. No hay cambios Backend/SQL/API en este ajuste.

**Regresión Web:** estructura accesible H1/H2 y regiones de ambas secciones,
ubicación de filtros/tablas, actualización única y viewport de custodia enfocable;
se conserva la prueba de búsqueda, estados, entrega/retorno y Recepción readonly.
JSDOM comprueba estructura/funcionalidad; la apariencia y el ancho real requieren
la siguiente revisión manual, sin atribuirla al agente.

**Repetir manualmente:**

1. Con Staff y propiedad concreta, comparar `/parking-valet` con `/amenities`,
   `/room-service` y `/housekeeping`: Inter en contenido/controles, Lora en
   títulos; tamaños y pesos, cabecera, paneles, espaciados y bordes consistentes.
2. Revisar escritorio y anchos aproximados1280/768/390px, zoom200% y teclado.
   Cabecera y Actualizar se acomodan sin superposición; el scroll de tablas
   queda dentro de cada panel. Tab enfoca filtros, botones y viewport de custodia;
   foco visible, labels de tablas y confirmaciones comprensibles.
3. Repetir buscar placa/reserva, filtros fecha/estado, Actualizar, iniciar,
   confirmar entrega y confirmar retorno. La entrega aún cambia DONE/WITH_GUEST
   conjuntamente; retorno no reabre solicitudes. Cancelar diálogo no muta datos.
4. Recepción solo lee; ALL_PROPERTIES pide hotel. Cambiar propiedad/logout no
   mantiene diálogos/datos previos. Revisar carga/error/offline/vacío sin perder
   tarjetas válidas. Repetir la comprobación de snapshots/concurrencia del QA base.

Resultados técnicos Android: focal4 suites/25 pruebas PASS; suite completa
57 suites/561 pruebas PASS. Lint/typecheck sin errores ni warnings; export Android
PASS. En la primera pasada completa falló un stub antiguo de Expo Router sin
useLocalSearchParams; se actualizó y la repetición completa pasó. Tras sus resúmenes
Jest mantuvo procesos activos incluso con --detectOpenHandles; se detuvieron solo
los procesos propios después de guardar resultados, sin forceExit ni cambios
para silenciarlo. La apariencia en dispositivo sigue pendiente de revisión manual.

Web: focal7 suites/37 pruebas PASS; suite completa352 suites/2685 pruebas PASS
con salida0; lint/typecheck y build PASS. `git diff --check` PASS.
Evidencia `/tmp/pms-valet-qa-*.log`. Mantener EN_QA hasta que el usuario confirme
por separado la repetición manual de H1 y H2.

### Archivos de la corrección H1/H2

- Android `src/modules/guest-auth/presentation/GuestRouteGuard.tsx`,
  `guestContinuation.ts`, `LinkedReservationsScreen.tsx`, `LoginScreen.tsx`.
- Android `tests/valet-navigation-real.test.tsx`; stubs de router actualizados en
  `tests/android-native-session.test.tsx` y `tests/android-reservations-focus.test.tsx`.
- Web `src/modules/parking-valet/components/persisted-valet-page.tsx`,
  `persisted-valet-page.module.css`, `persisted-valet-page.test.tsx`.
- Esta QA45 y entradas nuevas en `backend/docs/AlanPlan.md`/`AlanHandoff.md`.

Los archivos `app/(guest)/valet.tsx`, layouts, ActiveReservationContextProvider y
useCurrentStay fueron inspeccionados y conservados. Backend funcional, contratos
HTTP, migraciones, validaciones y transportes no cambiaron en esta corrección.
`next-env.d.ts` se conserva exactamente como estaba al comenzar este turno,
incluyendo su cambio previo generado por Next dev. No se revierte a main.

## Iteración posterior — vehículos principales y solicitudes desplegables

**EN_QA / avance parcial.** La separación de vehículo guardado y asociación a
estancia está pendiente de las decisiones VAL-04/VAL-05 propuestas en contrato62.
No se presenta como implementada la reutilización Android ni se atribuye PASS
manual. El modelo007 y todos sus datos/snapshots se preservan.

Comprobación manual de la parte implementada:

1. Staff con propiedad concreta: Vehículos registrados es el primer panel; ver
   contadores y orden PARKED→WITH_GUEST. Buscar placa, marca, modelo, reserva y
   habitación. Ubicación y Estancia son filtros independientes. Limpiar restablece
   el criterio operativo, no mezcla automáticamente todo el historial.
2. Con estancia CHECKED_OUT/CANCELLED/NO_SHOW y vehículo WITH_GUEST sin petición
   activa, el registro queda fuera de Operativos y visible en Inactiva/Historial.
   Con PARKED o petición activa permanece operativo. Estos datos proceden de
   PostgreSQL mediante la proyección Backend; no son simulación frontend.
3. Solicitudes inicia cerrado. Tab enfoca su botón; Enter/Espacio abre/cierra y
   anuncia aria-expanded; muestra contador de OPEN/IN_PROGRESS y chevron. Abierto,
   conserva tabla, búsqueda, filtros, actualización y acciones con permisos.
   Al cerrar/abrir no se reinician filtros. Una mutación/confirmación no depende
   de que la tabla esté visible y no debe perderse al ocultarla.
4. Repetir iniciar/entregar/retornar, cancelar/editar Guest y scope de propiedad.
   Recepción sigue readonly. No hay acción nueva de entregar sin petición ni
   reutilización en Android hasta aprobar e implementar las reglas pendientes.
5. Revisar escritorio/móvil/zoom/teclado con el sistema Inter/Lora existente.
   Scroll de la tabla de vehículos queda dentro del panel y es enfocable.

Pruebas nuevas: ordenación/búsqueda/filtros, historial por defecto separado,
custodia al finalizar estancia, expansión accesible y preservación de filtro/
mutación al colapsar. Endpoint Vehicle incluye referencia/habitación y estados
reales de estancia/reserva; OpenAPI y BFF actualizados. No hay migración nueva.
La conservación y reutilización entre reservas se validarán cuando se implemente
el modelo propuesto, no mediante flags visuales ni resultados mock.

Evidencia de esta iteración: `/tmp/pms-valet-reuse-*.log`. Focales Web8 suites/47
pruebas PASS; Backend36 PASS (11 Valet +25 OpenAPI). Backend verify1175/1175
PASS; Web353 suites/2695 pruebas PASS; lint/typecheck/build Web y diff-check PASS.
La suite Backend incluye entrega, retorno, edición/cancelación, propiedad/Guest,
visibilidad tras checkout y OpenAPI. No se repitió Android: su código y migración007
se verificaron idénticos al inicio de esta iteración; la reutilización Android
no está implementada ni se le atribuyen pruebas. QA manual permanece pendiente.

Para repetir esta iteración reiniciar Backend desde el worktree con la configuración
QA ya existente (puerto18085) y Web3005: la nueva proyección de vehículos requiere
que ambos estén actualizados. No hay migración nueva en esta entrega parcial.
Usar estancias finalizadas por flujos autorizados o fixtures del entorno de QA;
no forzar el estado con flags del cliente ni UPDATE sobre datos del hotel.

Archivos de esta iteración: ValetModels.java, ValetRequestService.java y sus
pruebas ValetRealIntegrationTests/OpenApiContractIntegrationTests; Web
persisted-valet-page.tsx/.module.css/.test.tsx, persisted-valet.dto.ts,
persisted-valet.mapper.ts, persisted-valet.ts, vehicle-list.ts/.test.ts y prueba
BFF valet/requests/route.test.ts. Contrato62, baseline OpenAPI39 y Plan/Handoff.
Lista absoluta de cambios respecto del inicio: `/tmp/pms-valet-reuse-changed-files.txt`.


## VAL-04 y VAL-05 aprobadas — nueva repetición manual requerida

**EN_QA.** Esta implementación sustituye la limitación parcial de la iteración
anterior: ahora hay identidad persistida por cuenta y asociaciones independientes,
y entrega excepcional Staff. No se declara PASS manual. Arrancar Backend actualizado
(migración008), Web y Android HTTP con los comandos de preparación; conservar BD,
cuentas y configuraciones existentes. No usar Expo mock para validar persistencia.
Antes de migrar datos007, ejecutar el preflight de solo lectura de contrato62;
si hay custodias incompatibles, detener la migración y conciliarlas explícitamente.
Nunca borrar/recrear vehículos o solicitudes para resolverlas.

Preparar un Guest A con dos estancias vinculadas, una tercera en otra propiedad
si está disponible; Guest B separado; Staff Operaciones con propiedad P y otro
Staff sin acceso a Q; Recepción readonly. Usar fechas elegibles para solicitudes.
Finalizar estancias mediante flujos autorizados/fixtures QA, sin UPDATE de datos
reales ni flags frontend. El cierre se basa en estados persistidos, no en reloj.

| Caso | Pasos y resultado esperado |
| --- | --- |
| V2-01 Registro persistente | En A/estancia1 registrar automóvil. Reiniciar sesión/app: sigue asociado y guardado. Backend no debe crear otra identidad. Registrar misma placa normalizada en otra estancia de A devuelve409; B tiene lista independiente. |
| V2-02 Bloqueo operativo | Con estancia1 vigente, PARKED o WITH_GUEST, intentar usarlo en estancia2: no disponible; petición HTTP forzada409. Con OPEN/IN_PROGRESS también bloqueado. Cambiar estancia no libera custodia. |
| V2-03 Custodia al finalizar | Finalizar estancia1 con automóvil PARKED, sin solicitud. Staff mantiene fila por defecto, contador En parqueo y etiqueta Custodia pendiente. Android estancia2 lo conserva guardado pero no permite asociar. |
| V2-04 Entrega excepcional | En ese caso Operaciones ve Confirmar entrega pendiente. Cancelar diálogo: sin cambios. Confirmar tras entrega física: WITH_GUEST y desaparece del listado operativo; visible en Inactiva/Historial. No aparece solicitud artificial ni cambia historial. Auditoría incluye actor/vehículo/propiedad/estancia/fecha. |
| V2-05 Permisos/estado | Recepción no ve acción; Guest no dispone de endpoint. Staff fuera de propiedad recibe403. No ofrecer entrega excepcional si estancia vigente, WITH_GUEST o solicitud activa. Forzar endpoint en estado no elegible409. |
| V2-06 Reutilización | Tras liberar custodia, ir a estancia2. En Vehículos guardados elegir Usar en esta estadía. No escribir otra vez marca/modelo/placa/color. Confirmación exige ubicación explícita sin preselección. Elegir WITH_GUEST: nueva asociación con ID distinto y misma identidad guardada; sin solicitudes anteriores. |
| V2-07 Cambio de estancia | Cambiar entre1 y2: lista actual/solicitudes pertenecen solo a esa estancia; identidad guardada es común a A. Reabrir Valet con estancia válida no muestra selector innecesario; sin selección continúa tras elegirla, sin bucle. Cambiar estancia con diálogo abierto lo cierra y no envía su draft al contexto nuevo. |
| V2-08 Propiedades/Guest | Repetir uso en Q solo si la anterior asociación está cerrada. P no ve datos operativos Q. Cambiar de cuenta a B no muestra guardados de A; UUID ajeno responde404 y no permite asociar ni editar. |
| V2-09 Concurrencia | Dos dispositivos A intentan asociar mismo guardado en estancias distintas: solo uno201, otro409; una única asociación operativa en PostgreSQL. Dos solicitudes activas del mismo vehículo: una201 y otra409. Actualizar tras conflicto. |
| V2-10 Reintentos/versiones | Cortar respuesta al asociar o entregar excepcionalmente; reintentar la misma intención/versión, mismo ID/resultado, auditoría única. Datos/versiones cambiados desde otra sesión:409 sin efectos parciales. No crear otra solicitud al reintentar. |
| V2-11 Historial/edición | Editar vehículo en estancia2 sin petición activa: identidad guardada actualizada; asociación1 y snapshots de solicitudes antiguas permanecen idénticos. Con petición activa edición409. Historial cancelado/completado no reaparece como solicitud de estancia2. |
| V2-12 Entrega/retorno normal | Solicitud OPEN→IN_PROGRESS→DONE solo Staff; ubicación no cambia al crear/cancelar. DONE entrega atómica; Staff retorno WITH_GUEST→PARKED sin reabrir. Retornar asociación1 cuando2 está operativa409. Repetir edición/cancelación OPEN antes de cutoff. |
| V2-13 UX Staff | Panel principal solo con tres cards En parqueo/Con huésped/Solicitudes, filtros y tabla de vehículos. El tercer card es el único acceso a un modal real de solicitudes; no hay sección inline. Modal con búsqueda, filtros, Limpiar filtros, tabla/estados/acciones; Cerrar/Escape, foco y teclado, filtros/datos conservados, confirmaciones y mutaciones sin interrupción. Móvil/zoom/scroll y tokens Inter/Lora. |
| V2-14 Mocks/Traslados | En mock conservar UX existente aislada; en HTTP Traslados no disponibles, sin reserva exitosa simulada. No hay pagos/cargos/GPS/tarifas nuevas. |
| V2-15 Upgrade | En copia QA007 con históricos, aplicar008 y reejecutar: mismos IDs/datos/versiones/keys/snapshots previos, identidad única. Copia con doble custodia incompatible: rechazo y rollback completo008, sin pérdida de datos. |

Guía de evidencias: registrar caso, propiedad/reserva/estancia y resultado observable;
no capturar tokens, cookies, secretos ni datos personales completos. Para concurrencia
usar dos sesiones QA y verificar Backend, no solo botones deshabilitados. No afirmar
PASS por un contador local o mock. El usuario debe confirmar cada resultado manual.

### Validación técnica de esta implementación

Evidencia de comandos y resultados finales abajo; logs `/tmp/pms-valet-v2-*.log`. Tests Backend usan PostgreSQL17 desechable,
sin publicar puertos ni tocar BD del hotel. Pruebas cubren guardados/reutilización,
historial, custodia pendiente, propiedad/Guest, concurrencia, versiones, auditoría,
rollback, upgrade007→008, checksum y paridad OpenAPI. Android cubre asociación con
ubicación explícita, reintento, indisponibilidad y regresiones de navegación; Web
cubre confirmación excepcional, BFF cerrado, filtros/panel y permisos existentes.


### Resultados técnicos finales (QA manual pendiente)

| Área | Comando reproducible | Resultado |
| --- | --- | --- |
| Backend/PostgreSQL | `docker compose -p pms-valet-v2-qa -f backend/compose.bd2-test.yaml run --rm verify mvn -B --no-transfer-progress clean verify` desde raíz | 1181 pruebas sin fallos/errores, build JAR PASS. |
| Backend focal | Mismo compose con `mvn -B --no-transfer-progress -Dtest=ValetRealIntegrationTests,ValetMigrationIntegrationTests,OpenApiContractIntegrationTests test` | 43 pruebas PASS; identidad, aislamiento, carrera de asociación/solicitudes, release/replay/rollback y upgrade con datos. |
| Web completo | `npm test` en Web | 353 suites /2697 pruebas PASS. |
| Web focal | `npm test -- src/modules/parking-valet src/app/api/staff/valet` | 8 suites /49 pruebas PASS. |
| Web calidad/build | `npm run lint`, `npm run typecheck`, `npm run build` | PASS; typecheck ejecutado aparte del build. |
| Android completo | `npm test` en Android | 57 suites /565 pruebas aprobadas; advertencia de handles al terminar (ver nota). |
| Android focal | `npm test -- --runTestsByPath tests/valet-real.test.tsx tests/valet-navigation-real.test.tsx` | 2 suites /19 pruebas PASS, terminación normal. |
| Android calidad/export | `npm run lint`, `npm run typecheck`, `npx expo export --platform android --output-dir /tmp/pms-valet-v2-android-export` | PASS; export Hermes Android, no es una APK instalable. |
| OpenAPI | Pruebas generadas incluidas en Backend | 106 operaciones /86 paths /131 schemas /15 tags, paridad mappings sin exclusiones. |
| Árbol | `git diff --check` | PASS; rama correcta, main original sin cambios. |

La suite Android completa informa handles abiertos después de aprobar todas las
pruebas (también advertencias act de RoomServiceScreen existentes); se cerró solo
el proceso Jest propio, verificando cwd/comando. No se usa forceExit ni se atribuye
salida0 al proceso terminado. Las pruebas focalizadas Valet sí finalizan normalmente.
En la primera pasada Backend se corrigió un fixture de upgrade sin email_verified_at;
la verificación limpia final con compilación independiente pasó íntegramente.

La migración007 se comparó byte por byte con el respaldo inicial y no cambió.
next-env.d.ts conserva su modificación preexistente; no se revierte a main.
Inventario de archivos modificados en esta iteración:
`/tmp/pms-valet-v2-changed-files.txt`; evidencia `/tmp/pms-valet-v2-checks.md`.
Ni el export ni las pruebas equivalen a PASS manual. Repetir V2-01–15 y registrar
resultados del usuario antes de cerrar EN_QA.


## Revisión final y confirmación manual — 2026-10-27

**Confirmación oficial del usuario, aceptada sin sustituirla por pruebas automáticas:**

- QA visual Web Staff: **PASS**.
- QA funcional: **11/11 PASS**.
- Ámbitos confirmados: «Registro, persistencia, solicitudes, duplicados,
  preparación, entrega, retorno, filtros, historial, reutilización, custodia tras
  checkout, entrega excepcional, aislamiento y permisos: todos PASS».

La comunicación no desglosa los11 escenarios individuales ni sus IDs. Por ello no
se reconstruye una lista ficticia de11 ni se convierte11/11 en15/15. La tabla siguiente
relaciona únicamente los ámbitos declarados con los casos oficiales y detalla la
cobertura manual todavía no demostrada. **No acreditado no significa FAIL ni afirma
que no se haya ejecutado**: falta evidencia/confirmación de ese paso concreto.
Las pruebas automáticas son evidencia técnica separada; no acreditan PASS manual.

| Caso oficial | Cobertura manual declarada | Detalle obligatorio aún no acreditado explícitamente |
| --- | --- | --- |
| V2-01 | Registro, persistencia, duplicados e aislamiento PASS reportados. | Reinicio de sesión/app y duplicado normalizado entre estancias de A, con lista B independiente, no desglosados por ID. |
| V2-02 | Duplicados, reutilización y custodia PASS reportados. | Matriz PARKED/WITH_GUEST con estancia vigente, OPEN/IN_PROGRESS y petición HTTP forzada409; cambio de estancia sin liberar custodia. |
| V2-03 | Custodia tras checkout PASS reportado. | Comprobación explícita sin solicitud activa, contador/listado Staff y bloqueo Android de asociación nueva. |
| V2-04 | Entrega excepcional e historial PASS reportados. | Cancelar confirmación sin cambios, ausencia de solicitud artificial y campos completos de auditoría no detallados. |
| V2-05 | Permisos e aislamiento PASS reportados. | Casos negativos Guest/Recepción/propiedad/estado y respuestas HTTP403/409 forzadas no detallados. |
| V2-06 | Reutilización PASS reportada. | Ubicación explícita sin preselección, ID nuevo con identidad guardada común y ausencia de solicitudes heredadas no detallados. |
| V2-07 | Sin confirmación específica de navegación/cambio de estancia. | Entrada directa/selector sin bucle y cambio de estancia con diálogo abierto, cierre del draft y aislamiento de respuestas tardías. |
| V2-08 | Aislamiento y permisos PASS reportados. | Reutilización en Q tras cerrar P, cambio de cuenta A→B y UUID ajeno404 forzado no desglosados. |
| V2-09 | Duplicados PASS reportados; no equivale a concurrencia. | Carrera de dos dispositivos para asociación y solicitudes, un201/un409 y unicidad persistida. |
| V2-10 | Sin confirmación específica de fallos/reintentos/versiones. | Cortar respuesta, reintentar misma clave/versión, auditoría única y409 ante versión ajena sin efectos parciales. |
| V2-11 | Historial PASS reportado. | Edición en estancia2, comparación inmutable de asociación1/snapshots, bloqueo de edición activa y no importar solicitudes antiguas. |
| V2-12 | Preparación, entrega y retorno PASS reportados. | Creación/cancelación sin mover ubicación, retorno histórico409, edición/cancelación OPEN dentro del cutoff y no reabrir historial. |
| V2-13 | QA visual Web Staff y filtros PASS confirmados. | El requisito vigente es el modal desde el tercer card (sustituye el antiguo desplegable). Teclado/Escape/foco, persistencia de filtros y mutación activa requieren confirmación desglosada si no formaron parte del11/11. |
| V2-14 | Sin confirmación específica de mock/Traslados. | Mock aislado y HTTP sin éxito simulado de Traslados; ausencia de pagos/cargos/GPS/tarifas. |
| V2-15 | Sin confirmación específica de ensayo de upgrade. | Copia007 con históricos, upgrade008 y reaplicación sin alterar originales; copia incompatible con rechazo y rollback íntegro. |

Se solicitó al usuario precisar la cobertura restante, mientras se completan las
validaciones técnicas. Hasta recibir esa trazabilidad no se registra cierre DoD
PASS, no se publica rama ni se crea PR. Se conserva el PASS visual y funcional
reportado; el módulo permanece **EN_QA por cobertura oficial pendiente**.

La revisión técnica final se registra debajo al concluir las suites. No se modifica
código funcional para reinterpretar o ampliar un resultado manual ya confirmado.


### Evidencia técnica de la revisión final

Ejecutada sobre el worktree completo, incluidos los cambios finales del modal
Staff, sin cambios funcionales durante esta revisión:

| Área | Validación final | Resultado |
| --- | --- | --- |
| Backend | Compose aislado `pms-valet-v2-qa`, PostgreSQL17 desechable; `mvn -B --no-transfer-progress clean verify` | **1181 pruebas,0 fallos/errores; build JAR PASS**. Incluye migraciones con históricos, rechazo transaccional, concurrencia, autenticación/scope y OpenAPI. |
| OpenAPI | Documento generado y paridad mappings de la suite Backend | **106 operaciones/86 paths/131 schemas/15 tags**, sin exclusiones. |
| Web | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` | **353 suites/2701 pruebas**, lint/typecheck/build PASS; salida0. |
| Android | `npm run lint`, `npm run typecheck`, `npm test` | Lint/typecheck PASS; **57 suites/565 pruebas aprobadas**; ver advertencia de terminación. |
| Android focal | `npm test -- --runTestsByPath tests/valet-real.test.tsx tests/valet-navigation-real.test.tsx --detectOpenHandles` | **2 suites/19 pruebas PASS, salida0 normal**. |
| Android Doctor | `npm run doctor` | **21/21 checks PASS** tras reintentar con acceso de red; primer intento falló por DNS del sandbox, sin modificar dependencias del proyecto. |
| Android build | `npx expo export --platform android --output-dir /tmp/pms-valet-final-review/android-export` | **PASS, bundle Hermes Android**; no es una APK ni instalación manual nueva. |
| Diff | `git diff --check` y revisión de archivos nuevos | PASS; sin patrones de secretos o artefactos en candidatos de integración. |

**Advertencias y límites:** la suite Android completa emitió avisos act de pantallas
existentes de otros servicios y «Jest did not exit one second after the test run has
completed». Tras conservar el resumen de565 pruebas, se cerró únicamente su PID,
verificando cwd/comando. No forceExit, no se atribuye salida0 a ese proceso, ni se
oculta el posible riesgo de timeout en Android CI. El focal Valet con detección de
handles termina normalmente. Las validaciones locales usan Node22.23.1; CI define
Node24 y todavía no se ha ejecutado para una publicación de esta rama.

Auditoría READ ONLY de la BD de QA:007 y008 figuran EXECUTED; las fuentes actuales
coinciden byte por byte con el JAR activo. Constraints nuevas validadas;0 dobles
asociaciones operativas,0 dobles solicitudes activas y0 vínculos/flags inconsistentes.
Esto confirma estado actual, no demuestra por inferencia el ensayo manual V2-15
ni una comparación histórica previa al upgrade. No se migró ni alteró esa BD.

Git:78 rutas nuevas/modificadas auditadas.77 son candidatas cohesivas del módulo,
contratos, pruebas y conexiones necesarias de auth/navegación/cache; no hay cambios
funcionales ajenos detectados. La diferencia preexistente y generada de
`frontend/pms-hotel-web/next-env.d.ts` se preserva fuera de la propuesta de commit;
no debe incluirse. Logs, exports, respaldos e inventarios permanecen fuera del repo
o ignorados; no se proponen secretos, temporales ni binarios.

Se actualizó solo la referencia remota mediante fetch: main avanzó de909a12c a
fa56e3e (PR176, documentación Staff de reservas/pagos). Hay cambios concurrentes
en Plan/Handoff que se deberán conservar al reconciliar, sin incorporar cambios
ajenos al commit de Valet. No se hizo merge/rebase, commit, push ni PR.

**Gate final:** PASS visual y funcional11/11 confirmados; cobertura detallada V2
pendiente. DoD global **sin cierre** y publicación **detenida** hasta aclarar los
casos obligatorios no acreditados. PR, commits y CI de la nueva rama: no creados.
Evidencia local `/tmp/pms-valet-final-review/`; no publicar los archivos de entorno
ni respaldos de QA. La siguiente acción es confirmar la matriz, no repetir los
flujos ya declarados PASS ni reducir los casos oficiales por inferencia.


## Cierre de pendientes específicos — QA/DoD PASS

El usuario autorizó demostrar automáticamente lo razonablemente comprobable y
pedir QA manual solo para lo que no pueda acreditarse así. Esta sección sustituye
el gate provisional de la revisión anterior, sin modificar ni repetir el PASS
manual visual/funcional11/11. No se atribuye al usuario ejecución manual de los15
casos: el cierre es **evidencia mixta, manual ya confirmada + automatizada explícita**.

### Archivos de evidencia

- **BV:** [ValetRealIntegrationTests.java](../../../backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/ValetRealIntegrationTests.java).
- **BM:** [ValetMigrationIntegrationTests.java](../../../backend/src/test/java/com/pms/hotelboutique/backend/modules/guestauth/ValetMigrationIntegrationTests.java).
- **AN:** [valet-navigation-real.test.tsx](../tests/valet-navigation-real.test.tsx), con Expo Router/guards/providers reales.
- **AR:** [valet-real.test.tsx](../tests/valet-real.test.tsx).
- **AM:** [valet-mock-boundary.test.tsx](../tests/valet-mock-boundary.test.tsx), ruta mock real aislada del cliente HTTP.
- **WS:** [persisted-valet-page.test.tsx](../../pms-hotel-web/src/modules/parking-valet/components/persisted-valet-page.test.tsx).
- **WF:** [vehicle-list.test.ts](../../pms-hotel-web/src/modules/parking-valet/model/vehicle-list.test.ts).
- **WB:** [BFF route.test.ts](../../pms-hotel-web/src/app/api/staff/valet/requests/route.test.ts).

Los nombres siguientes identifican tests concretos, no una inferencia por título
del módulo. BV/BM corren contra PostgreSQL desechable y esquema aislado; WS/WB
son pruebas Web con servicios simulados explícitos; AN usa Router real con HTTP
controlado. La combinación se indica donde la propiedad cruza capas.

| Caso | Qué faltaba demostrar y evidencia concreta | Resultado |
| --- | --- | --- |
| V2-01 | BV `independentAuthenticatedHttpClientsRaceAndReplayDiscardedAssociationAndRequestResponses` lee identidad persistida desde otra sesión Guest de la misma cuenta; `savedIdentitySurvivesCheckoutAndReuseKeepsHistoryAndFreshLocation` prueba ID guardado único/placa duplicada409; `concurrentReuseHasOneWinnerAndDatabaseCannotForgeInactiveAssociation` prueba cuenta ajena sin lista. Completa el registro/persistencia manual confirmado. | CERRADO, PASS automatizado. |
| V2-02 | BV `openInProgressAndEligibleWithGuestAllBlockAnotherOperationalAssociation`: OPEN, IN_PROGRESS y WITH_GUEST con estancia vigente bloquean nueva asociación409; checkout solo libera si ya no hay custodia. `savedIdentitySurvivesCheckoutAndReuseKeepsHistoryAndFreshLocation` mantiene PARKED bloqueado al finalizar. | CERRADO, PASS. |
| V2-03 | BV `endedStayRemainsOperationalWhileParkedOrPendingAndBecomesHistoryAfterDelivery` y `savedIdentitySurvivesCheckoutAndReuseKeepsHistoryAndFreshLocation`; WF `excludes inactive history by default but retains ended stays with unresolved custody`; AR `shows a saved vehicle with unresolved custody as unavailable instead of simulating an association`. | CERRADO, PASS. |
| V2-04 | BV `exceptionalDeliveryRequiresTerminalStayNoActiveRequestAndStaffScopeAndIsReplaySafe`: no solicitud artificial, historial DONE intacto, actor/vehículo/propiedad/estancia/savedVehicleId/confirmedAt y auditoría única; WS `preserves exceptional physical delivery from the vehicle table without opening the requests modal` cancela Volver sin mutación y luego confirma explícitamente; BV `exceptionalDeliveryRollsBackCustodyAndAuditTogether` verifica atomicidad. | CERRADO, PASS. |
| V2-05 | BV `associationHasClosedBodyStrictAuthVersionsAndHttpNegatives` y `exceptionalDeliveryRequiresTerminalStayNoActiveRequestAndStaffScopeAndIsReplaySafe`; WS `keeps intake read-only and requires a concrete authorized property`; WB `protects exceptional release and validates fresh persisted custody acknowledgement`.400/401/403/404/409 se verifican por HTTP real según corresponda; Guest/Recepción/scope/estado no se eluden. | CERRADO, PASS. |
| V2-06 | AR `reuses a saved account vehicle with an explicit fresh location and retry key without old requests` exige ubicación sin preselección; BV `savedIdentitySurvivesCheckoutAndReuseKeepsHistoryAndFreshLocation`: ID de asociación nuevo, mismo guardado, GET solicitudes nuevo vacío y ubicación explícita. | CERRADO, PASS. |
| V2-07 | AN `requires Guest login and preserves the Valet continuation through login and selection`, `selects a linked stay then resumes Valet without mounting HTTP queries beforehand or looping`, `changes stay with confirmation, keeps the default home destination, then opens isolated Valet data`, `keeps delayed vehicle data from the previous stay out of the new Valet route`, `drops an association draft on stay change while retaining account-only saved identity`. | CERRADO, PASS. |
| V2-08 | BV `reuseAcrossAuthorizedGuestPropertiesDoesNotLeakOperationalDataOrBypassSavedOwnership` prueba P→Q, permiso Staff403 y guardado ajeno404; `authenticatedGuestCannotCompleteOrChangeLocationAndForeignContextsStayHidden` y `concurrentReuseHasOneWinnerAndDatabaseCannotForgeInactiveAssociation` prueban cuentas ajenas; WS `resets the requests modal and its filters when authorized property scope changes`. | CERRADO, PASS. |
| V2-09 | BV `independentAuthenticatedHttpClientsRaceAndReplayDiscardedAssociationAndRequestResponses`: dos HttpClient, dos sesiones/JWT Guest de la misma cuenta y sockets al Tomcat real; asociación en distintas estancias y solicitudes contra el mismo vehículo dan exactamente un201/un409, con índices PostgreSQL y una sola auditoría. Se mantienen los tests MockMvc concurrentes como cobertura adicional, no se presentan como dos dispositivos físicos. | CERRADO, PASS por dos clientes autenticados reales. |
| V2-10 | El mismo test HTTP descarta los cuerpos de respuesta y recupera con idéntica clave/payload:200, mismo ID y auditoría única. AR `retains the same creation key after unknown HTTP outcome and only navigates on persisted success` y `reuses a saved account vehicle with an explicit fresh location and retry key without old requests` prueban error de transporte/clave estable sin éxito ficticio. BV `requestRetryAfterCancelOrEditPreservesIdentityAndRejectsNewIntent` y tests de release prueban replay/CAS409. Se simula pérdida de respuesta, sin atribuir una desconexión física de red. | CERRADO, PASS. |
| V2-11 | BV `registerNormalizePersistAndBlockActiveVehicleEditsWithoutCustodyChange`, `snapshotGuardAndPartialIndexCannotBeBypassedWithSql`, `savedIdentitySurvivesCheckoutAndReuseKeepsHistoryAndFreshLocation`: snapshot JSON completo idéntico tras editar nueva estancia; asociación vieja conserva marca; no importar historial y edición activa409. | CERRADO, PASS. |
| V2-12 | BV `staffOnlyDeliveryAndReturnAreAtomicAndReplayDoesNotRepeatAudit`, `registerNormalizePersistAndBlockActiveVehicleEditsWithoutCustodyChange`, `schedulesCheckoutCutoffAndClosedStayAreServerAuthoritative` y `savedIdentitySurvivesCheckoutAndReuseKeepsHistoryAndFreshLocation`: crear/cancelar no mueve, entrega/retorno Staff sin reabrir, edición/cancelación antes de cutoff y rechazo posterior, retorno histórico409. | CERRADO, PASS. |
| V2-13 | WS `has only three upper cards, vehicle filters and vehicle table, with no inline requests section even after opening`, `opens from the third card using keyboard, traps focus and closes with Escape or Cerrar restoring focus`, `retains request search, state, date and cached data across modal close/reopen and keeps vehicle filters independent`, `does not lose pending confirmations, mutations or filters and never has competing request/confirmation dialogs`, `keeps focusable horizontal viewports for vehicle and request tables on narrow screens`, `keeps the third card pending counter real and exposes history only inside its modal`. Complementa el PASS visual manual; no atribuye medición visual a JSDOM. | CERRADO, PASS manual visual + automatizado. |
| V2-14 | AM `selects the mock route and keeps its vehicle UX isolated from Guest HTTP persistence`; AR `real route preserves vehicle selection and date/time surface, never simulates Transfers or Guest custody`; BM comprueba ausencia de columnas financieras nuevas. Las solicitudes reales no caen a mocks ni crean éxito de Traslados. | CERRADO, PASS. |
| V2-15 | BM `upgradeFromCurrentMainPreservesHistoricalDataChecksumsAndReappliesValetOnce` y `reusableUpgradePreservesLegacyAssociationsAndRequestSnapshotsAndRejectsIncompatibleCustody`: upgrade007→008 con datos, reejecución única, checksums/columnas originales intactos, consolidación histórica y rechazo de doble custodia con rollback transaccional completo. Todo en PG desechable/schema aislado, nunca en la BD del QA/hotel. No se ejecutó rollback destructivo de una instalación usada. | CERRADO, PASS automatizado. |

### Defecto descubierto por HTTP real y corrección focal

La carrera nueva encontró201/401 en vez de201/409: `ResponseStatusException`
terminaba en `sendError` y despacho `/error`, donde la seguridad genérica reemplazaba
el código funcional por401. MockMvc no ejecutaba ese segundo despacho Servlet.
`ValetIntegrityExceptionHandler` ahora escribe ProblemDetail seguro para errores
400/404/409 y binding inválido, limitado a controladores Valet. No se abrió /error
ni se alteró Guest/Staff Auth. Test HTTP comprueba directamente /error→401, además
de400/401/403/404/409 de Valet. OpenAPI documenta application/problem+json y prueba
el schema ProblemDetail para los códigos correspondientes. No cambia reglas de negocio.

### Handles Jest: causa y solución verificada

La instrumentación temporal con async_hooks (fuera del repo) identificó timers
referenciados de300000ms de TanStack `Query.scheduleGc`/`Mutation.scheduleGc` al
retirar observadores. Los clientes de pruebas sin disposición explícita sobrevivían
al test. Además, `QueryClient.clear()` no destruye los timers de MutationCache en
la versión instalada. La limpieza correcta está en `src/test/queryClient.ts`:
primero cleanup/unmount, luego cancelar queries, destruir cada mutación y vaciar
caches.16 archivos de pruebas con clientes de duración por defecto usan esa fábrica.
No se cambiaron gcTime, APIs, configuración de Jest ni caché productiva; no forceExit.

Prueba antes/después: Amenities21 pasa con timers de300000ms antes; después pasa
sin esos timers y con proceso salida0. El comando CI normal `npm test`, sin opciones
especiales, termina solo: **58 suites/566 pruebas PASS, salida0**, sin aviso de
handles. Se ejecutó una única repetición completa después del arreglo para verificar
precisamente terminación y todos los consumidores de la fábrica, no para repetir
QA funcional. Pueden permanecer avisos act de pruebas existentes; no hubo fallo.

### Validación focal de cierre

- Backend: **46 pruebas focales** (19 Valet +2 migración +25 OpenAPI),0 fallos/errores;
  verify/build JAR PASS. No se repitió la suite completa1181 ya aprobada.
- Android Valet: **3 suites/20 pruebas PASS** con detectOpenHandles; proceso salida0.
- Android CI normal tras corregir lifecycle de tests: **58/566 PASS, salida0**.
- Web: **10 suites/64 pruebas PASS**, incluida cancelación explícita de entrega
  excepcional. No se repitieron las2701 pruebas completas.
- Lint/typecheck Android y typecheck/lint focal Web PASS. Build Web/Android export
  y Doctor21/21 anteriores se conservan: no cambió código productivo frontend.
- OpenAPI conserva106/86/131/15; añade contenido ProblemDetail a errores Valet.
- Evidencia local `/tmp/pms-valet-dod/`, respaldos del árbol y parches fuera del repo.

**Casos que requieren validación manual adicional: ninguno identificado.** Se
mantienen los PASS manuales ya confirmados. **Bloqueos técnicos: ninguno tras las
comprobaciones anteriores. QA/DoD PASS**, autorización condicional de integración
satisfecha. Reconciliar con main conservando ambas historias y abrir PR; nunca
merge a main. CI remoto se verifica al publicar; cualquier fallo nuevo se trata
antes de considerar la integración lista para revisión.

## 2026-10-29 — Reconciliación final con main b33236e

El fetch encontró main más reciente que fa56e3e: b33236e (lookup Guest,
reportes, perfil personal y ajustes Expo). Se protegió el trabajo con los stashes
`23795845ff85ce3c790af479857e7b3e3215cac8` y el respaldo adicional de restauración;
ninguno se eliminó. El directorio temporal anterior ya no estaba disponible y se
restauró desde Git, conservando los archivos sin seguimiento incluidos en el stash.
Los logs anteriores de /tmp no están disponibles en este entorno; los resultados
previos permanecen documentados como evidencia de la ejecución anterior.

Se conservaron íntegros los documentos de main y se agregaron las entradas Valet.
Se combinaron los permisos de Reportes OPERATIONS_MANAGE con Parking/Valet.
Los tests de migración comparan contra el manifiesto actual, quitando únicamente
las migraciones que el baseline excluye; se conserva la comparación de checksums.
No se modificaron los bytes de007/008 ni se migró ninguna base operativa.

Validación posterior a la reconciliación:

- Backend:71 pruebas seleccionadas;68 PASS iniciales y3 fallos por expectativas
  obsoletas del baseline. Corregidas y repetidas exclusivamente esas3:3 PASS,
  verify/JAR BUILD SUCCESS. Incluye19 Valet HTTP/PG y26 OpenAPI PASS en la
  ejecución inicial. Total71 casos seleccionados acreditados tras la corrección.
- OpenAPI generado:114 operaciones,93 paths,144 schemas,16 tags; paridad PASS.
- Web:11 suites/67 pruebas PASS, build, lint completo y typecheck PASS.
- Android:3 suites/20 pruebas Valet PASS, detectOpenHandles y salida0 sin forceExit;
  lint y typecheck PASS. La suite normal58/566 con salida0 queda acreditada por
  la ejecución previa, no se repitió completa en esta etapa.
- git diff --check PASS. Sin patrones de claves privadas/tokens en los candidatos.
- El ERROR PostgreSQL por custodia incompatible es el negativo esperado de la
  prueba008; su rollback ocurre exclusivamente en el esquema desechable.

V2-01–V2-15 siguen cerrados con la evidencia mixta trazada arriba, sin convertir
los11/11 manuales en15/15 manuales. No hay QA manual adicional pendiente ni bloqueo
local. QA/DoD PASS; commits/PR autorizados. CI remoto se verifica tras publicar.
