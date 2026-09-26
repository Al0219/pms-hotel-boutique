# Private 09 — Multi-property: correcciones frontend

Fecha: 2026-09-25. Owner: WEB-2. Reviewers requeridos: WEB-4 para métricas/disponibilidad; WEB-3 para composición del shell.

## Alcance autorizado

La solicitud del usuario autoriza corregir Property Switcher, Multi-property y la frontera de identidad del shell, crear una rama y publicar los cambios. Corresponde a IMP-WEB-0905, IMP-WEB-0906 e IMP-WEB-0907. IMP-WEB-0901/0902 aportan los roles y sesiones mock ya implementados en Private 07. La dependencia IMP-WEB-0601 sigue bajo WEB-4: no se modifica su implementación ni se declara terminada su integración.

El XLSX sigue marcando las tareas funcionales como PENDIENTE; esta corrección no cambia el backlog ni certifica su DoD como COMPLETADA. Fuente funcional: petición explícita, docs/05_PROPERTY_SCOPE.md, docs/06_TEAM_STRUCTURE.md y Web docs/21_MULTI_PROPERTY.md. Se conservan el snapshot y las opciones que ya presentaban las pantallas de Private 09. No se inventan Node IDs ni se declara una revisión visual de Figma que no se ha realizado.

## Contrato frontend/mock de esta corrección

No es una API Backend, autorización real ni contrato confirmado de WEB-4. El transporte local usa MSW en `/__mock/private-09/{session,metrics,comparison}`, siempre contra el mismo origen, nunca contra la base URL del Backend.

- Identidad: identificador local de sesión, nombre ficticio, role_id existente y memberships con property_id, nombre, timezone, currency y ACTIVE/INACTIVE. No contiene credenciales ni tokens.
- La sesión activa y logout proceden del estado de Security de Private 07; los permisos proceden de su catálogo de roles. Cambiar de propiedad no cambia el rol. Cerrar sesión Staff no cierra Guest.
- Solo memberships ACTIVE llegan al selector. ALL_PROPERTIES exige MULTI_PROPERTY_READ y declara exactamente el conjunto autorizado. Una preferencia persistida inválida exige selección explícita, nunca fallback global.
- La preferencia de contexto se conserva en sessionStorage, por sesión ficticia, y se revalida contra memberships y permisos. No es una credencial. Un fallo del almacenamiento conserva el cambio durante la visita y muestra feedback.
- Datos de dashboard: property_id, moneda, fecha de snapshot, room-nights vendidos/disponibles y revenue neto. Las métricas por propiedad preceden al consolidado; ADR/RevPAR/ocupación se ponderan por sus denominadores, sin promediar porcentajes. Diferentes monedas o fechas no se suman. Denominadores cero muestran ausencia de base.
- Snapshot existente: 08 sep 2026, GT-HB-01: 82/100 y GTQ 92,250; GT-HB-03: 76/100 y GTQ 101,800. Consolidado: 158/200, 79%, GTQ 194,050. No es información en tiempo real.
- Búsqueda: entrada/salida, texto de RoomType y contexto autorizado explícito. La demo limita la forma a 31 noches; no es una regla del hotel. Fechas y texto se conservan en URL y al volver a editar. Los ejemplos existentes cubren las noches del 12 y 13 sep 2026. Otras fechas sin fixture devuelven vacío; no se fabrica disponibilidad.
- Resultados: property_id/RoomType, moneda, tarifa de ejemplo, timezone y ATS diario. Se rechazan propiedades ajenas al contexto, duplicados y coberturas incompletas. ATS estancia usa el mínimo diario del ejemplo existente; no calcula ATS desde inventario físico ni modifica inventario.
- Consultas con claves por sesión/rol/scope/criterios y cancelación; al cambiar contexto no se muestran datos anteriores bajo la nueva propiedad.
- Estados: carga, error con retry, vacío, offline y logout pendiente/fallido/confirmado. Ningún error concede un scope mayor.

## Integración del shell y ownership

El layout sigue siendo composición. `auth` publica StaffSessionProvider/useStaffSession/StaffLogout; `properties` publica PropertyProvider/usePropertyScope/PropertySwitcher. El shell muestra usuario, rol, sesión, propiedad y logout, con enlaces existentes por rol documentado. No se agregan rutas funcionales ficticias.

El selector se presenta en `/dashboard`, `/multi-property` y su búsqueda/resultados. Otros módulos conservan su contexto propio: sus servicios aún no consumen este provider y el encabezado no pretende que el selector los haya cambiado. Integrarlos requiere coordinación con sus owners. No se cambian internals de Reservas, Folio, Payments, Revenue o Availability, ni permisos Backend.

Las rutas antiguas de rebooking permanecen fuera de esta corrección. La nueva comparación no enlaza a ellas como si pudiera aplicar un traslado real.

## Handoff para WEB-4 y WEB-3

Pendiente de revisión del equipo; no se afirma aprobación de terceros ni se envían mensajes automáticamente.

WEB-4: confirmar la futura API pública Domain para métricas por property y período, semántica neta/moneda/denominadores, límites temporales y disponibilidad diaria/RoomType. Revenue exporta actualmente modelos y un componente; no una consulta pública Domain que pueda usarse sin acceder a internals. Availability expone una matriz, pero sus fixtures actuales usan identificadores y fechas distintos del snapshot Private 09. Esta corrección aísla los ejemplos existentes y no altera esos contratos.

WEB-3: revisar el montaje de identidad en el shell y acordar cómo sus consumidores adoptarán usePropertyScope sin sustituir silenciosamente sus contratos actuales. Los filtros de navegación son presentación, no enforcement.

## QA reproducible

Con NEXT_PUBLIC_USE_MOCK_API=true, visitar `/multi-property` o `/dashboard`. Seleccionar GT-HB-01, GT-HB-03 y todas las autorizadas; revisar métricas, recargar, buscar 12–14 sep 2026 y filtrar King. Volver a editar conserva criterios. Cerrar sesión y recargar conserva el estado cerrado; iniciar demostración lo reabre.

Escenarios locales de carga de datos: en DevTools, guardar `pms:private-09:scenario` con valor `error`, `empty` o `loading` en localStorage y recargar. Eliminar esa clave restaura success; `loading` añade 3 segundos. No son opciones del producto ni afectan a otros módulos.

Las pruebas automatizadas cubren matrices de autorización frontend, memberships inactivas/vacías, rol sin global, scope guardado inválido, métricas ponderadas y monedas distintas, cobertura ATS, búsqueda, errores/retry/offline, cache por contexto, persistencia y logout compartido. Evidencia final de lint/typecheck/tests/build se registra al cerrar la corrección.

### Evidencia de ejecución — 2026-09-25

- Pruebas enfocadas de Private 09 y shell: 26 PASS.
- Regresión Web completa: `npm run test -- --maxWorkers=2 --testTimeout=15000`: 180 archivos y 761 pruebas PASS, sin errores no controlados. Una ejecución previa con cuatro procesos tuvo tres timeouts al iniciar runners; se repitió completa con dos procesos y terminó correctamente.
- `npm run lint`: PASS; `npm run typecheck`: PASS; `NEXT_PUBLIC_USE_MOCK_API=true npm run build`: PASS.
- Chrome sobre build de producción: dashboard, consolidado autorizado, búsqueda/resultados, viewport móvil de 390 px sin desbordamiento del documento, logout persistente tras recarga y reinicio de la demo: PASS. Sin excepciones de JavaScript. Servidor y navegador temporales detenidos al terminar.
- Revisión visual de escritorio/móvil realizada sobre la implementación; no sustituye la revisión contra Figma ni la aprobación de WEB-4/WEB-3.
- No se incluyen cambios de dependencias, Backend, Android o archivos generados de Next.js.
