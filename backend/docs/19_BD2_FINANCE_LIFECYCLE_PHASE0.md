# BD2-FP-000 — Fase 0: Folio/Payments y lifecycle

**Fecha/base:** 2026-10-02, origin/main `9eb2380` (PR #72 integrado).
**Owner:** José / BD2. **Rama:** `feature/bd2-finance-lifecycle-contracts`.
**Estado:** revisión y propuesta documental; no constituye API aprobada.

## Autoridad y alcance

El usuario aprobó el nuevo reparto y la secuencia modular en conversación.
Las reglas de dominio y C1/C2/C3 continúan vigentes. La autorización de esta
fase permite revisar, proponer y publicar contratos; no aprueba automáticamente
proveedores, políticas financieras, permisos, estados ni endpoints propuestos.

Fuentes: [dominio](../../docs/03_DOMAIN_MODEL.md),
[reglas](../../docs/04_DOMAIN_RULES.md), [scope](../../docs/05_PROPERTY_SCOPE.md),
[cross-app](../../docs/07_CROSS_APP_CONTRACTS.md),
[change control](../../docs/10_CHANGE_CONTROL.md),
[decisiones](../../docs/11_ARCHITECTURAL_DECISIONS.md),
[C2](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md),
[admisión](13_BD2_INVENTORY_ADMISSION_CONTRACT.md) y servicios/migraciones actuales.
El XLSX se consultó como contexto Web/Android; el seguimiento Backend reside
exclusivamente en AlanPlan/AlanHandoff según backend/AGENTS.md.

| Responsable | Alcance actual | Límite compartido |
| --- | --- | --- |
| José / BD2 | Folio/Payments e invoices; cancelación, no-show, waitlist, room move y extensión | Reutiliza reservas, dinero, auditoría, Auth y admisión existentes |
| Juan / BD3 | Operaciones y Comercial/B2B | Define HK, night audit, grupos/blocks, master folio comercial, promociones/rewards y cuentas por cobrar |
| Alan / BD1 | Integraciones/analítica y administración/cumplimiento | Mantiene autoridad de Auth/scope, permisos, transportes de integración, secretos, retry y acceso Guest/OTP |

BD2 puede extender el código financiero/lifecycle originalmente escrito por
BD3 dentro del nuevo ownership. No crea un segundo folio o servicio de booking.
Cambios de SPI compartidos requieren revisión del dueño afectado. No se trasladan
paquetes o changelogs por el mero cambio de responsables.

## Inventario verificado de capacidades

Rutas Java relativas a `backend/src/main/java/com/pms/hotelboutique/backend/`.
Las rutas SQL de la tabla son relativas a `backend/src/main/resources/db/changelog/`.

| Capacidad | Evidencia en código | Reutilización / trabajo pendiente |
| --- | --- | --- |
| Folio, cargo, pago contable, reverso, saldo, estados | `modules/reservations/application/FolioService.java`, `FolioServiceImpl.java`; `domain/Folio.java`, `FolioMovement.java` | Extender; `postPayment` registra contabilidad, no ejecuta un proveedor |
| Append-only financiero | `004ServiceReservations/004-folio.yaml`: trigger contra UPDATE/DELETE de movimientos | Conservar; nuevas restricciones se agregan en nuevos changesets |
| Auditoría | `modules/reservations/application/AuditService.java`, `AuditServiceImpl.java`; `005-audit-trail.yaml` | Reutilizar; actor y motivo reales deben llegar desde el flujo autorizado |
| Lecturas de reservas/folios | `modules/reservations/application/ReservationQueryServiceImpl.java` | Listado de folios filtra IDs en SQL; detalle usa findById y después comprueba scope: reforzar el predicado SQL antes de exposición HTTP |
| Repositorios de folio | `modules/reservations/infrastructure/persistence/FolioRepository.java`, `FolioMovementRepository.java` | Añadir consultas scoped/paginadas y locks según contrato; preservar consumidores actuales |
| Cancelación / no-show | `ReservationServiceImpl.cancel`, `ReservationStayServiceImpl.cancelStay/markNoShow` | Transiciones básicas; faltan política, penalización/reembolso, audit del flujo y coordinación operativa |
| Asignación / fechas | `ReservationStayServiceImpl.assignRoom`; `ReservationStay.assignRoom/updateDates` | No equivalen a room move/extensión: faltan conflicto físico, tarifa, admisión, folio e impacto HK |
| Booking atómico | `modules/reservations/application/ReservationBookingServiceImpl.java` | Ya usa InventoryAdmissionPort y demanda conjunta; reutilizar en conversión waitlist |
| ATS / admisión / dinero | `modules/inventory/application/AvailabilityService.java`, `InventoryAdmissionService.java`; `shared/money/MonetaryAmount.java` | Overbooking=0, OOO resta, OOS no; dinero exacto, UTC para instantes |
| Master folio | `modules/commercial/application/RoomBlockServiceImpl.openMasterFolio` | Ya crea el mismo Folio MASTER; acordar routing/transfer y concurrencia con BD3 |
| Housekeeping / night audit | `modules/operations/application/HousekeepingService.java`, `NightAuditService.java`, `NightAuditBlocker.java` | SPI de blockers existente; aún no hay paso de posting financiero implementado en cierre |
| Payments / garantía / invoices / waitlist | Búsqueda en módulos Java y changelogs del master | No se encontraron implementaciones Backend en esta base; UI/mock no es contrato Backend |
| Idempotencia persistente / outbox de pagos | Búsqueda de clases y esquema incluido por master | No se encontró implementación reutilizable; existe regla documental en `05_IDEMPOTENCY_AND_AUDIT.md` |

Pruebas existentes: FolioServiceIntegrationTests, FolioTests,
FolioMovementTests, AuditServiceIntegrationTests, Reservation*IntegrationTests,
InventoryAdmissionIntegrationTests e InventoryBookingIntegrationTests.
El cierre anterior validó 254 tests con verify; esa evidencia no sustituye
las futuras pruebas financieras, de HTTP ni del sandbox.

## Brechas que deben cerrarse antes de publicar escrituras

1. FolioService carga recursos por ID sin scope de sesión. Incorporar autorización
   previa y predicados property-scoped en las nuevas entradas públicas e internas
   operativas; no confiar en una comprobación posterior en memoria.
2. `postReversal` consulta existencia de reverso, pero no hay unicidad de
   `reverses_id` ni lock explícito: probar y proteger dos reversos concurrentes.
3. Folio `settle/close` valida estados, no saldo. Definir si saldo pendiente,
   crédito o direct bill permiten liquidación; no imponer saldo cero sin política.
4. Folio y stays no usan versionado/locks explícitos en estos flujos. Revisar
   carreras posting/cierre, extensión/cancelación y asignación de habitación.
5. Asignación de Room no comprueba por sí sola solapamiento físico ni compatibilidad
   de tipo; el FK garantiza propiedad/existencia, no habitación libre.
6. El booking conectado queda protegido; addStay directo, alta OOO y escritores
   externos no adquieren automáticamente los locks de admisión. Coordinar con BD3.
7. Tarifas base no son un snapshot de precio/política de una reserva. Confirmar
   cotización, vigencia y revalidación con Comercial antes de lifecycle financiero.
8. `postReversal` también admite un movimiento PAYMENT. Distinguir compensación
   contable de refund/void real y acordar permisos por operación: no permitir que
   una reversión de folio eluda PAYMENT_REFUND_VOID o simule devolución externa.

Son hallazgos de diseño para tareas futuras; esta fase no modifica producción.

## Contratos entre equipos por confirmar

| Interfaz / evento conceptual | BD2 entrega | Responsable contraparte / pendiente |
| --- | --- | --- |
| Operación de pago y confirmación externa | Importe/moneda, operación estable, vínculo financiero, dedupe y proyección a folio | BD1: adapter/proveedor, credenciales, verificación callback, retries y recuperación; decidir frontera concreta antes de código |
| Cambio de estancia / room move | Stay conservada, property, origen/destino, período, actor/motivo/correlación | BD3: validación de destino, reglas HK y aplicación idempotente; contrato todavía propuesto |
| No-show / cierre de business date | Política aplicada, resultado financiero, blockers de nuestra operación | BD3: cutoff/business date y NightAuditBlocker; posting requiere paso separado, no side effect del blocker |
| Precio / promociones / blocks | Solicitud de cotización y revalidación ligada a operación | BD3: snapshot comercial, prioridad/promos, elegibilidad y significado de blocks; block pickup no sustituye ATS |
| Folio de grupo / direct bill | Motor único de movimientos/routing con scope y moneda | BD3: creación/enlace comercial de master, empresa pagadora, crédito y cuentas por cobrar |
| Auditoría / identidad Guest | Eventos con referencias y datos mínimos; vínculo financiero autorizado | BD1: consultas AuditTrail, retención, OTP/acceso Guest; reserva pública no exige crear GuestAccount |

Los nombres de eventos y firmas Java no se declaran confirmados aquí. Se propone
una envolvente con operationId/eventId, propertyId, entidad, actor, motivo,
correlationId, occurredAt UTC y versión; se excluyen PAN/CVV y secretos.
Una entrega reintentada debe aplicarse una sola vez. Si los módulos participan
en una única transacción local, probar rollback conjunto; si son asíncronos,
acordar persistencia de entrega y recuperación antes de afirmar atomicidad.

## Registro de decisiones pendientes

La tabla conserva las decisiones de fase 0. SH-D01 tiene aprobación posterior
para base local en [contrato 21](21_BD2_LOCAL_IDEMPOTENCY_CONTRACT.md), sin
proveedores; sus efectos externos siguen pendientes. Las demás decisiones
continúan PENDIENTES salvo aprobación registrada específica.

| ID | Decisión / quién confirma | Bloquea |
| --- | --- | --- |
| FP-D01 | Proveedor, sandbox, moneda, métodos, límites de authorize/capture/void/refund; producto + BD1/BD2 | Payments real, esquema/status de proveedor |
| FP-D02 | Transporte/DTO/paginación/errores y permisos de lectura; BD2 + BD1 + consumidores Web/Android | Exposición HTTP; propuesta inicial en contrato 20 |
| FP-D03 | Garantía pública: momento en booking, prueba de acceso, duración, enlace a reserva y tokenización; producto + BD1/BD2 + WEB-1 | Flujo público; UUID/correo no son autorización |
| FP-D04 | Cierre/reapertura, saldo/credit balance/direct bill y cargos posteriores; producto + BD2/BD3 | Escrituras/estados de folio |
| FP-D05 | Split/routing/transfer: destinos, reglas, redondeo, motivo/permisos y monedas; producto + BD2/BD3 | Distribución de cargos |
| FP-D06 | Invoice interna/fiscal, emisor, numeración, impuestos, corrección y proveedor si aplica; producto + BD2/BD1 | Emisión; no asumir país/regla tributaria |
| LC-D01 | Cancelación total/parcial, política/versionado, penalización y orden ante pago incierto; producto + BD2 | Cancelación de negocio |
| LC-D02 | No-show: estados elegibles, cutoff local/business date, cargo permitido y liberación; producto + BD2/BD3 | No-show de negocio |
| LC-D03 | Waitlist: prioridad, expiración, notificación, consentimiento y precio al convertir; producto + BD2/BD3 | Waitlist/conversión |
| LC-D04 | Move: mismo tipo/cambio de tipo, tarifa, aceptación destino y estado HK; producto + BD2/BD3 | Room move completo |
| LC-D05 | Extensión: precio adicional, garantía, noches con Room asignada y fallos externos; producto + BD2/BD3 | Extensión completa |
| SH-D01 | Base local aprobada por el usuario: namespace, payload y persistencia; documento 21. Recuperación externa pendiente BD1/BD2 | Fase 1 local habilitada; pagos externos requieren otro acuerdo |
| SH-D02 | Locks comunes y orden entre room type, stay, Room y folio; BD2/BD3 | Operaciones concurrentes entre módulos |
| SH-D03 | Ubicación de nuevo módulo/esquema de pagos y SPI; BD1/BD2 | Nuevo módulo/cambio estructural (Change Control) |

El prefijo Liquibase 001 ServicePagos está reservado en AlanPlan, pero aún no
incluido en el master. Su uso es propuesta a confirmar. Folios existentes siguen
en 004 ServiceReservations; no editar ni mover sus changesets aplicados.
Consultas y documentación independientes pueden avanzar sin elegir proveedor;
ninguna ruta propuesta se implementa antes de aprobar su contrato.

## Entregas, dependencias y aceptación

Estos IDs organizan trabajo Backend; no son tareas Web/Android del XLSX.
Los estados vigentes están en AlanPlan; cada entrega exige su DoR específico.
FP-001 local ya tiene SH-D01 aprobado en documento 21. Fase 0 puede completarse
con decisiones registradas, sin declarar listos los módulos bloqueados por ellas.

| Tarea / módulo | Dependencias y DoR | Aceptación principal / archivos previstos |
| --- | --- | --- |
| BD2-FP-001 / 1: base transaccional | FP-000; SH-D01 y diseño de persistencia aprobados; SH-D03 si nace módulo | Dedupe concurrente, conflicto de payload, auth/scope/actor; services/repos/migraciones nuevas y tests PostgreSQL |
| BD2-FP-002 / 2A: lectura de folio | FP-000; FP-D02 aprobado para lectura | Lista/detalle/movimientos/saldo scoped y paginados; reutilizar QueryService/FolioService, DTO/api/repos y Postman |
| BD2-FP-003 / 2B: escritura de folio | FP-001; FP-D04 y contrato de escritura aprobado | Cargos/reversos únicos, compensación, carrera con cierre y audit; extender servicios existentes |
| BD2-FP-004 / 3: pagos/garantía | FP-001/003; FP-D01/03 y SPI BD1 aprobados | Authorize/capture/void/refund, listado/detalle, callbacks/recovery; ledger correlacionado y sandbox verificado |
| BD2-FP-005 / 4A: distribución | FP-003/004; FP-D05 y master/direct bill acordados | Split exacto, routing determinista, transfer atómico/idempotente, ninguna edición de importe histórico |
| BD2-FP-006 / 4B: invoices | FP-003/004; FP-D06 aprobado | Listado/detalle/emisión y corrección trazables; snapshot emitido y numeración/reglas aprobadas |
| BD2-LC-001 / 5A: cancelación | FP-003/004; LC-D01 y reglas para fallos externos | Multi-stay total/parcial, política/cargo/refund, ATS liberado, audit e idempotencia |
| BD2-LC-002 / 5B: no-show | FP-003/004; LC-D02 y contrato night audit | Cutoff con timezone, cargo permitido, stay NO_SHOW, ATS liberado y blockers correctos |
| BD2-LC-003 / 6: waitlist | FP-001; LC-D03 y cotización/admisión | No consume ATS al esperar; conversión única, demanda conjunta, reserva/tarifa revalidadas, rollback |
| BD2-LC-004 / 7A: room move | FP-001/003; LC-D04 y SH-D02/HK acordados | Mismo stay/folio, destino libre/compatible, audit/HK una vez, rollback/carrera real |
| BD2-LC-005 / 7B: extensión | FP-001/003; LC-D05 y SH-D02/cotización acordados | Admisión solo noches nuevas, departure/cargos/calendario coherentes, asignación física validada |
| BD2-FP-LC-QA / 8: integración | Entregas incluidas COMPLETADAS y SPIs reales disponibles | Verify sin exclusiones, sandbox, HTTP/OpenAPI/Postman, cross-property, fallos/reintentos; evidencia/handoff |

DoD de código para cada entrega: acceptance + pruebas de reglas/HTTP/SQL según
impacto, `./mvnw -B verify` Java 21/PostgreSQL 17, migraciones upgrade/idempotentes
cuando existan, diff limpio, documentación/colección coherentes y revisión local.
Después commit/push a rama de entrega, PR con reviewer del dominio afectado y CI.
Estados COMPLETADA requieren evidencia; no se sustituyen por mocks o tests omitidos.

## Siguiente entrega

Revisar el [contrato propuesto](20_BD2_FINANCE_LIFECYCLE_CONTRACT_PROPOSAL.md).
SH-D01 local quedó aprobado en documento 21; FP-D02 debe acordarse para lectura de folio.
Las decisiones de proveedor/políticas restantes se resuelven antes de su módulo;
no es necesario bloquear todo el programa mientras se define una de ellas.
