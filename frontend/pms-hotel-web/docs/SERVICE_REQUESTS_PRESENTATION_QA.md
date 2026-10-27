# Mis servicios Android y solicitudes Staff — QA de presentación

Fecha:2026-10-27. Worktree `/tmp/pms-amenities`, rama
`feature/amenities-real-mvp`. Ajuste de presentación autorizado; sin cambios de
Backend, contratos, DTO, mappers, servicios, permisos o reglas de negocio.
Amenidades conserva su PASS técnico/manual anterior; **este ajuste visual está
EN_QA**, pendiente de comprobación del usuario. Sin commit/push/PR.

## Android: pauta vigente

Las cards comparten altura colapsada, con espacio para título, fecha/hora,
cantidad de artículos cuando corresponde, estado y total **solo Room Service**.
La medición nativa del resumen más alto del listado aumenta la altura común si
hace falta por ancho o escala de fuente. Housekeeping no inventa una cantidad de
artículos. Notas y líneas individuales se montan al expandir; los artículos no
aparecen en el resumen aunque quede espacio. El chevron abre detalles si existen,
una sola card por listado. Tocar el cuerpo sigue editando según estado/cutoff;
swipe conserva cancelación/confirmación. El chevron no activa edición y no hay
botones nuevos dentro de la expansión. Los controles mock ya existentes de
completado siguen separados del contenido. Filtros/refresh/polling10s intactos.

## Web Staff: pauta vigente

Se reutilizan DataTable/EntityListSurface/EntityFilterField, StatusBadge, Button,
ConfirmDialog y SvgIcon. Menús: Inicio/Panel casa, habitaciones cama, limpieza
escoba, Room Service cubiertos, Amenidades regalo y reportes gráfico. Sin paquetes
adicionales de iconos ni cambios de permisos de navegación.

Las tres tablas ofrecen búsqueda, estado y fecha local del servicio. Estado
inicial **Pendientes=OPEN+IN_PROGRESS**. Orden visual: OPEN,IN_PROGRESS,DONE,
CANCELLED; dentro de cada estado, fecha y hora ascendente; empate por ID estable.
La franja de Housekeeping usa su hora inicial. No se convierte a UTC ni se usa la
zona del navegador para ordenar. La búsqueda ignora mayúsculas/acentos y abarca
reserva, habitación, notas y el servicio o nombres de artículos según la tabla.
La fecha es exacta; combinarla con estado/búsqueda aplica todos los filtros.
Limpiar filtros restablece Pendientes. Todo se realiza sobre las filas ya
consultadas y autorizadas, sin nuevas consultas ni filtros Backend.

| Tabla | Columnas principales |
| --- | --- |
| Room Service | Reserva/Habitación, Fecha/Entrega, Total GTQ, Notas, Acciones |
| Amenidades | Reserva/Habitación, Fecha/Entrega, Notas, Acciones |
| Limpiezas solicitadas | Reserva/Habitación, Servicio, Fecha/Horario, Notas, Acciones |

El estado se muestra con etiqueta y fondo suave en Reserva/Habitación, sin una
columna adicional: OPEN cálido, IN_PROGRESS azul, DONE verde, CANCELLED neutro.
El texto y nombre accesible expresan el estado, sin depender exclusivamente del
color. Usuarios de lectura no reciben botones de gestión, aunque se conserva la
columna Acciones. KPI de limpiezas sigue contando las solicitudes persistidas
pendientes, sin depender del filtro de la tabla.

Room Service/Amenidades permiten una fila expandida por tabla, mediante chevron,
clic en celda no interactiva o Enter/Espacio sobre la fila enfocada. La expansión
muestra artículos×cantidades, y precios snapshot existentes solo en Room Service.
No contiene acciones. Los botones de gestión no disparan expansión ni al hacer
clic ni al activarlos con teclado. Confirmación, CAS, errores y permisos siguen
siendo los existentes. Limpiezas conserva sus filtros al volver de confirmación.
Cambiar propiedad/sesión conserva los límites y limpieza de caché existentes.

## QA visual mínimo

Reutilizar Backend/Expo Go/Firefox de este worktree y las cuentas Guest/Staff
existentes. No se modificó ni migró la BD del hotel durante este ajuste.

1. **Android:** Inicio y Servicios→Mis servicios con una solicitud de cada tipo.
   Comparar altura colapsada y verificar título, horario, cantidad, estado y total
   Room Service. Ningún producto individual debe aparecer antes de expandir.
   Abrir una card y luego otra: cierra la anterior. Tocar cuerpo→edición elegible;
   chevron→solo detalles; swipe→confirmación de cancelación. Probar pantalla
   estrecha, orientación horizontal, texto grande y TalkBack.
2. **Firefox:** seleccionar la misma propiedad, revisar iconos y las columnas de
   `/room-service`, `/amenities` y Housekeeping→Limpiezas solicitadas. Ver Pendientes
   por defecto, orden por estado/fecha/hora y etiquetas suaves legibles. Probar
   búsqueda con/sin acento, estado DONE/CANCELLED/ALL, fecha y Limpiar filtros.
3. **Expansión/acciones:** abrir artículos de Room Service/Amenidades por chevron,
   fila y teclado; abrir otra cierra la anterior. Iniciar/completar desde Acciones
   no debe abrir/cerrar detalles, y sigue pidiendo confirmación. Completados se
   consultan con su filtro. Usuario INTAKE conserva lectura sin gestión; OPS
   conserva acciones. Android sincroniza los estados como antes.

## Pruebas reproducibles

```bash
cd /tmp/pms-amenities/frontend/pms-hotel-android
npm run lint
npm run typecheck
npm test
npx expo export --platform android --max-workers 2
```

```bash
cd /tmp/pms-amenities/frontend/pms-hotel-web
npm run lint
npm run typecheck
npm test -- --maxWorkers=2
npm run build
```

Focalizadas Android: service-request-overflow, guest-services-feedback,
service-request-details, service-requests, room-service-real y amenities-real.
Focalizadas Web: operational-request-table, staff-navigation.icons y los
componentes room-service-page, amenities-page y guest-cleaning-requests.
Cubren columnas, búsqueda sin acentos, combinación de filtros, orden inmutable,
expansión/teclado, estado accesible, separación de botones, permisos y regresión
de acciones. Las dimensiones Android se inyectan en tests; QA visual nativo no
se atribuye al agente. Evidencia local: `/tmp/pms-services-*.log`.

## Evidencia técnica

- Android:55 suites/538 tests PASS; focales6/78 PASS y6 tests de geometría del
  resumen/expansión PASS. Lint y typecheck PASS. Los warnings act/handles de la
  suite completa se conservan, sin forceExit.
- Web:346 archivos/2631 tests PASS con maxWorkers2; focales5/43 PASS; lint,
  typecheck y build Next PASS. Transiciones Staff/confirmación/errores/permisos
  conservados y comprobados.
- `git diff --check` PASS; Backend, contratos y capas de datos sin cambios de
  este ajuste. Cinco originales locales SHA-2565/5 intactos. Se preservó también
  el contenido previo de next-env.d.ts después de la generación del build.
- QA visual en Expo Go/Firefox **pendiente**. Sin commit, push ni PR.
- Export Android final PASS en `/tmp/pms-services-android-export` (log
  `/tmp/pms-services-android-final-export.log`). La exportación es un bundle,
  no un APK. Última comprobación de geometría/expansión:6 tests PASS.
