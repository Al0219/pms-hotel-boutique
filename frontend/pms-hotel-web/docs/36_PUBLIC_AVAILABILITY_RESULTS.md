# WEB-1 — Separación de rutas y primera entrega de resultados

Fecha: 2026-10-04. Implementación: José por autorización para completar WEB-1
y confirmación explícita de la distribución de rutas. Rama:
`feature/web1-public-booking`. Reviewer availability: WEB-4. No se afirma
aprobación externa, comparación con Figma ni cierre formal del XLSX.

## Alcance y dependencias

Se continúa desde IMP-WEB-0101 usando el contrato provisional existente de
IMP-WEB-0102 y componentes compartidos con pruebas. El usuario autoriza
continuar las entregas; no se cambian estados ni dependencias del XLSX.

- `/habitaciones` monta búsqueda/resultados públicos, sin sesión Staff obligatoria.
- `/staff/habitaciones` conserva el tablero RoomBoard, layout y lógica previos.
- El menú Staff cambia su href. Los enlaces Guest conservan `/habitaciones`.
- IMP-WEB-0103: tarjetas RoomType, ATS vendible, tarifas y condiciones
  expandibles; loading, error, vacío y fallo de red con reintento y criterios
  conservados. El dato viene de service → DTO → mapper → TanStack Query → UI.
- No se muestra ATS cero o RoomType sin tarifas como disponible. No se calcula
  inventario físico ni se crean reservas desde esta entrega.
- La selección/navegación a detalle IMP-WEB-0104, imágenes y posterior checkout
  aún están pendientes. No se agregan enlaces ni botones a rutas inexistentes;
  la expansión de tarifas es una acción funcional, no una selección de estancia.

## Contrato y datos

Se reutiliza `/api/v1/public/availability` y su DTO **PROVISIONAL**, sin crear
endpoints Backend ni declararlo confirmado. Su transporte usa `withAuth: false`:
una sesión Staff no debe aportar su JWT a una consulta pública. El hook separa
cache por todos los criterios del request, propaga AbortSignal y verifica que
las fechas/property de respuesta coincidan con la consulta. El mapper rechaza
fechas imposibles, noches inconsistentes, listas obligatorias ausentes y
políticas inválidas en lugar de inventar una política no reembolsable.

Se reutilizan las fixtures existentes en MSW. El helper de demostración ajusta
fechas/noches/totales de la respuesta al request usando las tarifas planas de
esas fixtures. Conserva opciones de distintos RoomTypes para una reserva
multi-room; no obliga a alojar todo el grupo en un mismo tipo ni decide la
distribución de ocupantes. Solo devuelve vacío si la cantidad solicitada excede
el ATS total de la fixture. Es un escenario simplificado: no confirma
distribución de ocupantes, pricing ni admisión real.
No sustituye al backend ni declara garantía de disponibilidad transaccional.
El fallback Next devuelve 503 fuera de modo mock, en lugar de vender fixtures
como inventario real. En modo mock la pantalla informa que es una demostración.

El código promocional se preserva en la navegación; el DTO actual no permite
validarlo. La pantalla declara que el precio mostrado no incluye ese descuento.
El calendario de la propiedad y su metadato público siguen pendientes de contrato,
como se documentó en la primera entrega. Sin ese dato se usa el calendario local.

## Validación

- Lint y TypeScript finales: PASS. Tipos de Next regenerados después del
  traslado de ruta; `next-env.d.ts` conserva su contenido versionado.
- Pruebas enfocadas: 7 archivos / 69 pruebas PASS, antes del caso offline
  pausado. Resultados públicos finales: 9/9 PASS, incluido ese caso.
- Build de producción con `NEXT_PUBLIC_USE_MOCK_API=true` para QA: PASS.
  `ignoreBuildErrors` es configuración heredada de main, por lo que se ejecutó
  TypeScript por separado. No se modifica esa configuración.
- Chrome sobre ese build: búsqueda/restauración de URL, resultados, expansión
  de tarifas, rechazo de cero habitaciones, estado vacío y menú Staff en la
  ruta nueva PASS. Escritorio 1440 × 1000 y móvil 390 × 844 sin desbordamiento
  horizontal; cero excepciones JavaScript y errores de consola. Capturas
  inspeccionadas, sin afirmar comparación visual con Figma.
- Primera regresión global: 190 archivos PASS, 1 archivo con el fallo previo de
  espera en `src/test/private-09.test.tsx:26` y 1 archivo sin ejecutar por timeout
  al iniciar un worker forks de Vitest. Resultado: 850 pruebas PASS / 1 fallo /
  1 error de runner. Los dos archivos afectados no se modifican. Ejecución
  aislada con threads: 2 archivos / 19 pruebas PASS. Se repite toda la suite con
  un solo worker threads, sin build concurrente y sin alterar assertions.
- Regresión completa con `npm run test -- --pool=threads --maxWorkers=1
  --testTimeout=15000 --reporter=dot`: 192 archivos / 857 pruebas PASS, sin
  errores del runner. Después se ajusta únicamente el helper de demostración
  y sus casos para conservar opciones multi-room de distintos tipos, repitiendo
  las comprobaciones afectadas antes de cerrar esta entrega.
- Comprobaciones posteriores al ajuste multi-room: 7 archivos / 71 pruebas
  PASS, incluyendo preservar opciones de diferentes tipos cuando la cantidad
  solicitada no cabe en uno solo. Lint, TypeScript y build PASS. Chrome repetido
  sobre el build final: resultados de ambos tipos, tarifas, estado vacío,
  validación, móvil y menú Staff PASS, sin excepciones ni errores de consola.
  No se afirma una nueva ejecución global después de ese ajuste:
  se verifica con la suite de los módulos y rutas afectados.
- `git diff --check`: PASS.

Figma, reviewers, detalle/selección y backend Guest real siguen pendientes;
esta entrega no cierra WEB-1 ni certifica el journey transaccional completo.
No se modifica Backend, Android, workflow, dependencias ni XLSX.
