# BE-014A — Propuesta de acceso transversal Backend

**Estado:** PROPOSED — revisión local preparada; pendiente de aprobación por dominio.
**Fecha/base:** 2026-10-04, main `9003567` (PR #73).
**Rama:** `feature/bd1-api-access-contracts`. **Owner:** Alan / BD1.
**Reviewers previstos:** José / BD2, Juan / BD3 y consumidores afectados.
No se han solicitado revisiones externas. AD-01 y AD-02 cuentan con aprobación
del usuario; las demás decisiones y contratos HTTP requieren revisión propia.

**Revisión vigente:** BE-014A-FIN-01 en `feature/bd1-api-access-contract-approval`
desde `main` `d258d60`; AD-02 fue aprobada por el usuario el 2026-10-04.
AD-01 también está aprobada. AD-03 a AD-06 siguen abiertas; el documento
completo conserva estado PROPOSED para esas decisiones y contratos HTTP.

## Autoridad y alcance

Fuentes: [C1](08_AUTH_SESSION_CONTRACT_PROPOSAL.md),
[C2](09_AUTHORIZATION_SCOPE_CONTRACT_C2.md), [C3](10_GUEST_AUTH_CONTRACT_C3.md),
[scope global](../../docs/05_PROPERTY_SCOPE.md),
[reglas de dominio](../../docs/04_DOMAIN_RULES.md),
[Change Control](../../docs/10_CHANGE_CONTROL.md) y
[propuesta financiera BD2](20_BD2_FINANCE_LIFECYCLE_CONTRACT_PROPOSAL.md).

C1/C2/C3 están aprobados. La asignación de cada operación futura a un permiso,
las reglas complementarias y las decisiones AD de este documento son propuestas.
No se añaden roles, permisos, rutas, DTOs ni migraciones en esta entrega.
Los métodos Java existentes no constituyen contratos HTTP confirmados.

El objetivo es habilitar BE-014B por dominio después de revisar acceso, actor y
scope. Una aprobación de esta matriz no aprueba políticas financieras/lifecycle,
proveedores, permisos nuevos ni los contratos HTTP de BD2/BD3 pendientes.

## Inventario confirmado de permisos C2

Evidencia: `src/main/resources/db/changelog/003ServiceSecurityAuth/002-rbac-memberships.yaml`.
Los únicos códigos que esta propuesta utiliza como permisos existentes son:

| Permiso existente | SUPER_ADMIN | GERENCIA | RECEPCION | OPERACIONES | AUDITOR |
| --- | --- | --- | --- | --- | --- |
| MULTI_PROPERTY_READ | Sí | Sí | No | No | No |
| STAFF_MANAGE | Sí | Sí | No | No | No |
| RESERVATION_MANAGE | Sí | Sí | Sí | No | No |
| FOLIO_PAYMENT_OPERATE | Sí | Sí | Sí | No | No |
| PAYMENT_REFUND_VOID | Sí | Sí | No | No | No |
| OPERATIONS_MANAGE | Sí | Sí | No | Sí | No |
| COMMERCIAL_MANAGE | Sí | Sí | No | No | No |
| AUDIT_READ | Sí | Sí | No | No | Sí |
| NIGHT_AUDIT_RUN | Sí | Sí | No | No | No |

Un permiso no elimina membership ni scope. SUPER_ADMIN conserva propiedades
activas de su organización; no accede a otra organización. ALL_PROPERTIES exige
MULTI_PROPERTY_READ, IDs autorizados explícitos y el permiso de la operación.
No convierte una lectura agregada en escritura sobre varias propiedades.

`B2B_MANAGE` aparece en TODOs del código Commercial, pero **no existe** en este
catálogo. La propuesta AD-01 reutiliza COMMERCIAL_MANAGE; no implementa el TODO
como si fuera un permiso aprobado. Crear un código más granular exigiría una
decisión y migración nuevas, con su matriz de roles y revocación correspondiente.

### Aprobación parcial registrada — 2026-10-04

El usuario aprueba AD-01: reutilizar COMMERCIAL_MANAGE para los seis servicios
comerciales. BE-014B-COM-01 implementa únicamente esa sustitución y sus regresiones.
Implementado en `feature/bd1-commercial-permissions`: guard compartido en los seis
servicios, flujos GERENCIA/SUPER_ADMIN y casos denegados. Verify final 270 tests
PASS (45 comerciales), Java 21/PostgreSQL 17 y wrapper Maven 3.9.16. El usuario
confirmó su QA manual y cerró BE-014B-COM-01; revisión BD3 queda para integración.
En ese incremento solo AD-01 quedó aprobada; AD-02 se aprobó después en
BE-014A-FIN-01. AD-03 a AD-06 y los contratos HTTP permanecen pendientes.
Esta aprobación no transforma el documento completo en CONFIRMED.

### Incremento BE-014B-COM-02 integrado

PR #93 integró en `main` la validación del scope Commercial contra el
snapshot Staff antes de los queries: organización, properties autorizadas,
`PROPERTY` único y `ALL_PROPERTIES` con `MULTI_PROPERTY_READ` y conjunto completo.
Las mutaciones que reciben scope exigen `PROPERTY`. Los vínculos a Company,
Agency, Reservation, Stay y Reward original se consultan con predicado SQL de
property/organización. QA local y manual PASS; revisión BD3 corresponde a la
integración de sus consumidores.
Este incremento no publica rutas HTTP ni resuelve actor Staff de sesión.

## Entradas y brechas observadas

Rutas de archivos relativas a `src/main/java/com/pms/hotelboutique/backend/`.

| Evidencia | Situación verificada | Requisito antes de nueva exposición |
| --- | --- | --- |
| `modules/securityauth/infrastructure/security/StaffJwtAuthenticationFilter.java` | Filtra únicamente el prefijo `/api/v1/staff-auth/` | Cada nueva superficie Staff debe seleccionar filtro/chain Staff; no basta `authenticated()` |
| `modules/guestauth/infrastructure/security/GuestJwtAuthenticationFilter.java` | Filtra únicamente `/api/v1/guest-auth/` | Superficies Guest deben usar su propio contexto y prueba de titularidad |
| `infrastructure/security/SecurityConfiguration.java` | Tiene `anyRequest().authenticated()`; los filtros anteriores no reconocen nuevos prefijos | No afirmar que las futuras APIs ya aceptan JWT Staff ni abrir matchers genéricos para ambos contextos |
| `modules/inventory/infrastructure/security/InventorySecurityConfiguration.java` | Chain Staff específica de catálogos/availability; handlers 401/403 | Conservar sin ampliar todos los subpaths property automáticamente |
| `modules/inventory/application/InventoryAccess.java`, `PropertyAccess.java` | Guards existentes; ATS requiere RESERVATION_MANAGE o COMMERCIAL_MANAGE | Reutilizar patrón de sesión activa y snapshot actual; no cambiar contratos Inventory |
| `modules/reservations/application/ReservationQueryServiceImpl.java` | Listados filtran properties en SQL; detalles de Reservation y Folio hacen findById antes del check | Mover scope al predicado de detalle y consultas dependientes antes de HTTP |
| `modules/reservations/application/FolioService.java`, `ReservationService.java`, `ReservationStayService.java` | Entradas por UUID sin contexto autorizado; algunas reciben actorId | Nuevas entradas operativas deben exigir contexto confiable, permiso y resource scope; actor desde sesión |
| `modules/reservations/application/ReservationBookingServiceImpl.java` | Booking transaccional usa admisión; auditoría usa SYSTEM | No exponer SYSTEM como actor de escritura Staff; fijar identidad pública/Guest por contrato aparte |
| `modules/operations/application/*Service.java` | Listados reciben scope; numerosas escrituras/detalles reciben propertyId o UUID y actorId directamente | Guard de servicio y SQL scoped; pertenencia de Room/Stay/Order/Request comprobada antes de escribir |
| `modules/operations/application/MessagingService.java` | conversation recibe solo guestProfileId; outbound recibe authorId | Lectura de conversación con scope/titularidad, author confiable y regla externa Reception |
| `modules/commercial/application/{Company,Agency,EventGroup,RoomBlock,Promotion,Reward}ServiceImpl.java` | Restricción SUPER_ADMIN provisional en los seis servicios | Sustituir solo después de AD-01; probar positivos GERENCIA y negativos otros roles |
| `modules/commercial/application/RoomBlockServiceImpl.java` | link/unlink usan findById de Reservation y checks posteriores | Predicados scoped para todos los enlaces y validación misma property |
| `modules/commercial/application/RewardServiceImpl.java` | Earn/reverse cargan Stay/Entry por ID antes de verificaciones | Scope SQL también en recursos dependientes, no solo en la entrada del ledger |
| `modules/reservations/application/AuditService.java` | get/findByEntity/findByCorrelation no reciben scope | Consulta administrativa por BE-008 con AUDIT_READ y alcance explícito; no publicar métodos crudos |
| `modules/reservations/application/ReservationLinkService.java` | Lookup interno referencia/correo; puerto Guest vacío | BE-013 debe cerrar SPI y OTP; lookup nunca se publica como acceso a reserva |

No se encontraron controllers de reservas, operaciones, comercial o finanzas en
esta base. Auth e Inventory sí tienen controllers. La ausencia de HTTP no elimina
las brechas de entradas internas; esta revisión tampoco prueba explotación en vivo.

## Contexto, scope, actor y transporte propuestos

Para cada entrada Staff: validar JWT **Staff** y sesión vigente, recalcular snapshot
desde BD, validar permiso, resolver scope autorizado y pasar ese scope a SQL antes
de cargar recursos. Revalidar al entrar al servicio; un objeto snapshot/scope
fabricado por el cliente o un actorId del body no concede facultades.

- Una mutación opera en PROPERTY; todos sus vínculos operativos deben pertenecer
  a la misma propiedad cuando su dominio lo exige. El detalle se busca por ID y
  property/organización autorizadas; no se carga primero y se filtra después.
- Las lecturas agregadas requieren además MULTI_PROPERTY_READ, solo cuando el
  contrato concreto ofrezca ALL_PROPERTIES. No exponerlo automáticamente.
- Actor Staff proviene del principal vigente. AssigneeId puede ser un destinatario,
  pero no se interpreta como actor y debe cumplir su validación de dominio.
- Llamadas de sistema/provider necesitan contexto interno explícito y origen
  validado. No eluden scope, inventario, dedupe o audit usando actor SYSTEM.
- Guest usa JWT/audiencia/sesión Guest y vínculo autorizado con el recurso.
  No recibe roles Staff ni acceso por properties membership; no utiliza el resolver
  Staff como prueba de pertenencia. Repositorios limitan también property/recurso.
- Reserva pública puntual conserva C1: no crea GuestAccount/sesión por correo.
  DTO/checkout/prueba de acceso pública requieren contrato aparte; no se habilitan
  lecturas posteriores por UUID, referencia o correo sin verificación.
- Web usa BFF y cookies separadas HttpOnly. Rutas BFF, DTO/Mapper, protección de
  mutaciones por origen/CSRF y renovación se revisan por endpoint antes de exponerlo.
  La API bearer interna no se convierte en API pública de cookies.
- No se define transporte Android por analogía con cookies Web; integración Guest
  Android requiere contrato de su canal, conservando la semántica de titularidad.

La implementación de la cadena debe probar selección de matchers y error dispatch:
401 por contexto/sesión inválidos, 403 por autorización insuficiente. El dispatch
de un error no debe convertir un 403 del servicio en 401 ni ejecutar filtros cruzados.

## Matriz propuesta por operación

Todas las filas siguientes son propuestas de aplicación de C2. Contexto por
defecto **Staff**; lecturas PROPERTY y ALL_PROPERTIES únicamente si la ruta futura
lo ofrece; escrituras PROPERTY. Actor en escritura: Staff vigente. Las columnas
de métodos son evidencia de capacidades internas, no métodos/rutas HTTP inventados.

### Reservations y Stays — coordinación BD2/BD3

| Operación / método interno existente | Permiso propuesto | Scope/recurso y condiciones |
| --- | --- | --- |
| ReservationQueryService.listReservations/getReservation/listStays | RESERVATION_MANAGE | Reserva, stays y occupants dentro de scope SQL; detalle scoped antes de cargar hijos |
| ReservationBookingService.createBooking; ReservationService.create/confirm | RESERVATION_MANAGE | Booking conjunto en PROPERTY; perfil/enlaces autorizados, admisión real y audit Staff; no exponer primitivas que evadan admisión |
| ReservationStayService.addStay/assignRoom/addOccupant/removeOccupant | RESERVATION_MANAGE | Stay-reserva-property y Room compatibles; addStay debe seguir protocolo de inventario, no bypass interno |
| ReservationStayService.checkIn/checkOut | RESERVATION_MANAGE | State/side effects son autoridad BD2/BD3; guard no los sustituye |
| ReservationService.cancel; cancelStay/markNoShow | RESERVATION_MANAGE | Solo autorización de transición; políticas y pipeline pendientes BD2-LC; refund/void requiere además PAYMENT_REFUND_VOID cuando se efectúe |
| Waitlist/conversión, room move, extensión (flujos futuros) | RESERVATION_MANAGE | Su contrato lifecycle debe aprobarse; admisión/cotización/HK/folio se coordinan, no nuevas primitivas CRUD sin pipeline |
| GuestProfileService: create/updateContact/activate/deactivate/get/findByAccount | Pendiente AD-05 | Master profile compartido no es propiedad automática de una property; fijar enlaces operativos y facultad de modificación antes de API |

El permiso de reservas no concede acceso irrestricto a perfiles CRM compartidos
ni a datos financieros. Una cancelación con devolución es composición de permisos;
Recepción no evita PAYMENT_REFUND_VOID mediante un reverso contable.

### Finanzas — coordinación BD2

| Operación / capacidad | Permiso propuesto | Scope/recurso y condiciones |
| --- | --- | --- |
| Lista/detalle/movimientos/saldo de folios | FOLIO_PAYMENT_OPERATE | Primera lectura PROPERTY; coincide con propuesta FP-D02/doc 20; no permiso financiero implícito para AUDITOR |
| openFolio/postCharge/postPayment | FOLIO_PAYMENT_OPERATE | Folio y vínculos scoped; PAYMENT actual es contabilidad, no capture del proveedor |
| settle/reopen/close | FOLIO_PAYMENT_OPERATE | Política FP-D04 y concurrencia aprobadas antes de API; no inventar saldo de cierre |
| postReversal de CHARGE | FOLIO_PAYMENT_OPERATE, AD-02 aprobada | Tipo original comprobado en servicio/SQL; motivo y compensación append-only, reverso único concurrente. El servicio actual rechaza revertir ADJUSTMENT. |
| postReversal de PAYMENT | FOLIO_PAYMENT_OPERATE + PAYMENT_REFUND_VOID, AD-02 aprobada | No acredita refund externo; enlazar operación real según contrato BD2, sin simular devolución ni eludir permiso |
| Authorize/capture/garantía Staff (futuro) | FOLIO_PAYMENT_OPERATE | FP-D01/03 y SPI aprobados; idempotencia y referencias de proveedor; garantía pública tiene otro contexto |
| Void/refund total/parcial (futuro) | FOLIO_PAYMENT_OPERATE + PAYMENT_REFUND_VOID | Importe/moneda/estado válidos según contrato, límite captured y dedupe; solo roles C2 con ambos permisos |
| Split/routing/transfer (futuro) | FOLIO_PAYMENT_OPERATE | Todos los folios origen/destino autorizados en PROPERTY; FP-D05, moneda y compensaciones confirmadas |
| Invoices lectura/emisión/corrección (futuro) | Pendiente AD-06 | No trasladar automáticamente permiso de folio a facultad fiscal; FP-D06 pendiente |
| openMasterFolio desde RoomBlockService | COMMERCIAL_MANAGE + FOLIO_PAYMENT_OPERATE | Propuesta para enlace comercial + alta financiera; GERENCIA/SUPER_ADMIN; movimientos posteriores siguen motor BD2 |

AUDIT_READ permite auditoría, no consultas de movimientos/saldos de negocio.
Acceso financiero de AUDITOR exigiría contrato/permiso expresos y Change Control;
no se añade implícitamente como permiso de lectura por su nombre de rol.

### Operations — coordinación BD3

| Operación / servicio | Permiso propuesto | Scope/recurso y condiciones |
| --- | --- | --- |
| Housekeeping: trackRoom/statusOf/clean/dirty/inspect/reject/DND/list | OPERATIONS_MANAGE | PROPERTY Room/HK; overlay DND no sustituye lifecycle; actor/inspector confiables |
| Maintenance: open/start/resolve/cancel/reopen/assign/linkOutage/get/list | OPERATIONS_MANAGE | OT/Room/OOO y asignaciones autorizadas, misma property; resolver OT no implica sellable |
| Outage: register/release/getScoped/list | OPERATIONS_MANAGE | OOO/OOS con actor/motivo/período e historial; coordinar inventario/locks BD2 para no romper admisión |
| Discrepancy: report/investigate/reconcile/cancel/get/list | OPERATIONS_MANAGE | Room/discrepancy scoped; reason/actor; no modificar reservas/folio fuera del pipeline |
| ServiceRequest: open/start/complete/cancel/reopen/assign/get/list | OPERATIONS_MANAGE | Servicio/conserjería/valet scoped; Stay/Room/GuestProfile relacionados validados; acceso RECEPCION pendiente AD-03 |
| Mensajería: get/list/conversation y trabajo interno | Pendiente AD-03/04 | conversation por GuestProfile no autoriza consultar todas las propiedades; diferenciar tarea interna y respuesta externa |
| Mensajería: logInbound | Interno validado o Guest autorizado, pendiente AD-04 | No endpoint anónimo para suministrar guestProfileId/propertyId; autenticar adapter o titularidad Guest |
| Mensajería: sendOutbound | Pendiente AD-04 | Regla global solo Recepción responde externamente; no mapear OPERATIONS_MANAGE a envío externo |
| NightAudit: openDay/closeDay/currentDay/listDays/listRuns | NIGHT_AUDIT_RUN | PROPERTY para ejecución; contrato BD3 con blockers/business date; consultas administrativas AUDIT_READ requieren endpoint separado aprobado |

La matriz no concede OPERATIONS_MANAGE a RECEPCION. Si Recepción debe crear/leer
solicitudes o tareas, definir permiso/capacidad limitada, sin concederle mantenimiento
o cierre de business date por conveniencia de UI. OPERACIONES no responde al huésped
externamente aunque pueda actualizar una tarea interna para Recepción.

### Commercial — coordinación BD3

| Operación / servicio | Permiso propuesto | Scope/recurso y condiciones |
| --- | --- | --- |
| Company y Agency: create/update/activate/deactivate/get/list | COMMERCIAL_MANAGE, AD-01 | Organization/property vigente; no dar acceso B2B a todos los Staff por lectura |
| EventGroup: create/update/advance/get/list | COMMERCIAL_MANAGE, AD-01 | Lifecycle y property; no saltar estados |
| RoomBlock: hold/release/reactivate/get/listByGroup/linkReservation/unlinkReservation | COMMERCIAL_MANAGE, AD-01 | Grupo/block/reserva en property autorizada; predicados SQL también al enlazar; block no es ATS físico |
| Promotion: create/update/activate/pause/expire/get/list/resolveStack | COMMERCIAL_MANAGE, AD-01 | Scoped; resolución determinista no publica administración al Guest; lectura pública promocional necesitará DTO/contrato distinto |
| Reward: earn/redeem/expire/reverse/balanceOf/historyOf | COMMERCIAL_MANAGE, AD-01 | Ledger y recursos dependientes scoped; límites/elegibilidad/idempotencia vigentes; aplicación a folio exige además permiso/flujo financiero BD2 |

Propuesta mínima AD-01: permitir estas operaciones a GERENCIA y SUPER_ADMIN
mediante COMMERCIAL_MANAGE. Recepción, Operaciones, Auditor y Guest no reciben
acceso a esta administración. Datos comerciales para booking/Guest no se obtienen
abriendo estos métodos administrativos: necesitan consultas de consumidor propias.

### AuditTrail y Guest

| Operación | Contexto/permiso propuestos | Prueba de acceso |
| --- | --- | --- |
| AuditTrail get/entity/correlation/lista filtrada | Staff + AUDIT_READ | BE-008/C6: scope previo y consultas paginadas; correlación no autoriza eventos fuera de scope |
| Sesión Google/refresh/logout Guest | Guest, C3 existente | Sesión vigente del contexto; cookies BFF aisladas |
| OTP histórico y asociación | Guest, BE-013/C3 | Referencia + correo Google verificado + OTP de un uso; no contacto por sí solo |
| Reserva/folio propio, servicios/chat/rewards de Guest (futuros) | Guest, contrato consumidor pendiente | Vínculo persistente autorizado y consulta acotada; no permisos Staff ni membership global |
| Crear booking público puntual (futuro) | Público, contrato checkout pendiente | Contacto no crea sesión/cuenta; límites y prueba de acceso puntual a definir con BD1/BD2/WEB-1 |

## Respuestas y trazabilidad propuestas

Contrato común recomendado: ProblemDetail seguro (`application/problem+json`),
sin stack trace, mensajes SQL, tokens, datos del proveedor o existencia de propiedades
ajenas. Cada endpoint concreto documenta su método/path/request/response/errores,
idempotencia/audit y ejemplo antes de implementarse.

| HTTP | Condición |
| --- | --- |
| 400 | Formato inválido de request, filtros, IDs o cursor; validación no revela recurso ajeno |
| 401 | Falta JWT del contexto esperado, JWT expirado/incorrecto o sesión revocada |
| 403 | Staff válido sin permiso o sin autorización de la property solicitada |
| 404 | Dentro de property autorizada, ID inexistente o perteneciente a otra property produce resultado indistinguible |
| 409 | Conflicto de transición/concurrencia/dedupe según contrato del dominio; no error de autorización |

Lecturas sin side effects no requieren Idempotency-Key por defecto. Escrituras
financieras, integraciones y operaciones que lo exijan usan SH-D01/contrato concreto:
misma key/payload deduplica y payload diferente genera conflicto. Un retry valida
autorización vigente antes de devolver incluso el resultado persistido original.
Actor/property/entidad/reason/correlation se auditan conforme al dominio/C6; no
aceptar esos identificadores como facultad suministrada por el cliente.

## Decisiones concretas por confirmar

| ID | Propuesta / decisión requerida | Efecto y reviewer |
| --- | --- | --- |
| AD-01 — APPROVED por usuario 2026-10-04 | Reutilizar COMMERCIAL_MANAGE para B2B/grupos/blocks/promos/rewards; no crear B2B_MANAGE | Quitar SUPER_ADMIN provisional tras aprobación y pruebas; BD3 + BD1/producto |
| AD-02 — APPROVED por usuario 2026-10-04 | FOLIO_PAYMENT_OPERATE para lecturas/ordinarias; también PAYMENT_REFUND_VOID para compensar PAYMENT; AUDITOR sin lectura financiera implícita | Revisión de integración del owner financiero y Web pendiente; coordinar FP-D02/04 y distinguir compensación de devolución externa |
| AD-03 | Definir facultad limitada de RECEPCION sobre ServiceRequests/conserjería/valet y consultas operativas | C2 hoy no le da OPERATIONS_MANAGE; permiso nuevo o contrato de capacidad específica requiere aprobación BD3/producto |
| AD-04 | Resolver cómo representar Recepción en mensajería y facultad GERENCIA/SUPER_ADMIN | Regla solo Recepción externa frente a C1 SUPER_ADMIN todas las funciones: contradicción real para este flujo; detener su implementación hasta decisión registrada |
| AD-05 | Delimitar lectura/modificación del master GuestProfile compartido | BD3 + BD1/producto; membership de property no concede modificar todo el CRM |
| AD-06 | Acceso invoices y futuro AUDITOR financiero si se requiere | BD2 + BD1/producto, FP-D06; no inventar permiso fiscal ni retención |

### Decisión focalizada AD-02 — acceso a folios y reversos

Evidencia de implementación: `FolioServiceImpl.postReversal` acepta como origen
CHARGE o PAYMENT y rechaza ADJUSTMENT; el movimiento compensatorio es ADJUSTMENT.
`postPayment` registra contabilidad, no una captura de proveedor. El puerto
`LocalOperationServiceImpl` ya puede exigir un permiso existente y PROPERTY de
una sesión Staff vigente, pero FolioService aún recibe UUID/actorId sin ese guard.
La aprobación aquí fija la **matriz de autorización**, no publica ese método ni
aprueba FP-D02/FP-D04, rutas HTTP, proveedor, refund o política de cierre.

| Operación de negocio | Permisos Staff aprobados en AD-02 | Roles C2 que los reúnen |
| --- | --- | --- |
| Lectura de folio/saldo/movimientos y postings ordinarios CHARGE/PAYMENT | FOLIO_PAYMENT_OPERATE | SUPER_ADMIN, GERENCIA, RECEPCION |
| Compensar un CHARGE contable | FOLIO_PAYMENT_OPERATE | SUPER_ADMIN, GERENCIA, RECEPCION |
| Compensar un PAYMENT contable | FOLIO_PAYMENT_OPERATE + PAYMENT_REFUND_VOID | SUPER_ADMIN, GERENCIA |
| Refund/void de proveedor futuro | FOLIO_PAYMENT_OPERATE + PAYMENT_REFUND_VOID; contrato financiero y adapter separados | SUPER_ADMIN, GERENCIA |
| Lectura de folio por AUDITOR | Sin acceso implícito por AUDIT_READ | Ninguno hasta decisión expresa AD-06 |

Cada fila requiere la organización y PROPERTY autorizada de la sesión Staff;
ALL_PROPERTIES no forma parte de la primera lectura propuesta FP-D02. El guard
de reverso debe cargar el folio y el movimiento original con predicados scoped,
inspeccionar el tipo original y validar el permiso adicional **antes** de crear
el movimiento compensatorio. `actorId` no procede del request. Una compensación
de PAYMENT nunca se presenta como refund externo completado; la conciliación
con proveedor requiere contrato propio. No se asigna permiso nuevo ni se amplía
el rol AUDITOR por analogía con AUDIT_READ.

**Aprobación registrada:** el usuario aprobó conjuntamente estas cinco filas el
2026-10-04. La revisión del owner financiero y de Web sigue pendiente antes de
integrar la implementación de BE-014B-FIN o publicar FP-D02.

Estas decisiones pueden aprobarse por dominio. AD-03 a AD-06 no bloquean por sí
solas la corrección scoped de lectura de reservas o el contrato comercial AD-01;
solo se inicia código de la entrega cuyo DoR esté satisfecho. AD-04 sí bloquea
la autorización del envío externo afectado; no se resuelve por una suposición local.

## Acceptance y siguiente implementación revisable

Para BE-014A: catálogo/roles contrastados con SQL; servicios en las matrices
contrastados con interfaces; brechas referenciadas; contexto/scope/actor/errores
separados de reglas de negocio; pendientes identificados; revisión local y diff
limpios. A permanece EN_QA hasta registrar revisión/aprobación aplicables.

Para cada BE-014B por dominio:

1. Guard servicio rechaza contexto inválido/sin sesión; recalcula permisos y
   memberships. Tests directos de servicio prueban que HTTP/BFF no son única barrera.
2. Matriz de roles tiene casos positivos y negativos por operación; filtros no
   aceptan JWT Guest en Staff ni viceversa. Tokens revocados no habilitan acceso.
3. Queries de lista/detalle/hijos/movimientos/enlaces usan scope SQL antes de
   cargar; mismos UUIDs ajenos no filtran datos ni existencia y no producen writes.
4. ALL_PROPERTIES contiene solo IDs autorizados y requiere permiso de operación
   + MULTI_PROPERTY_READ; mutaciones no reciben ese scope automáticamente.
5. Actor del body se rechaza/ignora conforme al DTO confirmado y nunca suplanta
   al principal. Se prueba 401/403/404 real y dispatch de errores de la chain.
6. Cambios de rol/permiso/membership efectivos desde BD se respetan en la próxima
   petición; revocación administrativa completa se cierra con BE-006C.
7. Regresiones Inventory/Auth, PostgreSQL/HTTP, `./mvnw -B verify` con Java 21 y
   PostgreSQL 17, migraciones si hay cambios, OpenAPI/contratos y diff revisados.

Primera entrega de código propuesta tras AD-01: guards Commercial con
COMMERCIAL_MANAGE en los seis servicios, recursos relacionados scoped y actor
Staff confiable; conservar lifecycle y motor financiero. Alternativa independiente:
reforzar detalle Reservation/Folio scoped con owners, sin publicar REST. Cada tarea
de implementación empieza en **una rama nueva**, con estado/rama/evidencia en
[AlanPlan](AlanPlan.md) y [AlanHandoff](AlanHandoff.md); no se modifica main.
