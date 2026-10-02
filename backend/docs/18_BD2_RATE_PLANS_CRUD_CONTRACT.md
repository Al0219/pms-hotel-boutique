# BD2-009 — Administración de RatePlans

Estado: implementación autorizada por la instrucción del usuario de terminar
los CRUD BD2. Owner BD2. Rama `feature/bd2-rate-plans-crud`, base Rooms `4cea3db`.
Contrato publicado antes de crear API; fuentes: dominio/reglas/scope, C2,
fundación monetaria BD2 y esquema rate_plans existente.

| Ruta | Operación | Permiso |
| --- | --- | --- |
| POST /api/v1/properties/{propertyId}/rate-plans | Crear tarifa | Staff COMMERCIAL_MANAGE y C2 PROPERTY |
| GET /api/v1/properties/{propertyId}/rate-plans | Listar tarifas | Staff activo y C2 PROPERTY |
| GET /api/v1/properties/{propertyId}/rate-plans/{ratePlanId} | Leer tarifa | Staff activo y C2 PROPERTY |
| PATCH /api/v1/properties/{propertyId}/rate-plans/{ratePlanId} | Editar catálogo | Staff COMMERCIAL_MANAGE y C2 PROPERTY |

POST: `{ "roomTypeId": "UUID", "code": "BAR", "name": "Flexible",
"basePrice": { "amount": "125.50", "currency": "GTQ" } }`.
Tipo existente en la propiedad del path. Unicidad property/type/code por
`uq_rate_plans_property_type_code`; nombres pueden repetirse.

Dinero como texto decimal sin exponentes (máximo 64 caracteres) y moneda ISO de
3 caracteres; no doubles. Se convierte con MonetaryAmount existente a BIGINT
en unidades menores, sin redondeo. Rechazar negativos, exceso de precisión,
overflow, moneda inválida/sin unidades menores, null y campos desconocidos.
La moneda es explícita en el RatePlan existente; no se inventa obligación de
igualarla a Property ni conversión de divisas. Cero es válido.

PATCH admite code (64), name (160) y/o basePrice completo; al menos uno, no null.
Omisiones conservan valores. IDs/property/roomType inmutables. Bloqueo de fila
scoped; no-op conserva fechas y no añade evento. No cambia reservas, folios ni
snapshots financieros existentes: solo la tarifa del catálogo para futuros usos.

DTO: id, propertyId, roomTypeId, code, name, basePrice {amount texto exacto,
currency ISO}, createdAt, updatedAt (UTC microsegundos). POST 201 y Location,
GET/PATCH 200; listas por ID. 400 validación; 401 JWT/sesión inválida o Guest;
403 permiso/scope; 404 recurso ausente en propiedad autorizada; 409 código
ocupado en ese property/type. Sin SQL en respuestas ni consultas globales.

Resolver sesión/permisos/scope antes de SQL; filtrar organización y propertyId.
Auditoría transaccional RATE_PLAN_CREATED/RATE_PLAN_UPDATED con entityType
RATE_PLAN, actor Staff, property/correlation y before/after. Fallo audit revierte
alta/edición. Duplicados no agregan filas/eventos; no se declara Idempotency-Key.

## Aceptación/DoD y límites

PostgreSQL: dinero exacto/reload, ISO con distinta precisión, overflow/negativos,
scope/roles/IDs cruzados, unicidad por tipo, edición/no-op/rollback, auditoría y
HTTP/Swagger/Postman. Motor ATS real debe quedar intacto al crear/editar tarifas:
RatePlan no posee inventario. Ejecutar verify completo sin excluir BD3; revisar
diff y publicar commit/push. No añadir migraciones, estados ni reglas comerciales
nuevas (restricciones por noche, impuestos, promociones).

No DELETE/baja: las referencias históricas requieren política de retención aún
no definida. C/R/U completado no equivale a cerrar D. Admisión/fixtures BD3
permanecen bajo su responsabilidad.
