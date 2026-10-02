# BD2-006 — Contrato aprobado de administración de propiedades

**Estado:** APROBADO por el usuario; implementación BD2-006B validada en QA BD2; CI global pendiente de BD3.
**Rama:** `feature/bd2-properties-crud`, desde `origin/main` `9552325`.
**Owner:** BD2. Revisión de seguridad/scope: BD1.

El usuario autorizó completar los CRUD pendientes de BD2 de forma incremental,
con pruebas y commit/push por entrega. Este documento concreta la primera
entrega antes de crear endpoints, conforme a AGENTS global y Backend.

## Base confirmada

- Property pertenece a Organization y ya tiene tabla, entidad y repositorio.
- C2 resuelve sesión Staff, permisos y membership desde PostgreSQL.
- `SUPER_ADMIN` tiene todas las propiedades activas de su organización.
- Los demás roles solo tienen propiedades activas de sus memberships.
- `ALL_PROPERTIES` exige `MULTI_PROPERTY_READ` y una lista autorizada explícita.
- La unicidad de código es por organización; no hay borrados en cascada.
- AuditTrail se conserva append-only; se puede reutilizar el servicio Audit
  existente sin modificar BD3, dentro de la misma transacción.

## Primera entrega aprobada: crear, consultar y editar datos descriptivos

| Ruta | Operación | Autorización aprobada |
| --- | --- | --- |
| `POST /api/v1/properties` | Crear propiedad activa | Staff `SUPER_ADMIN` con `STAFF_MANAGE`, en su organización actual |
| `GET /api/v1/properties` | Listar propiedades activas autorizadas | Staff con `MULTI_PROPERTY_READ`; scope `ALL_PROPERTIES` C2 |
| `GET /api/v1/properties/{propertyId}` | Consultar una propiedad autorizada | Staff activo y scope `PROPERTY` C2 |
| `PATCH /api/v1/properties/{propertyId}` | Editar nombre/código | Staff con `COMMERCIAL_MANAGE` y scope `PROPERTY` C2 |

Las rutas y este mapeo operativo de permisos fueron aprobados por el usuario.
No se añaden roles ni permisos al catálogo ni se amplía C2.
Crear una propiedad es una operación de la organización del administrador;
no se interpreta como una consulta global ni como scope sobre un ID inexistente.
El `organizationId` se deriva de la membership vigente en Backend, no del body.
Los usuarios Guest no acceden a estas rutas.

### Creación

Body:

```json
{
  "code": "HB-GT-002",
  "name": "Hotel Boutique Norte",
  "timezone": "America/Guatemala",
  "currency": "GTQ"
}
```

UUID y timestamps se generan en Backend. La nueva Property comienza en ACTIVE
en este contrato. Zona IANA y moneda ISO se validan; código/nombre conservan
las validaciones de longitud y texto actuales. No se crea una Organization,
membership, usuario Staff ni catálogo en esta operación. `SUPER_ADMIN` obtiene
la nueva propiedad activa mediante la resolución C2 existente.

Responder 201 con DTO y `Location`. La restricción única existente rechaza
código duplicado en la organización con 409, sin crear otra propiedad ni otro
evento de auditoría. No se declara implementado un protocolo genérico de
Idempotency-Key ni replay de respuestas en esta entrega.

### Consulta y edición

DTO: `id`, `organizationId`, `code`, `name`, `timezone`, `currency`,
`status`, `createdAt`, `updatedAt`. Los timestamps usan ISO-8601 UTC.
Lista: array de DTOs de las propiedades del scope autorizado, aplicado en SQL.

PATCH admite `code` y/o `name`; rechaza body vacío, valores inválidos y campos
no editables. Responder 200. No cambia organización, timezone, moneda ni estado
en esta primera entrega. Repetir un PATCH sin cambios efectivos no modifica
timestamps ni añade otro evento. Una fila bloqueada en la transacción evita
que dos ediciones pierdan el snapshot correcto del historial.

El servicio resuelve sesión/permiso/scope antes de consultar. El repositorio
limita por `organizationId` e IDs autorizados; no usa `findAll()` ni filtra
después. Cada escritura efectiva registra actor Staff real, propertyId,
correlationId y snapshots before/after, en la misma transacción que Property.
Si la auditoría falla, la modificación también se revierte.

Errores: 400 validación; 401 JWT/sesión inválidos; 403 permiso/scope
insuficientes; 404 si no existe dentro de un scope permitido; 409 código
duplicado. No se filtran SQL, secretos ni datos de una organización ajena.

## Operaciones que requieren otra definición antes de implementarse

- **Baja/reactivación:** C2 solo autoriza properties activas. Reactivar una
  inactiva necesita un contrato administrativo explícito; no puede resolverse
  quitando la comprobación de scope. No se inventa un DELETE físico ni se
  afirma que la primera entrega completa la parte D del CRUD.
- **Cambio de timezone/moneda:** necesita definir el efecto sobre estancias,
  tarifas y snapshots existentes. En este contrato son datos fijados al crear.
- **Rooms:** OOO/OOS no borran habitaciones. Retirar inventario o cambiar su
  tipo necesita coordinar capacidad y referencias históricas con la admisión.
- **Tarifas:** el CRUD base usa MonetaryAmount/centavos y moneda explícita;
  precios diarios, restricciones, impuestos y canales requieren contratos propios.

## Aceptación y DoD de la implementación

- Crear propiedad solo dentro de la organización actual autorizada.
- Rechazar Guest, sesión revocada, rol/permiso insuficiente y propiedad ajena
  antes de acceder a datos operativos.
- Listar exclusivamente IDs del scope C2; no exponer propiedades inactivas.
- Validar datos y unicidad; preservar IDs, timezone, moneda e historial.
- Registrar actor/snapshots y rollback conjunto con auditoría.
- Probar 201/200/400/401/403/409 mediante HTTP real y PostgreSQL.
- Ejecutar verify completo con Java 21/PostgreSQL 17 y conservar visibles los
  problemas de fixtures BD3 que todavía existan, sin deshabilitar tests.
- Publicar OpenAPI y extender la colección Postman según el contrato aprobado.
- Actualizar AlanPlan/AlanHandoff, revisar diff y hacer commit/push de la entrega.

## Secuencia BD2 restante

1. Implementar la primera entrega de Properties.
2. Definir/implementar RoomTypes con scope, unicidad y auditoría.
3. Definir/implementar Rooms preservando referencias y control de capacidad.
4. Definir/implementar RatePlans base con dinero exacto y sin stock propio.
5. Cerrar las políticas de baja/reactivación y las operaciones de capacidad.
6. Revalidar integración de admisión cuando BD3 conecte su booking y ajuste fixtures.

Cada entrega tendrá su propia rama y evidencia. Este contrato cubre C/R/U
descriptivo de Properties; el resto de CRUD y políticas señaladas sigue pendiente.
