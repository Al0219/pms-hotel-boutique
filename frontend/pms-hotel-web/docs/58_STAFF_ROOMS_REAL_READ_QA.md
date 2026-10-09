# Staff Habitaciones — lectura real para la presentación

Estado vigente: **COMPLETADA**; QA manual real **PASS** confirmado por Alan
el 2026-10-08. Base `main 63279d7`, rama
`feature/staff-room-inventory-read`. Incremento autorizado por Alan el 2026-10-08;
owner de integración Alan, UI WEB-3/José, revisión colaborativa WEB-4 y owners de
Inventory/Reservations. Sin commit/push/merge ni cambios Backend. No se modifica
el XLSX ni se declara completada la fila de Calendario relacionada.

## Ampliación posterior autorizada

El [incremento60 de C/R/U real](60_STAFF_INVENTORY_CRU_QA.md) habilita creación
y edición con contratos16/17; sustituye el límite READ-ONLY de esta entrega.
Esta guía conserva la evidencia histórica de lectura; su límite READ-ONLY y
los pendientes de QA describen las entregas iniciales, no el estado actual.
La integración Staff y C/R/U, el sidebar59 y los ajustes visuales/paginación60
quedan **COMPLETADOS** tras el PASS manual real comunicado por Alan.
DELETE sigue **bloqueado** por falta de contrato/política; asignación física es
el siguiente incremento, fuera de este cierre y sin iniciar implementación.

## Cierre con QA manual real — 2026-10-08

Alan confirmó «QA manual real: PASS» y autorizó marcar COMPLETADA la integración
Staff Habitaciones/C-R-U y el ajuste visual/paginación asociado. Se registra la
confirmación del owner, sin atribuir al agente una nueva ejecución PostgreSQL ni
inventar IDs, respuestas HTTP o resultados por caso. El alcance vigente y QA de
regresión están en [60](60_STAFF_INVENTORY_CRU_QA.md). Staff/PropertyContext reales,
Inventory/RoomTypes/Reservations, relación por roomId/null y datos operativos sin
fuente permanecen según lo entregado. El siguiente incremento no incluye DELETE.
Las evidencias técnicas siguientes se conservan con su fecha y alcance original.

## DoR y alcance

Se continúa la vista existente de [Staff core](52_PRIVATE_STAFF_CORE.md),
[ocupación por fecha](56_STAFF_ROOM_OCCUPANCY.md) y
[personalización provisional](57_STAFF_ROOM_PERSONALIZATION.md).
La fila relacionada `IMP-WEB-0308` (WEB-3, reviewer WEB-4, dependencia 0301) exige
stays por habitación/fecha, scope y N stays distinguibles; corresponde a Calendar,
no existe una fila específica para esta conexión de Habitaciones. Esta solicitud
autoriza el incremento acotado y no implementa ni declara completada esa fila.
No se modifica el XLSX ni se crea un ID de backlog.

DoR confirmado antes de implementar: UI/componentes existentes, lectura Inventory
16/17 integrada en main, Staff Auth/C2/PROPERTY y Reservations 49 COMPLETADA con
QA manual registrado. Datos, errores, aceptación y pruebas definidos por la solicitud.
Ninguna decisión de producto adicional: datos operativos sin fuente quedan ausentes;
solo lectura, sin nuevos estados, permisos o reglas de asignación.

Contratos:
[RoomTypes 16](../../../backend/docs/16_BD2_ROOM_TYPES_CRUD_CONTRACT_PROPOSAL.md),
[Rooms 17](../../../backend/docs/17_BD2_ROOMS_CRUD_CONTRACT.md),
[Staff Reservations 49](../../../backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md).

## Transporte y datos

| Lectura browser | Backend existente | Autorización |
| --- | --- | --- |
| GET `/api/staff/rooms?propertyId={uuid}` | GET `/api/v1/properties/{propertyId}/rooms` | Staff activo y PROPERTY C2 |
| GET `/api/staff/room-types?propertyId={uuid}` | GET `/api/v1/properties/{propertyId}/room-types` | Staff activo y PROPERTY C2 |
| GET `/api/staff/reservations?propertyId={uuid}` | GET `/api/v1/reservations?propertyId={uuid}` | Staff activo, RESERVATION_MANAGE y PROPERTY C2 |

Los BFF Inventory son same-origin, solo GET; usan únicamente `pms_staff_access`
HttpOnly y Bearer server-side. Sin tokens en JavaScript/storage. El Backend existente
revalida sesión/membership y scope antes de consultar PostgreSQL; Guest no autoriza
estas lecturas. Falta Staff cookie:401; parámetros ausentes/extra/repetidos o UUID
inválido:400; errores Backend400/401/403/404 conservados, otros/transportes/DTO inválido:503,
sin cuerpos upstream. Allowlist de campos y rechazo de scope/IDs inválidos.
`Cache-Control: private, no-store`; refresh Staff compartido y un retry usando
la infraestructura existente. Los GET reales Inventory se excluyen de MSW antes
de su listener, al igual que Reservations; no se altera el worker generado.

Rooms une el catálogo por `roomTypeId` para el nombre. Service devuelve DTO,
mapper valida identidad/scope/referencias/fechas y produce Domain. Room mantiene
status/floor null y lectura explícita. Catálogo real lista tipos/unidades en su
vista existente; no muestra editor, notas, fotos ni preview editorial.

Reservations expone un hook Domain público de stays independientes. La composición
app lo pasa a Rooms mediante un puerto estructural de datos; Rooms no importa
internals de Reservations ni crea una dependencia circular con Calendar.
Todas las caches reales incluyen sesión/propiedad y usan prefijos que logout Staff
ya cancela y elimina. Cambiar propiedad/sesión remonta el contenido.

La proyección por fecha usa `[arrival, departure)` y **roomId**, nunca código/nombre.
Room=null permanece **Sin asignar**; un roomId no presente en inventario produce
error, sin convertirlo en habitación libre o pendiente. Excluye padre CANCELLED
y stays CANCELLED/NO_SHOW/CHECKED_OUT; conserva RESERVED e IN_HOUSE y evidencia
de solapamientos. Header sin stays es válido. Responsable ausente se informa sin
fabricarlo. El estado de viaje disponible no reconstruye historial check-in/out.
Libre de estadías no acredita limpieza, estado operativo ni ATS; no se infieren
ACTIVE/OOO/OOS ni ocupantes. Error/carga/datos ausentes dejan ocupación desconocida.

`NEXT_PUBLIC_USE_MOCK_API=false`: ambas vistas leen fuentes reales. Todas las
mutaciones reales quedan cerradas, aunque la sesión tenga permisos comerciales.
`true`: se conserva el escenario MSW anterior para tablero/ocupación/catálogo y
ediciones provisionales; no representa persistencia PostgreSQL. Este incremento
no corrige Calendario ni el preview global ni convierte sus enlaces locales en reales.

No se modifican endpoints HTTP Backend, OpenAPI, migraciones, fixtures DB ni permisos.
No existe una nueva API Backend de ocupación: la lectura usa las N stays del contrato49.

## QA manual de lectura inicial — histórico, sustituido por la guía60

1. Levantar el stack real con build Web `NEXT_PUBLIC_USE_MOCK_API=false`, sin
   STAFF_PREVIEW; iniciar sesión Staff real en `/acceso` con RESERVATION_MANAGE y
   elegir una propiedad concreta. Abrir `/staff/habitaciones`.
2. Comparar números/UUIDs/tipos y conteos físicos con PostgreSQL o las lecturas
   Inventory. Abrir **Administrar inventario**, alternar habitaciones/tipos y buscar.
   No deben existir Nueva habitación/Nuevo tipo/Editar, fotos, notas ni personalización.
3. Seleccionar una fecha dentro de una reserva real. Comparar cada stay por
   stayId/roomId/fechas/estado con Reservations: room=null aparece **Sin asignar**,
   con enlace al detalle real. Una asignación existente se asocia por UUID incluso
   si el código mostrado cambia. Llegada inclusiva/salida exclusiva; N stays
   independientes. No crear asignaciones ni alterar la DB para aparentar ocupación.
   Si no existen asignaciones o IN_HOUSE/conflictos reales, registrar NO EJECUTABLE
   para esos casos; su cobertura automatizada no equivale a QA manual.
4. Buscar/filtrar por tipo y estadías en la tabla agrupada y usar Hoy/Actualizar.
   Verificar Identidad/Contexto/Relación/Estado; código de confirmación y fechas
   por stay, enlaces al detalle de reserva y bloque Sin asignar plegable. Sin
   panel fijo de habitación ni editor/modal; doble clic/swipe no escriben datos.
   Estado operativo debe estar **no disponible**; piso ausente, sin limpieza ni ATS.
   No hay status-change, asignación ni otras mutaciones reales.
5. Cambiar propiedad, F5 y cerrar/restaurar sesión: no retener habitaciones/stays
   de otro contexto. ALL_PROPERTIES exige seleccionar una propiedad. Catálogo vacío
   es válido; un error de Reservations no debe marcar las habitaciones como libres.
6. Verificar en red: solo GET Inventory/Reservations BFF; sin credenciales JS ni
   `/__mock`/`pms.test`. Access expirado con refresh válido: una restauración compartida;
   Staff revocado/anónimo/Guest-only:401; property no autorizada:403; UUID inválido:400.
   Backend desconectado: error/reintento, conservando separación de Guest.

Gate de la entrega inicial: permanecer EN_QA hasta confirmación manual de Alan.
Gate satisfecho: Alan confirmó QA manual real PASS y autorizó el cierre actual;
no se atribuyen resultados manuales a las fixtures automatizadas.

## Validación técnica

Resultados del 2026-10-08, ejecutados en `frontend/pms-hotel-web`:

- Focalizados: `npm test -- --maxWorkers=2 src/app/api/staff 'src/app/(private)/staff-property-workspace.test.tsx' 'src/app/(private)/staff-rooms-read.test.tsx' src/modules/rooms src/modules/reservations/mappers/staff-reservation.mapper.test.ts src/modules/reservations/service/staff-reservation-read.service.test.ts src/modules/reservations/calendar src/data/mocks/worker-boundary.test.ts src/data/mocks/room-occupancy.integration.test.ts src/data/mocks/room-personalization.integration.test.ts` → **190 PASS / 29 archivos**.
- Suite completa: `npm test -- --maxWorkers=2` → **1633 PASS / 276 archivos**, sin
  fallos/exclusiones. Log técnico `/tmp/pms-staff-rooms-web-tests.log`.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run typecheck` → **PASS**.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run lint` → **PASS**.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run build` → **PASS**; incluye ambos BFF
  Inventory. TypeScript comprobado por separado porque build omite esa validación.
- `git diff --check` → **PASS**. Archivo generado `next-env.d.ts` restaurado a su
  contenido inicial; sin cambios en Backend/OpenAPI ni dependencias.

Cobertura: cookie Staff/Guest separado, scope/parámetros, allowlist y errores BFF;
same-origin/refresh compartido, mapper Inventory, N stays/roomId/null/fechas/terminales,
conflictos, error sin falsa ocupación y cambio de propiedad; UI real read-only y
regresión de los escenarios provisionales. Un primer fallo focalizado por reutilizar
un cuerpo Response consumido en el mock del test se corrigió usando una Response
nueva por solicitud. Lint detectó un deep import en un test app; se corrigió usando
el soporte de fixtures de test, sin excepciones de boundaries.

Esta evidencia automatizada usa fixtures sintéticas; no acredita una nueva ejecución
de navegador contra PostgreSQL ni el QA manual de Alan. CI remoto no ejecutado.
Estado al entregar esta evidencia: EN_QA, sin commit/push/merge; cierre vigente
COMPLETADA según la confirmación manual registrada arriba.

## Ajuste de UI autorizado — tabla agrupada

Estado al entregar: **EN_QA** (histórico; cierre vigente COMPLETADA).
Corrección de presentación de este mismo incremento,
autorizada por Alan: sustituir cards/panel fijo por cuatro columnas agrupadas,
sin alterar contratos HTTP ni alcance de lectura. No se modifica el XLSX.

No existían EntityDataGrid/EditableCell/SwipeAction en esta base. El nuevo
`EntityDataGrid` shared **compone DataTable**, conservando su semántica table,
estado vacío y renderer de celdas. Añade densidad compacta y región de scroll
con foco de teclado; DataTable estándar mantiene su comportamiento anterior.
Los slots `renderEditor` (inline) y `renderInteractiveRow` (adaptador de acciones
swipe/teclado con tr semántico) quedan ignorados por defecto en readOnly.
Habitaciones usa explícitamente readOnly y no inyecta estos adaptadores. No se
implementa un motor de edición/gestos ni se crean PATCH/DELETE o modales normales.

Identidad: código e ID secundario abreviado con referencia completa. Contexto:
RoomType y hotel de la sesión. Relación: responsables/reservas/fechas de todas
las stays asignadas; confirmationCode ya existe en contrato49 y solo se conserva
en los modelos Domain públicos y la proyección por fecha. Si no viene en el
escenario provisional, se muestra su reservationId; no se fabrica un código.
Estado: Reservada/Ocupada/Sin estadía o información desconocida ante falta/error;
operación sin fuente real permanece no disponible. Sin estadía asignada se
presenta únicamente tras una lectura de stays válida y completa.

Se conservan filtros/fecha/Hoy/Actualizar y fuentes Inventory + RoomTypes + Staff
Reservations, asociación por roomId y room=null. Contadores compactos y Sin
asignar plegable por defecto, con enlaces/fechas y lista de altura acotada.
No hay panel fijo. Las acciones provisionales OOO/OOS quedan en un bloque local
plegable por fila, únicamente sobre habitaciones del escenario; sus títulos
usan IDs React únicos. No se habilitan acciones reales ni se altera el catálogo.

Validación actual: focalizados ampliados shared/BFF/Rooms/Reservations/Calendar/MSW
→ **229 PASS / 37 archivos** (`/tmp/pms-room-grid-focused.log`). Typecheck, lint
y build con `NEXT_PUBLIC_USE_MOCK_API=false` PASS; diff PASS. La suite completa
1633 registrada arriba corresponde a la entrega de lectura previa, no a una nueva
ejecución de este ajuste visual. El pendiente manual de esa entrega quedó
cerrado con el PASS real confirmado por Alan el 2026-10-08.

Verificación visual Firefox headless sobre un harness temporal de los componentes
reales y CSS Modules, con puertos de datos sintéticos y enlace sustituido por anchor:
PASS en anchos CSS efectivos **325, 392, 768, 1024 y 1440 px**. El mínimo de ventana
Firefox es 500 px; para las dos pruebas móviles se usó zoom en su instancia aislada
y se registró el ancho CSS efectivo, sin atribuirles exactamente 320/390 px.
Cuatro columnas, ocho filas, sin desbordamiento del documento, scroll horizontal
contenido en la tabla en móvil, cero editores/modales y Sin asignar cerrado (~42 px)
con expansión/enlace comprobados. Capturas `grid-{320,390,768,1024,1440}.png` y medidas
en `/tmp/pms-room-grid-visual/results.json`; los nombres móviles corresponden al
ancho solicitado. Esto valida presentación de componentes, no Auth/PostgreSQL ni
el QA manual real. No se instalaron dependencias ni se cambió el stack de la demo.
