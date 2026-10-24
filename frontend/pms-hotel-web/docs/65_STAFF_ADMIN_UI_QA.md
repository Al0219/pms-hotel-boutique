# Fase 2C — Administración de usuarios Staff: lectura real

Fecha: 2026-10-22. Rama: `feature/staff-admin-read`.
**Estado vigente: Fase 2C COMPLETADA (2026-10-22), por autorización expresa del usuario.**
El usuario confirmó los seis escenarios finales y condicionó la aceptación visual
únicamente a retirar Acciones con regresiones PASS. Condición técnica satisfecha;
no se le atribuye inspección manual de la nueva tabla de tres columnas.
Los estados EN_QA y pendientes anteriores se conservan abajo como historia;
las salvedades vigentes están en la última sección de cierre.
Autorización expresa del usuario para esta interfaz; Backend 2A y BFF 2B conservan
sus estados EN_QA. No se declaran APPROVED propuestas ni COMPLETADAS esas fases
independientes, BE-006B/C o filas del XLSX.
Owner WEB-2; reviewer WEB-3. Extensión de lectura BE-006; IMP-WEB-0901 del XLSX
corresponde a roles/permisos, no se reinterpreta ni se edita esa fila.

Fuentes: [contrato 51](../../../backend/docs/51_STAFF_ADMIN_READ_CONTRACT_PROPOSAL.md),
[Backend QA 52](../../../backend/docs/52_STAFF_ADMIN_READ_QA.md),
[BFF QA 64](64_STAFF_ADMIN_BFF_QA.md), arquitectura Web/capas, C1/C2/C4/C6,
Property Scope y seguridad del proyecto. Se consultó la guía page del Next
instalado: params/searchParams se esperan como Promise en las páginas servidor.
Las instrucciones de esta fase sustituyen el freeze histórico del shell Staff
únicamente para el alcance autorizado de lectura.

## Implementación y archivos

- App: `src/app/(private)/seguridad/usuarios/{page.tsx,filters.ts,[staffUserId]/page.tsx}`.
  Páginas finas que consumen la API pública `@/modules/staff`. Navegación preserva
  username/rol/estado/tamaño, nunca cursor, organización ni correo. Al regresar
  del detalle comienza la primera página de esos filtros; historial de cursores
  exclusivamente en memoria del listado, no se conserva después de desmontarlo.
- Módulo: `src/modules/staff/dtos/staff-admin.dto.ts`,
  `model/staff-admin.ts`, `service/staff-admin.service.ts`,
  `mappers/staff-admin.mapper.ts`, `hooks/use-staff-admin.ts`,
  `components/staff-admin-workspace.tsx`, `components/staff-admin.module.css`,
  `index.ts`, `README.md`, `staff-admin.test.tsx`.
- Integración: `src/app/(private)/staff-shell.tsx`,
  `staff-admin-navigation.test.tsx`; API pública Auth y provider de sesión;
  PropertyProvider/PropertySwitcher y resolver existentes; regresiones logout.
- Documentación: esta guía, rutas Web, AlanPlan y AlanHandoff (entrada nueva,
  conservando historial). Ningún cambio funcional Backend/BFF ni dependencia.

Service llama exclusivamente los tres GET del BFF con `staffBffRead` y AbortSignal;
DTO administrativo propio; mapper puro con DomainMappingError y proyección
allowlist; Domain de lectura; hook TanStack; UI. No DTO de sesión editable,
RolePreview, fetch en UI, paginación local ni fallback a catálogo ficticio.

## Experiencia

Listado `/seguridad/usuarios`, detalle `/seguridad/usuarios/[staffUserId]`.
StaffShell conserva un único sidebar y añade Usuarios solo con STAFF_MANAGE;
comprueba también el permiso en acceso directo antes de montar consultas.
No se determina autorización por el nombre visual del rol. Preview local sin
staffUserId muestra la necesidad de sesión real y no consulta administración.

EntityListSurface y EntityDataGrid existentes, Button/StatusBadge y tokens:

| Columna | Contenido agrupado |
| --- | --- |
| Usuario | Username destacado y correo secundario. |
| Acceso | Rol asignado y estado traducido; membresía inactiva diferenciada. |
| Asignación | Primera propiedad autorizada, cantidad; listado completo en detalle. |
| Acciones | Ver detalle, sin controles de escritura ficticios. |

El rol mostrado es el **asignado**: una membership INACTIVE no se presenta como
permiso efectivo concedido. ACTIVE=Activo, SUSPENDED=Suspendido,
DISABLED=Baja administrativa. Usuario sin propiedades activas se indica
explícitamente. No se inventan organización legible, teléfono, cargo ni totales.
Detalle con cuatro secciones relacionadas; fechas autorizadas en hora de Guatemala;
no se muestra version como control editable ni UUID interno innecesario.

En escritorio/tablet la tabla aprovecha el ancho con cuatro columnas; en móvil
(<=700px), mismas celdas agrupadas y encabezados accesibles pasan a filas tipo
ficha. Menú móvil existente, controles nativos etiquetados, foco visible, enlaces
con nombre del usuario, caption y headers de tabla, estados live/alert. Sin gestos
ni animaciones añadidos. El lector de pantalla requiere revisión manual final.

Búsqueda literal Backend, debounce350ms, rol desde catálogo real, estado, tamaños
25/50/100. Cambiar filtro/tamaño/scope reinicia cursor; Anterior/Siguiente usan
historial opaco Backend, sin reconstrucción, offset ni totales. Orden fijo Backend
username/C,id. Cursor vencido/inválido ofrece Volver al inicio del listado.

## Sesión, scope y caché

Cookies HttpOnly y refresh acotado compartido existentes; ningún token en UI o
almacenamiento. Segundo401 revalida el provider Auth público existente; este
retira sesión/caché y redirige a `/`. 403/404 no cierran Guest. No nuevo auth.
Backend sigue siendo autoridad y aplica organización y visibilidad completa SQL.

Bootstrap roles identifica organizationId, ligado a sesión real/fingerprint.
Queries incluyen prefijo staff-admin, sessionId, staffUserId, fingerprint de
rol/permisos/memberships, organización, scope/IDs ordenados, recurso, filtros y
cursor/ID. staleTime=0, gcTime=0, retry=false; sin placeholderData ni persistencia.
Cambiar identidad/fingerprint/scope desmonta la vista y sus queries, cancela
peticiones observadas y elimina cursores. Durante revalidación no se muestran
filas anteriores. Logout y signed-out limpian también staff-admin, preservando
Guest. Respuestas tardías quedan ligadas a la clave anterior.

Mapper contrasta organización, scope retornado y conjunto completo de IDs contra
memberships activas vigentes; discrepancia retira todos los datos y revalida Auth.
Reintentar vuelve a obtener el contexto si discrepó. No se renderizan usuarios
parcialmente confiables. Membership INACTIVE no borra asignaciones al validar.
GERENCIA no visualiza SUPER_ADMIN ni objetivos sin propiedades; Backend aplica
las restricciones incluso si el cliente altera la UI.

Caso sin properties: `allowEmptyAll` del PropertySwitcher solo se activa desde
StaffShell en estas rutas para SUPER_ADMIN con STAFF_MANAGE y MULTI_PROPERTY_READ.
Selección explícita, no automática. Resolver solo admite ALL vacío con ese opt-in
más permisos/rol; otras pantallas mantienen el selector vacío deshabilitado.
No se envía organizationId del navegador como autoridad.

Errores seguros: carga/actualización/offline, vacío vs sin coincidencias,
400 validación/INVALID_CURSOR, 401 caducada, 403 denegado, 404 indistinguible,
503 temporal, red y respuesta inválida. Reintento explícito, sin listas vacías
por fallo ni mensajes técnicos crudos. `private,no-store` permanece en el BFF.

## Evidencia automática

| Validación ejecutada | Resultado real |
| --- | --- |
| Focalizados UI/mapper/navegación/Auth/logout/properties | 84 PASS / 7 archivos. |
| NEXT_PUBLIC_USE_MOCK_API=false npm run check (final) | PASS: lint, TypeScript, 1.913 tests / 298 archivos y build. |
| NEXT_PUBLIC_USE_MOCK_API=true npm run build | PASS; ambas rutas de usuarios presentes. |
| npm run typecheck posterior al build con mocks | PASS. |
| Firefox + Next final sin mocks -> Spring -> PostgreSQL | 17 comprobaciones PASS. |
| Firefox + Next final con mocks y controller MSW activo -> mismo Backend | 18 comprobaciones PASS. |
| git diff --check | PASS. |
| SHA-256 de archivos previos Backend/BFF/MSW | Código y tests conservados sin alteración. Solo se amplían documentación de rutas y seguimiento. |
| QA manual humana, lector de pantalla y cierre | PENDIENTE; estado EN_QA. |

No equivalen a QA manual PASS ni nueva ejecución de Backend verify. La cifra864
Backend y los resultados2B son evidencia previa, no se atribuyen de nuevo a2C.
Un primer focalizado detectó la ausencia del handler refresh401 en el fixture de
prueba; corregido el test para ejercitar el transporte real acotado. No se
alteró autenticación ni Backend para hacer pasar la prueba. Se ajustó el espaciado
móvil tras inspeccionar capturas y se cubrió recuperación de cursor expirado y
pérdida de permiso en la misma sesión. Sin defectos contractuales pendientes.
Logs y capturas locales:
`/tmp/pms-staff-admin-ui-qa/` (artefactos efímeros, sin tokens en logs/capturas):
focused-final.log, check-final.log, build-mocks.log, typecheck-after-build.log,
browser-summary-mocks-false.json y browser-summary-mocks-true.json.
Capturas `mocks-{false,true}-{desktop-list,desktop-detail,tablet-list,mobile-list,
mobile-menu,mobile-no-matches}.png`; inspeccionadas en escritorio, tablet y móvil.
Scripts browser-qa.mjs y summaries reproducen las aserciones con WebDriver BiDi
Firefox157 sin instalar dependencias. Se verificaron login/logout/guard real,
ALL autorizado, búsqueda literal, regreso con filtros, cuatro columnas y
responsive sin overflow; el script mantiene las credenciales sintéticas fuera
de la evidencia. Entornos temporales se retiran al finalizar.

Tests propios: listado/detalle, cuatro columnas/celdas, filtros literales y
debounce, cursor opaco/atrás/reset/expiración, tamaños, regreso, permisos,
preview/Guest/401, scope vacío y ALL explícito, organización/partial assignments,
membership/status, payload inválido, secretos excluidos, reintento, aislamiento,
revocación de permiso, cancelación/respuesta tardía, eliminación de queries;
regresiones de logout preservan Guest. Suite general incluye login/refresh,
BFF/no-store/métodos/errores, MSW, Dashboard y PropertySwitcher.

Runtime real usa solo fixtures bootstrap del perfil existente
`backend/compose.auth-manual-qa.yaml`: PostgreSQL tmpfs aislado, JAR previamente
validado montado read-only, puertos 18086/3001, Firefox headless con perfil
`/tmp`. No datos de producción ni mutaciones de usuarios. Sesiones de QA se
cierran con logout. Capturas inspeccionadas por el agente, no aprobación humana.
Límite: runtime bootstrap-only no acredita GERENCIA, multiusuario/páginas
positivas ni múltiples propiedades en vivo; esos casos tienen tests de componente,
BFF y evidencia Backend previa. No se inventan fixtures ni endpoints de alta.

## Comandos reproducibles y QA manual pendiente

Desde `frontend/pms-hotel-web/`:

```bash
npm run test -- src/modules/staff/staff-admin.test.tsx 'src/app/(private)/staff-admin-navigation.test.tsx' src/modules/auth/components/staff-session-provider.test.tsx src/modules/auth/components/staff-logout-navigation.test.tsx 'src/app/(private)/staff-shell-scope.test.tsx' src/modules/properties
NEXT_PUBLIC_USE_MOCK_API=false npm run check
NEXT_PUBLIC_USE_MOCK_API=true npm run build
npm run typecheck
```

Desde raíz, solo entorno aislado y puertos libres:

```bash
docker compose -p pms-staff-admin-ui-manual-qa -f backend/compose.auth-manual-qa.yaml --profile manual-qa up --build -d
```

Desde Web en otra terminal:

```bash
PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18086 PMS_WEB_PUBLIC_URL=http://localhost:3001 NEXT_PUBLIC_USE_MOCK_API=false npm run dev
```

Abrir `http://localhost:3001/acceso` e iniciar con el bootstrap sintético definido
**solo** en ese perfil. No copiar cookies ni tokens a la consola/evidencia.

| Escenario manual | Evidencia y condición PASS (FAIL ante discrepancia) |
| --- | --- |
| Sidebar/entrada | Usuarios visible y activo con STAFF_MANAGE; un sidebar, selector y menú móvil conservados. |
| Listado real | Network GET roles/users 200 desde BFF, private/no-store; usuario bootstrap real; nunca mock ni éxito vacío en un error. |
| Agrupación | Solo Usuario/Acceso/Asignación/Acciones; correo debajo de username, estado junto al rol, propiedades resumidas. |
| Búsqueda | `qa_staff` coincide; literal `%_` no funciona como comodín; espera debounce; filtros se envían por HTTP. |
| Rol/estado | SUPER_ADMIN+ACTIVE encuentra bootstrap; DISABLED vacío auténtico; limpiar restaura. |
| Detalle/regreso | Datos coinciden con listado; no secretos; lista completa de asignaciones; regreso conserva filtros y scope, primera página. |
| Scope | PROPERTY y ALL autorizados cambian petición y retiran filas previas. Sin properties: solo SA puede seleccionar ALL explícito. |
| Paginación | Con fixture de QA52 suficientemente poblado: Siguiente/Anterior usa cursores reales; cambio de filtro/propiedad/tamaño reinicia; sin total inventado. |
| Cursor vencido | Con páginas reales, esperar >15min o reiniciar solo Backend aislado antes de Siguiente: error y Volver al inicio recupera. Nunca reconstruir cursor. |
| Roles y targets | Con fixtures de QA52: GERENCIA limitada; otros roles sin permiso no ven Usuarios ni consultan ruta directa; ajeno/inaccesible da404 indistinguible. No crear cuentas mediante APIs inexistentes. |
| Error de red/503 | Detener solo manual-backend del proyecto aislado; Reintentar tras iniciarlo recupera sin filas previas ni vacíos falsos. |
| Logout/identidad | Logout y volver con Atrás/F5 no muestra usuarios; Guest permanece independiente; nueva identidad no recupera resultados anteriores. |
| Responsive | 1366,1024,768,390px; filas compactas en móvil, sin desbordar página ni ocultar acciones; textos largos legibles. |
| Teclado/lector | Tab/ShiftTab/Enter/Espacio; foco visible; labels/caption/headers, estados anunciados; menú Escape devuelve foco; sin dependencia de color. |
| Solo lectura | No alta, edición, guardar, reset, sesiones ni baja ficticios. |
| Mocks true/false | Reiniciar con NEXT_PUBLIC_USE_MOCK_API=true; worker actualizado y activo; GET administrativos siguen reales y sin MSW respondWith. |

Para fallos de servicio (desde raíz, exclusivamente proyecto de prueba):

```bash
docker compose -p pms-staff-admin-ui-manual-qa -f backend/compose.auth-manual-qa.yaml --profile manual-qa stop manual-backend
docker compose -p pms-staff-admin-ui-manual-qa -f backend/compose.auth-manual-qa.yaml --profile manual-qa start manual-backend
```

Al terminar dev Ctrl+C y retirar únicamente ese proyecto:

```bash
docker compose -p pms-staff-admin-ui-manual-qa -f backend/compose.auth-manual-qa.yaml --profile manual-qa down
```

No declarar PASS manual con los tests Vitest/HTTP/Firefox. Confirmación requerida
del usuario; registrar escenarios no verificables con bootstrap como pendientes.

## Siguiente incremento: contratos y mutaciones antes de UI editable

1. Formalizar endpoints/DTOs/permisos/C4 de correo laboral, rol, properties,
   suspensión/reactivación/DISABLED, expectedVersion y errores409; resolver
   credenciales preparadas/activación, auditoría y revocación de sesiones. SA solo
   bootstrap; GERENCIA no SA; username inmutable; sin autoadministración sensible,
   sin escalada ni objetivos parciales/externos. No creación/edición real de roles.
2. Backend SQL scoped con transacción, concurrencia, auditoría append-only,
   restricciones y pruebas; BFF con validación y protección de origen existentes.
3. Extender mismo Domain/service/hooks y los slots **ya existentes** de
   EntityDataGrid (`renderEditor`, `renderInteractiveRow`), sin agregar otra tabla.
   Edición inline en las mismas cuatro celdas: borrador/original por fila,
   Guardar/Cancelar, expectedVersion; guardar solo tras confirmación Backend,
   errores contextuales, preservar borrador de red/409 y recuperar versión actual.
   No página/modal para edición sencilla.
4. Adaptador táctil horizontal revela Dar de baja sin ejecutar; alternativa por
   menú accesible con mouse/teclado en Acciones; confirmación explícita mediante
   ConfirmDialog compartido. DISABLED terminal lógico conserva historial, sin
   DELETE físico; explicar impacto/irreversibilidad ordinaria; gesto no interfiere
   con scroll vertical, selección, enlaces ni edición. Revalidación tras éxito.
5. Pruebas de concurrencia/privilegios/scope, drafts409 y gesto/teclado antes de
   habilitar; nuevo EN_QA y confirmación humana. No infraestructura ni controles
   de mutación se anticipan en esta fase.

## Revisión manual y corrección UX — 2026-10-22 (vigente)

**EN_QA.** El usuario comunicó **13 escenarios manuales PASS**, **1 NO EJECUTABLE**
(paginación positiva por falta de registros) y **1 PENDIENTE** (desconexión y
recuperación). Es evidencia histórica del usuario, no aprobación del cierre ni
atribución de QA manual al agente. Backend2A y BFF2B conservan sus estados.

El usuario autorizó corregir la UX: esta sección sustituye las instrucciones
anteriores de navegación a detalle y la prohibición absoluta de presentación
anterior **solo para cambios de username en el mismo contexto**. No cambia los
contratos HTTP, C4, Property Scope ni la autoridad Backend; no se marcan decisiones
APPROVED en nombre del usuario.

### Listado y consulta expandible

El encabezado es únicamente **Usuarios**. Se retiran Administración · Staff,
la descripción, Solo lectura y la repetición de la propiedad sobre el contenido.
Se conserva la propiedad real en el selector y en las asignaciones de cada fila.
PropertyProvider anuncia nombres legibles, nunca UUIDs; PropertySwitcher recibe
announceOnly únicamente en este módulo: el aviso redundante queda oculto
visualmente con role=status para lectores de pantalla. No se silencian errores
ni se modifica la selección real.

Se conservan las cuatro columnas. Acciones contiene un botón Ver más/Ver menos,
con aria-expanded y aria-controls enlazados a un region etiquetado por el botón.
Un único registro abierto a la vez; Enter/Espacio y foco nativos del botón.
DataTable añade únicamente el slot opcional renderExpandedRow (compatible con
consumidores anteriores); EntityDataGrid lo hereda sin habilitar edición.
La fila adicional ocupa colspan=4, no contiene otra tabla ni tarjetas por campo.
Muestra asignaciones completas cuando son múltiples, estado de membresía y
fechas secundarias; no repite username, correo ni rol. La vista móvil reduce
espacios y usa divisores de filas dentro de un listado continuo.

GET detalle se solicita **solo al expandir**, usando el mismo servicio, mapper,
organización y scope del listado. Cerrar cancela peticiones pendientes y elimina
la query sin persistirla (gcTime0); errores404 no distinguen ausente/inaccesible.
Sin precarga masiva. Cambio de criterio, cursor o contexto cierra la expansión;
las acciones futuras siguen separadas del control de consulta.

La ruta antigua `/seguridad/usuarios/[staffUserId]` ahora redirige con Next
redirect al listado, manteniendo únicamente filtros allowlisted. No transmite
ni selecciona el ID recibido, no consulta el target ni acepta un returnTo externo,
organizationId o cursor como autoridad. El listado aplica el guard habitual.

### Búsqueda y acceso

Debounce350ms y búsquedas literales en Backend, sin filtrado local. La tabla y
el input permanecen montados al escribir; indicador discreto Actualizando y
aria-busy aclaran que las filas son de la consulta anterior, sin confirmar
coincidencias del nuevo término. Acciones de detalle y paginación se deshabilitan
mientras se actualiza. No se anuncia un vacío confirmado con resultados previos.
El callback placeholderData de TanStack permite únicamente cambio de username
en primera página con igualdad de sesión, identidad, fingerprint, organización,
scope, rol, estado y tamaño. Cualquier otra diferencia retira las filas previas.
AbortSignal cancela consultas abandonadas y las claves impiden publicar respuestas
tardías. No se persiste la presentación anterior ni se amplía su TTL.

PrivateLayout configura el **mismo** StaffSessionProvider para estas rutas con
signedOutRedirect=/acceso y requireFreshSession. Sin sesión, no monta filtros,
registros ni consultas administrativas. Durante carga/revalidación/error de sesión
oculta el contenido; permisos revocados se aplican antes de remontarlo. Otros
módulos conservan su comportamiento y logout conserva su redirección canónica.
Con sesión válida el módulo exige STAFF_MANAGE efectivo, nunca solamente el rol.
El guard de UI complementa al BFF/Backend, que siguen aplicando autorización real
SQL. No se modifica su código ni se crea un segundo sistema de autenticación.
Guest permanece separado; limpieza Staff incluye las queries de detalle.

### Credenciales y CRUD posterior

No se muestran contraseñas originales, hashes, cadenas enmascaradas que aparenten
recuperación, tokens o credenciales en tabla/expansión/BFF/localStorage.
[C4-D05](../../../backend/docs/26_BD1_STAFF_ADMIN_CONTRACT_C4_PROPOSAL.md)
requiere invitación/restablecimiento iniciado por administrador y entrega segura
al workEmail, secreto de un uso con expiración/revocación; el administrador no
recibe contraseña, token ni enlace en el navegador. Restablecer acceso sigue
pendiente del contrato Backend/canal aprobado y no se implementa ahora.
Edición inline con expectedVersion/409 y baja lógica DISABLED mediante revelar,
confirmar y alternativa de teclado/mouse se conservan como siguientes fases;
ninguna mutación o gesto destructivo se ha anticipado.

### Nueva QA manual solicitada

Reutilizar el entorno de prueba y `/seguridad/usuarios`; no usar producción.

1. Entrada sin sesión y URL antigua: redirige a `/acceso` pasando por el listado,
   sin información administrativa ni lecturas de targets arbitrarios.
2. Recepción/Operaciones/Auditor sin STAFF_MANAGE: acceso denegado y cero GET
   administrativos; administradores autorizados conservan sus scopes reales.
3. Encabezado Usuarios, cuatro columnas, sin textos retirados ni UUID del aviso;
   PropertySwitcher y opciones/nombres reales intactos.
4. Ver más: abre información compacta en la misma tabla; Network registra un
   GET detalle únicamente al abrir; Ver menos cierra sin navegar. Enter/Espacio,
   foco visible, aria-expanded/controls y lector de pantalla coherentes.
5. Escribir con una respuesta lenta: input y tabla utilizables, Actualizando
   discreto, ningún dato anterior presentado como coincidencia confirmada;
   respuesta tardía descartada. No una consulta inmediata por tecla.
6. Cambiar propiedad/identidad/permisos: no filas del contexto anterior. Revocar
   permiso y volver a enfocar la ventana: contenido oculto durante revalidación y
   acceso denegado al resolverla. Logout/Atrás/F5 no recuperan datos.
7. 1366/768/390px: listado compacto, divisores sutiles, expansión sin tarjetas
   grandes ni desbordamiento; controles táctiles y teclado accesibles.
8. Recuperación: detener **solo** el Backend del entorno aislado; provocar una
   lectura, comprobar error seguro, iniciarlo y Reintentar. PASS solo al recuperar
   filas reales; FAIL si aparece éxito vacío o datos confirmados sin respuesta.
9. Repetir con mocks true: worker activo y lecturas siguen siendo reales. Sin
   acciones ficticias de edición, baja ni credenciales.

La paginación positiva sigue NO EJECUTABLE manualmente sin registros suficientes.
El escenario de recuperación continúa PENDIENTE de confirmación manual aunque
se ejecute automáticamente. Se requiere nueva confirmación del usuario antes
de cerrar la Fase2C.

### Evidencia automática de las correcciones

| Ejecución | Resultado |
| --- | --- |
| Focalizados Staff/guard/legacy/Auth/logout/DataTable/EntityDataGrid | 81 PASS / 8 archivos. |
| Primera ejecución npm run check | Lint/typecheck PASS; 1.919 tests PASS y 1 fallo checkout público (limpieza de carrito tras replay); no llegó a build. |
| Checkout focalizado de contraste | 11 PASS y el mismo fallo; no se modificó checkout. |
| Checkout sobre copia temporal de HEAD (solo lectura del Git actual) | 12 PASS. No se cambió rama ni árbol de trabajo. |
| Segunda ejecución íntegra NEXT_PUBLIC_USE_MOCK_API=false npm run check | PASS: lint, typecheck, 1.920 tests / 299 archivos y build. Código checkout sin cambios. |
| NEXT_PUBLIC_USE_MOCK_API=true npm run build | PASS, incluido el ajuste final del borde móvil. |
| npm run typecheck tras build con mocks | PASS. |
| Build final NEXT_PUBLIC_USE_MOCK_API=false | PASS, mismo código final. |
| Firefox real sin mocks, Next→Spring→PostgreSQL | 23 aserciones PASS, incluida desconexión/reinicio del Backend aislado y recuperación con Reintentar. |
| Firefox real con mocks y controller MSW activo | 21 aserciones PASS. |
| Activación nativa por Enter en harness Firefox | No confirmada; se usó clic para completar la QA de expansión. No se atribuye PASS de teclado nativo a esas aserciones. Enter/Espacio sí PASS en componentes; confirmar manualmente en Firefox. |
| git diff --check y hashes de archivos previos Backend/BFF/MSW | PASS, funcionalidad previa preservada. |

El fallo de checkout fue intermitente entre ejecuciones; su causa no se establece
como defecto de Staff ni se corrige fuera del alcance. Se conservan tanto los
logs de fallo como los PASS; no se oculta ni se atribuye aprobación humana.
El único ajuste posterior al check íntegro fue CSS del borde móvil, validado en
ambos builds finales y mediante capturas Firefox con mocks activo.

El harness WebDriver BiDi corrigió su expresión de detección de recursos y
activó la ventana antes de probar teclado; no requirió modificar la aplicación.
La activación nativa Enter no quedó confirmada y se distingue del clic real
funcional. Revisar ese punto y lector de pantalla en la nueva QA humana.

Runtime aislado en **3002/18087**, porque los puertos habituales ya estaban
ocupados: no se detuvo ni alteró el entorno existente. PostgreSQL tmpfs, fixtures
bootstrap SUPER_ADMIN del perfil QA existente, JAR anterior read-only, sin
reconstruir Backend ni BFF. No se añadieron usuarios ficticios ni producción.
Paginación positiva y GERENCIA multiusuario siguen sin acreditarse por este
runtime bootstrap-only; sus pruebas automatizadas existentes se conservan.

Artefactos efímeros: `/tmp/pms-staff-admin-ux-qa/`:
focused.log, check.log (fallo), checkout-regression.log, checkout-head-baseline.log,
check-retry.log (PASS íntegro), build-mocks.log, build-final-no-mocks.log,
typecheck-after-build.log, browser-summary-mocks-{false,true}.json y
mocks-{false,true}-{desktop-list,desktop-expanded,tablet-list,mobile-list,
mobile-expanded,search-updating}.png. Sin mocks también disconnected.png y
recovered.png. Capturas inspeccionadas por el agente, no QA manual del usuario.
Contenedores/navegador temporales retirados al finalizar.

Archivos de esta corrección:

- `src/modules/staff/components/staff-admin-workspace.tsx`, `staff-admin.module.css`,
  `hooks/use-staff-admin.ts` y `staff-admin.test.tsx`: listado expandible, detalle
  bajo demanda, búsqueda estable y aislamiento.
- `src/shared/components/data-table.tsx`: slot de expansión opcional compatible.
- `src/app/(private)/layout.tsx`, `staff-shell.tsx`,
  `src/modules/auth/components/staff-session-provider.tsx` y
  `src/modules/properties/components/property-provider.tsx`: configuración del
  guard existente y avisos accesibles sin UUIDs.
- `src/app/(private)/seguridad/usuarios/[staffUserId]/page.tsx` y
  `legacy-route.test.ts`: redirección segura y pruebas.
- `staff-admin-navigation.test.tsx`, `staff-shell-scope.test.tsx`: regresiones
  de permisos/revalidación y presentación del selector.
- Docs65/02 y AlanPlan/AlanHandoff: historial y seguimiento EN_QA; sin modificar
  contratos51/52/64 ni estados Backend/BFF.

## Ajustes finales autorizados — fila completa, tipografía y salida segura

**Estado vigente: EN_QA.** El usuario comunicó una segunda revisión manual con
PASS en encabezado limpio, detalles expandibles, búsqueda fluida, listado móvil,
redirección sin sesión a /acceso, Enter/Espacio del control anterior y recuperación
tras desconexión. Sigue pendiente la redirección de Staff sin STAFF_MANAGE;
paginación positiva continúa NO EJECUTABLE por falta de registros. No sumar estos
resultados a los13 históricos como escenarios distintos ni declarar el cierre.
La evidencia previa se conserva; recuperación manual ya fue confirmada por el
usuario para la versión anterior a estos ajustes.

### Comportamiento implementado

- Se elimina completamente `Fechas en hora de Guatemala.` del render. No se
  reemplaza. Intl.DateTimeFormat continúa con America/Guatemala, sin tocar datos.
- Toda zona no interactiva de la fila principal delega el clic a un botón nativo
  accesible en Acciones, presentado solamente como chevron discreto sin texto
  Ver más/menos, borde ni fondo de botón. Hover/cursor/foco indican interacción.
  El tr conserva su semántica de fila; no se convierte en role=button ni contiene
  controles anidados. Tab llega al control; Enter/Espacio nativos activan la
  misma acción. aria-expanded/controls enlazan la región de detalle.
- El evento ignora inputs/select/textarea, enlaces, botones, summary, roles de
  acciones/menús/controles, contenteditable, selección de texto y elementos con
  data-staff-row-action. Futuras acciones inline/guardar/cancelar/gestos anotan
  ese atributo cuando no tengan ya semántica interactiva. No se implementan ahora.
- EntityDataGrid añade renderReadOnlyRow, separado del adaptador editable futuro.
  Se conservan las cuatro columnas, las filas expandidas y el diseño móvil.
  Chevron y apertura usan140ms; prefers-reduced-motion desactiva ambos efectos.
- Detalle exclusivamente bajo demanda. Tras la primera expansión se mantiene
  un observador por registro visitado mientras el listado/contexto siga montado;
  cerrado: fila hidden, fuera del árbol accesible, query disabled, sin polling ni
  precarga. Frescura30s en memoria: reabrir dentro de ese plazo reutiliza el dato;
  al estar vencido se vuelve a consultar. gcTime0 permanece: cambiar identidad,
  organización/scope/fingerprint, revalidar el listado o desmontarlo retira el
  observador y elimina su caché. No localStorage ni nuevo cache HTTP/BFF.

### Causa tipográfica verificada antes de cambiar CSS

Se comparó código y estilos efectivos Firefox de Panel, Reservas, Calendario,
Habitaciones y Usuarios; las capturas de estilos están en fonts-before.json.
Usuarios heredaba **Inter**, igual que el cuerpo oficial del panel: no se
identificó una familia alternativa en sus strong. La diferencia concreta fue
el peso predeterminado del navegador: **700** en strong de Usuarios, frente al
semibold **600** explícito en Habitaciones y componentes administrativos.
El th ya usaba600 y el Button compartido500. Usuarios h1 también heredaba700.
Panel y algunos títulos de otras pantallas usan el token display Lora400;
no se cambia esa jerarquía de otros módulos.

Corrección local: `.page` usa --font-family-body; strong y h1 heredan esa familia
con --font-weight-semibold (600); el chevron nativo usa font:inherit. Sin shorthand
que sustituya la familia, cambios globales, dependencias o nuevas fuentes.
La declaración antigua del shell usa --font-inter sin fallback interno, que está
vacío en este runtime; la familia efectiva procede del token body con fallback
Inter y era la misma antes y después. No se modifica el shell global por ello.

Google CSS declara Inter400/500/600/700 y Lora400/500. Firefox aislado no cargó
caras externas (document.fonts vacío); se valida familia CSS efectiva y pesos,
no se afirma descarga exitosa de Google Fonts ni render de una cara específica.
Los estilos posteriores confirman Inter y600 en destacados/encabezado/th; el
control hereda Inter. Revisar el aspecto con las fuentes cargadas en el navegador
habitual del usuario; no incorporar fuentes alternativas para resolver QA local.

### Guard y destinos existentes

La única fuente de navegación existente de StaffShell se mueve sin cambiar sus
entradas/roles a `staff/model/staff-navigation.ts`, consumida por APIs públicas.
El límite reutilizable StaffAdminAccessBoundary protege todo el prefijo Usuarios
(desde PrivateLayout) y la composición pública del módulo; no monta hijos ni
consultas sin STAFF_MANAGE. Devuelve null durante router.replace: sin pantalla de
acceso denegado ni filtros/datos transitorios. Un ref evita repetir el replace.

| Estado resuelto de sesión | Destino/comportamiento |
| --- | --- |
| Sin sesión o caducada | Provider Staff existente → /acceso; nunca dashboard. |
| Con STAFF_MANAGE efectivo | Acceso al módulo, cualquiera que sea el nombre visual del rol; Backend decide definitivamente. |
| RECEPCION sin permiso | /dashboard, primer destino ya autorizado por su navegación. |
| GERENCIA/SUPER_ADMIN sin permiso efectivo | /dashboard; el rol no concede acceso a Usuarios por sí solo. |
| OPERACIONES/AUDITOR sin permiso | /, salida pública segura que conserva la sesión Staff. |

**Limitación existente:** la navegación del panel solo ofrece Panel/Reservas/
Calendario/Habitaciones a SUPER_ADMIN, GERENCIA y RECEPCION. No hay destino Staff
habilitado ahí para OPERACIONES/AUDITOR. No se inventa acceso a housekeeping,
reportes o auditoría mock. La salida / es externa al prefijo restringido, no hace
redirect automático hacia Usuarios y no produce bucle. /acceso sigue reservado
al flujo de autenticación, no se hace logout involuntario ni se altera Guest.

Las URLs antiguas continúan redirigiendo al listado; el mismo límite se aplica a
rutas futuras dentro del prefijo. BFF/Backend, STAFF_MANAGE y SQL scope sin cambios.

### Nueva QA manual mínima

1. Clic en username, correo o espacio libre: expande; segundo clic: contrae.
   Solo chevron, sin Ver más/menos ni aclaración de zona horaria. Fechas iguales.
2. Tab al chevron, foco visible, Enter y Espacio; comprobar anuncio del estado.
   Seleccionar texto o interactuar con controles internos no expande otra vez.
3. Network: un GET detalle al abrir; cerrar/reabrir en menos de30s no agrega GET;
   cambiar propiedad/sesión limpia el contexto y no muestra detalles anteriores.
4. Comparar textos semibold con Habitaciones/Reservas; misma familia oficial,
   sin bold sintético distinto. Escritorio/tablet/móvil sin desbordamiento; activar
   reducción de movimiento en el sistema y comprobar ausencia de animación.
5. RECEPCION sin STAFF_MANAGE → /dashboard; OPERACIONES/AUDITOR sin permiso → /;
   sin datos/filtros ni pantalla denegada. F5 y antigua URL de detalle: mismo guard,
   sin bucles ni nueva entrada restringida en historial por el replace.
6. GERENCIA/SUPER_ADMIN con permiso conservan acceso y scopes; sin sesión → /acceso.
   Búsqueda350ms, filtros/cursor y recuperación conservados. Paginación positiva
   sigue no ejecutable manualmente con el único usuario bootstrap disponible.

No declarar COMPLETADA ni cambiar estados Backend/BFF hasta nueva confirmación.

### Evidencias de esta revisión final

| Comprobación ejecutada | Resultado |
| --- | --- |
| Focalizados Staff, navegación, legacy, Auth/logout, DataTable/EntityDataGrid | 95 PASS / 8 archivos. |
| NEXT_PUBLIC_USE_MOCK_API=false npm run check | PASS: lint, TypeScript, 1.934 tests / 299 archivos y build. |
| NEXT_PUBLIC_USE_MOCK_API=true npm run build | PASS. |
| npm run typecheck tras build | PASS. |
| Firefox real sin mocks, Backend/PostgreSQL aislado | 20 aserciones PASS. |
| Firefox real con MSW activo y reducción de movimiento | 22 aserciones PASS; animación y transición efectivamente desactivadas. |
| Familia/pesos efectivos antes/después en Firefox | Cuerpo Inter; strong Usuarios700→600, th600 conservado, control hereda familia. |
| git diff --check, hashes de Backend/BFF/contratos previos | PASS; sin cambios funcionales en esas capas. |
| QA manual de cierre | PENDIENTE. No se atribuye al agente ni se modifica EN_QA. |

Primer focalizado encontró únicamente una selección ambigua en el test que
inyectaba un botón futuro (había dos botones en la fila); se corrigió el selector
del control de expansión, sin debilitar el caso. No fallos generales de checkout
en esta ejecución; se conserva su historia anterior sin atribuir una nueva falla.
El harness nativo de teclado Firefox sigue sin confirmar activación; no cuenta
como aserción PASS. Enter/Espacio del control anterior tienen PASS manual del
usuario; el nuevo control mantiene semántica nativa y pasa ambos en componentes.
Verificar el nuevo gesto y foco en la revisión manual final.

La QA real usa únicamente el bootstrap SUPER_ADMIN del perfil existente,
puertos temporales3003/18088 y PostgreSQL tmpfs, sin producción ni mutaciones de
usuarios. GERENCIA/roles sin permiso/destinos seguros se prueban con fixtures de
sesión en integración de componentes, no se presentan como cuentas reales del
runtime. Paginación positiva sigue NO EJECUTABLE manual con esos datos.

Artefactos: `/tmp/pms-staff-admin-final-qa/` contiene focused.log, check.log,
build-mocks.log, typecheck-after-build.log, fonts-before.json,
fonts-after-mocks-{false,true}.json, browser-summary-mocks-{false,true}.json y
capturas mocks-true-{desktop-list,desktop-expanded,tablet-list,mobile-list,
mobile-expanded}.png, inspeccionadas por el agente. Firefox de prueba no cargó
fuentes externas: no se promete paridad rasterizada de caras web no descargadas.
Se retiran los servicios/perfil temporales, conservando capturas y logs sin secretos.

Archivos de esta revisión:

- Staff: components/staff-admin-workspace.tsx, staff-admin.module.css,
  **nuevo** staff-admin-access-boundary.tsx, hooks/use-staff-admin.ts,
  **nuevo** model/staff-navigation.ts, index.ts y staff-admin.test.tsx.
- App privada: layout.tsx, staff-shell.tsx y staff-admin-navigation.test.tsx.
- Compartido: entity-data-grid.tsx (adaptador de fila de lectura opcional).
- Docs65, AlanPlan y AlanHandoff: seguimiento/historia EN_QA. Los contratos51/52/64,
  código Backend/BFF/MSW, servicio, DTO y mapper administrativos se conservan.


## Última corrección — tres columnas y cierre preparado

**Conformidad condicionada: SATISFECHA. Cierre de Fase2C preparado.**
La instrucción más reciente sustituye la disposición previa de cuatro columnas:
la tabla vigente tiene exactamente **Usuario, Acceso y Asignación**. Se eliminan
header/celdas/estilos de Acciones; no existe una columna de iconos. El mismo
control nativo de chevron se mueve dentro de Usuario, junto al grupo de identidad,
sin texto visible Ver más/menos. El detalle usa **colSpan=3**. Anchos40/27/33%;
en móvil Usuario ocupa la primera línea, Acceso y Asignación comparten la segunda,
conservando divisores y el área táctil44px del control. Sin cambios globales ni
en componentes compartidos, tipografía, caché, búsqueda, filtros, cursor o guard.

### Conformidad manual aportada por el usuario

El usuario confirmó expresamente PASS en estos seis escenarios de la versión
anterior a la retirada de la columna:

1. Expansión al pulsar zonas de la fila.
2. Contracción con segundo clic.
3. Activación mediante Enter y Espacio.
4. Reapertura sin nuevo GET dentro de30s.
5. Consistencia tipográfica.
6. RECEPCION sin STAFF_MANAGE redirigida a dashboard.

Además autorizó aceptar la última condición visual tras implementar la retirada
correcta de Acciones y obtener regresiones PASS. Se registra esa condición como
satisfecha con la evidencia técnica siguiente, **sin atribuir al usuario una
nueva inspección manual de la tabla de tres columnas**. No se requiere repetir
ni se borra la evidencia humana que acaba de confirmar; el anterior resultado
inconcluyente del harness nativo de teclado no invalida ese PASS manual.

### Verificación ejecutada sobre tres columnas

| Comando/ejecución | Resultado real |
| --- | --- |
| Focalizados Staff, navegación/legacy/scope, Auth/logout y componentes compartidos | 95 PASS / 8 archivos. |
| NEXT_PUBLIC_USE_MOCK_API=false npm run check | PASS: lint, TypeScript, 1.934 tests / 299 archivos y build. |
| NEXT_PUBLIC_USE_MOCK_API=true npm run build | PASS. |
| npm run typecheck tras build con mocks | PASS. |
| Firefox con MSW activo → Next→Spring→PostgreSQL aislado | 24 aserciones PASS: exactamente3 encabezados/celdas, sin Acciones, chevron en Usuario, colSpan3, detalle bajo demanda/reapertura sin GET y responsive. |
| git diff --check | PASS. |
| Hashes previos Backend/BFF/servicios/contratos | Conservados; solo tres archivos funcionales locales de presentación/tests cambiaron. |

Los tests incluyen clic/segundo clic, Enter/Espacio, foco y relaciones accesibles,
controles internos excluidos, GET bajo demanda y caché30s, aislamiento por contexto,
roles/redirects y las regresiones del panel. No se alteran las reglas verificadas.
Capturas escritorio/tablet/móvil inspeccionadas automáticamente por el agente,
no por el usuario. El runtime usa el bootstrap SA sintético de siempre en3004/
18089 y PostgreSQL tmpfs; no se crean usuarios de prueba mediante APIs inexistentes
ni se accede a producción. Servicios de QA retirados al finalizar.

Artefactos efímeros: `/tmp/pms-staff-admin-three-columns-qa/` contiene focused.log,
check.log, build-mocks.log, typecheck-after-build.log, browser-summary-mocks-true.json
(24 aserciones; no PASS nativo de teclado atribuido al harness), y capturas
mocks-true-{desktop-list,desktop-expanded,tablet-list,mobile-list,mobile-expanded}.png.

### Salvedades conservadas y siguiente incremento

- **Paginación positiva manual: NO EJECUTABLE**, faltan registros suficientes.
  Se conserva la cobertura automatizada de cursores/páginas sin sustituirla por
  una afirmación de QA humana.
- **Lector de pantalla: NO ACREDITADO** en el material disponible; relaciones,
  semántica y teclado tienen tests y los seis PASS humanos anteriores, pero no
  se declara una auditoría integral de accesibilidad ni lectura con NVDA/Orca.
- GERENCIA y otras identidades/scopes tienen pruebas de componentes/Backend
  previas; esta última sesión real solo acredita el bootstrap SUPER_ADMIN.
  No se inventan verificaciones manuales adicionales de otros roles.
- **Backend2A y BFF2B conservan EN_QA** y su evidencia independiente. No se
  declaran completados por este cierre preparado de presentación Web2C.
- No se marca COMPLETADA una fila del XLSX ni se hace commit/push/merge. Se entrega
  el cierre preparado bajo la conformidad condicionada del usuario, con estas
  salvedades explícitas, sin solicitar otra aprobación para la corrección menor.

El futuro CRUD mantendrá tres columnas: controles inline/Guardar/Cancelar y menú
contextual dentro de las celdas existentes, y swipe que revele baja lógica
DISABLED con confirmación y alternativa mouse/teclado. No reaparecerá Acciones
como columna automática; respetar expectedVersion/409, scope y permisos. Ninguna
mutación o infraestructura nueva se implementa en esta corrección.

Archivos de la última corrección: staff-admin-workspace.tsx (chevron y colSpan),
staff-admin.module.css (redistribución y móvil), staff-admin.test.tsx (estructura,
control dentro de Usuario y colspan), esta guía, rutas02, AlanPlan y AlanHandoff.

## Ajuste posterior — pie de paginación compartido con Habitaciones y Reservas

Autorización directa del usuario: reemplazar Anterior/Siguiente por flechas y
uniformar todo el pie. Usuarios usa ahora **EntityPagination**, el mismo componente
que RoomBoard y ReservationList, no una réplica local: selector «Filas por página»,
flechas ‹/› con labels accesibles Página anterior/siguiente, botón de página actual,
resumen a la izquierda, tamaños, foco, espaciado y comportamiento responsive comunes.
Se retiran los estilos locales `.pagination` y el pie construido con Button.

La variante opcional `mode:cursor` recibe estado del controlador de Usuarios;
no usa useEntityPagination ni corta colecciones en memoria. Backend conserva
cursor/limit/orden/búsqueda y sigue decidiendo si existe siguiente página. Botones
numerados representan únicamente páginas visitadas con cursores reales guardados;
se puede volver a ellas, no saltar a páginas futuras desconocidas. Al cambiar
filtro/scope/tamaño se descarta la historia incompatible, como antes.

Backend no proporciona COUNT ni total de páginas: el resumen muestra el rango
recibido (por ejemplo1–25 usuarios), sin inventar «de N». El resto del pie usa
los mismos estilos y marcado. Las otras tablas conservan su resumen con total y
sus saltos completos, porque ya conocen esos datos. No se cambia su hook local.

Selector común5/10/25/50/100; todos son válidos en el contrato Backend limit1..100.
Se mantiene el default50 de Usuarios y su consulta explícita; tamaños5/10 se
admiten también en la normalización de filtros de navegación. Cambiar tamaño
sigue reiniciando el cursor. Durante actualización las flechas/números se
inhabilitan y el resumen dice Actualizando, sin confirmar filas anteriores.

Validaciones de este ajuste:

- Focalizados finales: **103 PASS en7 archivos**, incluyendo EntityPagination,
  Usuarios/navegación/legacy, RoomBoard y ReservationList.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run check`: **1.937 PASS /299 archivos**,
  lint, TypeScript y build PASS.
- `NEXT_PUBLIC_USE_MOCK_API=true npm run build` y typecheck posterior: PASS.
- Firefox real con MSW activo, Next/Spring/PostgreSQL de prueba: **26 aserciones
  PASS**, incluidas flechas/página actual/selector compartidos y responsive sin
  desbordamiento. Capturas desktop/tablet/mobile inspeccionadas por el agente.
- `git diff --check` y hashes previos Backend/BFF/contratos: PASS.

Logs/capturas efímeros: `/tmp/pms-staff-admin-pagination-qa/`:
focused-final.log, check.log, build-mocks.log, typecheck-after-build.log,
browser-summary-mocks-true.json y mocks-true-{desktop-list,tablet-list,mobile-list}.png.
QA aislada3005/18090, solo bootstrap SA sintético; se retiran sus servicios al
terminar. No se atribuye nueva QA manual al usuario ni PASS nativo de teclado
al harness. Su conformidad anterior y el cierre preparado de2C se conservan;
paginación positiva manual sigue NO EJECUTABLE y lector de pantalla no acreditado.
Backend2A/BFF2B siguen EN_QA independiente, sin nuevos endpoints ni mutaciones.

Archivos: shared/components/entity-pagination.tsx y su test; Staff workspace/CSS/
test; app usuarios/filters.ts; esta guía y seguimiento AlanPlan/AlanHandoff.


## Cierre documental autorizado — Fase 3A, 2026-10-22

**Fase 2C COMPLETADA**, exclusivamente por la instrucción expresa del usuario de
registrar el cierre si faltaba. La conformidad manual de los seis escenarios y
la condición satisfecha (retirar Acciones con regresiones PASS) constan en las
secciones anteriores. El pie compartido posterior conserva su evidencia técnica.
No se atribuye al usuario una nueva inspección de la tabla final ni de ese pie.
Las entradas EN_QA/cierre preparado anteriores son evidencia histórica, no el estado
vigente. No se alteran los resultados ni las limitaciones:

- Paginación positiva manual: **NO EJECUTABLE**, por falta de registros suficientes.
- Lector de pantalla: **NO ACREDITADO**; no se afirma auditoría integral de accesibilidad.
- Los PASS automatizados/Firefox previos conservan fecha y alcance; no se volvieron
  a ejecutar por esta actualización exclusivamente documental.
- Backend2A y BFF2B: **EN_QA**, independientes. BE-006B/C y entrega de credenciales
  no se completan por el cierre de lectura UI. Ningún cambio en XLSX.

Siguiente incremento: [propuesta de contrato de mutaciones53](../../../backend/docs/53_STAFF_ADMIN_MUTATIONS_CONTRACT_PROPOSAL.md),
**PENDIENTE DE APROBACIÓN**, con guardados inline separados, tres columnas,
concurrencia/revocación/auditoría y baja por deslizamiento con alternativa accesible.
Ninguna mutación ni interfaz nueva se implementa en Fase 3A. Sin commit/push/merge.
