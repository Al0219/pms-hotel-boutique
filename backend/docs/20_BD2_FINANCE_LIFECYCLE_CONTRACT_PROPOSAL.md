# Propuesta BD2 — Folio/Payments y lifecycle de reservas

**Estado:** PROPOSED; requiere revisión/aprobación por entrega antes de código.
**Fecha/base:** 2026-10-02, main `9eb2380`. **Owner:** José / BD2.
**Reviewers propuestos:** BD1 (Auth/permisos/integraciones), BD3 (efectos de
reservas/operación/comercial), WEB-4 (finanzas), WEB-3 (lifecycle), WEB-1
(garantía pública) y ANDROID-1 cuando consuma la API correspondiente.

Este documento concreta el [análisis de fase 0](19_BD2_FINANCE_LIFECYCLE_PHASE0.md).
El nuevo reparto y las reglas globales están autorizados. Las rutas, DTOs,
límites y estrategias marcados como propuesta no son contratos CONFIRMED.
No crea endpoints implementados, estados de pago ni nuevas facultades Staff.

## Invariantes vigentes

- GuestAccount representa autenticación; GuestProfile representa identidad.
  El folio es la cuenta financiera. Una reserva pública puntual no crea una
  cuenta Guest automáticamente.
- Reservation agrupa N ReservationStay; ocupantes y consumo son por stay.
- Físico != ATS. RatePlan no posee inventario. Overbooking=0; OOO resta, OOS no.
- Movimientos financieros y auditoría sensible son append-only/compensatory.
  Revertir un importe implica un movimiento nuevo vinculado al original.
- Dinero exacto BIGINT/unidades menores + moneda; transporte monetario decimal
  como texto. Reutilizar MonetaryAmount; rechazar redondeo implícito y overflow.
- Instantes UTC/ISO-8601; noches LocalDate `[arrival, departure)` en timezone
  de propiedad. Business date no se obtiene de la fecha UTC del servidor.
- No PAN/CVV, secretos o tokens en DTO de respuesta, logs ni auditoría.
- Reintentar la misma operación no duplica entidad, evento financiero o efecto.
- En operaciones Staff, actor y property autorizada se derivan de sesión/scope, no de un actorId
  suministrado por el cliente. Reason/correlation no sustituyen esa identidad.

## Estados existentes frente a futuros

| Concepto | Estado observado en main | Tratamiento |
| --- | --- | --- |
| Reservation | PENDING, CONFIRMED, CANCELLED | Conservar; cancelación total no equivale a cancelar automáticamente cada stay |
| ReservationStay | RESERVED, IN_HOUSE, CHECKED_OUT, CANCELLED, NO_SHOW | Conservar; los dos primeros consumen ATS si padre no cancelado |
| Folio | OPEN, SETTLED, CLOSED | Conservar transiciones actuales; política de saldo/cierre pendiente FP-D04 |
| Movimiento de folio | CHARGE, PAYMENT, ADJUSTMENT | Conservar; PAYMENT contable no acredita ejecución de proveedor |
| Payment / garantía / waitlist / invoice | No existe enum Backend implementado | Definir matriz de transición al aprobar su contrato; no copiar enums de mocks |

Un pago puede tener múltiples operaciones parciales. Un único status mutable
no sustituye el historial de authorize/capture/void/refund ni sus referencias.

## Propuesta inicial FP-D02: lectura Staff de folios

Primera superficie HTTP propuesta; no publica escrituras ni acceso Guest.
Resolver sesión Staff, permiso y PROPERTY(propertyId) antes de acceder a datos.
Permiso propuesto para estas tres rutas: `FOLIO_PAYMENT_OPERATE`, ya existente.
`AUDIT_READ` no se convierte automáticamente en permiso de lectura financiera;
BD1 debe confirmar si el producto requiere acceso adicional para AUDITOR.

| Método / ruta propuesta | Request | Respuesta | Idempotencia / audit |
| --- | --- | --- | --- |
| GET `/api/v1/properties/{propertyId}/folios` | UUID property; filtros opcionales reservationId, groupId, status; limit/cursor | 200 `{items: FolioSummary[], nextCursor: string|null}` | Lectura sin Idempotency-Key ni evento de mutación |
| GET `/api/v1/properties/{propertyId}/folios/{folioId}` | UUID property/folio | 200 FolioDetail con saldo calculado | Lectura sin side effects |
| GET `/api/v1/properties/{propertyId}/folios/{folioId}/movements` | UUID property/folio; limit/cursor | 200 `{items: Movement[], nextCursor: string|null}` | Lectura sin side effects |

Auth: Bearer JWT interno Staff. Guest, sesión revocada y membership inactiva
no habilitan estas rutas. ALL_PROPERTIES queda fuera de esta primera propuesta;
su futura lectura agregada necesitará MULTI_PROPERTY_READ y IDs autorizados en SQL.

Propuesta de paginación: limit por defecto 50, entre 1 y 100; orden ascendente
estable `(createdAt, id)` y cursor opaco con validación de formato/filtros.
Ninguna consulta global seguida de filtro en memoria. Listado y detalle deben
incluir propertyId explícito y emplear el mismo scope en movimientos/saldo.
Los filtros no deben permitir resolver recursos ajenos por su ID.

DTOs propuestos (no entidades JPA):

- FolioSummary: id, propertyId, type, status, reservationId, stayId, groupId,
  currency, holderLabel, createdAt, updatedAt.
- FolioDetail: los campos anteriores y balance `{amount: string, currency: string}`.
- Movement: id, folioId, propertyId, kind, amount `{amount: string, currency: string}`,
  description, reversesId, createdBy, createdAt. Actor/referencias limitados a
  los campos necesarios; no añadir PII Guest ni referencia secreta del proveedor.
- El balance es la suma firmada: CHARGE aumenta deuda, PAYMENT la disminuye,
  ADJUSTMENT compensa. No convertir todos los movimientos a importes positivos.

Ejemplo parcial, solo para ilustrar el transporte monetario propuesto:

```json
{"balance":{"amount":"125.50","currency":"GTQ"}}
```

Errores propuestos como `application/problem+json`, conforme al uso existente
de Spring ProblemDetail. No exponer mensajes internos ni existencia de otra property.

| HTTP | Condición |
| --- | --- |
| 400 | UUID/filtro/cursor inválido, limit fuera del rango o estado no reconocido |
| 401 | Falta token, JWT Guest/incorrecto/expirado o sesión revocada |
| 403 | Sesión Staff válida sin permiso o sin acceso a la property solicitada |
| 404 | Folio inexistente dentro de la property autorizada; mismo resultado para ID de otra property |
| 200 | Lista vacía válida o lectura autorizada; saldo cero no es error |

Reutilización prevista: extender ReservationQueryService y repositorios para
detalle scoped/paginación; reutilizar FolioService y sus DTO/mappers donde
corresponda. No conectar HTTP al getFolio que carga por findById antes de validar
scope. Saldo y detalle deben usar lectura coherente frente a postings concurrentes.

Aceptación: pruebas HTTP Staff/Guest/revocación/permiso, SQL con IDs de propiedad,
lista vacía, filtros, orden/cursor sin duplicados para empates, moneda/importe
exactos, timestamp UTC, ausencia de escrituras y OpenAPI. Verify completo obligatorio
en la implementación. No generar Swagger de estas rutas mientras sigan propuestas.

## Propuesta SH-D01: idempotencia de escritura

La regla confirmada es misma clave + mismo payload -> resultado original;
misma clave + payload distinto -> conflicto. La solución persistente siguiente
requiere acuerdo BD1/BD2 antes de fase 1:

1. Exigir Idempotency-Key en las operaciones financieras/lifecycle que el contrato
   identifique como reintentables. Delimitar unicidad por contexto de actor,
   property, tipo de operación y clave; no por sessionId transitorio.
2. Canonicalizar payload validado con versión, IDs, moneda y unidades menores.
   Hash de request sin persistir PAN/CVV ni tokens de garantía. Confirmar cómo
   representar referencias tokenizadas sin almacenar datos secretos.
3. Resolver autorización vigente antes de consultar una respuesta deduplicada.
   La clave no concede acceso y el resultado original no elude revocación/scope.
4. Reservar la operación con constraint/lock transaccional; dos procesos/JVM
   concurrentes comparten el mismo resultado. Payload distinto -> 409 propuesto.
5. Mismo payload en curso o resultado incierto no inicia otro efecto externo:
   response/código, consulta de estado y TTL/retención se fijan con BD1.
6. Guardar operationId/correlationId y vínculo a movimientos/resultados; usar
   la misma identidad estable en la deduplicación del proveedor cuando la soporte.

Campos conceptuales: identidad de operación, alcance, clave/hash, versión,
resultado/referencias y tiempos. Estados, nombre de tabla, límites de clave,
caducidad y estrategia de recuperación aún no son contrato aprobado.

DB y proveedor no comparten una transacción. Propuesta: persistir intención,
ejecutar llamada fuera de locks de inventario/folio, y confirmar resultado +
movimiento + auditoría en una transacción local idempotente. Si hay crash entre
pasos, consultar/reconciliar la operación original; un timeout no demuestra rechazo.
Outbox/worker y límites de recuperación se acuerdan con BD1 sin introducir una
dependencia estructural o una integración duplicada en esta fase.

Pruebas requeridas: duplicado secuencial/concurrente, payload conflictivo, mismo
key en otro alcance, sesión revocada, crash tras aceptación externa, webhook
duplicado/fuera de orden y éxito externo con fallo de commit local.

## Contratos semánticos pendientes por flujo

Esta matriz fija requisitos de dominio y campos a acordar; no asigna rutas,
códigos de estado ni permisos nuevos a flujos aún no aprobados.

| Flujo | Entrada conceptual / resultado | Consistencia y aceptación requerida |
| --- | --- | --- |
| Abrir/operar folio | Property, vínculo reservation/stay/group permitido, moneda, motivo; folio/movimiento | Referencias scoped, actor autenticado, no doble posting/reverso; FP-D04 antes de settle/close/reopen |
| Listar/detallar pagos | Scope/filtros/paginación; operaciones y totales reconciliados | Solo datos autorizados; referencias públicas seguras, nada de secretos |
| Garantía pública | Acceso limitado al booking, token provider y operación estable; evidencia de garantía | No exigir Staff ni crear GuestAccount; contrato de capacidad/acceso pendiente; nunca aceptar PAN/CVV |
| Authorize/capture | Payment/operación, importe/moneda y referencia de origen; resultado confirmado o recuperable | Conservar cadena de referencias; capture dentro del autorizado disponible según proveedor |
| Void/refund | Operación origen, importe si parcial y motivo; resultado/compensación | PAYMENT_REFUND_VOID existente para Staff; acumulado devuelto/reservado concurrentemente no excede capturado disponible; elegibilidad void según proveedor |
| Split/routing/transfer | Movimiento/reglas/destinos scoped e importes; movimientos vinculados | Suma exacta, política de redondeo, folios/moneda compatibles, locks en orden estable; no UPDATE de monto original |
| Invoice | Folio/fuente financiera y datos de emisor/receptor aprobados; documento emitido | Snapshot trazable, emisión una vez y corrección posterior según política FP-D06; no prometer validez fiscal sin contrato |
| Cancelación | Reservation o Stay, motivo y política/version; estado/finanzas/inventario | Policy -> penalty/refund -> status -> release -> audit; definir resultado externo incierto sin fingir rollback del proveedor |
| No-show | Stay/política/cutoff local; cargo permitido, NO_SHOW y release | Policy/cutoff -> allowed charge -> NO_SHOW -> release -> folio/payment -> night audit; no inventar cutoff |
| Waitlist/conversión | Solicitud aprobada y cotización vigente; booking y vínculo de conversión | Espera no consume ATS; revalidar tarifa y demanda conjunta, crear una vez, marcar convertida en operación local coherente |
| Room move | Stay, Room destino, fecha efectiva y motivo; misma stay/folio | Validar libertad/OOO/HK/compatibilidad; evitar doble asignación y cargos; HK origen/destino + audit con BD3 |
| Extensión | Stay, nueva departure y tarifa/garantía aprobadas; stay/folio actualizados | Lock/releer stay, demanda delta `[oldDeparture,newDeparture)`, validar Room física si asignada; persistir fechas/cargos sin contar dos veces estancia actual |

Una compensación de PAYMENT no demuestra refund del proveedor. Acordar la
facultad de ajuste contable y exigir PAYMENT_REFUND_VOID en la devolución/anulación
Staff; no publicar un reverso genérico que eluda esa protección.

Para move del mismo tipo no solicitar una unidad ATS adicional: hay cambio de
asignación física, no venta nueva. Si se permite cambiar tipo, acordar admisión
del destino y liberación de origen con locks estables, sin recontar consumo propio.
El puerto actual no impide automáticamente solapamientos de Room: se necesita
validación/bloqueo de asignación física además del ATS agregado por tipo.

En lifecycle, folio y reserva deben conservar identidad e historial. Cambios
de precio/política requieren snapshots/versiones aprobados, no leer simplemente
el precio actual de RatePlan como si fuera el contratado. Calendar se alimenta
de la estancia actualizada; no crear una segunda reserva para una extensión.

## Aprobaciones y entrega

Ver FP-D01..06, LC-D01..05 y SH-D01..03 en el documento 19. Los campos/valores
propuestos de FP-D02 y SH-D01 pueden aprobarse independientemente. Las restantes
decisiones bloquean solo sus flujos; revisión documental completa no significa
que el proveedor o todos los contratos financieros estén aprobados.

Antes de implementar cada ruta se completan request/response, errores,
idempotencia, audit, auth/scope y ejemplos conforme a
[API Contract Policy](02_API_CONTRACT_POLICY.md). Publicar aprobación registrada,
actualizar DoR y revisar con owners afectados. Después código, OpenAPI, DTO/Mapper
de consumidores, pruebas, verify, commit/push y PR. No modificar DTOs Web/Android
en una entrega documental Backend ni tratar sus mocks como API definitiva.
