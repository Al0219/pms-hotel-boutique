# Entrega de Backend BD2 a BD1 y BD3

**Fecha:** 2026-10-03. **Autor:** José / BD2.
**Decisión del usuario:** José pasa al Frontend; Alan / BD1 y Juan / BD3
continúan el Backend, incluidos los pendientes que correspondían a BD2.
El reparto específico propuesto abajo requiere acuerdo entre Alan y Juan.

## 1. Trabajo terminado

| Entrega BD2 | Resultado | Estado |
| --- | --- | --- |
| Esquema y persistencia de inventario | Migraciones, entidades y repositorios para tipos, Rooms, OOO/OOS y tarifas; propiedades existentes reutilizadas | Integrado en main |
| Dinero y fechas | Dinero exacto en unidades menores/moneda; fechas locales por propiedad e instantes UTC | Integrado |
| Disponibilidad ATS | Inventario físico menos consumo y OOO; OOS no descuenta; mínimo por noche del período; overbooking=0 | Integrado |
| Admisión transaccional | Puerto y locks para demanda conjunta; BD3 conectó su booking al puerto | Integrado |
| APIs de catálogos | Crear, listar, consultar y editar Properties, RoomTypes, Rooms y RatePlans con validación/audit/scope BD1 | Integrado |
| API de disponibilidad | Consulta Staff protegida, OpenAPI y pruebas HTTP | Integrado |
| Integración con reservas | Regresiones reales de consumo, rollback, demanda conjunta y concurrencia | Integrado |
| Lectura segura de folio | Predicado de propiedades autorizadas antes de cargar el folio: be09de4 | Integrado |
| Fase 0 financiera | Capacidades, brechas, contratos propuestos y dependencias: a2241d6 | Documentación integrada |
| Idempotencia local | Recibo append-only; mismo payload recupera recibo, distinto genera conflicto; efecto/recibo/audit atómicos: e5421f9 | Publicado, no integrado |
| Demostración | Compose aislado, Staff de muestra y una colección Postman: f5fc545 | Publicado, no integrado |

Los catálogos son C/R/U. Baja, eliminación, reactivación y reclasificación
quedaron fuera del contrato aprobado; requieren política/contrato si el MVP las exige.
RatePlan no posee inventario. OOO/OOS nunca eliminan Room.

## 2. Qué deben integrar primero

Inspección tras fetch: origin/main 54f7dbd. Los commits a2241d6 y be09de4
son ancestros de main; e5421f9 y f5fc545 todavía no lo son.

1. Revisar e integrar `feature/bd2-financial-foundation` (e5421f9).
   Incluye contrato 21, LocalOperationService, nueva migración
   004-reservations-006 y adaptación de ReservationsSchemaUpgradeTests.
2. Después integrar `chore/backend-demo`, dependiente de esa base.
   Contiene f5fc545 y este traspaso documental. Revisar la base del PR al integrar.
3. Ejecutar CI sobre la combinación real y conservar los checks requeridos.

Todo el código existente está publicado en esas ramas; publicado no significa
integrado ni aprobado por el equipo. Los estados EN_QA de entregas previas se
conservan hasta revisión/CI. No crear commits duplicados de entregas ya subidas.

Evidencia local previa: verify completo Java 21/PostgreSQL 17, 281 tests,
0 failures/errors/skipped. Demo Newman: dos ejecuciones de 53 solicitudes y
81 comprobaciones sin fallos. Esta evidencia no sustituye el CI de integración.

## 3. Pendientes: propuesta de reparto

| ID | Trabajo que falta | Responsable propuesto |
| --- | --- | --- |
| FP-001 (integración/uso) | Revisar/incorporar la idempotencia local ya escrita y aplicarla a las nuevas operaciones; no recrearla | BD1, revisión BD3 |
| FP-002 | API de listado/detalle de folios, movimientos y saldo; filtros/paginación, permisos, scope, OpenAPI y Postman | BD1 |
| FP-003 | Escrituras de folio autorizadas, cargos/reversos concurrentes, posting frente a cierre; política de liquidación/cierre/reapertura | BD3 |
| FP-004 | Payments/garantía pública: proveedor/sandbox, listado/detalle, authorize/capture/void/refund, callbacks y recuperación externa | BD1; BD3 integra ledger/folio |
| FP-005 | Split/routing/transfer: importes exactos, destinos autorizados, movimientos compensatorios y locks | BD3 |
| FP-006 | Invoices: listado/detalle/emisión, numeración/snapshot/correcciones; decidir alcance interno o fiscal | BD1 con BD3 |
| LC-001 | Cancelación total/parcial con política, penalización/refund, estados, liberación y audit | BD3 con BD1 para pagos |
| LC-002 | No-show: elegibilidad, cutoff local/business date, cargo, liberación e integración night audit | BD3 |
| LC-003 | Waitlist y conversión: reglas aprobadas, revalidar tarifa/ATS, booking/admisión existentes y conversión única | BD3 |
| LC-004 | Room move: destino libre/compatible, evitar solapamientos, conservar stay/folio, HK y audit | BD3 |
| LC-005 | Extensión: noches adicionales, disponibilidad física, tarifa/garantía, fechas y cargos | BD3 |
| FP-LC-QA | Pruebas API/Postman, seguridad por propiedad, concurrencia, rollback, sandbox y verify completo | BD1 y BD3 |

Estos IDs conservan el prefijo BD2 en AlanPlan para trazabilidad histórica,
aunque los responsables de continuar son ahora BD1/BD3. No son tareas nuevas
asignadas automáticamente ni contratos de negocio aprobados.

## 4. Código que deben reutilizar y reforzar

Booking, GuestProfile/GuestAccount, Reservation/ReservationStay, FolioService y
AuditService fueron implementados inicialmente por BD3. No duplicar modelos.
FolioService ya abre folios, registra cargos/pagos contables/reversos, calcula
saldo y tiene transiciones básicas. ReservationStayService tiene asignación y
transiciones básicas. Eso no completa pagos externos ni el lifecycle de negocio.

- `postPayment` es contabilidad; no demuestra capture de un proveedor.
- Proteger reversos concurrentes y carrera entre posting/cierre de folio.
- Mantener scope antes de cargar recursos, actor derivado de la sesión y audit real.
- El ATS agregado por tipo no evita doble asignación de una Room específica.
- Coordinar addStay directo, altas OOO y otros escritores con la admisión común.
- Conservar snapshots de precio/política; RatePlan actual no es el precio contratado.
- LocalOperationService solo cubre efectos de la misma transacción local:
  no llamar proveedores desde su callback ni asumir rollback de efectos externos.
- La creación de reservas y folios no tienen todavía REST operativo en esta base;
  sus contratos de transporte deben acordarse para conectarlos al Frontend.

## 5. Acuerdos pendientes y límites

Antes de cada flujo: contrato request/response/errores, permisos/scope,
idempotencia, auditoría y criterios de aceptación. Pendientes: proveedor y
sandbox, acceso de garantía pública, cierre/saldo/direct bill, split/routing,
facturación, políticas de cancelación/no-show/waitlist/move/extensión, orden
común de locks y recuperación de pagos inciertos. No copiar contratos de mocks UI.

GuestAccount != GuestProfile; Reservation != ReservationStay. Movimientos
financieros y AuditTrail sensible append-only/compensatorios; no PAN/CVV.
No editar changesets aplicados ni crear nuevos roles/módulos sin aprobación.

Lectura recomendada:

- [Fase 0 y dependencias](19_BD2_FINANCE_LIFECYCLE_PHASE0.md).
- [Contratos propuestos](20_BD2_FINANCE_LIFECYCLE_CONTRACT_PROPOSAL.md).
- [Idempotencia local aprobada](21_BD2_LOCAL_IDEMPOTENCY_CONTRACT.md).
- [Demo Docker/Postman](22_BACKEND_DEMO.md).
- [Admisión de inventario](13_BD2_INVENTORY_ADMISSION_CONTRACT.md).
- [Plan](AlanPlan.md) y [evidencia](AlanHandoff.md).

Los documentos de fase 0 conservan su autoría/ownership inicial como historia.
Este traspaso y DEC-B-010 sustituyen ese ownership para trabajos pendientes.
SH-D01 local está aprobado en documento 21; recuperación externa sigue pendiente.

## 6. Próximo paso

Alan y Juan revisan las ramas publicadas, confirman reparto detallado, acuerdan
FP-D02 y exponen lecturas de folio. Preparan en paralelo políticas de escritura
y proveedor de pagos. José continúa Frontend como solicitó el usuario.
Este traspaso solo cambia documentación; no agrega funcionalidades ni contratos.
