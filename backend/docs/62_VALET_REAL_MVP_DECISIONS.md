# Valet real MVP — decisiones previas

Estado: QA/DoD PASS; visual Web y funcional11/11 manuales confirmados; V2 cerrado con evidencia mixta. VAL-01 a VAL-05 APROBADAS por el usuario el 2026-10-27.
Android28 prevalece sobre Android18 para solicitudes simultáneas.
Autorización: usuario, 2026-10-27. Worktree `/tmp/pms-valet`, rama
`feature/valet-real-mvp`, base `main`/`origin/main` `909a12c`.
Implementación validada técnicamente; QA manual pendiente. Sin commit, push ni PR.
Esta revisión final no ejecutó migraciones en la BD del QA; se observaron007/008
ya aplicadas mediante consultas READ ONLY. Las suites usan PostgreSQL descartable.

## Fuentes actuales

- [Android18](../../frontend/pms-hotel-android/docs/18_VALET_CONTRACT_PROPOSAL.md),
  líneas15–25: vehículos y recepción simulados; permite varias solicitudes para
  un vehículo PARKED. No confirma una API Backend.
- [Android28](../../frontend/pms-hotel-android/docs/28_SESSION_SERVICE_REQUESTS_PROPOSAL.md),
  líneas11–15: selección de PARKED sin solicitud activa; Guest confirma recepción
  y devolución en sesión. Contradice Android18 sobre solicitudes simultáneas.
- [Amenidades61](61_AMENITIES_REAL_MVP.md), reglas de concurrencia: solo Staff
  completa, OPEN→IN_PROGRESS→DONE; Guest edita/cancela OPEN antes del cutoff25min.
- Web `src/modules/parking-valet/dtos/valet-request.dto.ts` declara expresamente
  PROVISIONAL su contrato; sus tipos PARKING/VALET_IN/VALET_OUT y estados
  PENDING/COMPLETED no son autoridad Backend.
- [AD-03](21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md): SERVICE_REQUEST_INTAKE lee/abre;
  OPERATIONS_MANAGE gestiona transiciones. No hace falta inventar permisos.

## Decisiones aprobadas

VAL-04 y VAL-05: ver la sección final «contrato vigente aprobado e implementado»,
que sustituye la propuesta histórica de la entrega parcial.

- **VAL-01:** solo Staff OPERATIONS_MANAGE confirma la entrega mediante
  OPEN→IN_PROGRESS→DONE; DONE y PARKED→WITH_GUEST se persisten atómicamente.
  Staff confirma retorno WITH_GUEST→PARKED sin reabrir solicitudes. Crear o
  cancelar no altera ubicación; Guest no completa solicitudes reales.
- **VAL-02:** máximo una solicitud OPEN/IN_PROGRESS por vehículo, garantizado
  en PostgreSQL. Android28 prevalece sobre Android18.
- **VAL-03:** no editar vehículos con solicitudes activas; snapshots históricos
  inmutables. El registro conserva la declaración inicial de ubicación de la UX;
  las ediciones posteriores no cambian custodia.

## Alcance ya autorizado y continuación

Implementación autorizada: contrato Guest/Staff/OpenAPI y BFF; migración PostgreSQL aditiva
con vínculos Guest/estancia/property, constraints e historial; Backend autoritativo
para placas y programación existentes; Android real conservando UX y mocks
aislados; Mis servicios con edición/cancelación elegibles y sincronización;
Web `/parking-valet` con búsqueda/filtros/acciones por permisos existentes.
Traslados reales sin éxito simulado; sin pagos, cargos, GPS ni tarifas.

## Contrato HTTP de este incremento

Implementa las decisiones aprobadas y reutiliza GuestServiceContext, ServiceRequest
categoría VALET, AuditService, seguridad y permisos existentes. No introduce roles,
permisos, pagos, tarifas ni endpoints de Traslados.

`G=/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}`
`S=/api/v1/properties/{propertyId}`

| Método y ruta | Contrato y autorización |
| --- | --- |
| GET G/valet-vehicles | Guest activo, vínculo propio persistido; vehículos de su cuenta/estancia/propiedad. |
| POST G/valet-vehicles | Mismo contexto; Idempotency-Key16–100 alfanumérica/guiones;201 creado o200 replay. |
| PUT G/valet-vehicles/{vehicleId} | Propio, sin solicitud activa; datos completos y expectedUpdatedAt;200 mismo ID. No acepta location. |
| GET G/valet-requests | Historial propio con todos los estados y snapshot del vehículo. |
| POST G/valet-requests | Propio PARKED sin solicitud activa; Idempotency-Key;201 OPEN o200 replay. No cambia ubicación. |
| PUT G/valet-requests/{requestId} | OPEN propio, cutoff25min; fecha/hora y expectedUpdatedAt. Conserva vehículo y snapshot. |
| POST G/valet-requests/{requestId}/cancel | OPEN propio, cutoff25min; solo expectedUpdatedAt; CANCELLED/replay sin borrar ni mover vehículo. |
| GET S/service-requests/valet | Staff activo, SERVICE_REQUEST_INTAKE u OPERATIONS_MANAGE y propiedad autorizada. |
| PUT S/service-requests/valet/{requestId}/status | OPERATIONS_MANAGE, misma propiedad, expectedUpdatedAt y targetStatus IN_PROGRESS o DONE. DONE confirma entrega física. |
| GET S/valet-vehicles | Mismos permisos de lectura y scope Staff; ubicación y existencia de solicitud activa, sin ID de GuestAccount. |
| POST S/valet-vehicles/{vehicleId}/return | OPERATIONS_MANAGE, propiedad autorizada; expectedUpdatedAt; confirma retorno físico sin reabrir solicitudes. |

Respuestas `private, no-store`. Cuerpos cerrados, rechazando identidades, ubicación
postregistro, precios y campos extra.400 formato/cuerpo/programación;401 sesión
ausente/revocada o audiencia incorrecta;403 Staff sin permiso/scope;404 recurso
ajeno/inexistente indistinguible;409 versión/estado/cutoff, placa duplicada, key
con payload distinto o estancia no elegible.

Registro:

```json
{"make":"Toyota","model":"Yaris","platePrefix":"P","plateBody":"123ABC","color":"Azul","location":"PARKED"}
```

Ubicación de registro es declaración inicial del Guest como en la UX existente;
no se presenta como recepción Staff verificada. Placa: catálogo existente
P/A/C/TE/U/TRC/M/MT/TC/O/CD/CC/MI/DIS, body trim/mayúsculas y
`^[0-9]{2,3}[A-Z]{3}$`, comparación prefijo+body por cuenta/estancia. Marca/modelo
trim/requeridos/max40; color opcional trim/max30, vacío→null. No consulta SAT ni
validez legal. Edición envía estos cinco datos y expectedUpdatedAt, sin location.

Crear solicitud:

```json
{"vehicleId":"<UUID del vehículo propio>","serviceDate":"2030-01-02","deliveryTime":"09:00"}
```

Edición envía serviceDate,deliveryTime,expectedUpdatedAt; no permite sustituir el
vehículo. Sincronización: conservar la cadena updatedAt exacta, incluidos
microsegundos. Cancelación/retorno solo expectedUpdatedAt; transición Staff añade
targetStatus. Estado Backend OPEN/IN_PROGRESS/DONE/CANCELLED, sin lifecycle paralelo.

Reserva CONFIRMED y estancia RESERVED/IN_HOUSE para mutaciones Guest; historial
sigue consultable tras cierre. Misma validación de Amenidades: fecha llegada→salida
inclusiva,30min de anticipación, checkout normal12:00 en timezone de propiedad,
sin late checkout simulado y rechazando hora DST ambigua/inexistente. Guest solo
edita/cancela OPEN estrictamente antes de due_at−25min. Reprogramar exige30min;
PUT idéntico es no-op dentro de la ventana modificable.

## Migración aditiva y concurrencia PostgreSQL

Changeset **005-operations-007**, archivo007-valet.yaml; no modifica migraciones
aplicadas. Tablas:

- valet_vehicles: GuestAccount, stay, property, datos normalizados, ubicación,
  versión, clave/hash inicial y marca de replay del último retorno. UNIQUE placa
  por cuenta/estancia y UNIQUE intento de registro. Sin DELETE API.
- valet_requests: PK/FK ServiceRequest(id,stay), vehículo con FK compuesta de
  cuenta/estancia/propiedad, fecha/hora, hashes inicial/actual y snapshot JSONB.
  UNIQUE intento por cuenta/estancia. No contiene importes ni coordenadas.
- Índice parcial UNIQUE(vehicle_id) WHERE active. Trigger deriva active del
  estado real de ServiceRequest; su actualización sincroniza active en la misma
  transacción. Cambiar active manualmente no libera la restricción.
- Trigger protege identidad, key/hash inicial y snapshot contra UPDATE. Cambiar
  datos del vehículo después de terminales no altera las solicitudes históricas.

Orden de locks de aplicación: Guest sesión/vínculo+stay/reserva → vehículo →
ServiceRequest. Staff permiso/scope → vehículo → ServiceRequest. Versión CAS bajo
lock. Entrega modifica solicitud, ubicación y auditoría en la misma transacción;
un rollback revierte todo. Cancelación libera el slot activo sin mover vehículo.
El retorno tiene replay por versión del último retorno; entrega posterior elimina
esa marca, evitando que un retry antiguo retorne un vehículo de otro ciclo.

Replay de creación se resuelve por key+hash inicial antes de validar horario,
ubicación o elegibilidad actuales; devuelve ID/estado actual incluso tras edición
o cancelación. Payload distinto409. Editar idéntico y repetir estado ya alcanzado
no repite auditoría. Restricción PostgreSQL impide dos activos con claves distintas.

Rollback declarado elimina solo infraestructura nueva. No ejecutar rollback con
historial real sin estrategia de conservación; no se ejecutó contra la BD del hotel.

## Auditoría y capas

Guest: VALET_VEHICLE_REGISTERED/EDITED, VALET_REQUESTED/EDITED/CANCELLED con actor
Guest de sesión, entidad y property, ubicación/programación o referencia de
vehículo; no copia placa, marca/modelo o color a auditoría. Staff reutiliza
REQUEST_STARTED/REQUEST_COMPLETED y agrega VALET_DELIVERED/RETURNED con actor Staff
y cambio de ubicación. Todo participa en la transacción existente append-only.

Android: NativeGuestClient Bearer/SecureStore y refresh existentes → DTO → mapper
con contexto → dominio → hooks Query → pantalla. Ruta selecciona real/mock por
EXPO_PUBLIC_USE_MOCK_API; sin fallback real→mock. Reutiliza modales de registro,
selector→configuración, fecha/hora, cards, swipe/confirmaciones y aviso de éxito.
La edición congela snapshot/version del borrador; refetch no autoriza sobreescribir
con una versión nueva. Fallo no navega como éxito. Reintentar el mismo intento
conserva key. No hay cola offline/persistencia local del intento: si se cierra
con resultado incierto, consultar historial antes de crear otra solicitud.

Mis servicios/Inicio coordinan las cuatro fuentes persistidas, vacío solo tras
éxito vacío de todas; conservan datos válidos ante fallo y filtros existentes.
Polling compartido10s solo visible/foreground con solicitudes activas; foco y
foreground refrescan. Las tarjetas reales Valet no completan ni cambian ubicación.
Vehículos se actualizan al cambiar historial y al refrescar pantalla; sin copia
session-only. Traslados reales muestran no disponible y no invocan mutations mock.

Web: StaffShell, PropertySwitcher, tabla operacional con búsqueda por placa,
marca/modelo, referencia/habitación, filtros fecha/estado y confirmaciones; tabla
adicional de custodia permite retorno Staff. INTAKE solo lectura. Cambiar sesión/
propiedad desmonta confirmaciones, aborta mutation y separa caches; logout limpia
staff-valet. BFF interno `/api/staff/valet/requests` y `/vehicles` con propiedad en
query; status PUT y return POST. Cookie HttpOnly Staff, same-origin en escrituras,
allowlist de ruta/body/respuesta y errores seguros. Nunca cookie Guest ni éxito
optimista. Backend revalida todo antes de consultar o mutar.

## Validación y QA

OpenAPI generado y paridad con mappings, sin exclusiones nuevas. Inventario
actual:103 operaciones/83 paths/129 schemas/15 tags. Backend verify1174 PASS,
focal36 PASS y verificaciones finales de migración1/custodia10 PASS. Android
56 suites/553 pruebas PASS y focal real7 PASS; Web352 suites/2683 pruebas PASS
y focal17 PASS. Lint/typecheck, export Android, build Web y diff-check PASS.
Jest completo dejó handles abiertos tras su resumen; procesos propios detenidos
sin forceExit. Focal real --detectOpenHandles termina con salida0.
Evidencia y limitaciones registradas en AlanHandoff.
Se añadió validación de migración desde main, checksums/datos previos/reaplicación,
SQL del índice/snapshot, concurrencia de creación y start/cancel, permisos,
propiedad/titularidad, versiones/replays y rollback entrega/vehículo/auditoría.

QA manual y comandos: [Android45](../../frontend/pms-hotel-android/docs/45_VALET_REAL_MVP_QA.md).
Mantener EN_QA hasta PASS manual explícito del usuario. Sin commit, push ni PR.

## Iteración UX y reutilización — alcance parcial en curso

Solicitud del usuario posterior al QA H1/H2. Estado general **EN_QA**; no PASS
manual, commit, push ni PR. El modelo reutilizable aún no se implementa: hay
reglas de custodia pendientes de respuesta. No se modificó007-valet.yaml ni se
aplicó una migración nueva a la BD del hotel.

### Implementado sin depender de esas decisiones

Web prioriza Vehículos registrados. Solicitudes Valet inicia colapsado, con
button/aria-expanded/aria-controls, contador de OPEN/IN_PROGRESS y chevron.
Su contenido usa hidden y permanece montado: conserva filtros y estado de
mutación. ConfirmDialog y mutation siguen en el workspace, fuera del panel.
Hay actualización en el panel y actualización de vehículos en cabecera.

La proyección ValetVehicle amplía las lecturas existentes con reservationId,
confirmationCode, roomCode nullable, stayStatus, reservationStatus, stayActive y
operationallyVisible. Los campos salen de JOINs scoped por propiedad en Backend,
no de mocks o flags locales. Auth/permisos no cambian. El BFF valida/proyecta los
campos y comprueba coherencia de los indicadores; no expone GuestAccountId.

stayActive conserva la elegibilidad de estados existente: reserva CONFIRMED y
estancia RESERVED/IN_HOUSE. No inventa un estado de estancia ni la finaliza por
reloj. operationallyVisible = stayActive OR location PARKED OR solicitud activa.
La lista por defecto usa este último criterio: una estancia terminada con
vehículo PARKED/operación pendiente no desaparece. El historial sigue disponible
por filtro explícito. Los GET no cambian custodia, estado o historial.

Filtros Web: ubicación ALL/PARKED/WITH_GUEST; estancia OPERATIONAL por defecto,
ACTIVE, INACTIVE o ALL; búsqueda por tokens de placa, marca, modelo, reserva y
habitación. Orden PARKED primero, luego placa/referencia/ID estable. El selector
de propiedad autorizada sigue siendo PropertySwitcher de StaffShell, y Backend
revalida scope antes de consultar. No se consultan propiedades globales para
filtrarlas después. Contadores derivados de registros operativos y solicitudes
pendientes de la propiedad. En esta entrega parcial todavía no había identidad
guardada; esta limitación histórica queda resuelta por VAL-04/05 abajo.

### Diagnóstico y propuesta histórica del modelo reutilizable (superada por VAL-04/05)

El modelo007 guarda GuestAccount+stay+property+datos+location en valet_vehicles,
con UNIQUE(account,stay,prefix,body). Por eso exige registrar el mismo automóvil
en otra estancia y permite duplicados de la placa entre estancias. Los
vehicle_id de solicitudes y su snapshot se refieren hoy al registro operativo.
No basta quitar stay_id ni mover el registro de una estancia a otra: rompería
historial y custodia, y las FKs/snapshots existentes deben conservarse.

Propuesta histórica previa a la aprobación. La implementación vigente está en la sección siguiente:

- Nueva tabla de vehículos guardados por GuestAccount, UNIQUE(account,prefix,body),
  sin property, stay ni ubicación física. Identidad estable y datos editables.
- Conservar filas e IDs actuales de valet_vehicles como asociaciones operativas;
  agregar FK a identidad guardada y UNIQUE(saved_vehicle,stay). No borrar ni
  recrear registros ni reescribir snapshots de valet_requests.
- Backfill agrupado por cuenta/placa normalizada; conservar datos históricos de
  cada asociación. La consolidación y sus posibles discrepancias deberán tener
  evidencia de upgrade/checksums y pruebas antes de ejecutarse.
- Identidad guardada en solicitudes, FK coherente con asociación y restricción
  PostgreSQL de máximo una solicitud activa por vehículo guardado. Si existen
  operaciones previas incompatibles, detectarlas sin cancelarlas ni completarlas
  silenciosamente. Una migración no puede fingir que se resolvió una custodia.
- GET de vehículos guardados por sesión Guest; asociación explícita a su estancia
  propia, idempotente y con ubicación inicial explícita. No copiar location ni
  solicitudes anteriores. Android separará lista guardada de asociaciones y
  conservará el historial de solicitudes scoped por estancia.

### Consulta histórica de custodia (resuelta en esta iteración)

Se presentó al usuario una pregunta con estas propuestas; silencio no es aprobación:

- **VAL-04 propuesta:** impedir una nueva asociación mientras ese vehículo esté
  PARKED o tenga OPEN/IN_PROGRESS en otra estancia; evita custodia simultánea.
- **VAL-05 propuesta:** Staff OPERATIONS_MANAGE puede confirmar entrega física
  sin solicitud cuando la estancia terminó y el vehículo sigue en parqueo, con
  versión, lock y auditoría. Actualmente la entrega requiere una solicitud
  IN_PROGRESS; mantener visible el registro por sí solo no resuelve este caso.

Esta espera quedó resuelta por la aprobación explícita de VAL-04/05. El registro siguiente conserva el contexto de la entrega parcial anterior.
Los cambios de lectura/listado/panel no conceden esta acción nueva ni simulan
reutilización persistida. QA y evidencia de lo implementado: QA45, sección de
esta iteración. Mantener EN_QA y distinguir avance parcial de MVP completo.

Validación de la parte implementada: Backend focal36 y verify1175 PASS; Web focal
8 suites/47 pruebas y suite353/2695 PASS; lint/typecheck/build Web y diff-check PASS.
OpenAPI conserva103 operaciones/83paths/129schemas/15tags, con nuevas propiedades
Vehicle verificadas estructuralmente y sin exclusiones. Android y migración007
sin cambios; pruebas de reutilización/migración008 pendientes, no simuladas.


## VAL-04 y VAL-05 — contrato vigente aprobado e implementado

**Estado EN_QA.** Aprobación explícita del usuario en esta iteración; sustituye la
propuesta y limitaciones de la entrega parcial anterior. Sin commit, push ni PR;
no se atribuye PASS manual. Traslados, pagos, GPS y tarifas siguen fuera de alcance.

- **VAL-04:** identidad persistente por GuestAccount y placa normalizada única en
  esa cuenta. Asociaciones propias independientes por estancia/propiedad. Bloquear
  nueva asociación si hay otra operativa: estancia CONFIRMED+RESERVED/IN_HOUSE,
  custodia PARKED o solicitud OPEN/IN_PROGRESS. Incluso WITH_GUEST en estancia
  vigente bloquea una nueva asociación. Máximo una asociación operativa y una
  solicitud activa por identidad guardada, garantizadas en PostgreSQL.
- **VAL-05:** solo Staff OPERATIONS_MANAGE y propiedad autorizada confirma entrega
  excepcional cuando la estancia es CHECKED_OUT/CANCELLED/NO_SHOW, el vehículo
  sigue PARKED y no tiene solicitud activa. Confirmación explícita, CAS y locks;
  PARKED→WITH_GUEST y liberación operativa atómicos, auditados. No crea solicitudes
  ni toca las históricas. Retorno físico sigue exclusivo Staff; no puede reactivar
  una asociación histórica si otra asociación del vehículo ya está operativa.

### Identidades y endpoints adicionales

`vehicleId` conserva el significado y los IDs existentes: **asociación operativa**.
`savedVehicleId` es la identidad de la cuenta, distinta y estable entre estancias.
Nunca enviar el ID guardado como vehicleId de una solicitud. Las solicitudes
continúan scoped por Guest, reserva, estancia y propiedad, con snapshot inmutable.

| Método y ruta | Contrato |
| --- | --- |
| GET /api/v1/guest-auth/account/valet-vehicles | Guest activo; lista únicamente su cuenta, sin seleccionar accountId. SavedVehicle: id, make, model, platePrefix, plateBody, color, createdAt, updatedAt, canAssociate. Sin propiedad, ubicación ni solicitudes. |
| POST G/valet-vehicles/associate | Guest con vínculo propio y estancia elegible; Idempotency-Key; cuerpo cerrado {savedVehicleId,expectedVehicleUpdatedAt,location}. location obligatorio PARKED/WITH_GUEST elegido explícitamente. 201 nueva asociación/200 replay; 400 inválido,401 sesión,404 identidad/contexto ajeno,409 versión/ocupación/duplicado. |
| POST S/valet-vehicles/{vehicleId}/release | Solo Staff autorizado; cuerpo cerrado {expectedUpdatedAt},200 asociación WITH_GUEST;400 inválido,401 sesión,403 permiso/scope,404 asociación,409 versión/estado. |

GET/POST/PUT de asociación incorporan savedVehicleId y canRelease, además de la
proyección vigente. canRelease solo equivale a estancia terminal AND PARKED AND
sin solicitud activa; no concede permisos. Backend revalida todos los requisitos
al mutar. BFF Web homónimo `/api/staff/valet/vehicles/{vehicleId}/release?propertyId=...`,
solo cookie Staff, mismo origen, allowlist y validación de respuesta, private/no-store.

Registro nuevo crea identidad+asociación en una transacción; duplicado de placa en
la misma cuenta devuelve409, incluso si está en otra estancia. Edición actualiza
identidad guardada y solo la asociación actual elegible; conserva datos originales
de asociaciones anteriores y todo snapshot de solicitudes. No permite editar con
solicitud activa. No existe eliminación al terminar reserva. GET no asocia ni mueve.
La ubicación nueva se declara, nunca se copia del registro previo. Tampoco se copian
solicitudes, historial ni versiones de la asociación anterior.

Idempotencia: registro/asociación guardan clave+hash por cuenta/estancia; replay
exacto devuelve el mismo ID antes de elegibilidad, payload distinto409. Release
conserva versión origen y solo repite la misma entrega física: una nueva custodia
invalida esa marca. Reintento no duplica auditoría. Locks de identidad guardada y
asociación, versiones temporales completas y constraints resuelven carreras;
conflictos de integridad/concurrencia tienen respuesta409 segura. Auditoría Staff
VALET_EXCEPTIONAL_DELIVERY registra actor, asociación, savedVehicleId, propertyId,
stayId y confirmedAt; ubicación y liberación se revierten junto con auditoría si
falla la transacción. Historial de solicitudes no se modifica.

### Migración008 aditiva y compatibilidad

007 se conserva byte por byte. 008 crea valet_saved_vehicles y agrega FK de identidad
a valet_vehicles y valet_requests; mantiene IDs, placas/datos originales, custodia,
keys, versiones y snapshots existentes. Agrupa por cuenta+prefijo+placa normalizada;
ID guardado determinista de la fila más antigua (createdAt,id), datos canónicos de
la edición más reciente (updatedAt DESC,id); no reescribe el histórico. Backfill
operational_active refleja estancia/reserva, ubicación y petición persistidas.

Constraints: UNIQUE(account,prefix,body), UNIQUE(saved,stay), FK compuesta owner y
solicitud/asociación; índices parciales únicos sobre saved_vehicle_id WHERE
operational_active y WHERE active. Triggers derivan flags al asociar, actualizar
custodia, cambiar estado de petición, estancia o reserva; no se libera el cupo
mediante flags del cliente. Toda nueva asociación bloquea identidad en PostgreSQL.

Preflight de solo lectura **antes** de desplegar en una BD con datos007:

```sql
SELECT v.guest_account_id,v.plate_prefix,v.plate_body,count(*) AS incompatibles
FROM valet_vehicles v
JOIN reservation_stays s ON s.id=v.stay_id
JOIN reservations r ON r.id=s.reservation_id
WHERE v.location='PARKED'
   OR (r.status='CONFIRMED' AND s.status IN ('RESERVED','IN_HOUSE'))
   OR EXISTS(SELECT 1 FROM valet_requests q WHERE q.vehicle_id=v.id AND q.active)
GROUP BY v.guest_account_id,v.plate_prefix,v.plate_body HAVING count(*)>1;
```

Si devuelve filas, conciliar explícitamente las operaciones físicas con Staff;
la migración rechaza la inconsistencia y revierte íntegramente008. No elimina,
cancela ni entrega para conseguir que pase. Upgrade y reejecución prueban checksums
y columnas originales intactos; prueba adicional comprueba rollback ante conflicto.
No se ejecutó sobre BD del hotel. No usar rollback destructivo una vez creados
vehículos/asociaciones nuevos sin plan de retención y respaldo autorizado.

### Android y Web

Android HTTP consulta vehículos guardados por cuenta, lista aparte los asociados a
la estancia, permite reutilizar disponibles con ubicación explícita y bloquea
custodias/estancias incompatibles. Duplicados se validan contra la lista guardada;
Backend sigue siendo autoridad. Query keys de datos operativos incluyen cuenta,
reserva y estancia; workspace/dialog se reinician al cambiar ese contexto. Vehículos
guardados se cachean solo por cuenta; no contienen ubicación/historial. El polling
actualiza disponibilidades tras acciones Staff. Intento/versión se conservan para
reintento incierto; no simula éxito ni incluye confirmaciones Guest. Mocks separados.

Web conserva vehículos predominantes, filtros autorizados, orden PARKED primero e
historial separado. UX definitiva aprobada: panel principal solo con tres cards
En parqueo/Con huésped/Solicitudes, filtros y tabla de vehículos. El tercer card
es el único acceso a un Modal compartido superpuesto con solicitudes; no existe
panel/card/encabezado/tabla de solicitudes inline debajo. Cerrar/Escape, foco,
teclado y diseño responsive; filtros se mantienen en el workspace, datos en Query
y confirmaciones/mutaciones permanecen independientes del cierre. Una sola
asociación operativa por identidad evita duplicar vehículos operativos; filas
históricas representan asociaciones. Acción Confirmar entrega pendiente solo si
canRelease y permiso; ConfirmDialog antes de POST. StaffShell, PropertySwitcher,
tokens Inter/Lora y componentes compartidos se conservan.

Pruebas técnicas y pasos de repetición manual: QA45, sección VAL-04/VAL-05. La
aprobación funcional no equivale a PASS manual; mantener EN_QA hasta confirmación.


## Revisión final — confirmación manual y gate de integración

VAL-01 a VAL-05 siguen implementadas y coherentes: Staff confirma transiciones
físicas; unicidad activa en PostgreSQL; edición bloqueada y snapshots inmutables;
identidad Guest reutilizable con asociaciones aisladas; entrega excepcional terminal
sin petición artificial, atómica e idempotente con auditoría y scope.

Usuario confirma QA visual Staff PASS y funcional11/11 PASS. QA45 registra la
confirmación literal y su contraste con V2-01–V2-15; no se infiere cobertura de
concurrencia, reintentos, navegación, snapshots, mock/Traslados o ensayo de upgrade
que no esté acreditada por caso. La evidencia automática permanece separada.
El cierre DoD y publicación/PR están condicionados a completar esa trazabilidad.
La autorización de integración no incluye merge a main.

La documentación anterior de panel desplegable/QA pendiente general se conserva
como historial de iteraciones; prevalecen la UX modal definitiva y la matriz final
de QA45. La auditoría de007/008 no modifica migraciones aplicadas ni datos de QA.


## Cierre de pendientes DoD por evidencia automatizada

Según autorización posterior del usuario, QA45 acredita cada pendiente V2-01–15
con archivo/test/resultado. No se convierte11/11 en15/15 manual: se conserva el
PASS humano y se completa lo específico automáticamente. No quedan casos manuales
adicionales identificados ni bloqueos técnicos. QA/DoD PASS; publicación por PR
condicionada a checks remotos; no merge.

El nuevo test usa dos clientes HTTP y dos sesiones Guest independientes, PG real
desechable y respuestas descartadas/reintentadas. Detectó un409 reemplazado por401
al despachar /error. Corrección limitada a los controladores Valet: ProblemDetail
directo para400/404/409 y errores de binding, sin abrir /error ni modificar Auth.
OpenAPI y negativos HTTP reales lo verifican; reglas VAL-01–05 y007/008 sin cambios.

Jest ya termina normalmente: limpieza explícita de clientes Query de pruebas y
destrucción de timers de mutaciones, sin forceExit ni cambio de gcTime productivo.
Evidencia: Backend46 focales + JAR, Android20 focales y58 suites/566 tests normales
salida0, Web64 focales, lint/typecheck PASS. Se conserva la validación completa
anterior1181/2701 y los builds frontend, sin repetirlos innecesariamente.

## 2026-10-29 — Integración preparada sobre b33236e

VAL-01–05 y matriz V2-01–V2-15 coherentes, QA/DoD PASS con evidencia mixta
registrada en QA45. Main actualizado preservado sin cambiar007/008; baselines de
pruebas ajustados al manifiesto actual.71 casos Backend seleccionados acreditados
tras corregir3 expectativas de baseline; verify/JAR PASS. OpenAPI114/93/144/16.
Web67 y Android20 focales PASS, lint/typecheck y build Web PASS. No QA manual
adicional pendiente; CI remoto se verificará al publicar. No merge autorizado.
