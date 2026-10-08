# BD2-008 — Administración de Rooms

Estado: implementación autorizada por el usuario al solicitar terminar los CRUD
pendientes BD2. Rama `feature/bd2-rooms-crud`, dependiente de RoomTypes `1c0ed07`.
Owner BD2; reutiliza esquema, C2, admisión y auditoría existentes.

## Contrato publicado antes de implementar

Fuentes: dominio/reglas/scope globales, contratos C2 y fundación/admisión BD2.
Room es unidad física, distinta de ATS; OOO/OOS no elimina Room. No se cambian
booking, folios, estados OOO/OOS, migraciones ni fixtures BD3.

| Ruta | Operación | Permiso |
| --- | --- | --- |
| POST /api/v1/properties/{propertyId}/rooms | Crear unidad física | Staff COMMERCIAL_MANAGE y C2 PROPERTY |
| GET /api/v1/properties/{propertyId}/rooms | Listar unidades | Staff activo y C2 PROPERTY |
| GET /api/v1/properties/{propertyId}/rooms/{roomId} | Consultar unidad | Staff activo y C2 PROPERTY |
| PATCH /api/v1/properties/{propertyId}/rooms/{roomId} | Editar código | Staff COMMERCIAL_MANAGE y C2 PROPERTY |

POST: `{ "roomTypeId": "UUID", "code": "101" }`. Tipo existente en la propiedad
autorizada; se bloquea su fila para coordinar con admisión. Solo se inserta una
Room: capacidad física +1; no se reserva, vende ni cambia bloqueos existentes.
Unicidad por propiedad `uq_rooms_property_code`. UUID/fechas generados por servidor.

PATCH admite exclusivamente `code` no blanco, máximo 64, no null. No se mueve
Room entre tipos/propiedades ni se cambia su identidad. DTO: id, propertyId,
roomTypeId, code, createdAt, updatedAt. UTC ISO-8601, microsegundos. Lista array
ordenado por ID. POST 201 y Location; GET/PATCH 200. PATCH toma bloqueo scoped de
Room; no-op conserva fechas y no genera auditoría.

Scope vigente antes de SQL, organización e IDs autorizados en la consulta; IDs
del path vinculados a la propiedad. 400 cuerpo/UUID inválido o desconocido;
401 sesión inválida/revocada o Guest; 403 permiso/scope denegado; 404 propiedad,
tipo o Room ausente en el scope; 409 código ocupado. No exponer SQL.

Auditoría existente en la misma transacción: ROOM_CREATED/ROOM_UPDATED, entityType
ROOM, actor Staff real, property/correlation y before/after. Fallo audit revierte
inserción/edición. Duplicado 409 no crea capacidad/evento adicional; no se declara
Idempotency-Key genérico. No inventar roles/permisos nuevos.

## Aceptación, DoD y límites

Probar alta/read/list/patch, capacidad +1 con motor ATS real; no-op/referencias,
validación, permisos, scope cruzado y duplicados; rollback audit y locks con
PostgreSQL; HTTP/Swagger y colección Postman. Ejecutar verify completo sin ocultar
los errores ajenos y revisar diff antes de commit/push.

No DELETE, status, baja ni reclasificación: requieren política de retención,
referencias de stays/OOO y disponibilidad. No eliminar unidades físicas para
representar OOO/OOS. Se entrega C/R/U; la parte D no se declara completada.
