# 16 — Propuesta de contrato de Servicios Android

**Estado:** PROPUESTA PARA REVISIÓN HUMANA. No es contrato API, DEC, modelo de dominio aprobado ni autorización para iniciar `IMP-AND-0103`.

**Tarea relacionada:** `IMP-AND-0103` — permanece `PENDIENTE`.

## Propósito y límite

Esta propuesta identifica las decisiones necesarias para que Backend publique un contrato de catálogo y solicitudes de servicios consumible por Android. No fija rutas HTTP, métodos, DTOs, modelos, enums, nulabilidad, errores de negocio ni comportamiento de servidor.

`app/(guest)/services.tsx` sigue siendo el handoff técnico creado por `IMP-AND-0102`; no representa un catálogo ni una solicitud real.

## Fuentes inspeccionadas

- `docs/00_PROJECT_CONTEXT.md`: el producto contempla Housekeeping, Conserjería y Operaciones.
- `docs/02_BUSINESS_GLOSSARY.md`: define Housekeeping, DND, Turndown y Pickup Service.
- `docs/03_DOMAIN_MODEL.md`: el lifecycle de Housekeeping es `DIRTY -> CLEAN -> INSPECTED`; sus overlays no sustituyen ese lifecycle.
- `docs/04_DOMAIN_RULES.md`: una operación puede afectar Housekeeping en flujos de habitación, y exige idempotencia para integraciones; no define solicitudes de huésped.
- `docs/05_PROPERTY_SCOPE.md`: los datos operativos requieren property scope explícito cuando aplica.
- `docs/07_CROSS_APP_CONTRACTS.md`: `HousekeepingStatus` es un estado crítico cross-app; no enumera un estado de solicitud de servicios.
- `docs/08_SECURITY_PRIVACY.md`: autorización, minimización de datos, separación Guest/Staff y errores sin información sensible.
- `frontend/pms-hotel-android/docs/03_LAYERED_DATA_FLOW.md`, `07_MOCK_AND_DATA_POLICY.md` y `08_STATE_OFFLINE_POLICY.md`: Android usa `Remote/API -> DTO -> Mapper -> Domain -> State/ViewModel -> UI`; TanStack Query es la única fuente de server state y offline se simula con errores de transporte hasta una tarea de recovery real.
- `frontend/pms-hotel-android/docs/04_NAVIGATION.md` y `app/(guest)/services.tsx`: `/services` existe únicamente como handoff técnico sin catálogo, estado de solicitud, datos remotos ni comportamiento de `IMP-AND-0103`.
- `frontend/pms-hotel-android/src/modules/stay/domain/models/ReservationStay.ts`: único contrato Android relacionado confirmado; conserva la distinción `ReservationStay`/`Reservation` y `room` nullable.
- `backend/README.md` y `backend/docs/01_BACKEND_ARCHITECTURE_TODO.md`: no hay backend implementado ni arquitectura aprobada.
- `backend/docs/02_API_CONTRACT_POLICY.md`: Backend será la fuente del contrato confirmado y deberá documentar método, path, auth, permiso, scope, request, response, errores, idempotencia, audit y ejemplos.
- `backend/docs/03_AUTH_AND_SCOPE.md`, `05_IDEMPOTENCY_AND_AUDIT.md`, `06_SECURITY.md` y `07_TESTING_STRATEGY.md`: Backend debe validar sesión/scope, evitar efectos duplicados en retry, auditar cuando aplique, minimizar PII y probar contratos.
- `docs/Backlog_Implementacion_PMS_V1.xlsx`, fila `IMP-AND-0103`: solicita catálogo, detalle y solicitud para servicios de la estadía/property actual, con estados submitting/success/error/offline. Su DoR sigue siendo `Service contract ready`.

## CONFIRMADO

1. `IMP-AND-0103` necesita un contrato antes de implementarse; no está READY.
2. Android solo posee `ReservationStay` como contrato local relacionado. Sus campos confirmados son `id`, `reservationId`, `roomType`, `room` nullable, `arrival`, `departure` y `status` opaco. No existe un contrato Android de catálogo ni de solicitud de servicios.
3. `Reservation` y `ReservationStay` no son intercambiables. Cualquier futura solicitud deberá definir explícitamente con cuál se relaciona.
4. El backlog limita funcionalmente el alcance a servicios de la estadía y property actuales. No confirma cómo Backend identifica, autoriza o filtra ese contexto.
5. El lifecycle de Housekeeping y una posible solicitud de huésped son conceptos distintos. `DIRTY`, `CLEAN`, `INSPECTED`, DND, Turndown y Pickup Service no autorizan valores para un estado de solicitud.
6. Backend aún no tiene entidades, rutas, handlers, persistencia ni contract docs de servicios. Sus políticas establecen que Backend es la autoridad del contrato, valida autorización/property scope, y debe tratar retries/idempotencia/audit cuando corresponda.
7. UI Android no puede consumir DTOs ni hacer red directa. Los mocks futuros deben simular DTOs en la frontera remota.
8. Durante el estado actual de Foundation, offline se representa mediante `NetworkError`/transporte simulado; NetInfo no está aprobado para este alcance.

## PROPUESTO — temas que el contrato debe resolver

Los nombres y campos de esta sección son etiquetas de discusión, no definiciones definitivas.

### 1. Catálogo de servicios

Backend debería definir si existe un recurso de catálogo y qué representa una entrada. Para revisión:

| Tema | Propuesta de definición a revisar | Decisión requerida |
| --- | --- | --- |
| Identidad | Un identificador estable de servicio, opaco para UI. | Forma, estabilidad y origen del identificador. |
| Contenido | Nombre visible; descripción opcional; posibles imágenes o instrucciones. | Campos, idiomas, obligatoriedad y nulabilidad. |
| Clasificación | Posible categoría para agrupar servicios. | Si existe, sus valores y si es dominio o presentación. |
| Precio | Posible precio/currency o regla de “consultar”. | Si hay precio, fuente financiera, impuestos y cuándo se muestra. |
| Disponibilidad | Posible elegibilidad por property, estadía, horario, habitación o capacidad. | Modelo, timezone, causas de no disponibilidad y datos visibles. |
| Scope | Catálogo filtrado por property autorizada y estadía activa cuando aplique. | Si el scope se deduce de sesión, se envía o ambos. |

### 2. Detalle de un servicio

Backend debería decidir si el detalle es la misma representación del catálogo o un recurso distinto. La revisión debe definir qué información adicional puede retornar, qué partes son opcionales y si puede variar por property, fecha, habitación o estadía.

### 3. Creación de una solicitud

Se propone que el futuro contrato documente, sin asumir su forma:

- cómo se identifica el servicio elegido;
- cómo se vincula al contexto de estadía autorizado y qué identificador confirmado utiliza (`ReservationStay`, `Reservation` u otro mecanismo aprobado);
- qué property scope autoriza la operación;
- qué datos de huésped, instrucciones, horario o cantidad existen realmente;
- validación, idempotencia, audit y resultado de una creación exitosa;
- qué ocurrencia representa un retry con el mismo payload y qué ocurre ante el mismo idempotency key con payload diferente.

No se propone todavía endpoint, método HTTP, request body, campo obligatorio, ni una estrategia de reintento en cliente.

### 4. Consulta de solicitudes de la estadía

Se propone definir una consulta limitada a la estadía y property autorizadas. Debe decidirse si retorna solicitudes actuales, históricas, paginadas, filtradas o una combinación, y qué datos de solicitud son seguros y necesarios para Guest Android.

### 5. Estados de solicitud

El estado de solicitud requiere primero un contrato confirmado. Solo si el concepto termina siendo compartido por varias aplicaciones deberá incorporarse a los contratos cross-app correspondientes. Antes de declarar valores o transiciones deben aprobarse:

- nombre del concepto y su relación, si existe, con Housekeeping/Conserjería;
- valores permitidos, significado y transiciones;
- actor responsable de cada transición;
- visibilidad Guest versus Staff;
- timestamps, razones y cualquier estado terminal;
- si cancelación o modificación existen y bajo qué reglas.

Hasta esa aprobación, no reutilizar `HousekeepingStatus`, `StayStatus` ni la etiqueta visual `Pendiente` como enum de dominio.

### 6. Nulabilidad, errores y offline

El contrato debe enumerar para cada response/request:

- campos obligatorios, opcionales y nullable;
- representación de ausencia versus lista vacía;
- errores de autorización, scope, validación, disponibilidad, conflicto/idempotencia y error interno;
- errores seguros que Guest puede mostrar, sin PII, secretos ni stack traces;
- semántica de timeout/red y si una creación puede recuperarse mediante consulta posterior.

En Android, hasta que haya una tarea aprobada de conectividad/recovery, offline seguirá siendo un error de transporte simulado derivado por TanStack Query; no se propone cola offline, NetInfo, persistencia de requests ni éxito optimista.

## PROPUESTO — responsabilidades por capa

| Capa | Responsabilidad propuesta tras aprobación | No debe hacer |
| --- | --- | --- |
| Backend | Publicar el contrato confirmado; validar Guest session, scope y estadía; aplicar idempotencia/audit cuando corresponda. | Confiar en datos o permisos de UI. |
| DTO Android | Reflejar exactamente request/response confirmados, incluso naming externo y nulabilidad. | Convertirse en modelo de UI. |
| Mapper Android | Validar campos requeridos y convertir DTO a dominio sin defaults de negocio. | Inventar valores, estados o reglas. |
| Domain Android | Modelar únicamente conceptos/estados aprobados y mantener `Reservation != ReservationStay`. | Reutilizar estados de Housekeeping sin autorización. |
| Query/state Android | Usar TanStack Query para lecturas/mutaciones confirmadas y derivar RemoteState. | Crear un store paralelo. |
| UI Android | Mostrar modelos de dominio y estados derivados; presentar errores seguros. | Hacer `fetch`, recibir DTO o declarar éxito sin resultado confirmado. |
| Mocks Android | Simular DTOs y errores del contrato aprobado en la frontera remota. | Convertirse en contrato de Backend. |

## PENDIENTE DE DECISIÓN

1. Dominio responsable: ¿el catálogo es Conserjería, Housekeeping, ambos, u otro agregado?
2. Identidad y scope: ¿cómo se identifican property, servicio, estadía y solicitud? ¿Qué deriva de Guest session?
3. Catálogo: campos, idiomas, categorías, descripción, imágenes, precio, currency, impuestos y disponibilidad.
4. Detalle: si existe una representación adicional y qué campos muestra.
5. Solicitud: inputs, obligatoriedad, nulabilidad, fechas/horarios, cantidades, instrucciones y validaciones.
6. Relación: si una solicitud referencia `ReservationStay`, `Reservation`, Room o más de uno; cómo se maneja `room = null`.
7. Estados: nombre, valores, transiciones, actores, visibilidad, timestamps, razones y terminalidad.
8. Cancelación/modificación: si existen, quién puede realizarlas, hasta cuándo y cómo se auditan.
9. API: método, path, auth, permisos, responses, errores, paginación, filtros, idempotency key, correlation y audit.
10. Errores/offline: clasificación de errores recuperables y estrategia posterior de recovery/retry.
11. Seguridad: datos permitidos en notas/instrucciones, retención, PII y mensajes seguros para Guest.
12. Ownership/revisión: responsables designados de Backend, Android y, cuando corresponda, owner cross-app definido por el proyecto.

## FUERA DE ALCANCE

- Cambiar `IMP-AND-0103` a READY o declarar su DoR cumplido.
- Crear endpoints, DTOs productivos, modelos, mappers, enums, services, hooks, queries, mocks funcionales o tests de Servicios.
- Cambiar `app/(guest)/services.tsx` o convertir el handoff en catálogo/detalle/solicitud.
- Implementar catálogo, detalle, creación, cancelación, modificación, cola offline, NetInfo, reintentos, éxito optimista o pantallas de Servicios.
- Aprobar valores de estados, reglas de negocio, precio, impuestos, disponibilidad, permisos o nulabilidad.

## Gate propuesto para desbloquear IMP-AND-0103

`Service contract ready` solo podrá considerarse cumplido cuando una autoridad Backend publique y apruebe un contrato que documente los puntos de API exigidos por `backend/docs/02_API_CONTRACT_POLICY.md`, los estados/relaciones cross-app cuando correspondan y las decisiones de esta propuesta. Después deberán revisarlo los responsables designados de Backend, Android y, cuando corresponda, el owner cross-app definido por el proyecto; entonces podrá actualizarse el backlog y convertir la tarea a `READY` mediante el workflow oficial.

## Contradicciones detectadas

No se detectó una contradicción real entre backlog, Android, Backend y documentos globales. Se detectaron gaps explícitos: el backlog presupone un contrato listo para `IMP-AND-0103`, mientras Backend y Android documentan que ese contrato aún no existe. Esto es consistente con que el DoR permanezca bloqueado, no una autorización para inferirlo.
