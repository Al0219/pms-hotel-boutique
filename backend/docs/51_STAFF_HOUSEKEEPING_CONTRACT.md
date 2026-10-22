# Housekeeping Staff — primera integración real

Estado: **APPROVED**, contrato y matriz de acceso aprobados por José el
2026-10-21 al confirmar continuar con la implementación de frontend y backend
después de revisar esta propuesta. Implementación COMPLETADA; validación técnica
registrada en AlanHandoff y Web64, QA manual PASS confirmado por José el
2026-10-21. Se conservan los permisos aprobados. Solicitud: implementar frontend y backend de
Housekeeping, conservando los módulos existentes. Rama
`feature/staff-housekeeping-real`, base `main` `8e1abbe`.

La aprobación aplica a esta primera entrega, sin aprobar otros módulos,
discrepancias ni permisos nuevos. Contrato conforme
a [Change Control](../../docs/10_CHANGE_CONTROL.md),
[C2](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md),
[matriz de operaciones](21_BD1_API_ACCESS_CONTRACT_PROPOSAL.md) y
[Operations Web](../../frontend/pms-hotel-web/docs/17_OPERATIONS.md).

## Problema y alternativa recomendada

HousekeepingService y hk_room_states ya implementan DIRTY, CLEAN, INSPECTED y
DND. El frontend tiene tablero y transiciones, pero usa un contrato provisional
y recursos pms.test. No existe controller de Housekeeping ni BFF confirmado.
Mostrar el enlace sin resolver esto no produce una integración real.

Se propone una fachada Staff del servicio existente, DTOs explícitos y BFF
same-origin. Se descartan duplicar el motor de limpieza, enviar actorId desde
el navegador o convertir los mocks en persistencia. No requiere dependencias,
roles, permisos ni migraciones nuevos.

## Alcance de la primera entrega

- Tablero real por propiedad: código y tipo de habitación, estado de limpieza,
  DND y última actualización. Búsqueda, filtros, contadores y detalle.
- Iniciar seguimiento de una habitación física existente; marcar limpia,
  inspeccionada, devolver a limpieza con motivo y activar/desactivar DND.
- Persistencia, actor Staff confiable, auditoría append-only, control de
  concurrencia y actualización de la interfaz tras respuesta real.
- Entrada Housekeeping en el menú solo con el permiso acordado.

Discrepancias Front Office/HK, asignación de tareas a empleados, Turndown y Pickup
no se declaran integrados en esta entrega. Se conserva su código existente para
incrementos posteriores con contrato propio. Limpieza, ocupación y OOO/OOS
permanecen conceptos distintos; esta entrega no cambia ATS, reservas, tarifas,
pagos ni asignaciones físicas.

## Acceso propuesto

Ampliación aprobada posterior: [contrato52](52_ROOM_READINESS_CONTRACT.md)
habilita GET a RESERVATION_MANAGE para consulta en Habitaciones; las escrituras
y la página de gestión conservan OPERATIONS_MANAGE. La matriz siguiente describe
la primera entrega, previa a esa ampliación de lectura.

Lecturas y escrituras requieren sesión **Staff** activa y permiso existente
`OPERATIONS_MANAGE`. Según C2, lo poseen SUPER_ADMIN, GERENCIA y OPERACIONES.
RECEPCION, AUDITOR y Guest no obtienen acceso por conveniencia de navegación.
No se crea un rol Supervisor: inspeccionar/rechazar usa el mismo permiso en
este incremento. Una futura separación de funciones requiere decisión propia.

PROPERTY explícito y autorizado antes de consultar SQL. ALL_PROPERTIES no está
incluido: el usuario debe elegir un hotel. El servicio vuelve a validar sesión,
permiso y membership actuales; roomId debe pertenecer a esa property y su
organización. Actor siempre desde la sesión, nunca del body ni del query.

## Rutas propuestas

Base Backend: `/api/v1/properties/{propertyId}/housekeeping/rooms`.
UUIDs obligatorios; parámetros/body desconocidos se rechazan.

| Método | Sufijo | Cuerpo | Resultado |
| --- | --- | --- | --- |
| GET | vacío | ninguno | 200 lista del inventario físico con su seguimiento HK |
| GET | `/{roomId}` | ninguno | 200 detalle de la habitación dentro de la property |
| POST | `/{roomId}/tracking` | `{}` | 200 estado creado o seguimiento ya existente |
| PUT | `/{roomId}/status` | `{expectedStatus, expectedUpdatedAt, toStatus, reason}` | 200 estado confirmado |
| PUT | `/{roomId}/dnd` | `{expectedUpdatedAt, dnd}` | 200 estado confirmado |

GET colección: `{propertyId, rooms: [...]}`. Cada fila/detalle contiene
`roomId`, `propertyId`, `roomCode`, `roomTypeId`, `roomTypeName`, `tracked`,
`status`, `dnd`, `updatedAt`, `cleaningReason`. IDs UUID y timestamps ISO-8601 UTC.
Ampliación solicitada por José el 2026-10-22: `cleaningReason` es string nullable,
motivo vigente de devolución a limpieza cuando el estado es DIRTY; se lee de la
última transición de limpieza en la auditoría existente de esa property/estado HK.
Sin motivo registrado, sin seguimiento, CLEAN o INSPECTED devuelve null. DND no
reemplaza ese motivo. GET y respuestas de escritura lo incluyen; no se expone el
historial completo ni se modifica/borran eventos. Sin migraciones nuevas.
Colección sin paginación inicial, consistente con el catálogo físico actual;
filtros y paginación de presentación en frontend.

Si la habitación aún no tiene hk_room_states: tracked=false y status/dnd/
updatedAt=null. La interfaz muestra **Sin seguimiento**, que es una etiqueta de
presentación, no un cuarto estado persistido. GET no crea filas ni asume que la
habitación esté limpia. POST inicia DIRTY y DND=false conforme al constructor
existente, mediante acción explícita; repetirlo conserva estado y fecha.

No se añaden capacity, occupancy, huéspedes, datos personales ni fotos sin
fuente. El DTO provisional snake_case existente no se considera contrato Backend.

## Transiciones y DND

- DIRTY → CLEAN mediante markClean; CLEAN → INSPECTED mediante inspect.
- CLEAN → DIRTY es re-trabajo; INSPECTED → DIRTY es rejectInspection.
- Volver a DIRTY requiere motivo no vacío, máximo 280 caracteres, conservado
  en auditoría. INSPECTED → CLEAN y DIRTY → INSPECTED se rechazan.
- DND es overlay independiente y no sustituye el estado. No se inventa un
  bloqueo automático de limpieza por DND; cualquier política adicional debe
  aprobarse antes de aplicarla.
- Mutar una habitación sin seguimiento devuelve 409; no se registra implícitamente.

## Concurrencia, reintentos y auditoría

Mutaciones transaccionales: validar sesión/scope, bloquear Room dentro de la
property con el mecanismo existente y volver a leer el estado HK. Status exige
expectedStatus y expectedUpdatedAt; DND exige expectedUpdatedAt. Una versión
distinta devuelve 409 sin sobrescribir el cambio ajeno ni emitir audit.
No se añade una columna de versión ni se modifica una migración aplicada.

No hay retry automático de escrituras por transporte o conflicto. Ante respuesta
perdida se recarga el estado antes de repetir. Repetir un comando con versión
antigua devuelve 409; no duplica eventos. DND solicitado igual al actual, con
versión vigente, retorna el estado sin modificar fecha ni audit. POST tracking
se serializa por Room y es repetible sin reinicializar ni duplicar auditoría.

Reutilizar AuditService y los eventos HK_CLEANED, HK_SOILED, HK_INSPECTED,
HK_INSPECTION_REJECTED y HK_DND_CHANGED. La fachada registra la primera alta
como HK_TRACKED con actor Staff y deja silenciosos los replays. Auditoría y
estado se confirman en la misma transacción; conservar métodos internos y
consumidores actuales. Incluir valor anterior/nuevo de DND cuando cambie,
sin modificar eventos históricos.

## BFF y errores

Base BFF: `/api/staff/housekeeping/rooms?propertyId={uuid}`, con los mismos
sufijos y métodos. Solo cookie Staff HttpOnly y renovación Staff existente;
Guest permanece separado. POST/PUT validan Origin configurado y JSON, además
de estructura del body. Ningún token se devuelve a JavaScript.

Backend y BFF: private, no-store. Errores 400 parámetros/body inválidos; 401
Staff ausente/inválido/revocado o JWT Guest; 403 permiso/property denegados;
404 room inexistente o fuera de la property autorizada; 409 transición o versión
inválida/sin seguimiento. BFF sanea errores upstream y comunica 502/503 sin
mostrar SQL, tokens ni detalles internos. No convertir 403/409 en éxito local.

## Archivos y coordinación

- Backend operations: fachada Staff, DTO/controller, cadena Staff acotada,
  repositorios scoped/locks y pruebas PostgreSQL/HTTP/OpenAPI.
- Web housekeeping: DTO/mapper/service/hooks/UI reales; app: BFF, composición
  por PropertyContext y enlace Staff. Conservar la presentación crema/oliva.
- Contrato51, guía QA y seguimiento AlanPlan/AlanHandoff. No editar XLSX ni
  modificar auth, Reportes, checkout, finanzas o mantenimiento fuera de los
  puntos de integración mínimos.
- José integra frontend/backend. Juan aporta revisión del dominio operativo y
  Alan revisión de sesión/scope/BFF. La revisión colaborativa no sustituye las
  decisiones de producto ni bloquea por sí sola el trabajo autorizado.

## Aceptación y QA

1. PostgreSQL aislado: lectura sin escrituras, alta repetible, ciclo válido,
   rechazo/motivo, overlay DND y audit Staff atómico; conflictos y rollback.
2. Auth/HTTP: Guest/anónimo/revocado 401; rol/property ajenos 403; room ajena
   404; no queries globales ni actor falsificable; dos cambios concurrentes no
   se pisan. Sin mutación de reservas, inventario físico o dinero.
3. OpenAPI generado: paths/métodos, seguridad Bearer, UUIDs, JSON, nullability,
   timestamps, errores y cache headers consistentes con el controller.
4. Web: mappers estrictos, scope/sesión sin stale, errores/loading/empty,
   filtros, confirmaciones, motivo obligatorio, DND y permisos; BFF con CSRF/
   refresh sin cruzar Guest. Tests, lint, typecheck y build; verify Backend.
5. Navegador: login Staff autorizado, elegir hotel, iniciar seguimiento,
   limpiar/inspeccionar/rechazar con motivo y DND; recargar para verificar
   persistencia. Cambio de hotel/sesión no muestra ni modifica datos anteriores.
6. QA manual del usuario pendiente: mantener EN_QA después de la validación
   técnica; no declarar COMPLETADA sin confirmación aplicable.

No se hace commit, push ni merge sin autorización independiente. Guía Web/QA:
[Housekeeping real](../../frontend/pms-hotel-web/docs/64_STAFF_HOUSEKEEPING_REAL_QA.md).
