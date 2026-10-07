# Staff: reservas e inventario para la presentación

## Alcance autorizado

Reutilizar `/reservas`, `/reservas/[reservationId]` y `/staff/habitaciones`, sin conectar Backend ni modificar Public 01/02. Reservas corresponde a IMP-WEB-0301/0302 (WEB-3, reviewer WEB-4); este incremento no declara cerrado el backlog ni valida los contratos provisionales como API real.

- Listado: referencia, huésped, fechas/noches, habitación o tipo cuando lo provee el read model, estado, finanzas básicas y origen. Búsqueda sin distinción de acentos; filtros por estado y rango inclusivo de **fecha de llegada**, con limpieza y paginación.
- Detalle: huésped principal, N estadías, tipo y habitación física nullable, estado de cada estadía, origen, notas y resumen financiero. Una estadía sin habitación asignada no ofrece cambio de habitación.
- Habitaciones: búsqueda por número/tipo y filtro operativo ACTIVE/OOO/OOS; total físico y cantidad visible. ACTIVE no significa libre. La ocupación no se deduce del estado operativo; el piso desconocido permanece null.
- Catálogo: listar, ver, crear y editar tipos (código/nombre) y habitaciones (código/tipo al crear; solo código al editar). Sin eliminación. Crear un tipo no crea inventario físico; editar una habitación conserva su ID y RoomType.
- Contexto: propiedad obtenida de la sesión Staff y `PropertyProvider`. ALL_PROPERTIES obliga a elegir una propiedad concreta para estas operaciones; las respuestas de otra propiedad/ID se rechazan en los hooks. El menú móvil puede abrirse/cerrarse sin ocupar toda la pantalla.
- Menú de la presentación: solo Panel, Reservas, Calendario y Habitaciones. El Panel ofrece accesos a estos tres módulos y no muestra el dashboard Multi-property. Se retiran del menú los módulos aplazados, el acceso a Sesiones/seguridad y la campana que dirige a Mensajería; sus rutas, código y controles de autorización se conservan. Ocultar un enlace no revoca permisos ni bloquea la ruta.
- Centro de Reservas: encabezado y resúmenes en la paleta crema/oliva, alertas plegables, filtros con etiquetas visibles, contador de resultados, acceso explícito al detalle y estados vacíos orientativos. Conserva los datos, búsqueda, filtros, paginación y conversión de waitlist existentes. Nueva reserva permanece pendiente de una tarea posterior.
- Cerrar sesión Staff regresa a `/` después de confirmar su cierre. Un fallo conserva el panel y permite reintentar; una sesión local ya cerrada también regresa al inicio, sin ofrecer reinicio desde el área privada. Guest mantiene su sesión independiente.

## Contratos y conexión pendiente

Los controladores Backend `RoomController` y `RoomTypeController` confirman GET/POST `/api/v1/properties/{propertyId}/rooms` y `/room-types`, GET/PATCH con ID. RoomView contiene id/propertyId/roomTypeId/code/createdAt/updatedAt; RoomTypeView añade name y no roomTypeId. No contienen piso, ocupación ni estado operativo. Crear/editar exige COMMERCIAL_MANAGE (o SUPER_ADMIN), además de la validación Backend de property scope.

El catálogo usa **exclusivamente MSW**, mediante `/__mock/staff-room-catalog/{propertyId}`. El envelope types/rooms y el comando discriminado de esta ruta son infraestructura local, no endpoints/DTOs de Backend. Fixtures aisladas por propiedad y compartidas con el tablero permiten probar creación, edición y errores de código duplicado. Los datos viven en memoria y se reinician al recargar; no constituyen persistencia en la base de datos.

En modo mock, gerencia/superadmin pueden administrar el catálogo para revisar la interfaz. En una sesión real se exige el permiso confirmado COMMERCIAL_MANAGE o SUPER_ADMIN; la UI nunca sustituye la autorización Backend. Con mocks desactivados el catálogo informa que falta conectar su transporte y no envía comandos locales a Backend.

Los read models de Reservas y del tablero operativo conservan sus contratos provisionales y servicios existentes, con endpoint inyectable desde la composición. Las páginas no confunden NEXT_PUBLIC_API_BASE_URL con un recurso de reservas confirmado. Sin adapter real no consultan `pms.test` en modo Backend. El integrador debe adaptar las respuestas reales a los DTOs y pasar el recurso aprobado; no basta con cambiar una URL base.

## Handoff y límites de la demo

1. El acceso Staff real desde `/acceso` queda a cargo de BD1. Para recorrer únicamente el frontend, el usuario aprobó el acceso local con `qa_staff@example.test` / `12345678`. Solo funciona con NODE_ENV=development y NEXT_PUBLIC_USE_MOCK_API=true: MSW prepara la identidad `qa_staff`, rol mock superadmin, y reinicia su sesión local antes de navegar a `/dashboard`. No crea GuestAccount, no llama a BFF/Backend, no guarda la contraseña ni crea cookies/tokens reales. Fuera del modo local conserva Google y el BFF real sin este acceso. La sesión privada mock conserva sus límites anteriores: no representa un control de acceso de producción.
2. La reserva creada públicamente debe aparecer en Staff mediante la persistencia/read model real que conecte el compañero. No se enlazan artificialmente las fixtures del checkout con este panel ni se certifica todavía ese recorrido end-to-end.
3. `assignRoom(stayId, roomId)` es una operación interna Backend, no un contrato HTTP aprobado. No se crea un botón que simule una asignación real. La vista ya admite room=null con roomType presente.
4. Cancelación, no-show, extensión, room move, waitlist y Folio siguen con su implementación y límites previos. No se declaran integrados por pulir listado/detalle. La solicitud WAITLIST local HB-2026-08207 se gestiona en el módulo de lista de espera; no tiene un ReservationDetail confirmado.
5. No se modifican entidades, servicios, migraciones, credenciales ni endpoints Backend. Para cerrar integración: contrato del read model de reservas, proyección operativa, adapter de catálogo y acceso Staff desde `/acceso`.

## Validación

Pruebas de filtros y fechas, estadía sin habitación asignada, rechazo de respuestas fuera de scope, mapper del catálogo, creación/edición preservando identidad, códigos duplicados, consulta sin permisos y bloqueo del transporte mock en modo Backend. Validar también la navegación, formularios y aislamiento de propiedades en navegador en el puerto 3000, lint, typecheck y build.
