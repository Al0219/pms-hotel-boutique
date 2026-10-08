# Private 07 — Propuesta de contrato frontend/mock

Estado: APROBADO por el usuario en esta conversación el 24 de septiembre de 2026. No es un contrato API Backend.

Alcance solicitado: IMP-WEB-0901, IMP-WEB-0902, IMP-WEB-0903 e IMP-WEB-0904.
Owner: WEB-2. Reviewer: WEB-3.

## Autoridad y dependencias

La solicitud del usuario autoriza completar estas cuatro interfaces con simulación frontend, sin autenticación ni enforcement Backend. Foundation IMP-WEB-0017 figura COMPLETADA. Las cuatro tareas figuran PENDIENTE en el XLSX; este documento no modifica sus estados. Sesiones y MFA dependen de completar roles primero.

DEC-G-013 exige un contrato frontend/mock aprobado para la tarea. Los DoR del backlog requieren contratos de permisos, sesiones, MFA y Consent/DSR. Esta propuesta cubre esos datos y comportamientos; no define endpoints ni políticas de autorización nuevas.

Fuente visual: Private 07 Security / Privacy / Access. No se dispone en el repositorio de una captura o especificación completa de sus pantallas. La pantalla existente de roles sirve como referencia de estilos, no como prueba de conformidad Figma. La verificación visual contra Figma queda pendiente de disponer de esa fuente.

## Privacy / Consent — 0904

Ruta: `/seguridad/privacidad`.

Cada consentimiento de ejemplo tiene identificador local, sujeto ficticio, finalidad, canal, estado activo/inactivo, fuente, fecha de actualización y versión de evidencia. Los registros iniciales incluyen Marketing/Email y Marketing/SMS para demostrar granularidad. No se muestran datos personales reales.

La lista muestra finalidad, canal, estado y trazabilidad. Activar o desactivar modifica únicamente el registro seleccionado. Una mutación pendiente deshabilita su control; el éxito se anuncia después de guardar. Un fallo conserva el estado anterior y ofrece reintento. Recargar conserva los cambios guardados.

Los entrypoints DSR permiten registrar solicitudes simuladas de exportación o anonimización y muestran su estado pendiente. No ejecutan eliminación ni afirman que puedan suprimirse datos sujetos a retención legal.

## Roles / Permissions — 0901

Ruta existente: `/seguridad/roles`.

Reutilizar los roles y el catálogo de permisos ya presentes en la demostración. No agregar permisos ni deducir concesiones para roles sin configuración. Los roles sin configuración se identifican como tales y pueden recibir una selección explícita en el editor simulado.

Datos: identificador local, nombre, descripción opcional, cantidad de usuarios de ejemplo, permisos seleccionados y propiedades de ejemplo explícitas. No asignar automáticamente ALL_PROPERTIES cuando exista una lista de propiedades; diferenciar la lista de propiedades del alcance multi-property.

Conservar búsqueda, selección, creación y duplicación. Los roles creados empiezan sin permisos ni propiedades; duplicar conserva la configuración de ejemplo y no copia usuarios. El editor permite guardar o descartar cambios y muestra si existen cambios pendientes. Validar nombre no vacío y único. Mostrar la matriz también para configuraciones vacías. Mantener las restricciones ya visibles sin inventar una política para SuperAdmin.

Guardar persiste la configuración local; navegar o recargar recupera la última versión guardada. Ninguna edición modifica accesos reales, usuarios o roles de la sesión. La UI identifica el alcance de demostración.

## Sessions — 0902

Ruta: `/seguridad/sesiones`.

Datos seguros de ejemplo: identificador local, dispositivo, navegador, última actividad, indicador de sesión actual y estado activa/cerrada. No incluir tokens, IP, ubicación precisa ni identidad real.

Listar sesiones activas y señalar la actual. Permitir cerrar una sesión de ejemplo y cerrar las demás mediante confirmación. La lista cambia solo tras éxito de persistencia. El cierre de la sesión actual muestra un estado local de sesión cerrada, con opción explícita de iniciar otra demostración. El cierre sobrevive a la recarga y no altera Guest Auth.

## MFA — 0903

Ruta: `/seguridad/mfa`, enlazada desde sesiones.

Estados de presentación: desactivada, configuración pendiente y activada. Iniciar configuración presenta una explicación de simulación; confirmar activación persiste únicamente el estado. Cancelar vuelve al estado anterior. Desactivar requiere confirmación. Mostrar feedback y estado pendiente durante las operaciones.

No generar ni solicitar OTP real, semilla, secreto, QR de enrolamiento ni códigos de recuperación. Mostrar la recuperación como referencia informativa de la demostración, sin prometer un mecanismo real de acceso. La UI debe aclarar que activar esta simulación no protege una cuenta real.

## Persistencia y arquitectura

Usar Service → DTO → Mapper → Domain → Hook/State → UI, con TanStack Query y MSW según las reglas Web. Los identificadores de transporte mock que se definan al implementar serán internos a la simulación y no endpoints Backend confirmados.

Persistir únicamente datos ficticios y estados de la demostración, con claves versionadas separadas de Guest Auth. El almacenamiento pertenece a la infraestructura mock, nunca a componentes ni mappers. Validar los datos recuperados; un dato corrupto muestra error con recuperación explícita, sin informar éxito falso. Si guardar falla, conservar el último estado confirmado.

Los mappers son puros y rechazan campos obligatorios inválidos con DomainMappingError. La UI recibe modelos Domain y expone loading, empty, error, reintento y submitting cuando corresponda. No incorporar dependencias nuevas.

## Archivos previstos

- `src/modules/permissions/`: DTO, mapper, service, hook y actualización de la pantalla existente.
- `src/modules/privacy/`: capas de consentimientos y pantalla de privacidad.
- `src/modules/security/`: capas y pantallas de sesiones y MFA.
- `src/data/mocks/`: fixtures ficticias, handlers y persistencia de esta simulación.
- `src/app/(private)/seguridad/`: composición de roles, privacidad, sesiones y MFA.
- Tests de mappers, mutaciones y componentes dentro de los módulos afectados.

## Acceptance y DoD previstos

1. Revocar Marketing/SMS conserva Marketing/Email; el estado persiste tras remontar y recargar.
2. Fallar una escritura no muestra éxito ni cambia el último estado confirmado.
3. Crear, editar, duplicar, guardar y descartar roles funciona; un rol vacío muestra matriz editable; no se agregan permisos al catálogo.
4. Las propiedades se muestran explícitamente y editar roles no cambia el contexto Guest ni el rol de sesión.
5. Revocar una sesión solo cambia la lista tras respuesta correcta; cerrar la actual persiste y no cierra Guest Auth.
6. MFA permite activar, cancelar y desactivar la simulación; storage y logs no contienen códigos, semillas ni credenciales.
7. Estados vacíos, errores, reintentos y bloqueo de doble submit verificados con RTL/MSW; validaciones de DTO con Vitest.
8. Teclado, nombres accesibles, foco, feedback anunciado y navegación entre las cuatro rutas.
9. `npm run check` PASS. Revisión visual responsive y comparación Figma pendiente de acceso a su fuente.

La aprobación de esta propuesta habilita la implementación del contrato mock. No equivale a aprobación de una API, políticas Backend, nuevos permisos o conformidad visual Figma.
