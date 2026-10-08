# BD2-007 — Propuesta de administración de RoomTypes

**Estado:** APROBADO para implementación por la instrucción del usuario de terminar los CRUD BD2.
**Rama/base:** `feature/bd2-room-types-crud`, `origin/main` `c2699ff`.
**Owner:** BD2. Reviewer de seguridad/scope: BD1.

## Problema y fuentes

BD2 tiene tabla, entidad y repositorio de RoomType, pero todavía no expone
altas/consultas/ediciones al cliente. Recepción y comercial necesitan identificar
los tipos vendibles sin cargar fixtures SQL. El usuario autorizó continuar los
CRUD pendientes por entregas con commit/push.

Fuentes: `docs/03_DOMAIN_MODEL.md`, `docs/04_DOMAIN_RULES.md`,
`docs/05_PROPERTY_SCOPE.md`, contrato C2, contrato de fundación BD2 11 y
`002ServiceManagement/002-core-inventory.yaml`. Según `docs/10_CHANGE_CONTROL.md`,
las rutas nuevas se publican como propuesta antes de declararlas API confirmada.

## Reglas existentes

- RoomType es el tipo vendible; Room es la unidad física.
- RoomType pertenece a una Property; ID y propertyId son estables.
- Campos existentes: código (64), nombre (160), UUID y timestamps UTC.
- Código único por propiedad: `uq_room_types_property_code`.
- Rooms, RatePlans y ReservationStay referencian el RoomType existente.
- Crear un tipo sin Rooms deja inventario físico y ATS en cero.
- El schema actual no tiene status de RoomType ni cascadas de borrado.
- C2 limita Staff a propiedades activas de su membership/organización.

## Primera entrega propuesta: C/R/U descriptivo

| Ruta propuesta | Operación | Autorización propuesta |
| --- | --- | --- |
| `POST /api/v1/properties/{propertyId}/room-types` | Crear tipo | Staff con `COMMERCIAL_MANAGE` y scope `PROPERTY` C2 |
| `GET /api/v1/properties/{propertyId}/room-types` | Listar tipos de una propiedad | Staff activo y scope `PROPERTY` C2 |
| `GET /api/v1/properties/{propertyId}/room-types/{roomTypeId}` | Consultar tipo | Staff activo y scope `PROPERTY` C2 |
| `PATCH /api/v1/properties/{propertyId}/room-types/{roomTypeId}` | Editar código/nombre | Staff con `COMMERCIAL_MANAGE` y scope `PROPERTY` C2 |

Se reutiliza el catálogo C2, sin crear roles/permisos. El permiso comercial
propuesto permite administrar tipos a los roles que ya lo poseen dentro de
su scope; no se propone limitar esta operación de propiedad a SUPER_ADMIN.
Las consultas sirven también a Recepción/Operaciones/Auditor con propiedad
autorizada. Guest no accede a estas rutas Staff. No se publica una consulta
global ni se deduce ALL_PROPERTIES al omitir propertyId.

### Body de alta y DTO

```json
{
  "code": "DLX-KING",
  "name": "Deluxe King"
}
```

El servidor genera UUID y timestamps. propertyId viene exclusivamente del path;
organizationId se obtiene del contexto C2 para validar la Property antes del
INSERT. Rechazar campos desconocidos, null, texto blanco y longitudes inválidas.
No normalizar códigos ni inventar capacidades, camas, estado o amenidades.

DTO propuesto: `id`, `propertyId`, `code`, `name`, `createdAt`, `updatedAt`.
Fechas ISO-8601 UTC con precisión compatible con PostgreSQL (microsegundos).
POST responde 201 con DTO y Location de la ruta anidada. Lista: array de DTOs
ordenados por ID; una Property autorizada sin tipos responde 200 con `[]`.

### PATCH

Admite code y/o name, al menos uno. Campos omitidos conservan su valor; null,
blanco y campos no editables se rechazan. No permite mover el tipo a otra
propiedad, cambiar IDs ni modificar Rooms/RatePlans/ReservationStay.

Responder 200 con DTO. Cambios efectivos toman un bloqueo de fila scoped y
registran before/after reales en la misma transacción. Repetir el mismo PATCH
no modifica timestamps ni añade otro evento. El bloqueo coordina las ediciones
con los locks de RoomType que ya usa admisión, sin cambiar capacidad ni ATS.

### Scope, errores y auditoría

Resolver sesión vigente y permisos desde BD y PROPERTY scope antes de consultas
operativas. Aplicar en SQL organización, IDs autorizados y propertyId explícito;
el ID del tipo debe pertenecer a la propiedad del path incluso si el Staff tiene
permiso sobre otras propiedades. No usar findAll/findById globales y filtrar.

Errores propuestos: 400 validación; 401 JWT/sesión inválidos o Guest; 403 permiso
o propiedad no autorizada; 404 Property/tipo inexistente dentro del scope válido,
incluido un tipo de otra propiedad; 409 código ocupado en esa propiedad.
No devolver SQL ni revelar datos de otra propiedad.

La unicidad rechaza un POST duplicado con 409, sin otro tipo/evento; el mismo
código puede existir en propiedades diferentes. No se declara protocolo genérico
Idempotency-Key ni replay. AuditService existente registra `ROOM_TYPE_CREATED`
y `ROOM_TYPE_UPDATED`, entityType `ROOM_TYPE`, actor STAFF real, propertyId,
correlationId y snapshots before/after. Fallo de auditoría revierte la escritura.
No modificar el servicio ni fixtures de BD3.

## Alternativas y límites

- Alta/edición descriptiva sobre el schema existente: incremento propuesto.
- Esperar al CRUD de Rooms: innecesario para publicar el catálogo; un tipo vacío
  es válido y no añade inventario disponible.
- DELETE o baja lógica: requieren política de retención/referencias y estado.
  No se añaden status ni migraciones para inventar esa política. Esta entrega
  no cierra la parte D del CRUD.
- Capacidad, amenities, reglas comerciales y cambio de clasificación de Rooms:
  contratos posteriores; no se deducen de los mocks del Frontend.
- Integración BD3: booking/admisión y sus dos fixtures de CI siguen pendientes
  en su ownership. El CRUD descriptivo de tipos puede avanzar independientemente.

## Archivos previstos y aceptación/DoD

- RoomType: método de edición descriptiva que preserve identidad/propiedad.
- RoomTypeRepository: consultas por property y scope, con bloqueo de edición.
- Servicio/view/guard, controlador/DTO/advice, OpenAPI y adaptación de la cadena
  Staff limitada a estas rutas publicadas; reutilizar C2/AuditService.
- Crear/leer/listar/editar con PostgreSQL y HTTP; permisos negativos, Guest,
  sesión revocada, propiedades/tipos cruzados, unicidad por propiedad y validación.
- Verificar timestamps entre requests, PATCH no-op, historial before/after y
  rollback real ante fallo de auditoría. Verificar que no cree Rooms ni cambie
  ATS; RoomType sin Rooms responde ATS=0 mediante el motor real.
- Comprobar que renombrar no cambia referencias de Rooms/RatePlans/stays,
  conteo físico, OOO/OOS ni disponibilidad.
- Ejecutar verify completo con Java 21/PostgreSQL 17, conservando visibles los
  errores BD3 que continúen; no deshabilitar/excluir tests del workflow.
- Colección Postman, guía, tracking AlanPlan/AlanHandoff, revisión de diff y
  commit/push por entrega. QA documental no equivale a validar una API existente.

## Continuación autorizada

El usuario autorizó implementar estas cuatro rutas, permisos C2 existentes y
alcance C/R/U descriptivo. Rooms y RatePlans se entregan por separado con sus
contratos. La baja sigue pendiente de política de dominio; no se inventa DELETE.
