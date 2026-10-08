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

## Integración Web de disponibilidad real (2026-10-06)

Rama `feature/web-public-availability-real`; Backend A1/A2/A3 integrado en main.
Estado: EN_QA; QA técnico parcial por el test de payment indicado abajo y QA manual
Web pendiente. Autorización limitada a disponibilidad,
detalle y conservación de selección; sin booking, checkout submit ni payment.

- Modo real: navegador → Next `/api/v1/public/availability` → Backend del mismo
  path mediante `backendGuestRequest` y `PMS_BACKEND_INTERNAL_URL`. No reenviar
  Authorization ni cookies Guest/Staff; lectura sin caché y whitelist del response.
- Query confirmado `propertyId`, `arrival`, `departure`, `rooms`. El hook reutiliza
  `NEXT_PUBLIC_PROPERTY_ID` cuando no existe property explícita; el carrito conserva
  la Property real. Variable pública necesaria al compilar/iniciar Web; si falta,
  error recuperable y ninguna consulta con ID ficticio. `.env.example` documenta
  ambos parámetros sin UUID ni secretos. Dockerfile y Compose propagan la variable
  existente al build Web; sin valor por defecto, cambios en `.env` ni otros servicios.
- `PublicAvailabilityResponseDTO` es independiente del DTO provisional demo.
  Service devuelve DTO; mapper puro produce Domain o `DomainMappingError`.
  UUIDs, code/name, ATS, ratePlanId/code, currency y minor units vienen de Backend.
  No se recalcula el total por noches ni se sustituye por precios de fixtures.
- Metadata editorial local por RoomType.code exacto, sin UUID. Los códigos visuales
  actuales DLX-KNG/STE-TER/SUP-DBL/STE-JNR conservan imágenes ilustrativas y descripción;
  STD/DLX/SUITE y otros códigos sin asociación editorial usan presentación mínima.
  Capacidad desconocida `null`, sin políticas/penalidades, desayuno o cargos inventados.
  No se deduce metadata de nombres. Filtros demo de capacidad/categoría/rangos USD
  y conversión indicativa no se ofrecen en real; se mantiene orden por precio GTQ.
- Catálogo → detalle por UUID → `/reserva` conserva los IDs y la cotización real
  en el provider existente y vuelve a consultar availability. La selección no
  asigna Room física, retiene stock ni confirma una reserva.
- 400: revisar criterios; 404: Property no disponible; 500/503/red: error con
  reintento. 200 offers=[]: vacío normal. Sin fallback mock en modo real.
  `NEXT_PUBLIC_USE_MOCK_API=true` conserva DTO, MSW, fixtures y filtros anteriores.

Pruebas focalizadas: 12 archivos / 121 tests PASS, incluyendo transporte BFF,
ausencia de credenciales, query exacto, whitelist, vacíos, errores HTTP/red,
metadata por código, precios distintos de la fórmula demo y journey con UUID real
y DEMO_DELUXE hasta la revisión `/reserva`. QA manual Web no ejecutado por el agente.
El futuro POST booking requiere integración propia con el contrato de Juan y
revalidación de inventario/precio en Backend; no forma parte de esta entrega.

Validación final: `npm run test -- --pool=threads --maxWorkers=1 --testTimeout=15000
--reporter=dot`: 225 archivos PASS / 1 FAIL, 1161 tests PASS / 1 FAIL, sin exclusiones.
El único fallo es `public-payment-review-page.test.tsx`, caso
`guards direct/reloaded confirmation and never posts with mocks disabled`: cambia
mock → real conservando una selección/cotización demo y espera el botón de pago
deshabilitado. La nueva disponibilidad separa caches por modo y rechaza esa
cotización; se muestra el error de consulta y no el botón. No se mantiene pricing
mock en real para satisfacer esa expectativa. Payment y su test se conservan por
el límite explícito de alcance; adaptar ese caso requiere autorización separada.
El mismo caso registra una request Guest session sin handler MSW en su escenario
real. No se afirma PASS global ni QA manual Web.

`npm run typecheck`, `npm run lint`, `NEXT_PUBLIC_USE_MOCK_API=false npm run build`,
`docker compose config --no-interpolate --format json` y `git diff --check`: PASS.
El build conserva el bypass TypeScript heredado; typecheck independiente PASS
después del build. `next-env.d.ts` generado restaurado al contenido versionado.
No se levantó el stack, se crearon datos ni se ejecutó QA manual. Logs en
`/tmp/pms-web-real-availability-{focused,full-final,typecheck-final,lint-final,build}.log`.

## Correcciones tras QA manual Web (2026-10-06)

Estado: EN_QA en `feature/web-public-availability-real`. Se conserva el incremento
real anterior. Alan reportó defectos y autorizó correcciones frontend hasta la
vista de Payment; la repetición de QA manual permanece pendiente.

- Inicio real consulta la misma availability para los criterios actuales del
  buscador (incluidos sus valores iniciales válidos). Sin criterios válidos no
  ofrece un precio. IDs, nombres, ATS, moneda y minor units son Backend; imágenes
  y descripción solo proceden de metadata por código. El catálogo demo queda
  limitado a mock mode.
- Carrito: `+` limitado a ATS, `−` elimina al pasar de 1 a 0; cantidades enteras,
  una selección por UUID, snapshots con code/currency/nightlyRateMinor/totalMinor
  y plan real. El botón se coloca junto a fechas en la barra sticky; se reduce el
  margen del título sin añadir elevación. Filtros reales por código y máximo
  nocturno GTQ, con orden por precio o nombre/código, sin mutar ni reconsultar ATS.
- Guest valida nombres Unicode, correo, teléfono numérico, país, documento ahora
  obligatorio y solicitudes. Normaliza nombre/apellidos/documento y email antes
  de aprobar el paso; errores accesibles y foco al primer campo inválido.
- Causa del bloqueo: `paymentEstimate` exigía el `priceBreakdown` demo, ausente en
  el contrato real. `accommodationQuote` suma `totalMinor × quantity` con enteros
  seguros y una sola moneda; no inventa tasas, descuentos ni garantías. Review
  real muestra Alojamiento/Total y permite pasar a Payment. Su vista conserva la
  cotización; envío final real deshabilitado, sin tarjeta ficticia, POST booking
  ni Reservation persistida. El cálculo y gateway demo continúan solo en mock.
- Enlaces atrás y pasos anteriores completados conservan carrito y formulario
  en el provider existente; no habilitan saltos hacia delante. Se elimina copy
  interno sobre almacenamiento, retención y «Volver al catálogo». El guard de
  cotizaciones demo al pasar a real sigue vigente.

Focalizados finales: 30 archivos / 261 pruebas PASS (Booking, Checkout,
Availability y Route Handler). Cubren homepage real/mock, IDs/precios reales,
Carrito, filtros, validación Guest, suma GTQ con cantidades y varias ofertas,
rechazo de monedas mezcladas y regreso desde Payment sin escrituras.
La integración transaccional con el Backend de Juan y el proveedor de pago sigue
fuera de este incremento.

Archivos de esta corrección (rutas relativas a `frontend/pms-hotel-web/`):

- `src/modules/booking/domain/`: `room-catalogue.ts`, `room-catalogue.test.ts`,
  `selection-price-summary.ts`.
- `src/modules/booking/ui/`: `booking-stepper.tsx`, `booking-stepper.test.tsx`,
  `catalogue-dialogs.tsx`, `catalogue-filters.tsx`, `public-availability-page.tsx`,
  `public-availability-page.module.css`, `public-availability-page.test.tsx`,
  `public-booking-home.tsx`, `public-booking-home.test.tsx`,
  `public-booking-review-page.tsx`, `public-booking-review-page.test.tsx`,
  `public-booking-review.module.css`, `public-room-detail-page.tsx`,
  `public-room-detail-page.test.tsx`, `public-real-availability.test.tsx`,
  `public-real-featured-rooms.tsx`.
- `src/modules/checkout/domain/`: `accommodation-quote.ts`,
  `accommodation-quote.test.ts`, `guest-details.ts`, `guest-details.test.ts`,
  `payment-estimate.ts`.
- `src/modules/checkout/components/`: `guest-details-form.tsx`,
  `public-guest-data-page.tsx`, `public-guest-data-page.test.tsx`,
  `public-checkout-review-page.tsx`, `public-checkout-review-page.test.tsx`,
  `public-payment-review-page.tsx`, `public-payment-review-page.test.tsx`,
  `public-real-checkout.test.tsx`, `reservation-summary.tsx`.
- `docs/`: este documento y `42_PUBLIC_BOOKING_GUEST_DATA.md`.

Los demás archivos pendientes de Public Availability real estaban modificados
antes de esta corrección y se conservan.

Validación final de las correcciones: suite Web completa 229 archivos / 1194
pruebas PASS, sin exclusiones. `npm run typecheck`, `npm run lint` (sin warnings),
`NEXT_PUBLIC_USE_MOCK_API=false npm run build` y `git diff --check`: PASS.
El build mantiene el bypass TypeScript heredado; se comprobó TypeScript por
separado. Se restaura `next-env.d.ts` a su contenido previo tras generar el build.
Logs: `/tmp/pms-web-qa-fixes-{focused-final,full,typecheck-final,lint-final,build}.log`.
Sin commit, push, nueva rama ni ejecución de QA manual por el agente.

## Local Demo Dataset integrado (2026-10-06)

Estado EN_QA, sin commit/push/merge y conservando el trabajo previo. Guía canónica:
[Local Demo Dataset](../../../docs/LOCAL_DEMO_DATASET.md). Compose entrega el UUID
local automáticamente y arranca Web real junto al Backend/PostgreSQL.

- Catálogo real con seis tipos y galería de tres fotos por código; 14 JPEG locales
  licenciados de Wikimedia con créditos públicos y fuentes en
  [LOCAL_DEMO_IMAGES](LOCAL_DEMO_IMAGES.md). Algunas fotos son compartidas como
  presentación ilustrativa; jamás alteran identidad, precio o ATS.
- Carrito en Header público (el header simplificado de acceso se conserva).
  Provider existente + sessionStorage separado mock/real, whitelist sin Guest/PII,
  validación al hidratar, SSR sin mismatch, fallback en memoria si storage falla.
  Cada apertura resuelve selección contra availability vigente; storage no cotiza.
  Mantiene cantidades/IDs reales, elimina en 1→0 y respeta ATS.
- Dos handles nativos de range en un track, bounds derivados de minor units de
  offers, valores GTQ, mínimo≤máximo, teclado/ARIA y reset, sin consultas por mover
  el slider. Filtros por code y orden anteriores conservados.
- Guest: nombre 2–50, apellido 2–60, email≤120 normalizado, +502 ocho dígitos,
  otros 7–15, documento required 4–25 y solicitudes≤250 con contador. Validación
  Domain y maxLength HTML coherentes; sin comprobación de autenticidad.
- Token `--public-container-max:1440px` compartido por Header/home/results/detail/
  selección/datos/review/payment, responsive y controles de al menos 44px.
- Pago real conserva quote y final submit bloqueado con indicación discreta;
  no gateway, POST booking ni Reservation/Stay real. OAuth no se altera: el start
  integrado redirige a Google; el recorrido completo lo valida Alan manualmente.

Pruebas Backend 459 PASS y focalizados Web 278 PASS / 34 archivos, más prueba
focalizada de límites HTML Guest 5 PASS. La evidencia manual histórica corresponde
a entregas anteriores: se requiere repetir QA de este incremento.

Validación final: suite Web 1212 PASS / 233 archivos; typecheck, lint y build real
PASS. Después del ajuste responsive del slider, focalizados slider/confirmation
5 PASS y smoke Firefox integrado de siete pantallas por cinco anchos
(1440/1024/768/375/320) sin overflow; teclado del range, selección y total Backend
en Payment PASS, submit final deshabilitado. Compose config/build y servicios
healthy PASS. Google start 307 hacia el proveedor, OAuth completo pendiente manual.
`git diff --check` PASS. Web continúa **EN_QA**.

## Correcciones del QA integrado — carrito/búsqueda/perfil/imágenes (2026-10-06)

**EN_QA**, pendiente del QA manual final de Alan. Conserva el bootstrap y los
cambios sin commit. Backend permanece intacto; no se implementa el POST de Juan.

- Única fuente de carrito: Provider público y sessionStorage por modo. Se quitaron
  controles locales redundantes de catálogo/detalle; Header muestra SUM(quantity).
  Storage conserva también la última búsqueda válida cuando no quedan líneas,
  sin Guest/PII. Reload y navegación acceso/regreso restauran IDs, planes y cantidades.
- `revalidateCartForSearchCriteria` reutiliza el read Service/DTO/Mapper de
  availability. Para cada línea exige RoomType UUID, plan ID/code vigente y
  quantity≤ATS. Construye un resultado completo nuevo, sin mutar inputs. Error de
  red/Backend, plan ausente o una sola línea insuficiente rechaza toda la edición;
  conserva criterios/carrito/precios anteriores y nombra la habitación afectada.
  Si Backend omite la oferta, no se inventa el ATS numérico que no devolvió.
- `usePublicSearchChange` confirma cart/scope juntos solo tras éxito. Actualiza
  todas las líneas (ATS, moneda, nightly/total minor, plan/code/nombre) y conserva
  cantidades/UUID. Semilla la query nueva con esa respuesta y presenta aviso de
  cambio de precio. Si el usuario cambió el carrito durante la consulta, rechaza
  el resultado tardío; no sobrescribe la selección más reciente.
- La misma operación se usa desde homepage/búsqueda flotante, elección desde
  homepage, catálogo y editor inline del detalle. Adults/children se conservan
  en el journey sin inferir capacidad; roomsCount se envía al contrato Backend.
  Fechas/ocupación inválidas no disparan consulta ni cambian el estado aceptado.
- `Habitaciones` utiliza href centralizado con la búsqueda aceptada. URL antigua
  o Back/forward no sustituye un carrito activo: se muestra y sincroniza su scope
  canónico. `/habitaciones` sin query es un catálogo landing con título propio y
  formulario compacto para elegir fechas, sin inventar catálogo/precios.
- Detalle no ofrece selector Plan de tarifa; conserva plan ID/code interno y
  cotiza con Backend. Review y Payment usan criterios aceptados y siguen
  reconsultando autoridad. Payment real mantiene submit final bloqueado.
- Checkout real reutiliza el BFF/resumen de Account; mock sigue separado. Causa,
  comportamiento y pruebas en [Guest Data](42_PUBLIC_BOOKING_GUEST_DATA.md).
- Se retiraron textos/enlaces de créditos e imágenes ilustrativas del journey.
  Galerías activas Pexels verificadas, tres vistas/tipo, diez JPEG locales;
  historial/licencias anteriores conservados. Ver [licencias](LOCAL_DEMO_IMAGES.md).

Validación final de esta corrección:

- Focalizados: 310 PASS / 39 archivos, incluidas regresiones Auth/Account/rutas
  Google; comprobación posterior de edición concurrente/perfil/Header 15 PASS.
- Suite Web completa: **1234 PASS / 236 archivos**. Typecheck, lint sin warnings
  y `NEXT_PUBLIC_USE_MOCK_API=false npm run build` PASS. `git diff --check` PASS.
- Compose config/build integrado PASS; PostgreSQL, Backend y Web healthy.
  Backend no se modifica ni se repite Maven en esta corrección.
- Firefox contra `localhost:3001`: siete pantallas por cinco anchos sin overflow.
  STD×2 + SUITE×1 → contador 3; intento rooms=5 conserva exactamente el storage
  anterior, siguiente edición a cuatro noches/rooms=2/3 adultos/1 niño actualiza
  ambas líneas desde Backend (ATS=4, totales 260000/480000). Review/Payment muestran
  Q10,000.00; final submit deshabilitado, sin POST público. Reload y acceso/regreso
  mantienen IDs/cantidades/criterios; Header conserva query y galería funciona.
- Google start integrado 307 al proveedor. BFF own-account sin sesión devuelve
  401 correctamente; la hidratación con sesión/perfiles se prueba automáticamente
  con fixtures propios del contrato real. Alan debe repetir login Google y prefill
  en su sesión real; no se automatizó OAuth ni se registraron credenciales/cookies.

Estado final: **EN_QA**. Sin commit/push/merge; trabajo anterior conservado.

### QA restante: catálogo Home y búsqueda editable — EN_QA (2026-10-06)

La decisión de navegación más reciente reemplaza el destino del Header:
`Habitaciones` apunta a `/#habitaciones`, o a `/?checkIn=...&checkOut=...&adults=...&children=...&roomsCount=...#habitaciones`
con criterios aceptados válidos. `publicHomeCatalogueHref` es el constructor único;
Home lee la query y el scope global. El anchor tiene margen para el Header sticky.
Los enlaces explícitos a resultados/detalle conservan sus rutas. Una URL anterior
en Home tampoco reemplaza criterios de un carrito activo: se sincroniza la query.

La comprobación en Firefox del stack anterior sí abrió campos habilitados desde
«Modificar búsqueda», pero el foco quedaba en el botón y el panel debajo del
resumen. Resultados y detalle ahora comparten `PublicSearchEditor`: muestra los
criterios actuales, enfoca la primera fecha y lleva el panel a la vista. Ambos
usan `usePublicSearchChange` y la misma política atómica documentada arriba.
Carrito vacío también consulta Backend antes de aceptar; cambio de roomsCount
revalida inventario, adults/children se conservan sin inferir capacidad.

No se modifica OAuth ni se implementa POST booking/pago. Web sigue **EN_QA**.

Validación de esta corrección:

- Focalizados Availability/Booking/Checkout/Account/Auth/BFF Guest: **447 PASS /
  58 archivos**; prefill tras proteger edición manual: **6 PASS**.
- Suite final: **1245 PASS / 237 archivos**; typecheck, lint y build real PASS.
- Compose config/build PASS; PostgreSQL, Backend y Web healthy. OpenAPI integrado
  confirma el summary sin name/picture y nombres únicamente en profiles[].
- Firefox real: siete pantallas y cinco anchos, sin overflow. Modificar búsqueda
  desde resultados: rooms=5 rechaza y conserva el storage anterior; cambio a
  cuatro noches/rooms=2/3 adultos/1 niño acepta y actualiza ambas líneas. Header
  vuelve al anchor Home con query vigente, catálogo y precios actualizados.
  Reload/acceso/regreso conservan selección; Review/Payment muestran Q10,000.00
  para STD×2 + SUITE×1, final submit bloqueado y ningún POST público.
- BFF real devuelve seis ofertas GTQ/ATS=4. Google start integrado devuelve 307
  al proveedor; no se ejecutó login/callback ni se inspeccionó la sesión de Alan.
  Prefill de sesión concreta sigue sujeto al QA manual y al límite del contrato.
- `git diff --check` PASS. Web/bootstrap permanecen **EN_QA**, sin commit/push/merge.


## Cierre final — Web Public Availability y journey pre-submit (2026-10-06)

**Estado: COMPLETADA — QA manual PASS confirmado por Alan.** Se validaron en el
stack Docker integrado el catálogo real de seis RoomTypes, galerías, carrito global
y persistencia, filtros, modificación de fechas/huéspedes, revalidación atómica y
navegación del Header al catálogo Home. Guest session/account se comporta según el
contrato actual; se recorrieron Guest checkout, Review y Payment. La confirmación
final permanece bloqueada correctamente.

El contrato Account Summary solo permite completar firstName/lastName si existe un
GuestProfile asociado con esos datos. No se afirma que Google aporte nombres sin
dicho perfil.

**Fuera de scope y pendiente de Juan:** `POST /api/v1/public/bookings`, PaymentGateway
simulado Backend, persistencia Reservation/ReservationStay, confirmationCode e
idempotencia booking. El QA PASS termina antes de crear o confirmar una reserva.
Este cierre sustituye los estados EN_QA registrados durante las rondas anteriores;
su historial y evidencia se conservan.
