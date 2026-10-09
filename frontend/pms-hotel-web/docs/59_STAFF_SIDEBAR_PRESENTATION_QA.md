# Staff sidebar — presentación

Fecha: 2026-10-08. Estado: **COMPLETADA**. QA manual real **PASS** confirmado
por Alan en el cierre del incremento actual.
Corrección de presentación autorizada sobre el shell de `main 63279d7`,
conservando los incrementos de Habitaciones existentes en la rama.

## Cambio y límites

Panel, Reservas, Calendario y Habitaciones comparten sidebar con marca PMS Staff,
usuario, rol secundario, selector de propiedad, navegación con iconos y logout
al fondo. Se elimina el header horizontal del shell. Las rutas de detalle de
Reservas mantienen su módulo activo. En pantallas estrechas el botón del menú
abre selector, navegación y logout; Escape cierra y devuelve foco al botón.

Se reutilizan `StaffLogout`, `PropertySwitcher` y el renderer SVG existente de
Booking, promovido a shared sin dependencias nuevas. Booking conserva su export
`BookingIcon`. El selector compacto muestra el nombre recibido de la sesión y
un tooltip con nombre/ID; sus valores, permisos, scope, persistencia y eventos
son los originales. `PropertyProvider` y `resolvePropertyScope` no cambian.
Solo se ajustan las referencias textuales al selector que antes indicaban el
encabezado. Auth, HTTP, BFF, Backend y el contenido interno de los módulos
conservan su implementación en este ajuste de shell. Habitaciones era READ-ONLY
al entregar el sidebar; el alcance vigente de C/R/U real y paginación queda
cerrado en [60](60_STAFF_INVENTORY_CRU_QA.md).

**Límite previo de Calendario:** su página sigue inyectando propiedad/endpoints
por variables de entorno. Mostrar el selector del shell no integra ese módulo
con PropertyContext ni certifica refresco de sus datos al cambiar de hotel.
La composición de Calendario queda fuera de esta corrección del shell.
Panel es una pantalla de accesos; no realiza lecturas de inventario/reservas.

## Validación técnica

- `NEXT_PUBLIC_USE_MOCK_API=false npm test -- …`: 183 PASS / 21 archivos
  focalizados (shell/layout/scope, sesión/logout, propiedades, workspace real,
  Habitaciones, Calendario y UI Booking afectada por la reutilización de iconos).
- `NEXT_PUBLIC_USE_MOCK_API=false npm run typecheck`: PASS.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run lint`: PASS.
- `NEXT_PUBLIC_USE_MOCK_API=false npm run build`: PASS.
- `git diff --check`: PASS.

Los dos tests nuevos de integración montan el layout y PropertyProvider reales,
con el flag false y respuestas BFF sintéticas de MSW: cambiar de propiedad
recarga Reservas/Habitaciones, retira el contenido anterior, conserva la
preferencia por sesión y ALL_PROPERTIES exige un hotel concreto sin consultar
un ID global. Los tests existentes cubren cierre de sesión confirmado, redirección
al inicio, aislamiento Guest y error recuperable de logout.

Firefox: componentes/CSS reales de las cuatro pantallas, con puertos sintéticos
solo en un harness temporal fuera del repo. 20 combinaciones verificadas en
anchos CSS efectivos 317, 392, 768, 1024 y 1440: sin overflow del documento,
una identidad/selector/logout, cuatro links con iconos decorativos, ruta activa,
selector accesible al desplegar menú y logout anclado en escritorio. También
se comprobó el cierre/reapertura móvil y la selección/persistencia/ALL_PROPERTIES.
Capturas y mediciones: `/tmp/pms-staff-shell-visual/`. Esta revisión visual no
acredita sesión PostgreSQL ni reemplaza la QA manual real.

## Cierre con QA manual real — 2026-10-08

Alan confirmó QA manual real PASS y autorizó el cierre documental del incremento,
incluido el ajuste visual asociado. Sidebar **COMPLETADA**, con la evidencia
técnica previa conservada; esta actualización no ejecuta nuevamente el navegador
contra PostgreSQL ni atribuye resultados específicos no comunicados por Alan.
El límite de composición de Calendario indicado arriba permanece vigente: este
cierre del shell no completa la integración de datos de Calendario. DELETE sigue
bloqueado por contrato/política; asignación física queda como siguiente incremento
según [60](60_STAFF_INVENTORY_CRU_QA.md), fuera del alcance cerrado.

## QA manual corta — guía de regresión

1. Iniciar Staff real con `NEXT_PUBLIC_USE_MOCK_API=false`. Recorrer Panel,
   Reservas, Calendario y Habitaciones: marca, usuario y rol solo en sidebar;
   sin header horizontal, labels visibles y un único módulo activo.
2. En Reservas y Habitaciones cambiar entre hoteles autorizados: aparecen los
   nuevos datos, sin conservar filas del anterior. Recargar y comprobar selección.
   ALL_PROPERTIES conserva la petición de elegir un hotel concreto. Si la cuenta
   no tiene MULTI_PROPERTY_READ, la opción global no aparece.
3. En móvil abrir el menú y usar selector y links. Comprobar navegación por
   teclado, foco visible, Escape y navegación sin desbordes. Las tablas mantienen
   su scroll interno. Calendario conserva el límite de composición indicado arriba.
4. Cerrar sesión desde el sidebar: cierre BFF y retorno a `/`; Atrás no recupera
   contenido Staff autorizado. Con fallo de logout, permanece la pantalla y se
   puede reintentar. Confirmar que Guest conserva su sesión independiente.

Resultado de cierre: QA manual real PASS confirmado por Alan; COMPLETADA.
La guía se conserva para regresión. Sin commit/push/merge.
