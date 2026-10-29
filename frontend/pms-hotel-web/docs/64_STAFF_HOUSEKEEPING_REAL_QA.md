# Housekeeping Staff — integración real y QA

## Corrección de motivo y foco — 2026-10-22

Estado del ajuste: COMPLETADA; José confirmó QA manual propio PASS y autorizó
commit/push el 2026-10-22. El cierre anterior se
conserva como histórico. José solicita poder escribir seguido sin perder foco
y mostrar el motivo guardado en la descripción de la habitación. El Modal separa
el enfoque inicial de los listeners; polling/foco automáticos se pausan durante
la confirmación, conservando el token de concurrencia y el manejo de409.
La lectura real/BFF proyecta `cleaningReason` desde auditoría existente, visible
en el detalle mientras DIRTY. Recargar o cambiar DND no pierde el motivo;
marcar limpia lo retira de la descripción vigente, sin borrar la auditoría.
QA: rechazar INSPECTED escribiendo una frase con espacios sin volver a hacer clic;
confirmar, ver motivo en detalle, recargar y contrastar; limpiar y comprobar que
ya no figura como causa vigente. Sin nuevos permisos ni datos locales simulados.

Evidencia automatizada del ajuste: Web84 PASS/18 archivos con timeout original;
typecheck y lint PASS. Backend verify focalizado41 PASS/BUILD SUCCESS con
Java21/PostgreSQL17, cubriendo ciclo de motivos/DND/lecturas tras limpiar el
contexto JPA, permisos/property scope, concurrencia y OpenAPI nullable requerido.
La prueba de escritura continua falló antes del arreglo (solo primera letra y
guardado accidental al escribir un espacio). El QA manual de José se confirma
separadamente; no se atribuye una ejecución completa nueva de887 casos a este ajuste.
Regresión adicional de composición Habitaciones:4 PASS/1 timeout5s en la primera
ejecución local; repetición del archivo completo5 PASS con --testTimeout=30000
solo en CLI. No se cambia la configuración del repo ni se omiten assertions.
Build producción Backend/Web PASS; Web usa la imagen local de dependencias del
mismo package/lock, comprobados byte a byte por override temporal fuera del repo.
Chrome real3001:7 comprobaciones PASS, cero excepciones JS/5xx. Escritura letra
a letra con espacios/tildes mantiene foco y valor más de30s; cancelar conserva
estados/versiones/motivos. Motivo existente visible en detalle tras recargar;
móvil390px sin overflow. No se guardaron nuevos rechazos sobre habitaciones del
usuario. SQL antes/después conserva2 propiedades/24 rooms/2 reservas/5 estados HK
y25 eventos audit. Backend/Web/PostgreSQL saludables; volumen original intacto.
Artefactos en temporal pms-hk-reason-qa y backend/target ignorado. Commit/push
autorizados en la misma rama; sin merge ni atribución de checks remotos.

Ampliación posterior: [Web65](65_ROOM_READINESS_QA.md)/contrato52 habilita lectura
de limpieza para Recepción desde Habitaciones. Los casos403 de lectura descritos
abajo son evidencia histórica del incremento51, no la política actual ampliada.
Escrituras y página de gestión HK conservan OPERATIONS_MANAGE.

Estado: COMPLETADA; validación técnica PASS y QA manual PASS confirmado por
José el 2026-10-21. Se conservan los permisos aprobados; commit y push autorizados,
sin merge a main ni atribución de checks remotos.
Owner: José, frontend y
backend, autorizado el 2026-10-21. Rama `feature/staff-housekeeping-real`, base
main `8e1abbe`. Contrato aprobado:
[Backend51](../../../backend/docs/51_STAFF_HOUSEKEEPING_CONTRACT.md).
Incremento sobre la base de IMP-WEB-0501 y el overlay DND de IMP-WEB-0502; no
marca esas filas históricas como COMPLETADAS ni modifica el XLSX.

## Qué incluye

`/housekeeping` usa PropertyContext y la sesión Staff vigente; no obtiene su
scope de NEXT_PUBLIC_PROPERTY_ID. En PROPERTY concreta y con OPERATIONS_MANAGE
permite consultar habitaciones físicas, iniciar seguimiento, limpiar,
inspeccionar, devolver a limpieza con motivo y activar/desactivar DND.
La misma composición usa backend real con ambos valores del flag de mocks.

El tablero conserva la paleta crema/oliva, búsqueda por código/tipo, filtros de
limpieza/tipo/DND, resumen de estados, paginación y detalle. Lectura vacía, falta
de acceso, conexión interrumpida y actualización en curso tienen estados propios.
Los valores anteriores se ocultan durante refetch y cambio de contexto; el
componente se remonta por sesión/property y aborta las escrituras al salir.

Sin seguimiento significa ausencia de fila HK, no un cuarto estado de limpieza.
GET no registra habitaciones. El usuario inicia el seguimiento explícitamente;
el estado inicial persistido es DIRTY. OOO/OOS y ocupación son independientes,
y esta entrega no cambia reservas, habitaciones físicas, tarifas o dinero.

Discrepancias FO/HK, Turndown, Pickup, asignación de tareas y automatismos de
check-in/check-out no están integrados en esta entrega. Sus componentes previos
se conservan; no se presentan como operaciones reales del nuevo tablero.

## Transporte, permisos y concurrencia

Service → DTO → Mapper → Domain → Hook → UI. DTO real separado del provisional;
mapper rechaza propiedad/ID distintos, IDs duplicados y estados incoherentes.
updatedAt conserva exactamente el string UTC de PostgreSQL, sin convertir el
token a milisegundos de JavaScript. La fecha visible sí se formatea según hotel.

BFF interno `/api/staff/housekeeping/rooms?propertyId={uuid}`, con GET detalle y
POST tracking/PUT status/PUT dnd por roomId. Solo cookie Staff HttpOnly; origen
configurado y JSON obligatorios para escribir. Refresh Staff compartido solo
ante401; no retry automático por transporte,409 o5xx. Errores saneados y
respuestas private,no-store. El worker propio excluye esos métodos/rutas de MSW.

OPERATIONS_MANAGE autoriza lectura y escritura. C2 lo concede a OPERACIONES,
GERENCIA y SUPER_ADMIN; no se concede a RECEPCION por mostrar más módulos.
Ocultar el menú no sustituye la validación Backend de sesión, permiso y scope.
ALL_PROPERTIES exige elegir un hotel. No se introducen roles o permisos nuevos.

Los comandos usan la versión leída y bloqueo transaccional de Room. Un409 no
muestra éxito ni sobrescribe al otro usuario. Ante un error o resultado incierto
la UI pide actualizar antes de otro intento. La confirmación bloquea doble clic;
volver a DIRTY exige motivo, hasta280 caracteres. Auditoría y cambio se confirman
juntos; DND registra valor anterior/nuevo y no reemplaza el estado de limpieza.

## Cómo probarlo manualmente

1. Con la rama revisada, arrancar desde la raíz:
   `docker compose up -d --build --wait`. Conserva el volumen existente; no usar
   down -v para actualizar esta entrega. Abrir `http://localhost:3001/acceso`.
2. Usar una cuenta Staff propia con OPERATIONS_MANAGE y una property autorizada.
   La cuenta demo de Recepción existente no tiene ese permiso; no cambiarla de
   rol ni ampliar sus permisos para ocultar un403. Usar la cuenta autorizada de
   Operaciones/Gerencia/Superadmin que corresponda al entorno.
3. Abrir Housekeeping desde el menú y elegir un hotel concreto. Verificar que
   los códigos/tipos coincidan con Habitaciones. Si no hay inventario físico,
   debe mostrarse vacío; no se crean habitaciones desde Housekeeping.
4. Elegir una habitación sin seguimiento. Iniciar seguimiento y confirmar:
   aparece Sucia. Recargar y comprobar que permanece registrada.
5. Marcar limpia → inspeccionada → rechazar inspección. Sin motivo no se permite
   confirmar. Con motivo se guarda Sucia; repetir limpieza y comprobar el ciclo.
6. Activar/desactivar No molestar: el badge cambia y el estado de limpieza
   permanece igual. Recargar para comprobar persistencia. DND es un indicador;
   no se inventa una prohibición automática de limpiar en este contrato.
7. Probar filtros, búsqueda, limpiar filtros y paginación; comprobar escritorio
   y móvil. Cambiar propiedad: no deben aparecer habitaciones del hotel anterior.
8. En dos ventanas con la misma habitación, guardar un cambio en una y después
   usar la versión anterior en otra. Debe aparecer conflicto, sin éxito falso;
   actualizar datos y comprobar el estado real antes de continuar.
9. Cerrar Staff y volver a la URL: el guard dirige al inicio. Una sesión Guest
   independiente se conserva y no concede acceso a esta API. Una cuenta sin
   OPERATIONS_MANAGE no ve el enlace y el acceso directo informa falta de permiso.

Los comandos de QA automatizado usan PostgreSQL aislado, sin datos reales del
hotel. El QA manual del usuario sigue siendo necesario antes de COMPLETADA;
no se atribuye a revisores ni al usuario un resultado no confirmado.

## Evidencia técnica de esta entrega

- Backend Java21/PostgreSQL17: `./mvnw -B verify`,879 PASS/BUILD SUCCESS. Después
  del último ajuste de nulabilidad OpenAPI, verify focalizado de
  StaffHousekeepingIntegrationTests y OpenApiContractIntegrationTests:26 PASS.
  Logs/reports/OpenAPI/JAR en backend/target/housekeeping-* (ignorados).
- Web, Node24/Linux: `npm run test -- --maxWorkers=1 --reporter=verbose`,
  306 archivos/1863 casos:1862 PASS y1 timeout5s en public-real-checkout existente.
  Repetición íntegra de ese archivo:25 PASS con el mismo límite; el caso inicial
  pasa en4.46s. Los1863 casos quedan verificados entre ambas ejecuciones; la
  suite inicial terminó con exit1 y no se presenta como una sola ejecución PASS.
  Ejecuciones previas Windows/paralela afectadas por lentitud/timeouts no cuentan
  como suites PASS. No se modificaron fuentes de checkout, assertions ni timeouts.
- `npm run build` (DOCKER_BUILD=true, mocks=false), `npm run typecheck` y
  `npm run lint`:PASS. No se cambian dependencias/lockfiles ni workflows.
- Chrome real contra BFF/API/PostgreSQL aislados:9 comprobaciones PASS; sesión
  Operaciones, menú/rooms reales, seguimiento persistente tras reload, ciclo con
  motivo obligatorio, DND independiente, comando viejo409, móvil390px sin overflow,
  logout y Recepción denegada. Cero excepciones JS. Capturas escritorio/móvil
  revisadas. SQL confirma6 eventos con actor Staff esperado y sin duplicar replay.
- Artefactos de Web/navegador en el directorio temporal
  pms-housekeeping-browser-qa. CI de GitHub no ejecutado; sin commit/push/merge.

## Actualización del entorno local3001

José autorizó reconstruir la rama en el entorno habitual. Backend y Web se
reconstruyeron con los Dockerfiles existentes, mocks=false; Compose terminó
con los tres servicios saludables en `http://localhost:3001`. PostgreSQL conserva
su contenedor/volumen y se guardó una copia previa fuera del repositorio. La
preview aislada3101 usada en la validación anterior quedó detenida.

El recorrido real verifica Inicio, catálogo, detalle, checkout Guest y
confirmación persistida; el pago sigue siendo SIMULATED, sin tarjeta ni cargo
bancario. ATS disminuye exactamente1. Recepción encuentra esa reserva, asigna
una habitación física y consulta Habitaciones, Calendario y on-books. El tablero
de habitaciones muestra la reserva en su fecha de llegada. Logout vuelve a
Inicio y Recepción recibe403 en HK. Se reutilizó la misma reserva al repetir
verificaciones, sin duplicarla; no se creó una GuestAccount.

El bloqueo inicial por ausencia de Admin quedó resuelto: José autorizó crear
la cuenta QA local con el bootstrap existente. El alta se realizó desde un
contenedor one-off con la imagen actual, sin reiniciar el sistema ni editar .env,
Compose, roles de Recepción o fuentes de seguridad. Se verificaron cuenta activa,
membership y un único evento STAFF_BOOTSTRAP_CREATED. El contenedor temporal se
retiró y eliminó al terminar; las credenciales no se guardaron en archivos.

Resultado integrado final PASS:17 comprobaciones en navegador contra3001,
cero excepciones JS/respuestas5xx. Superadmin accede desde el formulario de login
y consulta una property concreta. En la201 se guardó seguimiento, limpieza e
inspección y se activó/desactivó DND sin alterar la limpieza. Reload confirma
INSPECTED/DNDfalse; SQL confirma5 eventos HK con actor Admin correcto. ATS permanece
igual después de Housekeeping. Logout retorna a Inicio y bloquea rutas Staff.
Recepción conserva su restricción403. Se reutilizó la misma reserva de QA, sin
duplicar recibos ni crear cuentas Guest; creación/ATS-1 constan en la ejecución
anterior. La validación aislada previa se conserva como evidencia separada.
Artefactos, recibo, captura y backup en temporal pms-housekeeping-local3001-qa,
fuera del repo. La cuenta de QA es exclusiva de esta base local; no se propaga
a otros entornos mediante Git. Credenciales comunicadas al usuario por separado.

José confirmó el QA manual PASS y autorizó commit/push el 2026-10-21; incremento
COMPLETADO. No se autoriza merge ni se atribuye CI remoto. Detalle operativo en
AlanHandoff; el resultado automatizado anterior no se presenta como una ejecución nueva.
