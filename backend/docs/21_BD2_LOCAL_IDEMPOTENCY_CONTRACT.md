# BD2-FP-001 — SH-D01: idempotencia local

**Estado:** APPROVED para base local por el usuario en conversación, 2026-10-02.
**Owner:** José / BD2. **Rama:** feature/bd2-financial-foundation.

Esta aprobación sustituye la parte local pendiente de SH-D01 en documentos
19/20. No aprueba APIs, proveedores, estados Payment ni políticas de lifecycle.
No crea un nuevo módulo: se reutiliza Reservations/Folio y su prefijo Liquibase.

## Contrato interno

LocalOperationService ejecuta un callback de persistencia local y devuelve un
recibo inmutable: operationId, propertyId, staffUserId, operationName, resultId
y completedAt UTC. resultId referencia el resultado local (por ejemplo, un
movimiento append-only); el recibo es el resultado de este puerto, no una
respuesta HTTP ni una proyección del estado mutable actual del recurso.

El llamante define en código OperationDefinition (nombre y permiso existente),
no desde datos del cliente. Se aceptan FOLIO_PAYMENT_OPERATE,
PAYMENT_REFUND_VOID y RESERVATION_MANAGE, sin nuevas facultades. Una operación
de devolución/anulación futura debe usar PAYMENT_REFUND_VOID. Los nombres
internos son identificadores de 2–64 caracteres A–Z/0–9/underscore; no definen
estados o rutas de negocio. Se valida Staff con los servicios BD1 y se resuelve
PROPERTY antes de acceder al registro; el callback recibe actor/scope derivados
de esa sesión y un operationId estable, nunca un actor del request.

La clave es opaca, de 8–128 caracteres Unicode válidos, no vacía y sin controles;
no se normaliza ni se escribe en audit/logs. Su unicidad es Staff + property +
operación + clave, independiente de sessionId. Cambiar de sesión válida del
mismo Staff conserva el resultado. La clave no acredita autorización.

LocalOperationRequest contiene versión positiva y mapa inmutable de campos
ya validados/canonicalizados por el dominio: UUID canónico, moneda ISO y dinero
en unidades menores, sin redondeo. Se preservan valores y se ordenan nombres;
SHA-256 con longitudes explícitas evita ambigüedades de concatenación. El hash
incluye versión, operación y permiso. No se persiste el payload, secretos,
PAN/CVV ni tokens. Las capas futuras no deben incluir esos datos en el mapa.

## Persistencia y transacción

La tabla local_operation_receipts almacena recibo, clave, hash, versión y permiso.
Tiene unicidad por contexto y trigger append-only; no existe caducidad automática.
Solo se inserta al completar el callback. Fallar el callback, audit, commit o
transacción exterior revierte efecto y recibo; una ejecución fallida puede volver
a intentar la clave porque no existe un éxito confirmado.

Un advisory lock transaccional PostgreSQL serializa el mismo contexto entre
conexiones/JVMs. Tras esperar el commit, READ_COMMITTED ve el recibo original.
Colisiones del hash del lock solo añaden espera: el lookup/constraint usan el
contexto completo, nunca ese hash como identidad. El lock dura hasta finalizar
la transacción exterior. Se rechazan contextos read-only o de otro aislamiento.

Mismo hash devuelve el recibo original sin ejecutar callback ni audit nuevo;
hash diferente lanza LocalOperationConflictException. No se asigna aquí HTTP 409:
su mapeo pertenece al contrato de la futura API. AuditService registra un evento
LOCAL_OPERATION_COMPLETED con actor/property, operationId/correlation y resultId
en la misma transacción. El efecto específico conserva su auditoría existente.

El callback es código de servidor y debe usar el mismo datasource/transaction
manager, restringir todos sus recursos al scope recibido y validar sus reglas.
No debe iniciar REQUIRES_NEW, llamar proveedores ni ejecutar efectos fuera de
la transacción. Este puerto no convierte automáticamente escrituras antiguas en
idempotentes y no sustituye admisión de inventario ni locks de folio/Room.

## Aceptación

PostgreSQL real: duplicados secuenciales/concurrentes y espera hasta commit;
conflicto por payload/versión/permiso; scopes/actores/operaciones independientes;
sesión revocada/membership/permiso/property inválidos; rollback interno/exterior,
fallo de audit y recuperación tras rollback; dinero exacto y recibo estable.
Pruebas de canonicalización; migración de base previa, reaplicación sin cambios,
constraints/append-only. Verify completo sin exclusiones.

La nueva migración también hace crecer el master. ReservationsSchemaUpgradeTests
compara con la instalación vigente, conservando comprobaciones de tablas,
triggers, seed y reaplicación, en lugar de asumir siempre 17 changesets.

Validación local: `./mvnw -B verify`, Java 21/PostgreSQL 17, BUILD SUCCESS;
281 tests, 0 failures/errors/skipped, incluidos 22 nuevos. Revisión de PR y
checks GitHub pendientes; seguimiento en AlanPlan/AlanHandoff, estado EN_QA.

## Pendiente para fases siguientes

SH-D01 de efectos externos sigue pendiente con BD1: estados inciertos,
reconciliación, outbox/worker, proveedor y callbacks. FP-D02, FP-D04 y contratos
de escritura no quedan aprobados por implementar esta infraestructura local.
