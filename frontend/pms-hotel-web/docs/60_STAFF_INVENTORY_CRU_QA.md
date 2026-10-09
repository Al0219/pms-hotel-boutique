# Staff Habitaciones — C/R/U real y UI compacta

Estado: **COMPLETADA**; QA manual real **PASS** confirmado por Alan el
2026-10-08. Base `main 63279d7`, rama
`feature/staff-room-inventory-read`. Sin commit/push/merge ni cambios al XLSX.

## Cierre del incremento — QA manual real PASS, 2026-10-08

Alan confirmó «QA manual real: PASS» y autorizó marcar **COMPLETADA** la
integración Staff de Habitaciones/C-R-U y el ajuste visual/paginación asociado.
Se registra el resultado comunicado por el owner; este cierre documental no
repite QA PostgreSQL ni inventa evidencia por caso, IDs o respuestas HTTP.

Alcance cerrado: Staff/PropertyContext reales, BFF same-origin/HttpOnly, lectura
Inventory/RoomTypes y stays reales de Staff Reservations por roomId/null;
crear Room, editar su código, crear RoomType y editar código/nombre conforme a
contratos16/17; tabla agrupada, edición inline, sidebar, filtros compactos y
paginación compartida5/10/25/50/100 (default25, reinicio por tamaño/filtros/propiedad).
Métricas y Sin asignar se conservan completos, fuera del slice de filas.

**DELETE continúa bloqueado:** sin contrato/operación canónica ni política de
baja/retención aprobada. No se cierra esa capacidad ni se simula delete/archive.
**Siguiente incremento: asignación física**, fuera de esta entrega y sin iniciar.
Antes de implementarlo, verificar su DoR, contrato y decisiones aplicables; este
cierre no autoriza nuevas APIs ni concede READY por la sola lectura de roomId.
Limpieza, OOO/OOS, ATS, fotos, notas, piso y status-change siguen fuera del alcance.

Evidencia técnica conservada: suite relevante416 PASS/70 archivos y focalizados
finales32 PASS/3 archivos; typecheck/lint/build con mocks=false y diff-check PASS.
Los resultados anteriores y estados EN_QA siguientes describen cada entrega
histórica y quedan supersedidos por este cierre. Aquí solo se actualizan58/59/60
y el seguimiento pertinente en AlanPlan/AlanHandoff; se ejecuta diff-check, sin
repetir suites ni modificar código funcional, Backend, contratos o fixtures.

## DoR y autorización

Esta solicitud amplía explícitamente el incremento de lectura58 y conserva el
sidebar59, Staff/PropertyContext reales y la relación por roomId/null. Filas Web
relacionadas: IMP-WEB-0301 (Reservas) y 0308 (Calendario); no hay fila específica
para C/R/U del inventario en esta pantalla. Owner UI WEB-3/José, reviewer WEB-4;
owner de integración/QA Alan. No se inventa ID ni se modifica el XLSX.

DoR confirmado antes de implementar: contratos aprobados
[RoomTypes16](../../../backend/docs/16_BD2_ROOM_TYPES_CRUD_CONTRACT_PROPOSAL.md) y
[Rooms17](../../../backend/docs/17_BD2_ROOMS_CRUD_CONTRACT.md), controllers actuales
POST/PATCH, Staff Auth/C2 y PostgreSQL integrados. AlanPlan registra BD2-007B,
BD2-008 y cierre BD2-010 COMPLETADA. La solicitud define aceptación, campos,
patrón inline, errores y pruebas. DELETE queda bloqueado por separado según17.
No se modifican Backend, migraciones, OpenAPI/Swagger ni Postman: sus endpoints
existentes bastan. Las evidencias Backend históricas no se presentan como una
nueva ejecución de tests Backend en esta entrega Web.

## UI y fuente de datos

Se retiran los textos/encabezados y acciones superiores solicitados de Reservas
y Habitaciones, sin conservar sus bloques vacíos. Filtros y tablas reutilizan
`entity-workspace.module.css`, los tokens y EntityDataGrid: controles46px,
bordes/radios/padding/focus compartidos, misma densidad y header; StatusBadge
compartido. Reservas conserva sus columnas agrupadas, filtros y paginación;
Habitaciones conserva Identidad/Contexto/Relación/Estado, vistas, fecha/Hoy/
Actualizar, métricas, filtros y Sin asignar plegable.

En modo real, **Administrar inventario** permite crear habitaciones/tipos con
panel compacto. Celdas permiten Guardar/Cancelar inline; código de habitación
también editable en el tablero. No hay modal de edición real. La composición
habilita controles únicamente con COMMERCIAL_MANAGE recibido de la sesión;
un rol SUPER_ADMIN sin ese permiso no sustituye el contrato Backend.

Solo se editan código Room y código/nombre RoomType. No se cambia tipo/propiedad/
identidad de Room. Los textos enviados y confirmados se conservan sin normalizar
códigos; la unicidad real sigue PostgreSQL, mientras el mapper provisional
conserva sus reglas locales. Operación, piso, notas, fotos, limpieza y ATS no
adquieren una fuente inventada. Stays siguen viniendo de Staff Reservations,
uniéndose por roomId; room=null permanece Sin asignar, sin asignación física.

Los recorridos de personalización anteriores se conservan detrás de mocks=true
con aviso explícito de escenario local en memoria. Con mocks=false no se monta
ese editor ni se usa su servicio de mutaciones.

## BFF y mutaciones confirmadas

| Browser same-origin | Backend existente | Campos |
| --- | --- | --- |
| POST `/api/staff/rooms?propertyId={uuid}` | POST `/api/v1/properties/{propertyId}/rooms` | code, roomTypeId |
| PATCH `/api/staff/rooms/{roomId}?propertyId={uuid}` | PATCH `/api/v1/properties/{propertyId}/rooms/{roomId}` | code |
| POST `/api/staff/room-types?propertyId={uuid}` | POST `/api/v1/properties/{propertyId}/room-types` | code, name |
| PATCH `/api/staff/room-types/{roomTypeId}?propertyId={uuid}` | PATCH `/api/v1/properties/{propertyId}/room-types/{roomTypeId}` | code y/o name, al menos uno |

BFF usa solo cookie HttpOnly Staff, valida Origin contra PMS_WEB_PUBLIC_URL
(default localhost3001), IDs/query/body permitidos y respuesta property/ID/
timestamps. Backend sigue siendo autoridad de sesión, COMMERCIAL_MANAGE, scope
C2, persistencia y auditoría transaccional. No se reenvían cookies Guest ni el
Authorization aportado por el browser; respuestas allowlist y no-store.
400/401/403/404/409 se conservan y sanitizan; transporte/5xx se representan como503.
POST confirma201 y PATCH200, con Domain validado antes de actualizar caches.

No hay actualización optimista ni persistencia local. Las caches se actualizan
con respuesta confirmada y se revalidan por sesión/propiedad, incluidos reads de
stays/lista para los nombres/códigos referenciados. Una respuesta tardía de otra
propiedad no altera la pantalla actual. Doble submit tiene bloqueo síncrono;
Guardar/Cancelar se deshabilitan durante el guardado. Ante fallo permanecen
borrador y valor previo. Solo un401 permite un refresh Staff/reintento compartido;
red/5xx/409 no generan replay automático. Ante red/5xx, actualizar/verificar antes
de reintentar un POST: no hay contrato Idempotency-Key y el resultado podría ser
incierto. El worker MSW excluye los POST/PATCH reales antes de interceptarlos.

## DELETE — bloqueado, sin UI simulada

No existe DELETE ni operación canónica equivalente en controllers/contrato17.
Rooms no tiene estado archive/inactive. Las FK de reservation_stays y de
out_of_order_records referencian `(property_id, room_id)` sin cascada de borrado;
incluso stays históricos/cancelados conservan referencia. Esas FK no definen una
política de baja. Domain Rules04, sección Availability, exige «No borrar Room»;
OOO/OOS tampoco representa una eliminación.

Falta decisión aprobada de baja/retención y tratamiento de historial, stays,
reservas y outages; después falta método/ruta HTTP canónicos, permisos/scope,
auditoría, conflictos y QA. Propuesta mínima: BD2 publica ese contrato tras la
decisión de dominio. Solo entonces se conecta la acción de swipe y su equivalente
por teclado con confirmación. No se añaden gesto destructivo, DELETE local,
archive/status ni migración en este incremento.

## Validación técnica

- Focalizados iniciales de BFF, service, mapper y C/R/U UI:52 PASS /6 archivos.
- Suite relevante final: `NEXT_PUBLIC_USE_MOCK_API=false npm test -- src/modules/rooms src/modules/reservations src/modules/properties src/app/api/staff src/shared/components 'src/app/(private)' src/data/mocks/worker-boundary.test.ts`: **472 PASS /73 archivos**.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run typecheck`: PASS.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run lint`: PASS.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run build`: PASS. Tipos comprobados aparte.
- `git diff --check`: PASS.

Tests cubren cuatro comandos, allowlist/Origin/HttpOnly y scope BFF, estados
400/401/403/404/409/5xx, double submit, borrador/valor previo, gate de permisos,
remount con nueva cache, cambios de propiedad/respuesta tardía, no operaciones
provisionales y refresco de nombres en stays después de editar el tipo.
Fixtures HTTP automatizadas no equivalen a QA PostgreSQL manual.

Firefox con componentes y services reales, transporte HTTP sintético solo en
harness externo al repo:10 combinaciones Reservas/Habitaciones en anchos CSS
317/392/768/1024/1440, sin overflow del documento. Mediciones confirmaron iguales
bordes/radios de filtros, altura46px, header y padding de celdas. También pasó
crear/editar ambas entidades y editar código desde tablero sin modal.
Capturas/mediciones en `/tmp/pms-inventory-functional-visual/`.

## QA manual real para Alan

Precondición: Backend/PostgreSQL reales, build con mocks=false, sesión Staff con
COMMERCIAL_MANAGE y una propiedad autorizada. PMS_WEB_PUBLIC_URL debe coincidir
con el Origin público ya usado por el login. Usar códigos únicos de QA y anotar
IDs; no intentar limpiar con DELETE, porque esta entrega no incluye baja.

1. **CREATE tipo → aparece → F5 → persiste:** abrir Administrar inventario /
   Tipos / Nuevo tipo; guardar código y nombre. Confirmar POST201, fila e ID;
   F5 y comprobar ambos campos/ID con GET real. El tipo solo no añade Rooms.
2. **EDIT tipo → cambia → F5 → persiste:** editar código y nombre en sus celdas,
   Guardar; confirmar PATCH200 y valores devueltos. F5: mismo ID con cambios.
   Cancelar otro borrador no envía PATCH. Si tiene stays, revisar nombre actualizado
   en contexto/relaciones sin cambiar sus IDs/estado/asignación.
3. **CREATE Room → aparece → F5 → persiste:** pestaña Habitaciones físicas /
   Nueva habitación; escoger tipo real de esa propiedad y un código único.
   Confirmar POST201 y nueva Room; F5 mantiene ID, código y roomTypeId.
4. **EDIT Room → cambia → F5 → persiste:** editar código inline en catálogo o
   tablero, Guardar, confirmar PATCH200; F5 mantiene cambio y mismo ID/tipo.
   Las stays asignadas siguen ligadas por roomId; Sin asignar permanece null.
5. **Scope:** cambiar entre dos hoteles autorizados. Las filas/borradores del
   anterior desaparecen; requests y nuevas escrituras llevan el propertyId actual.
   ALL_PROPERTIES exige hotel concreto; IDs de otro hotel no se pueden editar.
6. **Permisos/errores:** una sesión sin COMMERCIAL_MANAGE no ofrece crear/editar;
   Backend debe responder403 a intentos directos denegados. Repetir código ocupado
   da409 con borrador conservado y sin éxito falso; validar400 y límites64/160.
   Sesión expirada/refresh fallido401 y recurso ausente404 no muestran Guardado.
   Con desconexión/5xx no hay replay ni falsa persistencia: recuperar conexión,
   actualizar/F5 y comprobar BD antes de reenviar. No bloquear/cambiar el login
   real para producir estas condiciones. Doble click/Enter durante Guardando debe
   enviar un solo comando; móvil/teclado mantienen selector, scroll y edición.

QA manual real PASS confirmado por Alan; incremento COMPLETADA. La guía anterior
se conserva para regresión; no se inventan respuestas/IDs no comunicados.
No hay QA DELETE, porque sigue sin contrato.

## Corrección de coherencia visual — 2026-10-08

Estado al entregar: **EN_QA** (histórico; cierre vigente COMPLETADA).
Reservas es la referencia canónica.
`EntityListSurface`, `EntityFilterField` y `EntityListFooter` comparten estructura,
labels/búsqueda, contenedores, separación y pie. Se eliminan reglas locales
obsoletas de filtros/tabla/footer. Habitaciones retira el heading visual extra y
mueve el conteo existente al pie; conserva las cuatro columnas agrupadas y usa
el mismo mínimo940px y aviso de scroll de Reservas. Se comparte tipografía
primaria/secundaria y se conserva el focus verde medido en la referencia.

Sin cambios a datos, handlers, CRU, contratos, Auth, PropertyContext, BFF o Backend;
Sin asignar, fecha/métricas y tabs conservados. Tests actualizados verifican las
columnas, filtros, conteo después de la tabla y ancho común; los recorridos CRU
existentes continúan pasando.

Validación: focalizados ampliados374 PASS /66 archivos (Rooms, Reservations,
shared y composición real/scope); typecheck/lint/build con mocks=false PASS;
`git diff --check` PASS. Firefox:10 combinaciones en CSS317/392/768/1024/1440,
sin overflow global, controles46px, igual borde/radius/shadow/header48.5px en
desktop, padding12/16px, alineación top, uppercase y mínimo940px. Separación de
filtros a tabla20px en desktop; el aviso de scroll suma el mismo espacio en
ambas vistas responsive. Diferencias numéricas subpixel menores a0.1px son
redondeo del navegador. Comparación lado a lado desktop y regresión inline C/R/U
con transporte HTTP de prueba PASS; no reemplaza QA PostgreSQL manual.
Evidencia: `/tmp/pms-inventory-functional-visual/desktop-side-by-side.png` y
`results.json` en la misma carpeta. Sin commit/push/merge.

## Composición común de superficie — 2026-10-08

Estado al entregar: **EN_QA** (histórico; cierre vigente COMPLETADA).
Corrección de presentación,
sin modificar datos, contratos, hooks, Auth, PropertyContext ni lógica C/R/U.

`EntityListSurface` ahora organiza ambos módulos con el mismo grid responsive:
buscador2fr, dos columnas1fr y acciones120px en desktop; dos columnas a1100px y
una a600px. Limpiar filtros ocupa siempre su columna; Reservas conserva sus
campos y handlers, colocando las fechas en la segunda fila común. Habitaciones
incluye fecha como EntityFilterField, Hoy/Actualizar con el botón compartido y
las tabs dentro de la misma card. Las tabs siguen disponibles al cargar o fallar
el tablero; el catálogo conserva su flujo actual.

Métricas de28px y Sin asignar plegable de28px quedan debajo de la card, a ancho
completo. La franja secundaria compartida reserva64px en desktop también cuando
no hay contenido, para estabilizar la posición de la tabla sin añadir textos o
registros ficticios a Reservas. Al desplegar Sin asignar o mostrar errores, el
contenido crece naturalmente; en móvil se permite envolverlo. Sin datePanel
separado ni CSS paralelo. Tabla de cuatro columnas agrupadas conservada; fila
base96px y pie compartido mínimo44px, con separación16px.

Validación con mocks=false: **405 PASS /69 archivos** (Rooms, Reservations,
shared/components y composición Staff); typecheck, lint y build PASS;
`git diff --check` PASS. Backend/BFF no modificados ni tests Backend necesarios.

Firefox, comparación lado a lado en1440px, estado cargado/Sin asignar plegado:
filtros y tablas x272..1408 (ancho1136px), filtros y16..236, tabla y332,
controles46px, buscador462px, selects231px y Limpiar120px. Distancia del borde
inferior de filtros al borde superior de tabla96px idéntica. Header48.5px,
fila base96px, borde/radius/shadow/padding/focus y pie iguales. También verificado
responsive en317/392/768/1024px sin overflow global y regresión inline C/R/U con
transporte HTTP de prueba; esta evidencia no confirma persistencia PostgreSQL.

Evidencia temporal: `/tmp/pms-inventory-functional-visual/desktop-side-by-side.png`
y `results.json`. QA manual: alternar Reservas/Habitaciones a1440px, comprobar
bordes/fecha/botones, plegar/desplegar Sin asignar, cambiar filtros/fecha/Hoy,
Actualizar y volver entre Tablero/Administrar; continuar el QA real C/R/U/F5 y
scope descrito arriba. Sin commit/push/merge ni cierre del incremento.

## Filtros compactos y paginación compartida — 2026-10-08

Estado al entregar: **EN_QA** (histórico; cierre vigente COMPLETADA).
Esta corrección autorizada
sustituye la segunda fila de fechas y la franja vacía de Reservas descritas en
la sección anterior. Sus filtros desktop quedan en una fila: Buscar, Estado,
Llegada desde, Llegada hasta y Limpiar, sin contenedores vacíos. El grid común
admite cuatro campos con búsqueda2fr y acciones120px; responsive conserva los
breakpoints1100/600px. Habitaciones mantiene fecha/acciones/tabs en su card y
métricas/Sin asignar en la franja secundaria.

Ambas tablas usan `EntityPagination` y `useEntityPagination`, con selector
5/10/25/50/100, default25, resumen de rango y botones anteriores/números/siguiente.
La paginación se aplica a filas ya filtradas. Tamaño, filtros (incluida fecha)
y scope de propiedad reinician página1; los cambios de datos también acotan una
página que dejó de existir. Resultado vacío muestra0–0 y navegación deshabilitada.
Habitaciones calcula métricas y Sin asignar sobre el resultado operativo completo,
sin aplicarles el slice de páginas. Columnas agrupadas y C/R/U conservados.
No hay endpoints, DTOs, permisos ni semántica Backend nuevos.

Validación: suite relevante **416 PASS /70 archivos**, focalizados finales de
paginación/Rooms/Reservations **32 PASS /3 archivos**; typecheck/lint/build con
mocks=false y `git diff --check` PASS. Tests cubren todos los tamaños, páginas
parciales/vacías, navegación, reducción de resultados, reinicio por filtros y
propiedad, y métricas/stays sin paginar. Los recorridos C/R/U siguen pasando.

Firefox a1440px confirma cuatro inputs/selects y Limpiar en y73, controles46px,
card de Reservas128px y separación a tabla20px. Responsive317/392/768/1024px
sin overflow global y edición/creación inline con fixtures HTTP PASS. Evidencia:
`/tmp/pms-inventory-functional-visual/pagination-desktop-side-by-side.png` y
`pagination-results.json`. Fixtures no equivalen a QA PostgreSQL manual.

QA manual: en cada módulo, navegar con más de25 filas, cambiar todos los tamaños
y comprobar rango/última página. Desde página2 cambiar búsqueda, estado/ocupación,
tipo, fechas y propiedad; debe volver a1 y mostrar resultados ya filtrados.
Probar cero resultados. En Habitaciones comprobar que métricas y Sin asignar
mantienen todos los registros operativos al cambiar página/tamaño; editar un
código y verificar con Actualizar/F5 según el QA C/R/U real anterior. Revisar
móvil/teclado y una fila única de filtros de Reservas en desktop.
Sin commit/push/merge ni cierre del incremento.
