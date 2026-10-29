# Fase3D-1 — Edición inline real de usuarios Staff

Fecha: 2026-10-23. Rama: `feature/staff-admin-read`.
**Estado vigente: COMPLETADA, con aceptación QA PASS del usuario (2026-10-23).**
Alcance autorizado: solo correo, rol y propiedades. Fases2C,3B-1 y3C permanecen
COMPLETADAS; Backend2A/BFF2B mantienen EN_QA independiente;3B-2 BLOQUEADA por M08.
3D-2 sigue PENDIENTE. No completa BE-006B/C ni BE-014A, ni aprueba todo53.

## Cierre autorizado de Fase 3D-1 — COMPLETADA, aceptación QA PASS

El usuario autoriza expresamente el cierre y confirma la validación manual del
alcance siguiente. Esta aceptación global no convierte los escenarios pendientes
en pruebas manuales ejecutadas ni amplía el alcance a3D-2.

| Verificación | Evidencia manual confirmada por el usuario |
| --- | --- |
| Edición directa de correo laboral | PASS. |
| Edición directa de rol Staff | PASS. |
| Edición directa de propiedades | PASS. |
| Guardados y persistencia | PASS. |
| Conservación de borradores | PASS. |
| Cambios externos | PASS; no acredita haber provocado ni inspeccionado un409 HTTP. |
| Simplificación visual después de Actualizar usuario | PASS. |

**Evidencia automatizada conservada, no repetida en este cierre documental:**
159 pruebas focalizadas/4 archivos PASS; última corrida de npm run check con2125
pruebas/302 archivos PASS, lint, TypeScript y build; builds mocks false/true PASS.
Se conserva también la evidencia automatizada previa de Firefox/concurrencia y
las incidencias intermedias registradas abajo, sin atribuirlas al usuario.

| Pendiente no ejecutado manualmente en esta aceptación | Estado/evidencia |
| --- | --- |
|409 HTTP y recuperación explícita del conflicto de versión | PENDIENTE MANUAL; cobertura automatizada histórica conservada. El PASS de cambios externos no equivale a este caso HTTP. |
|503/resultado incierto y recuperación | PENDIENTE MANUAL; cobertura automatizada histórica conservada, sin atribuir una desconexión/timeout manual. |
| Lector de pantalla | PENDIENTE MANUAL / NO ACREDITADO; las pruebas de semántica no sustituyen esta ejecución. |
| Otros escenarios sin confirmación manual expresa | Conservan sus pendientes y cobertura anteriores; no se amplía el PASS a casos límite, variantes de foco/teclado/táctil, permisos/scope o sesiones no acreditados. |

CI remoto sigue NO ACREDITADO. La fase queda **COMPLETADA** por autorización y
aceptación QA PASS, con estas limitaciones explícitas conservadas.
3B-1 y3C permanecen COMPLETADAS;3B-2 sigue BLOQUEADA por M08 y3D-2 PENDIENTE.
No cambian los estados independientes Backend2A/BFF2B ni se cierran BE-006B/C o
BE-014A. Solo QA67, AlanPlan y AlanHandoff se actualizan; sin código ni nuevas
pruebas funcionales, sin commit/push/merge y con cambios locales preservados.
Verificación documental de este cierre: git diff --check PASS y comparación
SHA-256 del árbol inicial para confirmar que solo cambiaron esos tres documentos.

## Historial técnico y de QA anterior al cierre

Las entradas EN_QA y sus procedimientos pendientes que siguen describen el estado
en cada entrega anterior. Se conservan como historial; el estado vigente y el
alcance exacto del PASS manual son los del cierre anterior. Los escenarios no
confirmados manualmente continúan pendientes, aunque el incremento esté cerrado.

## Simplificación después de Actualizar usuario (2026-10-23), EN_QA

Esta corrección sustituye únicamente la presentación de recuperación de las
iteraciones anteriores; sus resultados se conservan como evidencia histórica.
No cambia los contratos, Backend, BFF ni los estados de cierre independientes.

- Se retiran las instrucciones permanentes de guardado automático y teclado,
  la comparación textual «Valor vigente»/«Borrador conservado» y las confirmaciones
  «Estado vigente comprobado»/«Información actualizada». Tras el GET autorizado
  correcto solo quedan los controles con el borrador preservado y las otras
  celdas sincronizadas. No se sustituye silenciosamente el borrador por el servidor.
- Se mantienen etiquetas accesibles, atajos semánticos aria-keyshortcuts y errores
  asociados al control; no quedan referencias aria-describedby a ayudas retiradas.
  Los mensajes de error, conflicto activo, resultado incierto y comprobación en
  curso siguen mostrándose cuando corresponden, sin nuevos banners de éxito.
- Actualizar conserva el mismo grupo, nodo y selección. Al desaparecer ese control
  se restaura el último campo usado, incluidas las casillas de propiedades, solo
  si el foco quedó en body y la página está visible/con foco. Si durante el GET
  el usuario se mueve a otro control no se roba el foco al terminar.
- Recuperar no envía comandos. El blur pasivo del borrador recuperado sigue sin
  guardar. Correo necesita Enter o una nueva edición deliberada; propiedades
  Ctrl+Enter o nuevos cambios deliberados. El rol conserva su selección pendiente
  como opción deshabilitada y permite ratificar ese mismo rol con mouse/táctil
  seleccionando su opción autorizada, o con Enter explícito. No se fuerza elegir
  un rol distinto para poder confirmar. El payload utiliza la versión recuperada
  y conserva el otro componente vigente de membership.
- Permanecen los bloqueos de409/503, una escritura por usuario, GET de reconciliación,
  ausencia de retries automáticos, protección de sesión/scope, tres columnas,
  click-to-edit, expansión y estilos responsive. No hay acciones3D-2.

Archivos funcionales: components/staff-inline-group.tsx,
components/staff-admin.module.css (solo elimina dos reglas de ayudas sin uso),
hooks/use-staff-inline-edit.ts (mensaje vacío al recuperar correctamente).
Pruebas: staff-inline-edit.test.tsx y app/(private)/staff-admin-navigation.test.tsx;
las esperas de éxito ahora verifican el cierre del editor y los payload/datos,
sin depender de mensajes eliminados. Seguimiento: esta67 y AlanPlan/AlanHandoff.

### Verificación y límites de esta corrección

- Seis casos nuevos de recuperación limpia: correo/rol/propiedades con nodo,
  selección y borrador preservados; ausencia de párrafos/ayudas tras el GET;
  relación accesible de errores; foco en última casilla y no robado durante GET
  lento; confirmación explícita del rol con versión y propiedades actuales.
- Los casos existentes mantienen409,503/red/acuse inválido, bloqueo compartido,
  blur pasivo tras recuperar, guardado único, refetch y regreso entre pestañas.
- Focalizados Staff + navegación administrativa + checkout: **159 PASS/4 archivos**.
  La primera ejecución focalizada antes del ajuste táctil dio133 PASS; las pruebas
  intermedias detectaron que una opción hidden no era accesible y que el helper
  selectOptions por texto elegía la opción pendiente deshabilitada. La opción
  conserva semántica nativa visible; el test selecciona la opción habilitada real.
- La primera corrida general terminó2123 PASS y1 FAIL en checkout público:
  public-real-checkout.test.tsx, invalid-response/replay, aserción de sessionStorage
  tras navegación. Ese archivo y checkout no se modificaron; sus25 casos pasan
  dentro del focalizado posterior. Se registra la incidencia, sin atribuirla a
  Usuarios ni ocultarla con cambios fuera de alcance.
- Segunda corrida completa de npm run check: **PASS,2125 pruebas/302 archivos**,
  lint sin warnings, TypeScript y build. El fallo de checkout anterior no se
  reprodujo; no se modificaron sus aserciones ni su implementación.
- Builds explícitos NEXT_PUBLIC_USE_MOCK_API=false y true: **PASS ambos**.
- git diff --check y comparación SHA-256 de2200 archivos iniciales: **PASS**;
  solo8 archivos de este ajuste/seguimiento cambiaron, sin archivos añadidos ni
  retirados y sin sobrescribir otros cambios locales.

Comandos desde frontend/pms-hotel-web/:

```bash
npm run test -- src/modules/staff 'src/app/(private)/staff-admin-navigation.test.tsx' src/modules/checkout/components/public-real-checkout.test.tsx
npm run check
NEXT_PUBLIC_USE_MOCK_API=false npm run build
NEXT_PUBLIC_USE_MOCK_API=true npm run build
npm run typecheck
git diff --check
```

Logs locales de esta ejecución: /tmp/pms-inline-clean-qa/ (focused-pass.log,
check.log [primera corrida con fallo], check-final.log, builds y preservación).
No se ejecutan nuevas pruebas HTTP contra Spring/PostgreSQL ni Firefox en esta
corrección de presentación; las evidencias anteriores permanecen históricas.

### Nueva QA manual pendiente

1. Provocar un409 con dos pestañas/cuentas QA autorizadas sobre un registro
   descartable. Pulsar Actualizar usuario: mismo campo/grupo y borrador, sin
   instrucciones, valores anteriores ni mensajes de éxito permanentes.
2. Salir del campo sin modificarlo: cero reenvíos. Confirmar explícitamente:
   correo Enter; rol seleccionar nuevamente el rol pendiente o Enter; propiedades
   Ctrl+Enter o nuevos cambios antes de finalizar. Comprobar versión y membership.
3. Usar la segunda casilla de propiedades antes de recuperar: no saltar a la
   primera. Durante un GET lento mover el foco a otro control: no recuperarlo
   forzosamente al terminar. Repetir con teclado y dispositivo táctil.
4. Repetir503 incierto/desconexión: conservar borrador y bloqueo hasta GET explícito,
   errores visibles si el GET falla, sin retry ni éxito ficticio. Tras comprobar
   correctamente, continuar editando sin un banner informativo permanente.
5. Verificar escritorio/móvil, tres columnas, expansión y nombres accesibles;
   la comprobación visual/nativa y con lector de pantalla sigue pendiente.

**3D-1 EN_QA** hasta aceptación manual. No atribuir al usuario esta nueva revisión
ni reutilizar los26 checks Firefox de la corrección previa como prueba de esta.

## Corrección de retorno entre pestañas Firefox (2026-10-23), EN_QA

### Diagnóstico comprobado

No era una navegación completa. Se reprodujo con el bundle anterior
`KiCue0wmwZIS78z5ZgnaN` sobre Next producción, Firefox con ventana y PostgreSQL
QA aislado: el marcador JavaScript del documento sobrevivía y navigation seguía
siendo1, pero el input anterior quedaba desconectado, desaparecía el borrador y
la búsqueda volvía a vacía. La sesión sí había sido revalidada; cero mutaciones
al salir. Cinco comprobaciones de reproducción, no QA PASS de la corrección.

Causa principal: PrivateLayout activa requireFreshSession para Usuarios. Al volver,
StaffSessionProvider revalida por foco/visibilidad y sustituía todo el árbol por
«Cargando sesión Staff…» mientras fetchStatus no era idle. Ese desmontaje borraba
PropertyProvider, búsqueda, expansión y estado local del hook de edición. No se
observó reload del documento ni router.refresh como causa.

Factores secundarios: el listado podía desmontar celdas al refetchear contexto o
retirar un usuario de un filtro; la identidad de consultas incluía metadatos de
propiedades (un renombrado provocaba remount); blur no exigía una salida deliberada
dentro de la página, por lo que el defocus causado por la comprobación de sesión
podía confundirse con finalización. No se arregla desactivando consultas/foco.

### Implementación vigente

- El proveedor mantiene el **mismo árbol ya autorizado**, oculto e inert durante
  revalidación estricta. Tras éxito vuelve a mostrarlo sin remount. Una sesión
  meramente cacheada al primer montaje sigue necesitando verificación antes de
  montar consultas administrativas: estado admitted solo después de éxito real.
- Un503 temporal de sesión conserva el árbol oculto/inert y permite Reintentar
  sesión. Un401 definitivo, DTO de autorización inválido, cambio de identidad o
  pérdida efectiva de acceso siguen retirando datos/estado según los guards.
  No se desactiva login, refresh, logout ni revalidación de permisos.
- Window blur y visibility hidden suspenden la finalización por blur y cancelan
  su timer, **sin** ejecutar comandos ni cancelar el borrador. Se distingue salir
  hacia un control de la página o mediante pointer/Tab interno de una pérdida de
  foco de ventana, toolbar o defocus programático. Ctrl+Tab/Alt+Tab no equivalen
  a finalizar un campo. Se excluye también el árbol bloqueado por sesión.
- La interacción posterior dentro de la página permite de nuevo el blur normal.
  Click-to-edit, Enter/Escape, selección de rol y lote de propiedades conservan
  sus contratos. No escritura al reconectar, ni descarte automático por foco.
- Mientras se edita, una lectura autorizada en actualización o con error temporal
  conserva la celda y el borrador. Las lecturas administrativas **siguen activas**.
  Si el registro sale del filtro se mantiene identificado como fila en edición,
  fuera de esos resultados; se comprueba con GET scoped, no se inventa visibilidad.
  GET404 retira representación/borrador por pérdida de acceso, no revela la causa.
- Las claves de identidad conservan sesión, StaffUser, rol, permisos y propiedades
  activas autorizadas, ordenadas. Nombre/zona/moneda de la propiedad no remonta
  el editor por sí solo. Cambios reales de seguridad/scope siguen invalidándolo.
- El hook observa lecturas autorizadas de caché y consulta el objetivo al retornar
  visible/con foco, coalesciendo consultas en vuelo. Una versión mayor marca
  conflicto y guarda el dato remoto **separado**; no reemplaza user.version ni el
  borrador original. Detalle en caché no retrocede a una versión menor.
- Actualizar usuario sigue siendo el único camino para adoptar explícitamente la
  versión vigente y revisar/reaplicar el borrador. Si se descubre un cambio antes
  de enviar, no se manda una escritura condenada al conflicto. Un409 recibido
  conserva su manejo existente.503 incierto no se desbloquea por refetch/foco:
  requiere comprobación explícita y nunca reintenta automáticamente.

Sin nuevas rutas/DTO, Backend/BFF/migraciones/Guest ni cambios de tres columnas,
PropertySwitcher, paginación o mutaciones3D-2. Estado **3D-1 EN_QA**; datos/borradores
solo en memoria. No se promete sobrevivir a recarga explícita, cierre de pestaña
o HMR que reemplace realmente la aplicación. La retirada por seguridad es una
excepción intencionada a la conservación de borradores.

### Pruebas de esta corrección

| Verificación nueva | Resultado ejecutado |
| --- | --- |
| Focalizados Staff/Properties/BFF/Auth/Dashboard/shell,17 archivos | **476 PASS**. |
| npm run check final | **PASS:2119 tests/302 archivos**, lint sin warnings, TypeScript y build. |
| Builds explícitos mocks=false y mocks=true | **PASS ambos**. |
| Typecheck posterior a ambos builds | **PASS**. |
| Bundle anterior con dos pestañas Firefox | Reproducción confirmada: marcador de documento conservado, input desconectado, borrador nulo y búsqueda vacía; sesión revalidada. |
| Bundle corregido, dos pestañas reales, mocks=false | **13 comprobaciones PASS**. |
| Mismo recorrido con MSW activo | **13 comprobaciones PASS**; Backend real, sin persistencia mock. |
| Concurrencia HTTP real por cada flag | Dos PATCH simultáneos con la misma versión: exactamente un200 y un409. El editor original conserva el borrador, bloquea sobrescritura, exige GET explícito y la decisión posterior confirma versión2. |
| git diff --check / SHA-256 | **PASS**; solo archivos de la corrección y seguimiento, sin pérdida de cambios previos. |

Quince casos nuevos (más regresiones): tab/ventana/visibilidad sin escritura o
cancelación; blur interno conservado; propiedades pendientes con un único PUT
posterior; mismo nodo durante refetch de roles/listado y sesión; error temporal
administrativo o de sesión; versión externa; usuario fuera del filtro y GET404;
503 incierto; defocus programático sin intención; renombrado de propiedad;
verificación inicial incluso con caché, logout/Guest y permiso revocado.
Se ajustó el test del guard durante revalidación para exigir contenido invisible
**e inert**, conservado en DOM; después de revocación exige retirada efectiva.

Firefox compara antes/después mediante marcador del documento y referencia al
input, búsqueda, llamadas de sesión y mutaciones observadas. La concurrencia usa
Promise.all de dos comandos BFF reales contra Spring/PostgreSQL17 en una segunda
pestaña; ninguna inyección de resultados200/409 en esa comprobación. Al volver,
se comprueba conflicto sin sobrescribir; GET explícito y una única decisión del
usuario producen el correo deseado con versión2. Son26 comprobaciones nuevas
válidas; no sumarlas a las53/5 ni49 de iteraciones anteriores como QA manual.

Incidencias del harness, no defectos del producto ni PASS: import fireEvent ausente,
una fixture Guest con gcTime0 que expiraba por su propia configuración y una espera
de MSW aplicada indebidamente al bundle anterior de flag desconocido. Se corrigieron
las fixtures/esperas; resultados finales arriba. Una primera suite general se
interrumpió deliberadamente antes de build para preservar el bundle de baseline;
solo check-final.log acredita la corrida final completa. No se relajó seguridad.

Evidencia local efímera: /tmp/pms-staff-tab-focus-qa/: initial.json,
baseline.json/baseline-final.log, fixed-false.json/log, fixed-true.json/log,
check-final.log, focused-final.log, build-false-final.log, build-true.log,
typecheck-final.log y preservation-final.json. Proyecto descartable
pms_staff_tab_focus_qa, DB tmpfs sin puerto host, JAR existente solo lectura,
Backend18098 y Next3009; se retiran únicamente servicios/perfiles QA propios.
Sin datos habituales/producción, Maven ni nuevas atribuciones de915 Backend.

Archivos: Auth staff-session-provider.tsx; Staff use-staff-admin.ts,
use-staff-inline-edit.ts, staff-inline-group.tsx, staff-admin-workspace.tsx;
tests staff-inline-edit.test.tsx y app/(private)/staff-admin-navigation.test.tsx;
esta67 y seguimiento AlanPlan/Handoff. APIs públicas y contratos intactos.

Comandos desde frontend/pms-hotel-web/:

```bash
npm run test -- src/modules/staff src/modules/properties src/app/api/staff/admin src/app/api/auth src/lib/http/staff-bff.test.ts src/data/mocks/worker-boundary.test.ts src/modules/auth/components/staff-session-provider.test.tsx 'src/app/(private)/staff-admin-navigation.test.tsx' 'src/app/(private)/staff-shell-scope.test.tsx' 'src/app/(private)/dashboard/auth-regression.test.tsx'
npm run check
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18098 PMS_WEB_PUBLIC_URL=http://localhost:3009 npm run build
NEXT_PUBLIC_USE_MOCK_API=true PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18098 PMS_WEB_PUBLIC_URL=http://localhost:3009 npm run build
npm run typecheck
git diff --check
```

### QA manual nueva pendiente

Usar exclusivamente el entorno descartable del procedimiento manual de esta guía.
No utilizar usuarios importantes ni repetir estados terminales.

1. En Firefox, abrir Usuarios y escribir un correo válido sin finalizar. Alternar
   varias veces a otra pestaña mediante clic y Ctrl+Tab/Alt+Tab, volver y esperar
   la comprobación de sesión: mismo borrador/búsqueda/fila, ningún PATCH/PUT.
2. Repetir con varios checks de propiedades sin finalizar: selecciones conservadas,
   cero PUT por salir de pestaña; Ctrl+Enter o blur deliberado dentro de la página
   produce un único PUT con la versión vigente del snapshot original.
3. Refetchear datos sin cambios (por foco o herramientas de red) no debe borrar ni
   finalizar el borrador. Si no cambió el servidor, Enter/blur interno sigue
   guardando normalmente una sola vez.
4. Mantener el borrador en pestaña1. En pestaña2 editar y confirmar el mismo usuario
   mediante UI/BFF autorizados. Volver a1: conflicto y borrador conservado, sin
   sobrescritura. Actualizar usuario permite comparar y exige otra decisión para
   aplicar; ninguna escritura automática por recuperar foco.
5. Confirmar aparte logout en otra pestaña y pérdida de permiso con fixtures
   autorizadas: al volver se retiran datos y se aplica el destino canónico. No
   conservar UI operable usando permisos cacheados mientras se comprueba acceso.
6. Para503 incierto, conservar el procedimiento de pausa/reanudación de Backend QA:
   refetch o cambio de pestaña no desbloquea nuevas escrituras; Actualizar usuario
   sigue siendo explícito. Verificar las tres columnas y ausencia de acciones3D-2.

Estas ejecuciones de Firefox fueron automatizadas, **no QA manual PASS del usuario**.
Lector de pantalla y CI remoto no acreditados.3D-1 se mantiene EN_QA hasta nueva
validación manual; fases3B-1/3C/2C y QA2A/2B independientes no cambian.

## Corrección UX vigente — click-to-edit (2026-10-23), EN_QA

Autorizada por el usuario después de la entrega inicial. Sustituye la interacción
con botones Editar/Guardar/Cancelar, sin cambiar Backend, BFF, DTO, mappers,
transporte ni políticas de autorización. La evidencia de la entrega inicial se
conserva abajo; no implica aceptación manual de esta corrección.

- Clic sobre el correo, rol o resumen de propiedades abre directamente ese grupo,
  expande la fila y consulta la versión vigente. No exige expandir antes ni hace
  dos GET concurrentes de detalle: el GET del editor alimenta la caché del detalle.
- El contenido normal tiene semántica de botón nativo, sin apariencia/texto de
  botón Editar. Tab, Enter/Espacio, foco visible, hover discreto y descripción
  accesible del valor actual. Username y estado conservan lectura/expansión normal.
- Correo: Enter o pérdida de foco aplica una sola vez; Escape descarta. Sin cambio
  efectivo se cierra sin HTTP. Error de validación conserva el campo sin enviar.
- Rol: elegir una opción autorizada aplica automáticamente el PUT completo una
  vez. No envío al abrir/focalizar el selector. Escape sale sin cambios pendientes.
- Propiedades: checkbox múltiple con nombres reales. Cambios, Tab entre casillas
  y Enter simple **no envían**. Salir del grupo aplica el conjunto una vez;
  Ctrl+Enter (o Cmd+Enter) ofrece finalización explícita, Escape descarta todo el
  borrador. Una selección vacía prohibida no se envía aunque se intente finalizar.
- Al guardar por blur no se roba el foco al destino. Enter/Escape devuelven foco
  al contenido. Se espera a que el foco termine de cambiar antes de decidir sobre
  blur, evitando guardar por cada clic en etiquetas/casillas.
- ScopeSwitcher y diálogos de descarte están excluidos del autoguardado por blur;
  su guard existente decide antes de cambiar scope. Edición bloqueada mientras
  los resultados presentados pertenecen a una búsqueda anterior en actualización.
- Composición IME y key229 no finalizan edición. Enter+blur, eventos repetidos o
  blur tardío de otro grupo no duplican comandos: finalización ligada a target/
  grupo y bloqueo síncrono de escritura existente.
- 409 mantiene borrador y exige Actualizar usuario. Después del GET, un blur
  pasivo no reenvía el borrador: correo requiere Enter o una nueva modificación;
  propiedades, Ctrl+Enter o nuevos cambios seguidos de salida. Rol conserva el
  borrador anunciado y pide seleccionarlo de nuevo (placeholder no asignable),
  permitiendo confirmar también en táctil sin un botón Guardar.
- 503/red/acuse inválido conserva el bloqueo: Escape, blur y Enter no lo eluden.
  Actualizar usuario sigue siendo una acción visible de recuperación explícita,
  no un botón de edición. Ningún retry/refresh de escritura ni éxito ficticio.

Archivos de esta corrección: staff-inline-group.tsx, staff-admin-workspace.tsx,
staff-admin.module.css, use-staff-inline-edit.ts (finalización sin cambio/no-op y
verificación target/grupo), staff-inline-edit.test.tsx y esta67/AlanPlan/Handoff.
Sin PropertyProvider, Auth, contratos o rutas BFF modificados. Una versión canónica,
contraparte completa del PUT, reconciliación GET, restricciones y tres columnas
se mantienen.3D-1 continúa EN_QA;3D-2 no se implementa.

### Evidencia de la corrección

Ejecución nueva, separada de los418/2089/49 históricos de la entrega inicial:

| Comprobación de la corrección | Resultado ejecutado |
| --- | --- |
| Focalizados finales Staff/Properties/BFF/Auth/worker/shell,15 archivos | **433 PASS**. |
| Núcleo Staff/Properties durante desarrollo,4 archivos |112 PASS; incluido en la suite posterior, no sumarlo como pruebas únicas. |
| npm run check final | **PASS:2104 tests/302 archivos**, lint sin warnings, TypeScript y build. |
| Builds explícitos mocks=false y mocks=true | **PASS ambos**. |
| Typecheck posterior a ambos builds | **PASS**. |
| Firefox con ventana→Next→JAR→PostgreSQL17 descartable, mocks=false | **26 comprobaciones PASS**,8 envíos explícitos (incluyen409 y timeout); no retries. |
| Mismo recorrido, MSW realmente activo | **27 comprobaciones PASS**,8 envíos explícitos; no persistencia simulada. |
| Layout headless separado a1366/768/390px | **5 comprobaciones PASS**, tres columnas, sin overflow, selector abierto sin escrituras. No acredita foco/blur nativos. |
| git diff --check y SHA-256 | **PASS**, solo los8 archivos de esta corrección; Backend/BFF/Auth/Properties y trabajo previo preservados. |

Las15 pruebas nuevas verifican contenido clicable y accesible, Enter/Espacio,
correo por blur sin robar foco, Enter+blur único, Escape/no-op, validación y IME,
selección automática de rol, propiedades por lote/Tab interno/Escape/Ctrl+Enter,
blur pasivo después de409 y bloqueo503. Las36 pruebas iniciales de edición se
adaptaron a la nueva interacción conservando casos de versión, orden de guardado,
autorización, errores y caché. No se borraron suites de Backend/BFF.

Firefox con ventana prueba Enter/Escape reales y blur por cambio real de foco,
rol inmediato, un PUT al finalizar propiedades, conflicto409 con revisión antes
de reaplicar, ScopeSwitcher sin guardado accidental y503 real al pausar solo el
Backend QA. GET explícito posterior sin replay; SQL final AUDITOR/ACTIVE/version8/
dos asignaciones activas en ambas fixtures. Son53 comprobaciones nativas en total;
las5 de layout se ejecutaron aparte, sin atribuir eventos de foco a headless.

Incidencias del harness, no PASS: Firefox headless no emitía eventos focus/blur
al no tener ventana activa; setViewport BiDi bloqueaba en modo con ventana;
una repetición reutilizó un correo de otra fixture y recibió conflicto legítimo.
Se verificó el diagnóstico con eventos DOM, se usaron fixtures/correos nuevos,
Firefox con ventana para interacción y otro perfil headless para layout. No se
modificó la aplicación ni se relajó Origin/autenticación para resolver esas
incidencias. Corridas finales, captura visual inspeccionada y cobertura automatizada
no equivalen a aceptación manual del usuario. Lector de pantalla y CI remoto
**NO ACREDITADOS**.3D-1 sigue **EN_QA**.

Comandos nuevos desde frontend/pms-hotel-web/:

```bash
npm run test -- src/modules/staff src/modules/properties src/app/api/staff/admin src/app/api/auth src/lib/http/staff-bff.test.ts src/data/mocks/worker-boundary.test.ts 'src/app/(private)/staff-admin-navigation.test.tsx' 'src/app/(private)/staff-shell-scope.test.tsx'
npm run check
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18096 PMS_WEB_PUBLIC_URL=http://localhost:3008 npm run build
NEXT_PUBLIC_USE_MOCK_API=true PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18096 PMS_WEB_PUBLIC_URL=http://localhost:3008 npm run build
npm run typecheck
git diff --check
```

Evidencia efímera: /tmp/pms-staff-click-edit-qa/: check-final.log,
focused-final.log, build-false.log/build-true.log, typecheck-final.log,
browser-false-final.log/browser-true-final.log, browser-false.json/browser-true.json,
visual.log/visual-summary.json; capturas false-desktop-values/email/conflict-review/
uncertain y visual-desktop/tablet/mobile-properties.png. initial.json y
preservation-final.json acreditan preservación. JAR Backend existente montado
solo lectura, DB tmpfs sin puerto host, proyecto propio pms_staff_click_edit_qa,
Backend18096/Next3008. Solo ese entorno y perfiles temporales propios se retiran;
no DB habitual ni producción. Sin Maven ni repetición de915 Backend.

## Fuentes y alcance operativo

Contratos [53](../../../backend/docs/53_STAFF_ADMIN_MUTATIONS_CONTRACT_PROPOSAL.md)
y [54](../../../backend/docs/54_STAFF_ADMIN_MUTATIONS_QA.md), QA64/65/
[66](66_STAFF_ADMIN_MUTATIONS_BFF_QA.md), AlanPlan/AlanHandoff y código vigente de
los tres incrementos. Inspección de DTO/servicios/parser Backend y BFF, guard,
PropertyProvider/StaffSessionProvider y guías de arquitectura Web. Se consultó
la guía page del Next instalado; no se añadieron páginas ni endpoints.
Subincremento BE-006 autorizado, owner WEB-2, reviewer WEB-3; no se reinterpreta
IMP-WEB-0901 (roles/permisos de demostración) ni se modifica el XLSX.

## Experiencia implementada

La tabla conserva **exactamente Usuario / Acceso / Asignación** y colSpan=3.
La interacción vigente es click-to-edit descrita arriba: el contenido se convierte
en input/selector inline, sin botones visibles Editar/Guardar/Cancelar ni página
independiente. Username y estado siguen informativos. La entrega inicial utilizaba
acciones contextuales y guardado mediante botones; esa interacción fue sustituida
por esta corrección, conservando sus invariantes y evidencia histórica.

Se permite un grupo en edición a la vez en este workspace. No Guardar todo ni
secuencia automática PATCH+PUT. La finalización aplica únicamente ese grupo; sin
cambios efectivos cierra sin petición. Escape descarta el borrador permitido y
retorna foco al contenido. Escrituras ya enviadas o inciertas no se cancelan por
Escape ni por salir del campo. Correo normaliza con login existente, máximo50 en
mutación; lectura320 intacta.

Durante edición se bloquean búsqueda/filtros/paginación para no perder el grupo
abierto. Fuera de edición conservan debounce350ms, búsqueda literal en Backend,
cursores reales, flechas/pie compartido y estados de lectura existentes. El envío
solo presenta carga dentro del grupo; no reemplaza la tabla por un spinner.

## Fuente real de propiedades y permisos

La fuente suficiente existe: `StaffSession.memberships`, obtenida del BFF de sesión
real y expuesta por la API pública de Auth. Cada membership activa contiene ID,
nombre, código, zona y moneda. Es la misma fuente autorizada de PropertySwitcher.
No nuevo catálogo, UUID fijos, captura manual de UUID ni integración simulada.
El selector presenta checkboxes con nombres y solo propiedades activas de esa
sesión; Backend revalida organización y conjunto completo al ejecutar PUT.

Cambiar el rol conserva **todas** las propiedades del usuario, no solo la propiedad
seleccionada. Editar propiedades conserva el rol vigente. La selección autorizada
Q se limita al portfolio de la sesión; PROPERTY no reduce artificialmente el
reemplazo al único ID seleccionado. No fallback a ALL_PROPERTIES.

Conjunto vacío solo para objetivo SUSPENDED + actor SUPER_ADMIN + ALL_PROPERTIES.
ACTIVE, GERENCIA o PROPERTY lo rechazan antes de enviar. Membership INACTIVE se
presenta sin activarla implícitamente. El catálogo administrativo real proporciona
las etiquetas de los cuatro roles asignables; nunca se ofrece SUPER_ADMIN.

STAFF_MANAGE efectivo y sesión Staff real son requisitos. No edición propia ni de
DISABLED. GERENCIA no visualiza SUPER_ADMIN conforme al mapper/Backend. Un SA
puede editar correo de otro SA según M06/Backend real; el rol y las propiedades
de SA permanecen protegidos. La UI previene prohibiciones evidentes; Spring es
la autoridad definitiva de autorización, versión, visibilidad completa y scope.

## Capas, archivos y estado

| Capa / archivo | Responsabilidad |
| --- | --- |
| Nuevo dtos/staff-admin-command.dto.ts | Entradas PATCH/PUT y acuse mínimo propios. |
| Nuevo service/staff-admin-command.service.ts | Una petición nativa mismo origen con cookies, no-store, redirect:error, deadline12s; sin refresh/retry. No usa staffBffRead para escribir. |
| Nuevo mappers/staff-admin-command.mapper.ts | Valida claves exactas, organización/objetivo, booleano y versión esperada; produce Domain o error. |
| Nuevo model/staff-admin-edit.ts | Borrador, elegibilidad, validación/no-op por grupo y error seguro. Read Domain sigue inmutable. |
| Nuevo hooks/use-staff-inline-edit.ts | Un editor/versión canónica, serialización, 409/503, reconciliación y caché. |
| Nuevo components/staff-inline-group.tsx | Contenido editable por clic/teclado, finalización por campo, foco, nombres accesibles y recuperación explícita. |
| components/staff-admin-workspace.tsx / staff-admin.module.css | Composición dentro de las tres celdas, guard de scope, actualización discreta y responsive. |
| hooks/use-staff-admin.ts | Reutiliza claves/contexto de lectura; puede desactivar consultas tras pérdida de acceso. No cambia contrato GET. |
| properties/components/property-provider.tsx | Guard de selección voluntaria opt-in, mediante API pública usePropertyScope. Sin consumidor no cambia su comportamiento. |
| properties/components/property-provider.test.tsx | Guard diferido y cambios forzosos de sesión. |
| Nuevo staff-inline-edit.test.tsx | UI/contratos/MSW de prueba, concurrencia, foco y recuperación. |
| model/staff-admin.ts, index.ts, README.md | Precisión documental y descripción del módulo; sin DTO administrativo editable de sesión. |
| Esta67, AlanPlan y AlanHandoff | Evidencia y seguimiento EN_QA, historial conservado. |

Todas las rutas anteriores del módulo se expresan respecto a `src/modules/staff/`;
la excepción PropertyProvider pertenece a `src/modules/properties/`. Importaciones
entre módulos solo por API pública; UI → hook → service/DTO → mapper → Domain.
No cambia código Backend, BFF3C, Auth, shell, componentes globales de tabla, worker
MSW ni dependencias. Se reutilizan Input/Button/ConfirmDialog y tokens actuales.

## Contratos consumidos

| Operación | BFF real | Payload |
| --- | --- | --- |
| Correo | PATCH /api/staff/admin/users/{id}?scope=... | workEmail, expectedVersion |
| Rol | PUT /api/staff/admin/users/{id}/membership?scope=... | nuevo roleCode, propertyIds completos vigentes, expectedVersion |
| Propiedades | Mismo PUT membership | roleCode vigente, propertyIds nuevos completos, expectedVersion |
| Catálogo/lista/detalle | GET existentes bajo /api/staff/admin/ | Contratos51/64/65; GET detalle vigente antes de editar/reconciliar. |

Respuesta confirmada200: únicamente organizationId, staffUserId, version, changed.
Mapper verifica mismos organización/objetivo y versión segura: esperada+1 con
changed=true, misma con false. No StaffView, secretos, rol/properties inventados
ni timestamp fabricado. Organizaciones, roles y membresías de sesión del actor
no se modifican desde el acuse administrativo.

## Coordinación y caché

1. Abrir edición consulta mediante GET autorizado la versión actual del objetivo.
   El detalle expandido normal continúa diferido y reutiliza30s de caché; entrar
   a edición fuerza lectura vigente para no construir PUT con un listado antiguo.
2. El editor mantiene un único snapshot canónico y un borrador de un grupo. La
   contraparte del PUT siempre sale del snapshot vigente, no de otro borrador.
3. Guardar comprueba validación/cambios y crea un bloqueo síncrono por usuario en
   QueryClient antes del único despacho. Impide doble clic/Enter o reentrada.
4. El acuse200 actualiza la versión y confirma el comando; cancela lecturas previas
   e invalida páginas/detalles de esa identidad/organización. Se hace GET autorizado
   para obtener datos completos antes de permitir otro editor.
5. El detalle y páginas se sincronizan con Domain vigente; las páginas cuyo scope
   o filtro ya no admite al usuario lo retiran. Se reinicia la historia de cursores
   y revalida el listado actual. La fila permanece abierta si sigue siendo visible.
   No se reutiliza el detalle de30s anterior al cambio ni hay actualización optimista.
6. Confirmado200 pero GET inaccesible404: «Guardado. El usuario ya no está disponible
   en este contexto», retirar representación/borrador de ese contexto, sin convertir
   el comando en error. Un GET temporalmente fallido conserva el éxito confirmado
   y bloquea nuevas escrituras hasta comprobar el estado.

Claves de lectura siguen aisladas por sesión, identidad/permisos/memberships,
organización, scope, propiedades, filtros y cursor. El bloqueo de comando se liga
además al objetivo y deliberadamente no al scope: sobrevive a remontajes/cambios
forzosos de propiedad dentro de la misma identidad, impidiendo saltarse un resultado
incierto. Solo contiene metadatos en memoria, sin borrador ni credencial; gcTime
infinito hasta reconciliación o limpieza central existente del prefijo staff-admin
por logout/cambio de identidad/permisos. No localStorage/sessionStorage de borradores.
No garantía de exclusión entre pestañas: expectedVersion Backend protege esa carrera.

Respuesta tardía de un workspace desmontado no escribe en la UI ni repuebla caché.
Los GET de edición se abortan al desmontar. No se interpreta desmontar/cancelar
como rollback del PATCH/PUT enviado; su bloqueo exige comprobar la cuenta después.

Cambio voluntario de propiedad con edición: ConfirmDialog compartido pide descartar
antes de ejecutar select; Volver conserva scope/borrador. Durante guardado o resultado
incierto el cambio se bloquea hasta comprobar el estado. Cambios forzosos de sesión,
permisos y logout ocultan inmediatamente el contexto y no esperan confirmación.

## Errores y recuperación

| Resultado | Comportamiento UI |
| --- | --- |
| 400 / INVALID_REQUEST | Mensaje local seguro, conserva borrador; revisar antes de enviar otra vez. |
| 401 / STAFF_SESSION_REQUIRED | Retira datos/consultas administrativas y revalida la sesión por el mecanismo canónico. No vuelve a enviar el comando. |
| 403 / STAFF_ACCESS_DENIED | Retira datos/consultas y revalida acceso. Ofrece comprobar de nuevo cargando la página; guard/BFF/Backend siguen vigentes. |
| 404 / STAFF_USER_NOT_FOUND | No distingue inexistente/ajeno; retira datos del objetivo y comunica que ya no está disponible. |
| 409 / STAFF_EMAIL_CONFLICT | Conserva campo y explica que el correo no está disponible; no revela otra cuenta. |
| 409 / STAFF_VERSION_CONFLICT o STAFF_STATE_CONFLICT | Borrador preservado, escritura bloqueada. Actualizar usuario hace GET explícito, muestra valor vigente frente al borrador y requiere otra acción consciente de guardar. |
| 503 / STAFF_WRITE_UNAVAILABLE, red/timeout o acuse inválido | Resultado incierto: no afirma éxito ni fracaso. Bloquea nuevas escrituras, descarte por Escape y cambio de propiedad; Actualizar usuario consulta el estado. Un GET fallido no desbloquea. |
| 200 confirmado + GET fallido | «Guardado; no se pudo actualizar la información». No repetir escritura. Comprobar estado para continuar. |
| changed=false | Conserva versión; reconciliación muestra «Sin cambios». Ninguna escritura adicional. |

Tras un GET posterior a un resultado incierto, igualdad de valores no prueba que
este cliente haya guardado: se informa «Estado vigente comprobado», nunca éxito
propio. Si el borrador coincide con lo vigente, finalizar cierra sin enviar; si
no coincide, requiere una nueva decisión explícita y versión leída. No replay,
refresh+retry de comandos, encolado offline ni compensación entre PATCH/PUT.

## Accesibilidad y responsive

Controles nativos con labels/nombres por usuario; Input compartido y errores
contextuales, aria-invalid/describedby, fieldset/legend para propiedades.
Foco al entrar en edición; Enter/Escape lo retornan al contenido. El guardado por
blur conserva el foco de destino.
Mensajes status/alert y carga local; sin envío si no hay cambios, validación
inválida o recuperación pendiente. Semántica y descripción del contenido accesibles. No botones interactivos
anidados ni cambios a la semántica tr/td/colSpan3.

La delegación de clic existente excluye formularios/controles/data-staff-row-action;
se bloquea expansión durante edición. Enter/Espacio de controles no alternan fila.
Fuera de edición, clic y teclado conservan la expansión aprobada.
Escritorio mantiene40/27/33%; tablet reduce de forma natural; móvil usa los grupos
compactos con divisores y, al editar, una columna vertical para dar ancho al control.
Sin desbordamiento horizontal; tipografía oficial/tokens heredados. No swipe ni
animaciones nuevas. ConfirmDialog de descarte conserva el patrón accesible existente.
Las pruebas automatizadas no sustituyen QA manual con lector de pantalla.

## Evidencia automatizada de la entrega inicial — preservada

| Comprobación ejecutada | Resultado |
| --- | --- |
| Focalizados Staff/PropertyScope/BFF/Auth/boundary/shell,15 archivos | **418 PASS**. |
| npm run check | **PASS:2089 pruebas/302 archivos**, eslint sin warnings, TypeScript y build. |
| Build explícito mocks=false y mocks=true | **PASS ambos**. |
| Typecheck final después de builds | **PASS**. |
| Firefox real → Next producción → Spring/JAR → PostgreSQL17 aislado, mocks=false | **24 comprobaciones PASS**,6 escrituras solicitadas explícitamente. |
| Mismo recorrido con MSW activo | **25 comprobaciones PASS**,6 escrituras solicitadas explícitamente;49 comprobaciones Firefox en total con ambos flags. |
| git diff --check / preservación SHA-256 | **PASS**; únicamente archivos del incremento, sin pérdida de cambios previos ni alteración Backend/BFF/Auth/UI de otros módulos. |

La suite focalizada incluye36 casos nuevos de edición y un caso nuevo del guard
PropertyProvider, además de regresiones de lectura, búsqueda/cursor, permisos,
login/refresh/logout, rutas3C, mocks y navegación. Prueba ambas secuencias rol→
propiedades y propiedades→rol; contraparte vigente, versión, doble submit, no-op,
validaciones, SA/autoedición/DISABLED, conjunto vacío, 400/401/403/404/409, red/503/
acuse inválido, recuperación fallida, éxito con GET fallido, salida del scope,
remontaje incierto y respuestas tardías/cambio de identidad. Tests de foco/controles
accesibles y guard de cambio de propiedad. Mocks únicamente test-only en tests.

Firefox automatizado prueba cookies reales/STAFF_MANAGE, las tres columnas,
focus email y retorno, guardados secuenciales, nombres reales de propiedades,
layout sin overflow en768/390px y409 real producido por actualización concurrente
en fixture SQL aislada. Pausa únicamente el contenedor Backend QA antes del PATCH:
BFF devuelve503 tras deadline; comprueba una petición, bloqueo de escritura y GET
explícito después de reanudar. El servidor puede confirmar esa petición buffered;
no se presupone rollback. SQL final verifica AUDITOR, ACTIVE, versión agregada y
una asignación activa; ninguna suspensión/baja ejecutada desde UI.

**Todo lo anterior es automatizado por el agente.** No QA manual PASS del usuario
ni CI remoto. Backend/3C no se modifican; no Maven ni repetición de las915 pruebas
Backend. Sus evidencias anteriores se conservan con su atribución original.

Fallos intermedios corregidos: fixture409 consumía dos veces un body; selección
ambigua de texto; uso de opción de test de roles no tipada. Se mantuvo la regresión
que oculta filas al revalidar contexto: retención durante actualización solo dentro
de un editor del mismo contexto o la búsqueda admitida. Typecheck/check finales
no ocultan esos fallos. Comandos npm iniciales desde raíz sin package.json no se
presentan como pruebas ejecutadas PASS; se repitieron en el cwd Web correcto.

Evidencia local efímera en `/tmp/pms-staff-inline-qa/`: check.log, focused-final.log,
build-false.log/build-true.log, typecheck-final.log, browser-false.log/JSON,
browser-true.log/JSON, capturas desktop-email, desktop-conflict-review,
desktop-uncertain, tablet-properties y mobile-properties; initial.json y hashes
finales. Firefox headless/BiDi; contenedores propios pms_staff_inline_qa, tmpfs DB
sin puerto DB host, Backend18094 montado solo lectura y Next3007. Datos sintéticos;
no base habitual/producción. Los servicios propios se retiran al finalizar.

Comandos desde frontend/pms-hotel-web/:

```bash
npm run test -- src/modules/staff src/modules/properties src/app/api/staff/admin src/app/api/auth src/lib/http/staff-bff.test.ts src/data/mocks/worker-boundary.test.ts 'src/app/(private)/staff-admin-navigation.test.tsx' 'src/app/(private)/staff-shell-scope.test.tsx'
npm run check
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18094 PMS_WEB_PUBLIC_URL=http://localhost:3007 npm run build
NEXT_PUBLIC_USE_MOCK_API=true PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18094 PMS_WEB_PUBLIC_URL=http://localhost:3007 npm run build
npm run typecheck
git diff --check
```

## QA manual reproducible pendiente

Crear **otro** entorno descartable; no reutilizar el usuario DISABLED de QA3C.
Referencia exacta para Docker/JAR/demo: bloque manual de QA54, sustituyendo solo
project/name/puerto por los siguientes, desde backend/:

```bash
docker compose -p pms_staff_inline_manual -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_staff_inline_manual -f compose.bd2-test.yaml run --rm -d \
  --name pms_staff_inline_manual_app -p 127.0.0.1:18095:8080 \
  -e PMS_BOOTSTRAP_ADMIN_USERNAME=qa_inline_admin \
  -e PMS_BOOTSTRAP_ADMIN_EMAIL=qa.inline.admin@example.test \
  -e PMS_BOOTSTRAP_ADMIN_PASSWORD=QA-only-inline-password1! \
  verify java -jar target/pms-hotel-backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=demo --pms.demo.data.enabled=true
```

Esperar http://127.0.0.1:18095/actuator/health →200/UP. En Web:

```bash
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18095 PMS_WEB_PUBLIC_URL=http://localhost:3007 npm run build
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18095 PMS_WEB_PUBLIC_URL=http://localhost:3007 node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3007
```

Firefox: http://localhost:3007/acceso, login SA sintético anterior y luego Usuarios.
Seleccionar ALL_PROPERTIES, buscar `pms_demo_reception`. Ese usuario corresponde
exclusivamente a esta DB demo nueva y es distinto del actor. Nombres de propiedades
vienen de sesión; si no hay dos opciones, la selección positiva múltiple manual
queda NO EJECUTABLE hasta preparar una segunda propiedad mediante el flujo aprobado
sobre esa DB descartable. No inventar IDs ni editar usuarios importantes.

| Escenario manual | Acción y evidencia | PASS / FAIL |
| --- | --- | --- |
| Base de lectura | Abrir desde sidebar; clic/Enter/Espacio expande; buscar/filtrar/paginar | Tres columnas exactas, sin Acciones, consulta real y detalle diferido. Paginación positiva solo si hay registros suficientes. |
| Correo | Clic en el valor; cambiar a correo único<=50; probar Enter y, en otra edición, salir del input | Un200 por finalización, versión+1 y persistencia. Enter retorna foco al contenido; blur conserva el destino. Username no editable. |
| Validación/descarte | Correo inválido o sin cambio normalizado; finalizar. Abrir otro borrador cambiado y pulsar Escape | Inválido no envía y presenta error; sin cambio cierra sin HTTP. Escape descarta solo el grupo sin enviar. |
| Acceso | Clic en el rol y elegir AUDITOR | Selección aplica un único PUT, sin botón Guardar; conserva properties y versión vigente. Estado sin edición y sin opción SA. |
| Asignación | Clic en el resumen; hacer varios cambios y Tab interno; salir o Ctrl+Enter | Cero envíos por selección; un PUT completo al finalizar, conserva rol vigente. Escape descarta. Cambiar rol después no revierte properties. |
| Vacío | Quitar todos los checks de un ACTIVE | Finalización rechazada, sin envío. SUSPENDED+SA+ALL permitido solo con fixture elegible independiente; si falta, pendiente manual con cobertura automatizada separada. |
| Grupo único | Intentar editar otro grupo o contraer durante edición | Botones de otros grupos y expansión deshabilitados; clic/input/Enter/Espacio no cierra fila. |
| Scope/borrador | Cambiar PropertySwitcher durante edición, primero Volver y después Descartar y cambiar | Volver conserva scope/borrador; confirmar descarta antes de seleccionar, sin guardar automáticamente. |
| Conflicto real | Ventana1 abre borrador; ventana2 confirma otro cambio; volver a1 y finalizar |409, borrador intacto, no retry. Actualizar usuario muestra vigente; no hay envío por blur pasivo. Enter/Ctrl+Enter o reelección del rol aplica conscientemente con nueva versión. |
| Usuario sale del scope | Bajo PROPERTY retirar esa propiedad conservando otra autorizada | Acuse200; GET404/listado ya no muestra el usuario. Mensaje Guardado sin afirmar fallo ni filtrar datos fuera del scope. |
| Timeout real | Con editor abierto, pausar únicamente app QA: docker pause pms_staff_inline_manual_app; finalizar el campo y esperar503. Luego docker unpause pms_staff_inline_manual_app y Actualizar usuario | Un PATCH/PUT en Red. Resultado incierto, Escritura y descarte por Escape bloqueados. GET explícito comprueba estado; no se asume rollback ni éxito propio. Ningún envío automático al reconectar. |
| Permisos/estado | Probar cuenta propia, DISABLED y GERENCIA sin acceso a SA con fixtures autorizadas | No acciones prohibidas ni datos fuera del alcance. Sin STAFF_MANAGE, redirección Staff autorizada; sin sesión /acceso. No dar PASS si no hay fixture/ejecución. |
| Responsive/teclado |390/768/escritorio, Tab/Shift+Tab/Enter/Espacio, finalizar y descartar | Sin overflow, labels comprensibles, foco visible/retorno, mensajes y controles accesibles. Lector de pantalla debe comprobarse manualmente si se acredita. |
| MSW | Repetir build/arranque con true, worker activo y fixtures nuevas | Mismos comandos BFF reales y lectura persistida; no acuse mock. |

No exportar HAR/cookies/tokens sin sanitizar. Al finalizar, parar solo el proceso
Next QA propio y retirar exclusivamente este proyecto descartable:

```bash
docker stop pms_staff_inline_manual_app
docker compose -p pms_staff_inline_manual -f compose.bd2-test.yaml down -v
```

## Cierre y pendientes

**Fase3D-1 COMPLETADA, con aceptación QA PASS autorizada por el usuario el
2026-10-23.** Alcance manual confirmado: edición directa de correo, rol y
propiedades, guardados/persistencia, conservación de borradores, cambios externos
y simplificación visual tras actualizar. Se conserva la evidencia automatizada
histórica separada de estas comprobaciones manuales.

409 HTTP, recuperación503 y lector de pantalla continúan PENDIENTES MANUALMENTE;
los demás casos sin ejecución confirmada tampoco se convierten en PASS. No se
repite la suite funcional en este cierre documental; CI remoto NO ACREDITADO.
La autorización de cierre no elimina esas limitaciones ni autoriza3D-2.

No se implementa3D-2: suspensión, gesto/revelado/confirmación de DISABLED ni
reactivación, alta, invitación/reset, credenciales o roles editables. No endpoints
nuevos. Próximo incremento únicamente tras autorización: acciones de estado y
baja accesible dentro de las mismas tres columnas, con contrato/versionado actual.
Reactivación sigue bloqueada por M08; no inferir credencial preparada de hashes.
No commit/push/merge. Se conserva todo el trabajo local previo y el historial QA.
