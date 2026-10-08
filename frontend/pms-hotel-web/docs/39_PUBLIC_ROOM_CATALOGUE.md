# Public 01 — Catálogo de habitaciones disponibles

Rama: `feature/web1-public-booking`. Owner: José / WEB-1, por autorización
explícita del usuario para continuar Public 01. Fuente visual: especificación
del usuario (crema, serif, oliva, tarjetas y selección lateral). Reviewer del
contrato de disponibilidad: WEB-4. No se declara revisión externa ni cierre
formal del XLSX, ni comparación pixel-perfect con un frame Figma no aportado.

## Alcance y contratos

Se amplía IMP-WEB-0103 y se muestra detalle informativo de IMP-WEB-0104
mediante modal en `/habitaciones`. Se reutilizan IMP-WEB-0101/0102, el formulario,
service, DTO provisional, mapper puro, hook TanStack Query y componentes
compartidos. No se construye Public 03 ni se crea una Reservation/ReservationStay.

- Fechas, adultos, niños, cantidad solicitada y código promocional se conservan
  desde la URL. Noches calculadas como diferencia de fechas de calendario UTC,
  sin convertirlas en instantes de llegada del hotel.
- Modificar despliega el formulario existente. Al aplicar, se actualiza el
  estado y la URL con `history.replaceState`, soportado por Next 16, sin recarga
  ni navegación fuera del catálogo. Una recarga restaura la búsqueda aplicada.
- Filtros locales combinan categorías OR, capacidad mínima y bandas USD OR;
  las tres secciones se combinan mediante AND. Limpiar conserva búsqueda y
  selección. El contador cuenta RoomTypes vendibles visibles, no Rooms físicos.
- Recomendados conserva el orden API. Precio usa la tarifa elegida; monedas
  diferentes se agrupan por moneda sin conversión. Capacidad usa maxOccupancy.
- Tarjetas muestran ATS y totales cotizados de la respuesta. Una segunda
  tarifa no añade inventario: cambia el RatePlan de la misma selección.
- El carrito permite quitar y ajustar cantidades hasta el ATS de la respuesta.
  Una categoría oculta por filtros sigue seleccionada. Cambiar búsqueda limpia
  selección y tarifas para evitar cotizaciones de otra estancia. Una respuesta
  nueva se usa para resolver tarifas/cantidades y advertir selecciones inválidas.
- Totales sumados en unidades menores por moneda; no se multiplica la tarifa
  base para reemplazar un total API. No hay retención ni admisión transaccional.
- Loading, empty, error, offline y retry conservan criterios. Inventario con
  ATS cero o sin tarifa no se presenta como vendible. Un error/refetch no expone
  tarjetas anteriores como disponibilidad actual.

El DTO Guest sigue **PROVISIONAL**. Se añaden metadatos opcionales `category`,
`bed_description`, `area_square_meters`, `amenities` y `badge`, que requieren
confirmación Backend. El mapper valida lo recibido; datos ausentes no se
adivinan desde el nombre ni se sustituyen por medidas/servicios ficticios.
No se cambian contratos Staff ni endpoints Backend. La consulta pública sigue
sin JWT Staff. El fallback Next sigue devolviendo 503 fuera de modo mock.

## Datos y límites de esta entrega

`data/mocks/public-catalogue.ts` contiene cuatro RoomTypes editoriales y sus
tarifas para demostrar categorías y bandas de precio. MSW y fallback Next usan
la misma fixture y ajustan noches/fechas en el helper existente; el ATS total
de ejemplo sigue siendo siete. La fixture anterior se conserva para no alterar
escenarios ajenos. Los placeholders salvia son ilustrativos; no se afirman fotos
reales. Si existen imágenes en la respuesta, la tarjeta/modal presenta la primera,
con fallback ante error. Políticas y comidas provienen de la tarifa elegida.

No hay contrato confirmado para impuestos ni destino de checkout público. Se
solicitó aclaración al usuario y se explica el límite en el carrito: importe
cotizado disponible, impuestos/total final pendientes, CTA de checkout deshabilitado.
No se inventa una tasa fiscal ni una ruta de pago. Completar ese paso requiere
contrato de cotización/impuestos, reparto de ocupantes por stay, persistencia
de selección y revalidación/admisión Backend, dentro de entregas posteriores.
Promociones y timezone de propiedad continúan pendientes del contrato documentado
en entregas anteriores; no se inventan descuentos ni horarios/políticas del hotel.

## Validación

- Pruebas de booking, availability, fallback API y modal compartido: 12 archivos,
  117 casos. Cubren error/offline, criterios corruptos, respuesta de otras fechas,
  límites centesimales, monedas, filtros/sort, selección oculta, ATS, cambio de
  tarifa, cotización del servidor y edición sin navegar.
- Lint, TypeScript strict y build se ejecutan por separado; el build conserva
  `ignoreBuildErrors` heredado y no sustituye al chequeo explícito de tipos.
- Chrome: Inicio → catálogo con valores recibidos; filtros, vacío/reset, orden,
  detalle/políticas/foco, selección/cantidad, límites ATS, edición sin recarga y
  restauración al recargar. Anchos 320, 390, 768, 1024 y 1440 sin overflow; drawer
  y CTA alcanzables en móvil. Capturas revisadas, sin certificar Figma.
- Los tipos locales de Next dañados se regeneran mediante el servidor de
  desarrollo; no se versionan cachés ni modificaciones a `next-env.d.ts`.

Backend, Android, dependencias, workflow y backlog XLSX no se modifican.
