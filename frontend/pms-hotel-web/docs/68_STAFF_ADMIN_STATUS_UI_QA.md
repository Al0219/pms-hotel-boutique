# Fase 3D-2 — Suspensión y baja lógica Staff desde Usuarios

Fecha: 2026-10-23. Rama: feature/staff-admin-read.
**Estado: COMPLETADA — aceptación QA manual PASS autorizada por el usuario el 2026-10-23.**

Alcance autorizado: UI de ACTIVE→SUSPENDED, ACTIVE→DISABLED y
SUSPENDED→DISABLED mediante el PATCH de estado existente.3D-1,3B-1 y3C siguen
COMPLETADAS;3B-2 permanece BLOQUEADA por M08. Backend2A/BFF2B conservan sus QA
independientes; no se cierran BE-006B/C ni BE-014A.

## Cierre autorizado y preparación de commit/PR (2026-10-23)

El usuario confirma aceptación manual PASS y autoriza cerrar **únicamente 3D-2**
para suspensión, baja lógica, confirmaciones, swipe de escritorio e iconos.
No se infiere ejecución manual de otros casos a partir de esta aceptación.

| Evidencia | Resultado / alcance |
| --- | --- |
| QA manual del usuario | PASS: suspensión, baja, confirmaciones, swipe de escritorio e iconos |
| Automatizado histórico | 149 focalizadas de gesto/estado/inline; 80 focalizadas posteriores a iconos; 28 aserciones Firefox de fixture. Las cifras y límites anteriores se conservan por ejecución; no se suman como casos únicos |
| Validación completa de publicación | `npm run check` ejecutado una sola vez: lint/typecheck PASS; 2.207 tests PASS y 1 FAIL en checkout público (303 archivos PASS/1 FAIL). Build no alcanzado por ese comando |
| Diagnóstico focalizado del fallo ajeno | Checkout: 11 PASS/1 FAIL; mismo assert de limpieza del carrito en public-payment-review-page.test.tsx:175. Archivo sin cambios; no se altera ni se repite suite completa |
| Build restante | `npm run build` ejecutado una vez por separado: PASS. No convierte el check global en PASS |
| Pendientes manuales expresos | 409 HTTP, recuperación 503, lector de pantalla, hardware touch/touchpad y variantes de permisos/scope/MSW no confirmadas individualmente; no se atribuye PASS manual |
| Paginación positiva | NO EJECUTABLE histórico por insuficiencia de registros; no se elimina por este cierre |

3D-1, 3B-1 y 3C conservan COMPLETADA; 3B-2 sigue BLOQUEADA por M08. Backend 2A,
BFF 2B y BE-006B/C/BE-014A mantienen sus estados independientes. Creación y
reactivación son incrementos posteriores; no se implementan aquí. Las entradas
EN_QA y FAIL que siguen son **historial**, no el estado vigente del incremento.
Publicación del commit y PR autorizada; merge no autorizado. PR en borrador por
el fallo de validación global, que permanece explícito. Build/checkout logs solo
en `/tmp/pms-staff-pr-review/`, excluidos del commit. `next-env.d.ts` generado
se excluye y conserva su contenido local previo. No se repiten suites Backend.

## Iconos de acciones reveladas (2026-10-23), EN_QA

PauseCircle sobre «Suspender» y UserX sobre «Deshabilitar», centrados en vertical.
SVG oficiales de [Lucide](https://github.com/lucide-icons/lucide/tree/main/icons)
inline, sin dependencias nuevas; licencia en `components/staff-status-icons.LICENSE`.
Se mantienen colores warning/error, 50/50 o 100 %, altura completa y responsive.
Iconos decorativos aria-hidden/focusable=false; el texto conserva el nombre
accesible. Sin cambios de gesto, edición, permisos, confirmaciones ni contratos.
**80 pruebas focalizadas PASS** (staff-admin-row y staff-status-actions);
`git diff --check` PASS. Sin suite general/builds/Docker. Ajuste visual pendiente
de confirmación manual: revelar acciones y revisar icono sobre texto en escritorio
y móvil; confirmar/cancelar conserva el comportamiento previo. **3D-2 EN_QA**.

## Ajuste UX: swipe-to-reveal detrás de toda la fila (2026-10-23), EN_QA

- Las tres celdas conservan su semántica y columnas. Sus superficies opacas se
  trasladan con el mismo offset; el panel posterior queda anclado a la derecha,
  recortado al registro. No se desplaza el panel ni se añade columna.
- Mouse/touch: intención horizontal desde 16 px; seguimiento continuo, apertura
  o cierre al superar 48 px y retorno al estado anterior ante gesto insuficiente
  o cancelado. Wheel horizontal usa el mismo desplazamiento y panel. Transición
  de asentamiento de 160 ms, anulada con `prefers-reduced-motion`.
- Suspender/Deshabilitar se proyectan al panel mediante un portal local; cada
  acción ocupa la mitad de su ancho y toda su altura. Una única acción ocupa el
  100 %. Durante el arrastre sin confirmar apertura, el panel permanece inert.
  La alternativa contextual de Acceso abre ese mismo panel; ya no inserta allí
  las dos acciones. Apertura por teclado enfoca la primera acción; Escape cierra.
- Se reutilizan confirmación, permisos, coordinador y mutaciones sin cambios.
  La confirmación se proyecta a document.body para evitar recorte/transformación.
  Se corrigió el ancho del encabezado accesible oculto en móvil y se amplió allí
  el panel para no partir «Deshabilitar». Sin cambios Backend/BFF ni compartidos.

**Pruebas focalizadas:** 149 PASS en tres archivos:

```bash
npm run test -- src/modules/staff/components/staff-admin-row.test.tsx src/modules/staff/staff-status-actions.test.tsx src/modules/staff/staff-inline-edit.test.tsx
git diff --check
```

**Firefox headless, fixture de componentes reales y datos sintéticos:** 28
aserciones PASS con entrada nativa BiDi: seguimiento y cierre, panel fijo,
reparto 50/50/100 %, altura completa, tres columnas, sin overflow a 1366/768/390 px,
clic de los tres editores, confirmación fuera del recorte, touch y wheel sin
escritura por gesto. No se acredita dispositivo físico ni ruta autenticada.
Capturas inspeccionadas y script en `/tmp/pms-3d2-swipe-layout/` (`check.mjs`,
`open-1366.png`, `open-768.png`, `open-390.png`). Sin suites generales/builds/Docker.

**Nueva QA manual pendiente:** comprobar código actualizado; en una cuenta
objetivo ACTIVE elegible, arrastrar a izquierda y verificar que se mueven los
tres grupos sobre dos acciones iguales. Arrastrar a derecha; comprobar clic de
correo/rol/propiedades y expansión. Repetir en móvil, con wheel horizontal y con
teclado desde Opciones de estado. Seleccionar una acción debe abrir confirmación;
Volver no escribe. Con SUSPENDED, Deshabilitar debe llenar todo el panel. Comprobar
409/503 según los procedimientos existentes si se valida la operación completa.
Estado EN_QA; no se atribuye nueva aceptación manual ni se cambian otros estados.

## FAIL persistente: servidor con build anterior demostrado (2026-10-23), EN_QA

La investigación de esta iteración cambia la hipótesis: no se atribuye el FAIL
persistente al reconocedor actual. Por HTTP real de `/seguridad/usuarios` en
127.0.0.1:3001, la respuesta Flight referencia el build
`h-sNKwKaTgRGTT1sYXtdD`; el archivo local `.next/BUILD_ID` contiene
`Hn3SEdEnvuJrJGWzkcVRq`. El chunk servido
`/_next/static/chunks/04rfflkeek481.js` exporta `StaffAdminWorkspace` pero su
`renderReadOnlyRow` produce un `tr` de consulta simple: no contiene
`data-staff-edit-trigger`, `staffDragging` ni `onPointerDown`. El chunk local
`2l75evnskbp9j.js` sí contiene esos tres marcadores. El proceso Next identificado
trabaja en el directorio Web de este repositorio. No se inspeccionaron secretos.
Por tanto, **el servidor observado entrega código anterior, sin edición ni gesto**;
las correcciones de componentes no pueden arreglar esa versión servida. Esto no
acredita qué versión tenía abierta una pestaña concreta del usuario.

Cambios mínimos: **ningún cambio funcional** en UI, eventos, estilos, hooks,
Backend o BFF. Se agregan dos herramientas locales de diagnóstico de solo lectura:

- `scripts/diagnose-staff-users.mjs`: compara build servido/local y detecta los
  marcadores de edición/gesto en los chunks de la ruta. No requiere autenticación,
  no consulta APIs administrativas ni envía escrituras. Salida 1 significa runtime
  desactualizado/incompleto; salida 2 indica imposibilidad de inspeccionar.
  La presencia del código no equivale a PASS funcional.
- `scripts/staff-users-firefox-diagnostic.js`: pegar en Console sobre la ruta
  autenticada. Registra eventos reales (fases de captura/burbuja y cancelación),
  hit-testing/CSS, controles deshabilitados, `inert`, bloqueo de sesión,
  `aria-busy` y cambios de identidad de los nodos de fila. No cancela eventos,
  no captura punteros ni lee credenciales, valores de campos, cookies, storage,
  payloads o estado interno de React. No efectúa peticiones ni mutaciones.

**Verificación ejecutada:** 54 pruebas focalizadas PASS, 53 no seleccionadas,
2 archivos; sintaxis de ambos scripts validada con `node --check`;
smoke del logger con JSDOM: 9 aserciones PASS sin interceptar clics ni registrar
contenido de campos (APIs de layout/navegación suplidas, no prueba Firefox);
`git diff --check` PASS. Sin suite completa, builds, Docker o QA funcional PASS.
Ruta autenticada no disponible para el agente con una sesión QA autorizada:
overlays, eventos, remounts y sesión **en esa ruta autenticada** siguen pendientes
de la captura siguiente. No se declara una nueva ejecución manual del usuario.
Los resultados aislados anteriores quedan como evidencia histórica, no como
explicación suficiente del FAIL integrado.

### Recuperación y diagnóstico en Firefox (sin rebuild repetido)

1. Desde `frontend/pms-hotel-web`, ejecutar:

   ```bash
   node scripts/diagnose-staff-users.mjs http://localhost:3001
   ```

   Si informa `STALE_OR_INCOMPLETE_RUNTIME`, detener **en su terminal original**
   el Next existente con Ctrl+C. Volver a iniciarlo en esa terminal, conservando
   su configuración de conexión al Backend:

   ```bash
   NEXT_PUBLIC_USE_MOCK_API=false NEXT_PUBLIC_STAFF_PREVIEW=false npm run dev
   ```

   No usar `dev:staff`, que activa preview/mocks. No se ha detenido el proceso del
   usuario desde el agente ni reconstruido `.next`. La compilación de desarrollo
   de la ruta debe utilizar el código actual. Repetir el diagnóstico: se requiere
   `editingCodeServed: true` y `gestureCodeServed: true`. En dev puede no existir
   buildId comparable; esos marcadores solo acreditan código servido.

2. En Firefox, abrir DevTools → Network → deshabilitar caché y recargar con
   Ctrl+Shift+R; iniciar sesión con una cuenta QA autorizada. Verificar **Network**
   y **Debugger** sobre los scripts realmente recibidos, incluyendo la respuesta
   del documento/RSC, no únicamente los archivos en disco. No borrar cookies ni
   modificar permisos para esta prueba.
3. Pegar el contenido completo de `scripts/staff-users-firefox-diagnostic.js`
   en Console. `staffUsersQA.snapshot()` debe mostrar controles editables
   habilitados en un objetivo elegible (no cuenta propia, SUPER_ADMIN protegido
   o DISABLED). Si no hay controles, comprobar primero build y elegibilidad.
4. **Primero edición:** clic normal en correo, Escape; rol, Escape; propiedades,
   Escape. Debe abrirse el editor correcto sin guardar ni revelar acciones.
   `staffUsersQA.report()` conserva fases y cambios de nodos antes/después.
5. **Después gesto:** sobre una fila elegible sin editor, arrastrar a izquierda
   más de 48 px, sin movimiento vertical dominante; deben revelarse acciones.
   Arrastrar a derecha las oculta. El clic inmediatamente posterior debe abrir
   edición o expansión normalmente. El gesto no debe crear PATCH alguno.
6. Ante FAIL, ejecutar `staffUsersQA.hit()` y `staffUsersQA.report()`:
   `hit` identifica el elemento realmente alcanzado y los elementos superpuestos;
   las fases ausentes permiten localizar la propagación interrumpida;
   `preventedAfterDispatch` detecta cancelación; cambios en `node` entre down y
   click indican remount; `sessionBlocked`, `inert`, `busy` y `disabled` separan
   autorización/revalidación de gestos. En Debugger, añadir Event Listener
   Breakpoints para pointerdown/up/click y revisar la pila del runtime recibido
   si se necesita identificar el listener exacto. Captura de puntero se registra
   mediante got/lostpointercapture; no se deduce su responsable sin la pila.
   Terminar con `staffUsersQA.stop()` o recargar. El reporte no incluye datos de
   cuentas ni secretos; no compartir cabeceras/cookies ni exportar HAR con sesión.

**Cierre pendiente:** actualizar el servidor/pestaña y ejecutar los clics y gesto
en la ruta autenticada. Si persiste con código vigente, usar la captura anterior
para localizar el bloqueo antes de cambiar el reconocedor. 3D-2 sigue EN_QA;
ninguna fase independiente cambia de estado.

## Regresión crítica: prioridad click-to-edit (2026-10-23), EN_QA

FAIL manual comunicado: arrastre y edición de los tres grupos no funcionan.
Reproducción Firefox de componentes: selección residual impedía abrir correo,
rol y propiedades por el veto global de selección en onClick. Se retiran ese veto,
set/releasePointerCapture, captura anticipada y supresión temporal de 500 ms. Down/up
normales no se cancelan: se observa el movimiento en document, se decide solo al
superar 48 px y se consume únicamente el clic de liberación de un arrastre reconocido;
una nueva pulsación o tecla elimina ese registro. Selección ajena no bloquea la
fila; la selección pulsada/modificada sigue nativa. Captura de clic React retirada.

**66 focalizadas PASS/3 archivos; 78 casos no seleccionados; diff --check PASS.**
Primero clics de correo/rol/propiedades, selección residual y clic inmediato tras
arrastre; después gesture/touch/wheel/confirmación y regresiones 409/503 seleccionadas.
**46 checks Firefox nativos de componentes PASS**, comenzando por esos tres clics;
fixture sin Backend, no ruta autenticada. **NO se declara PASS funcional** de
/seguridad/usuarios ni QA manual del usuario. Ruta integrada y aceptación 3D-2
PENDIENTES. Sin suite general/builds/Docker ni cambios Backend/BFF.
Evidencia: /tmp/pms-3d2-click-regression-qa/ (click-baseline.log, click-fixed.log,
focused-final.log, native-final.log y native-restored.json). Las entradas siguientes
son históricas; no acreditan la restauración en la ruta autenticada.

## QA manual FAIL: arrastre desde contenido normal (2026-10-23), EN_QA

Fallo comunicado por el usuario, reproducido con mouse nativo Firefox en una
fixture que renderiza StaffAdminRow/InlineGroup/StatusActions y DataGrid reales:
username/correo/rol/propiedad no revelaban; celda vacía sí. Había exclusiones
explícitas de texto y botones inline, captura tardía y clic residual que abría
correo. No fue recorte CSS en esta reproducción. Se sustituye la recomendación
anterior de buscar espacio vacío: se captura el elemento original desde down,
se admite el contenido de edición cerrado y solo al superar48px se toma el gesto.
El clic residual se frena en captura antes de llegar al editor. Inputs/acciones,
selección previa o con modificadores, vertical, teclado y confirmación conservados;
user-select/cursor cambian solo durante el arrastre reconocido y se restauran.

**45 focalizadas PASS/2 archivos,26 no seleccionadas; diff --check PASS.**
**35 comprobaciones nativas Firefox PASS** (headless final, eventos isTrusted):
izquierda/derecha desde cinco zonas, clic normal/edición, input activo, touch,
wheel y confirmación/cancelación; no son eventos DOM fireEvent ni QA manual del
usuario. Evidencia/captura: /tmp/pms-3d2-mouse-real-qa/native-final.json y mouse-fixed.png.
**Ruta autenticada NO VERIFICADA:** cuenta QA documentada respondió401; revisión
automática rechazó leer bootstrap del contenedor, no se leyó ni se buscó por otra
vía. Fixture explícita con datos sintéticos, sin Backend; no certifica permisos,
persistencia ni integración real. Se solicitó una cuenta QA autorizada.
Sin suite general/build de producción/Docker nuevo/hashes masivos.3D-2 EN_QA.

## Corrección local mouse/touchpad (2026-10-23), EN_QA

Se elimina la restricción touch-only: arrastre primario con mouse sobre espacio
libre de texto/controles, touch existente y wheel horizontal acumulado para touchpad
cuando el navegador lo entrega. Se conservan umbral48px, predominio horizontal,
scroll vertical/zoom, selección, clic/expansión, teclado y confirmación obligatoria.
Escape/cancelación/captura perdida/blur cancelan; el gesto nunca escribe.

**41 focalizadas PASS/2 archivos;26 casos no seleccionados; diff --check PASS.**
30 casos del reconocedor y11 regresiones relacionadas; log y comando exacto en
/tmp/pms-3d2-drag-qa/focused-final.log. WheelEvent simulado, hardware y nueva QA
Firefox PENDIENTES. Sin check general/builds/E2E/Docker/hashes en esta corrección.
Solo reconocedor/tests y registro breve; Backend/BFF, permisos, versiones,409/503
intactos. Manual: arrastrar una zona libre a izquierda/derecha; comprobar revelado
sin PATCH, clic normal, selección y controles; probar touchpad real horizontal y
scroll vertical. **3D-2 EN_QA**, sin aceptación manual ni commit/push/merge.

## Contrato y arquitectura reutilizados

Fuentes: contrato53 (M03/M04/M06/M08 y estado), Backend real3B-1/QA54,
BFF3C/QA66 y coordinador3D-1/QA67. Esta entrega no aprueba decisiones nuevas,
no modifica endpoints Backend/BFF, autenticación, migraciones ni Guest.

UI → useStaffInlineEdit → command service/DTO → BFF3C; el acuse pasa por el mapper
existente antes de utilizarse como Domain. El service extiende su unión tipada con
`StaffAdminStatusCommandDTO` y selecciona exclusivamente el sufijo `/status`.
Un fetch con cookies same-origin, cache no-store y sin refresh/retry de escritura:

```http
PATCH /api/staff/admin/users/{id}/status?scope=PROPERTY&propertyId={propertyId}
Content-Type: application/json

{"status":"SUSPENDED","expectedVersion":0}
```

Los valores proceden del GET autorizado vigente y PropertyScope real. También
se conserva ALL_PROPERTIES cuando está autorizado. No organizationId en body,
no tokens del navegador ni fuente arbitraria de organización. El BFF sigue
protegiendo Origin y el Backend STAFF_MANAGE/organización/scope completo.
Acuse200 mínimo: organizationId, staffUserId, version, changed. No se espera
StaffView. La tabla/detalle se reconcilian con GET, sin estado optimista ficticio.

## Interacción implementada

- Exactamente Usuario, Acceso y Asignación, con expansión y edición directa
  existentes. No nueva columna, pantalla, librería o componente shared modificado.
- En móvil, deslizamiento **hacia la izquierda** sobre una zona no interactiva
  de la fila revela las operaciones disponibles en Acceso; hacia la derecha las
  oculta. Umbral48px y predominio horizontal1.6x; vertical>12px predominante cancela
  el reconocimiento. touch-action permite pan-y/pinch-zoom. Pointercancel,
  selección de texto, controles, toque secundario y edición en curso no revelan.
- El gesto no consulta ni escribe por sí mismo y su clic posterior no expande
  accidentalmente la fila. Solo escoger una operación provoca GET vigente.
- Alternativa visible/discreta «⋯» en Acceso, con nombre accesible «Opciones de
  estado de {username}», aria-expanded/controls. Mouse, Enter/Espacio y Tab llegan
  a botones normales dentro de un grupo accesible, sin fingir semántica menu.
  Escape/clic exterior cierran el revelado; no equivalen a confirmar un comando.
- Seleccionar Suspender/Deshabilitar abre ConfirmDialog compartido después del
  GET/validación. Advierte que actualmente no existe reactivación; la baja es
  lógica, definitiva y conserva historial. Volver/Escape cancelan sin escribir.
- Una confirmación explícita envía un solo comando. No existe arrastre que ejecute
  la acción, eliminación física, ACTIVE/reactivación, alta ni credenciales.
- Mientras se edita correo/rol/propiedades, las acciones de estado y gestos están
  bloqueados. Mientras se procesa estado, los otros grupos también lo están.
  Permanece el guard de PropertySwitcher y la retirada por identidad/permisos.
- Se conserva layout responsive y reduced-motion. Solo las opciones reveladas
  ocupan espacio adicional. El foco vuelve al disparador o, tras DISABLED, al
  control de expansión de la fila cuando acaba la reconciliación, sin robarlo
  si el usuario se movió fuera del registro. Si el filtro elimina la fila, esta
  desaparece según los resultados autorizados, no se conserva como dato vigente.

## Reglas y recuperación

| Caso | Comportamiento |
| --- | --- |
| ACTIVE | Ofrece Suspender y Deshabilitar. |
| SUSPENDED | Ofrece únicamente Deshabilitar. |
| DISABLED | Terminal, sin acciones de estado ni edición inline. |
| Cuenta propia, objetivo SUPER_ADMIN o actor sin STAFF_MANAGE | No ofrece operaciones prohibidas. GERENCIA no descubre/gestiona SA; autoridad final Backend. |
| GET previo cambia la elegibilidad | No confirma una transición ya inválida. Mantiene estado vigente y permite cerrar la intención. |
|409 | Conserva objetivo/intención y versión original, cierra confirmación activa; exige Actualizar usuario mediante GET y nueva revisión/confirmación. No reenvía al recuperar. |
| Cambio externo conocido por caché/foco | El mismo coordinador marca conflicto; no adopta snapshot ni ejecuta una escritura silenciosa. |
|503/red/acuse inválido | Resultado incierto, no éxito ni fracaso afirmado; bloqueo compartido incluso tras remount. Sin cerrar/descartar ni nuevas escrituras hasta GET explícito. Un refetch/foco no desbloquea. |
| Resultado ya persistido al recuperar | Muestra el estado real. Si la transición ya no procede, no ofrece repetirla. Cerrar permite seguir consultando; no simula rollback. |
|200 seguido de GET fallido | Conserva acuse/version y bloqueo hasta comprobar el estado; no vuelve a enviar. Manejo heredado del coordinador probado en3D-1. |
|401/403/404 | Reutiliza retirada/revalidación y errores sanitizados existentes. No filtra otra organización ni mantiene acciones con autoridad caducada. |

Versión global, lock síncrono por identidad/organización/usuario y caché son los
mismos de3D-1. La extensión de grupo status no crea un segundo hook de escritura.
Una intención en conflicto no puede sobrescribir correo/rol/propiedades; el
comando status solo contiene status y expectedVersion. Un cambio confirmado
invalida listado/detalle y reinicia cursores como el resto de mutaciones.

## Inventario

| Archivo en src/modules/staff salvo indicación | Cambio |
| --- | --- |
| dtos/staff-admin-command.dto.ts | DTO de estado, enum SUSPENDED/DISABLED. |
| service/staff-admin-command.service.ts | Mismo transporte de un despacho, sufijo status. |
| model/staff-admin-edit.ts | Grupo de acción/estado, disponibilidad y transiciones. |
| hooks/use-staff-inline-edit.ts | Extiende versión, lock, validación y reconciliación existentes. |
| components/staff-admin-row.tsx (nuevo) | Fila nativa, reconocimiento táctil y supresión del clic posterior. |
| components/staff-status-actions.tsx (nuevo) | Revelado, accesibilidad, confirmación, recuperación y foco. |
| components/staff-admin-workspace.tsx | Integración local en Acceso y wrapper de fila. |
| components/staff-admin.module.css | Estilos locales de opciones, gestos y reduced-motion. |
| staff-status-actions.test.tsx (nuevo) |37 casos nuevos, incluidos teclado/táctil, versiones, permisos y fallos. |
| README.md | Alcance público/documentación y estados actualizados. |
| docs/68..., backend/docs/AlanPlan.md y AlanHandoff.md | Evidencia/seguimiento EN_QA. |

QA67 y el código Backend/BFF/Auth/Properties/shared permanecen intactos respecto
al inicio de esta tarea; se conservan todos los cambios locales anteriores.

## Pruebas automatizadas ejecutadas

| Ejecución | Resultado |
| --- | --- |
| Focalizados finales Staff/Properties/BFF/Auth/Dashboard/shell | **519 PASS /18 archivos**, incluidos37 nuevos de estado y regresiones3D-1. |
| Lint/TypeScript | **PASS** en check final: ESLint sin warnings y TypeScript; typecheck posterior a ambos builds también **PASS**. |
| Builds explícitos mocks false/true | **PASS ambos**, repetidos sobre la fuente final tras el ajuste de foco. |
| npm run check por defecto, primera corrida |2157 PASS y2 FAIL/303 archivos: checkout público, aserciones de carrito/sessionStorage. No alcanzó build. |
| npm run check después de nuevos casos de caché |2160 PASS y1 FAIL/303 archivos: otra aserción del mismo checkout. No alcanzó build. |
| VITEST_MAX_WORKERS=2 npm run check |2160 PASS y1 FAIL/303 archivos, public-payment-review-page.test.tsx:175. No alcanzó build; se interrumpió antes un run separado de tests al sustituirlo por este check completo, no cuenta como PASS. |
| npm run check sobre fuente final con prueba de foco | **PASS:2162 pruebas/303 archivos**, lint/typecheck y build completos en la última corrida, sin cambiar checkout ni relajar aserciones. |
| Firefox→Next3010→Spring18101→PostgreSQL17, mocks=false | **19 comprobaciones PASS**. |
| Mismo flujo con MSW activo y fixtures independientes | **19 comprobaciones PASS**, persistencia real. |
| Firefox headless responsive/táctil | **11 comprobaciones PASS** en1366/768/390px, eventos táctiles BiDi de confianza, gesto sin escritura y cancelación. Simulación, no dispositivo físico. |
| SQL de solo lectura | **14 aserciones PASS**:11 estados/versiones,12 eventos administrativos con actor/sujeto/organización/correlación y11 memberships ACTIVE conservadas. |
| diff --check / preservación | **PASS**; SHA-256 de2200 archivos iniciales:9 archivos existentes modificados y4 añadidos, todos del alcance; ningún archivo retirado ni cambios ajenos sobrescritos. |

**La última comprobación general es PASS**, pero se preservan los fallos
intermitentes anteriores en checkout público; su código y tests no se modificaron. Se conservan sus fallos
exactos, sin relajar aserciones/timeouts ni resolver módulos ajenos a este alcance.
La causa de la limpieza tardía/reaparición del carrito requiere seguimiento aparte;
reducir workers no eliminó el fallo en aquella corrida y el PASS final no equivale
a haberlo corregido. No se afirma CI remoto ni nuevas pruebas
Backend Maven; se usó el JAR validado existente de3B-1, montado de solo lectura. Revocación,
carreras de autenticación y rollback siguen siendo responsabilidad/evidencia de
3B-1; no se atribuye una nueva certificación completa de esas suites en esta UI.

Las37 pruebas nuevas cubren las tres transiciones, flags de mocks, PROPERTY/ALL,
revelado/cancelación mouse/teclado, horizontal/vertical/corto/cancelado/mouse/
secundario/selección/controles, exclusión de edición, SA/propio/DISABLED/GERENCIA/
sin permiso,409,503/red/acuse inválido, resultado ya persistido,400/401/403/404,
conflicto de estado, refetch externo durante confirmación, GET previo, doble
confirmación, lock compartido con email tras remount, retiro del filtro y foco.

Incidencias corregidas durante QA: aviso duplicado al invalidarse una transición;
retorno de foco antes de terminar refetch; fixtures con etiqueta de estado antigua
y selector ambiguo de Activo; la prueba de caché esperaba retención donde gcTime0
retira deliberadamente un detalle sin observador. Ahora observa la actualización
antes de su retirada y verifica ausencia de snapshots anteriores. Sin arreglos de
Backend/BFF ni excepciones de seguridad para hacer pasar la integración.

### Evidencia real y límites

Proyecto Docker propio **pms_staff_3d2_qa**: DB tmpfs sin puerto host, JAR Java21
existente en mount readonly. Backend18101, Next3010 y perfiles Firefox QA propios.
Solo se insertaron cuentas sintéticas qa_status_*; no se tocó la base habitual,
los otros proyectos Docker, producción ni un perfil Firefox personal.

Por cada flag se verificaron UI real, tres columnas, advertencias, cancelación,
ACTIVE→SUSPENDED→DISABLED, ACTIVE→DISABLED, desaparición de editores, no-store y
DTO sin secretos. Mientras la confirmación estaba abierta se modificó correo
mediante el BFF: status con versión anterior produjo un **409 HTTP real**;
Actualizar usuario no reenvió y una nueva confirmación adoptó la versión vigente.

Para503 se pausó únicamente el Backend QA después de abrir la confirmación.
Tras deadline se conservó el bloqueo; al reanudar no hubo reintento. En ambas
fixtures el comando original **terminó persistido** (SUSPENDED/version1): el GET
explícito lo reconcilió sin otra escritura. Esto demuestra por qué503 no debe
etiquetarse como fracaso seguro ni reenviarse automáticamente. SQL comprobó las
versiones finales y12 eventos ORGANIZATION atribuidos a qa_staff y cada objetivo.

Capturas reales inspeccionadas por el agente: desktop-true.png, layout-1366.png,
layout-768.png, layout-390.png, mobile-actions.png y mobile-confirmation.png en
/tmp/pms-3d2-qa/. La primera captura de opciones se tomó durante opacity0 de la
animación; se repitió después de200ms, sin cambiar CSS para ocultar un defecto.

Teclado nativo con ventana: **NO EJECUTABLE** en este entorno, Firefox permaneció
visible pero document.hasFocus era false. Dos intentos iniciales se registraron
como fallos de harness, no PASS del producto. No se falsificó hasFocus ni se
inyectó una autorización. El teclado/foco tiene cobertura de componentes, no se
atribuye una validación nativa ni manual. Lector de pantalla, hardware táctil y
CI remoto continúan NO ACREDITADOS. Ninguna de estas comprobaciones automatizadas
es QA manual PASS del usuario.

Artefactos efímeros: /tmp/pms-3d2-qa/: fixtures*.json/sql, compose.json,
focused-final-focus.log, check-*.log, build-*.log, browser-false-third.log,
browser-true.log, browser-false.json, browser-true.json, mobile-final.log,
mobile.json, sql-final.log, sql.json, sql-assertions.json y capturas. La evidencia
de negocio se obtuvo antes del ajuste final de retorno de foco; ese ajuste tiene
regresión focalizada y builds finales propios, sin cambios del transporte/contrato.

## Comandos de verificación

Desde frontend/pms-hotel-web/:

```bash
npm run test -- src/modules/staff 'src/app/(private)/staff-admin-navigation.test.tsx' src/modules/properties src/app/api/staff/admin src/app/api/auth src/lib/http/staff-bff.test.ts src/data/mocks/worker-boundary.test.ts src/modules/auth/components/staff-session-provider.test.tsx 'src/app/(private)/staff-shell-scope.test.tsx' 'src/app/(private)/dashboard/auth-regression.test.tsx'
npm run check
VITEST_MAX_WORKERS=2 npm run check
NEXT_PUBLIC_USE_MOCK_API=false npm run build
NEXT_PUBLIC_USE_MOCK_API=true npm run build
npm run typecheck
git diff --check
```

## Procedimiento manual reproducible (PENDIENTE)

Usar solo un entorno descartable. No probar suspensión/baja sobre una cuenta
importante: actualmente no hay reactivación. Estos pasos no se registran PASS
hasta confirmación del usuario.

Desde backend/, con el JAR validado existente, proyecto y puerto propios:

```bash
docker compose -p pms_staff_status_manual -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_staff_status_manual -f compose.bd2-test.yaml run --rm -d \
  --name pms_staff_status_manual_app -p 127.0.0.1:18102:8080 \
  -e PMS_BOOTSTRAP_ADMIN_USERNAME=qa_status_admin \
  -e PMS_BOOTSTRAP_ADMIN_EMAIL=qa.status.admin@example.test \
  -e PMS_BOOTSTRAP_ADMIN_PASSWORD=QA-only-status-password1! \
  verify java -jar target/pms-hotel-backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=demo --pms.demo.data.enabled=true
```

Esperar health200/UP. Desde frontend/pms-hotel-web/ (detener este Next antes de
reconstruir el mismo .next; no detener servidores de otros proyectos):

```bash
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18102 PMS_WEB_PUBLIC_URL=http://localhost:3011 npm run build
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18102 PMS_WEB_PUBLIC_URL=http://localhost:3011 npm run start -- --port 3011
```

En Firefox, http://localhost:3011/acceso, login qa.status.admin@example.test con
la contraseña sintética anterior. Elegir Usuarios. El objetivo demo independiente
pms_demo_reception debe pertenecer al scope y no ser el actor. Si se necesita otro
objetivo ACTIVE, preparar una base/proyecto descartable nuevo, no reactivar el
anterior ni manipular su historial. Para GERENCIA u otra org/permisos utilizar
fixtures QA autorizadas existentes; si no están disponibles, conservar pendiente.

| Escenario | Acción/evidencia | PASS / FAIL |
| --- | --- | --- |
| Revelado móvil | Deslizar a izquierda/derecha, repetir scroll vertical y toque corto | Solo revela/oculta acciones aplicables; cero PATCH y cero expansión accidental. |
| Mouse/teclado | Opciones de estado en Acceso, Enter/Espacio, Tab, Escape | Acciones descubribles, nombres y foco visibles, sin cuarta columna. |
| Confirmación/cancelación | Elegir Suspender, revisar advertencia y Volver/Escape | GET vigente, sin comando ni pérdida de edición; advertencia de que no existe reactivación. |
| Suspensión | Confirmar Suspender sobre ACTIVE | Un PATCH status/expectedVersion,200 mínimo; GET muestra SUSPENDED/version+1. No Reactivar. |
| Baja | Sobre SUSPENDED confirmar Deshabilitar; en otra fixture ACTIVE probar baja directa | Explica terminal/historial, un PATCH, DISABLED persistido, ningún editor disponible, sin hard delete. |
|409 real | Con confirmación abierta, cambiar el correo en otra sesión autorizada y confirmar la anterior |409 HTTP en Red, intención intacta y sin replay. Actualizar hace GET; Revisar vuelve a pedir confirmación con nueva versión. Si el foco ya detectó el cambio antes del envío, comprobar conflicto preventivo separadamente, no atribuir409 HTTP. |
|503 incierto | Abrir confirmación, docker pause pms_staff_status_manual_app, confirmar y esperar deadline. Luego docker unpause pms_staff_status_manual_app | Un envío, bloqueo y resultado incierto; no nueva escritura al reconectar. GET explícito decide el estado, incluso si el primer comando sí persistió. |
| Lock entre grupos | Con estado pendiente intentar correo/rol/propiedades o cambiar scope | Sin mutaciones simultáneas;503 exige recuperar primero. Cambio voluntario protegido y cambio forzoso de identidad retira datos. |
| Permisos/terminal | Cuenta propia, SA protegido, GERENCIA ordinaria/SA, Staff sin permiso, sin sesión, objetivo fuera de scope | Solo operaciones autorizadas; no existencia ajena. No dar PASS sin fixture/ejecución de cada variante. |
| Regresión3D-1 | Editar correo/rol/propiedades, búsqueda, filtros, cursor, expansión, pestañas | Mismas garantías de borrador/versión, tres columnas y cero acciones de estado mientras se edita otro grupo. Paginación positiva requiere registros suficientes. |
| Responsive/a11y |390/768/escritorio, zoom, teclado real y lector de pantalla | Sin overflow, scroll natural, gesto con alternativa accesible, diálogo y foco correctos. Hardware/lector no se infieren de simulación. |
| MSW | Repetir con flag true, worker activo y objetivos nuevos | BFF/Backend reales, SQL/GET persistentes; no confundir un handler de prueba con persistencia. |

No compartir HAR, cookies, tokens ni hashes. Tras guardar evidencia, detener solo
el Next propio y el proyecto QA propio:

```bash
docker stop pms_staff_status_manual_app
docker compose -p pms_staff_status_manual -f compose.bd2-test.yaml down -v
```

## Entrega histórica previa a la aceptación manual

**3D-2 EN_QA**, no COMPLETADA ni QA manual PASS. La intermitencia observada en checkout
requiere seguimiento independiente; el check final PASS no la declara resuelta.
3D-1 conserva su cierre y limitaciones manuales de QA67;3B-1/3C COMPLETADAS y3B-2
bloqueada por M08. Sin reactivación, alta, credenciales, otros CRUD o nuevas fases.
Sin commit, push ni merge. Los servicios QA propios se retiran al terminar y se
conserva todo el trabajo local anterior.
