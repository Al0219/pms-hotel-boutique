# Auditoría técnica — Backend de reserva pública de Juan

Fecha: 2026-10-08. Modalidad: auditoría no destructiva. Alcance: J3, J1, J2, J5, J4 y J6, sus dependencias reales y su integración en el HEAD inspeccionado.

**RESULTADO: PARTIAL.** El flujo principal funciona y la suite completa pasa: **832 pruebas, 0 failures, 0 errors, 0 skipped**. La auditoría adicional reprodujo una carrera de elegibilidad de Property, una entrada NUL que supera J3 y acaba en HTTP 500, una fecha fuera del formato OpenAPI que se persiste y devuelve, y restricciones OpenAPI más permisivas que el runtime. No se corrigió ninguno de estos hallazgos.

La idempotencia, el mapeo de cantidades, los precios autoritativos y los rollbacks tienen evidencia de ejecución sobre PostgreSQL. No basta, sin embargo, con el PASS de la suite para declarar cumplimiento integral sin reservas.

## 1. Identificación, fuentes y alcance

| Dato | Valor observado |
| --- | --- |
| Repositorio | `C:\proyectodesarrolloweb\pms-hotel-boutique` |
| Rama | `feature/backend-public-booking-core` |
| HEAD | `bb8310381ff29c2496ea896b97dd71228ceb43e1` |
| Referencia local de base | `origin/main`, `2bfacba729e2803ddbac144a54028c6e65615d6f` |
| Base anterior a J3 | `8a6228d` |
| Entorno ejecutado | Java Temurin 21.0.9, Maven 3.9.11, PostgreSQL 17.11 |
| Frameworks declarados | Spring Boot 4.1.1, springdoc 3.1.1, JPA, JDBC, Liquibase y Spring Security |
| Build | `mvn -o -B --no-transfer-progress verify`, exit code 0, BUILD SUCCESS |
| Duración de verify | 05:14 min; finalizó `2026-10-08T20:54:57Z` |

Fuentes canónicas leídas: `AGENTS.md`, `backend/AGENTS.md`, `docs/01_SOURCE_OF_TRUTH.md`, las secciones J1–J6 de `backend/docs/AlanPlan.md` y `backend/docs/AlanHandoff.md`, el contrato DOCX, las políticas Backend de API/persistencia/idempotencia/pruebas, los contratos de admisión y disponibilidad, y las reglas globales de dominio pertinentes. Se contrastaron con código, tests, migraciones, Git, respuestas HTTP y filas PostgreSQL. No se consultó memoria de sesiones anteriores.

El DOCX `docs/Plan_Tareas_Backend_Reserva_Publica_Alan_Juan.docx` era un archivo preexistente sin seguimiento. Su SHA-256 leído fue:

```text
0580E62C5D5C09C59BF092B893BFEEEE3F50EE4194C3ECFEEE3450F59440974E
```

Sus precisiones aprobadas están registradas en AlanPlan/Handoff: clave global opaca, hash V1, APPROVED como único éxito, reglas exactas de reutilización de perfiles, trim legacy solo al persistir, Property ACTIVE para nuevas reservas, HTTP 201 también para replay y BOOKING_FAILED → 500. Se aplicaron estas decisiones al evaluar el código; no se inventaron estados o reglas adicionales.

La solicitud recibida termina durante la descripción de J5. Se auditó la asociación Reservation/ReservationStay completa y también J4/J6, expresamente incluidos al inicio de la solicitud, usando sus contratos existentes. No se asumieron requisitos posteriores que no estuvieran presentes en las fuentes.

## 2. Integridad de la auditoría

Estado inicial, registrado antes de ejecutar pruebas:

```text
?? docs/AUDITORIA_MODULOS_WEB3.md
?? docs/AUDITORIA_MODULOS_WEB4.md
?? docs/Plan_Tareas_Backend_Reserva_Publica_Alan_Juan.docx
?? docs/Responsabilidades_Frontend_Web_PMS.pdf
```

No había cambios en archivos rastreados. Estos cuatro documentos se conservaron. `git status --short` se repitió tras la suite, durante los grupos HTTP/integración y al cierre. Antes de crear este informe seguía mostrando exactamente las cuatro entradas iniciales.

La ejecución utilizó el proyecto Docker exclusivo `pms-public-juan-audit-20261008`:

- PostgreSQL nuevo, base `pms_audit`, almacenamiento tmpfs y sin puertos publicados.
- Contenedor Maven nuevo, con Backend montado en `/source` **solo lectura**. `/proc/mounts` confirmó `ro` para ese montaje.
- Se copiaron `src`, `pom.xml` y `docs` a `/audit`, tmpfs del contenedor. El build y sus artefactos se generaron allí; no en `backend/target` del host.
- La caché existente `pms-public-j5-qa_maven-cache` se montó solo lectura y se copió al contenedor antes de ejecutar Maven offline. No se descargaron ni incorporaron dependencias nuevas al proyecto.
- El JAR se inició dentro del contenedor, escuchando en `127.0.0.1:8080` del propio contenedor. Se usaron únicamente configuración de pruebas y credenciales desechables de esa base. No se leyó `.env` ni se contactó una pasarela real.
- Las escrituras de fixtures, triggers de fallos y reservas de prueba afectaron exclusivamente la base desechable. No se conectó la base del hotel.
- Al terminar se retiraron los dos contenedores y su red mediante `docker compose ... down`, sin `-v`, sin pruning y sin eliminar volúmenes existentes. Los logs/builds temporales se descartaron con ellos; la evidencia relevante queda incorporada aquí.

Se calculó una huella agregada SHA-256 sobre **2,031 archivos**: los 2,027 rastreados y los cuatro documentos preexistentes. Se ordenaron las rutas y se hasheó su lista de `ruta + SHA256(contenido)` en UTF-8. La huella de control, tomada durante la inspección antes de los probes HTTP adicionales, y la huella tras terminar las pruebas coincidieron:

```text
B87A3CE99E4B4AF61F8F8B310C501CBB6093E5697B3B7EE4FC7F1F3814CA33F1
```

El único archivo creado en el repositorio por esta auditoría es este informe, en la carpeta `docs` ya existente. Por ello el estado final incluye una entrada nueva autorizada:

```text
?? docs/AUDITORIA_BACKEND_RESERVA_PUBLICA_JUAN.md
?? docs/AUDITORIA_MODULOS_WEB3.md
?? docs/AUDITORIA_MODULOS_WEB4.md
?? docs/Plan_Tareas_Backend_Reserva_Publica_Alan_Juan.docx
?? docs/Responsabilidades_Frontend_Web_PMS.pdf
```

`git diff --stat` quedó vacío y `git diff --check` pasó. La huella de los archivos originales se verificó nuevamente después de crear el informe. Rama y HEAD permanecieron iguales. No se ejecutaron operaciones Git de escritura, no se editaron archivos existentes y no se aplicaron correcciones.

## 3. Inventario y arquitectura

El Backend es un monolito modular Spring Boot bajo `backend/`. Las capas de Reservations están en `backend/src/main/java/com/pms/hotelboutique/backend/modules/reservations/`. Public Booking forma parte de este módulo, no constituye otro repositorio o servicio desplegable independiente.

| Tarea | Implementación principal | Integración |
| --- | --- | --- |
| J3 | `application/PublicBookingRequest.java`, `PublicBookingIntegerDeserializers.java`, `PublicBookingValidationService.java`, `PublicBookingValidationServiceImpl.java`, `PublicBookingValidationException.java`; `infrastructure/persistence/PublicBookingPropertyRepository.java` | Bean Validation, Jackson local al DTO y existencia de Property en PostgreSQL |
| J1 | `application/PublicBookingReceiptRequest.java`, `PublicBookingReceiptResult.java`, `PublicBookingReceiptService.java`, `PublicBookingReceiptServiceImpl.java`, `PublicBookingReceiptSnapshotValidator.java`, `PublicBookingIdempotencyConflictException.java`; `domain/PublicBookingReceipt.java`; `infrastructure/persistence/PublicBookingReceiptRepository.java` | JDBC y JPA en una misma transacción; advisory lock PostgreSQL; snapshot JSONB |
| J2 | `application/PaymentGatewayPort.java`, `PaymentRequest.java`, `PaymentResult.java`; `infrastructure/payment/SimulatedPaymentGatewayAdapter.java` | Un adaptador local Spring, sin IO externo |
| J5 | `application/PublicBookingMappingService.java`, `PublicBookingMappingServiceImpl.java`; `infrastructure/persistence/PublicBookingMappingRepository.java` | Lookup con Property explícita y preparación de un único `CreateBookingCommand` |
| J4 | `application/PublicBookingService.java`, `PublicBookingServiceImpl.java`, `PublicBookingException.java`, `PublicBookingView.java` | Pricing real `DemoRatePolicy`, admisión, pago local, servicios de booking/confirmación y recibo |
| J6 | `api/PublicBookingController.java`, `PublicBookingExceptionHandler.java`; metadata Swagger en request/view | POST público, filtros de seguridad reales, ProblemDetail, OpenAPI generado |

Modelos persistidos y servicios reutilizados: `GuestProfile`, `Reservation`, `ReservationStay`, `ReservationGuest`, sus repositorios, `GuestProfileServiceImpl`, `ReservationBookingServiceImpl`, `ReservationServiceImpl` y `ReservationStayService`. El recibo es un record de dominio persistido por JDBC; no necesita ser una entidad JPA para ser persistente.

Dependencias de Inventory: `DemoRatePolicy`, `PublicAvailabilityCatalogRepository`, `InventoryAdmissionPort/Service`, `InventoryAdmissionLockRepository`, `AvailabilityQueryRepository`, `InventoryDemand` y `StayDateRange`. La admisión bloquea los RoomTypes reales en orden estable, suma demanda por noche y aplica físico − OOO − stays consumidores; OOS no descuenta en este MVP documentado. RatePlan no posee inventario físico.

Migración propia J1: `backend/src/main/resources/db/changelog/004ServiceReservations/008-public-booking-receipts.yaml`, changeset `004-reservations-008`, author `juan-bd3`. Se agrega mediante include al changelog modular y entra desde el master. J2–J6 no introducen otra migración propia de booking.

Configuración inspeccionada: `pom.xml`, `application.yml`, Dockerfile y Compose de tests. PostgreSQL es la base real de integración; `ddl-auto=validate`, Liquibase controla el esquema y `open-in-view=false`. No existe dependencia de proveedor de tarjetas en J2. Se preserva la separación Guest/Staff y GuestAccount/GuestProfile.

Flujo observado:

```text
POST + Idempotency-Key
 → validación/hash J3
 → transacción J1 / lock por key / búsqueda del recibo
   → si existe: snapshot original o conflicto por hash
   → si no existe: catálogo + precio oficial J4
     → admisión de inventario / locks RoomType
     → refresco de RoomTypes y nuevo cálculo de precio
     → pago local J2
     → comando J5 / booking real / confirmación
     → validación y flush / recibo COMPLETED / commit
 → respuesta 201
```

J3 consulta existencia de Property antes de J1 incluso en replay. Dentro de la rama de replay no se vuelven a evaluar precio, inventario, elegibilidad mutable ni pago. Las FK impiden borrar ordinariamente una Property que tiene estas reservas; la prueba de replay no equivale a recuperación tras borrar manualmente relaciones o esquema.

## 4. Historial Git y alcance por fase

| Orden | Commit | Fecha local registrada | Alcance observado |
| --- | --- | --- | --- |
| 1 | `7bb6277` | 2026-10-06 22:56 | J3: seis fuentes, dos tests, entradas propias de seguimiento |
| 2 | `5f3c1f6` | 2026-10-06 23:52 | J1: ocho fuentes, migración 008/include, tres tests y changelog pre-J1 de test, seguimiento |
| 3 | `ab411f4` | 2026-10-07 00:17 | J2: puerto/request/result/adaptador, ajuste autorizado APPROVED en validator J1, tres tests, seguimiento |
| 4 | `10c0d82` | 2026-10-07 00:43 | J5: interface/mapper/lookup, dos tests, seguimiento |
| 5 | `a79cfc0` | 2026-10-07 01:30 | J4: cuatro fuentes y dos tests, seguimiento |
| 6 | `f2cfeba` | 2026-10-07 17:15 | J6: controller/advice, metadata de DTO/view, dos tests, seguimiento |
| 7 | `4c18940` | 2026-10-07 23:23 | J6 integrado con A4: RequestRejectedException → 400, filtros/HTTP y adaptación autorizada de tres tests compartidos |
| 8 | `f13df76` | 2026-10-08 00:15 | Registro documental del QA manual PASS de J6 |
| 9 | `bb83103` | 2026-10-08 00:56 | Merge de main PR143, conservación de J6 y de ambos historiales |

Se observaron también los merges `738d428`, `e6a2340` y `860d3bd`. El orden funcional es **J3 → J1 → J2 → J5 → J4 → J6**, compatible con las dependencias. Los commits de tarea separan sus unidades funcionales e incluyen documentación operativa, no una mezcla indiscriminada de cambios de otros módulos.

Excepciones deliberadas al aislamiento estricto por tarea: J2 modifica el validator de snapshot J1 para fijar el estado aprobado; J6 ajusta tests compartidos después de integrar A4. Ambas están respaldadas por decisiones registradas. Las adiciones a AlanPlan/Handoff en esos commits son seguimiento de Juan; esta auditoría no las modificó.

`origin/main...HEAD` mostró **11 archivos, 1,021 inserciones y 16 eliminaciones**: entrega J6, seguimiento y tests compartidos. J1–J5 ya están en la base por PR138 (`6223196`), por lo que no aparecen como cambios nuevos frente a esa base actual. No deben deducirse ausentes usando solo ese diff.

La comparación de `origin/main` con HEAD para SecurityConfiguration, POM, application.yml y migraciones no mostró diferencias. POM/application.yml sí difieren respecto a la base antigua `8a6228d` por integraciones de main; esos cambios no son introducidos por los commits funcionales J1–J6. Se distinguieron las migraciones Guest/Auth importadas de las propias de Juan.

El controller/advice J6 están iguales entre `4c18940` y HEAD. La migración 008 solo tiene el commit de creación `5f3c1f6`. Los changesets históricos 001–007 de Reservations no fueron editados por J1; su changelog recibe un include nuevo. Esto se contrastó además con el upgrade y sus checksums.

No se hizo fetch: la comparación se refiere expresamente a las referencias locales existentes. El estado de GitHub/CI remoto actual no se verificó. Los PASS de CI mencionados en Handoff se consideran evidencia histórica declarada, distinta del verify ejecutado aquí.

## 5. Pruebas ejecutadas y calidad de la evidencia

La suite se ejecutó desde fuentes copiadas, sin excluir tests ni modificar assertions:

```text
mvn -o -B --no-transfer-progress verify
Tests run: 832, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

| Grupo específico | Tests ejecutados | Resultado |
| --- | ---: | --- |
| PublicBookingValidationServiceTests | 62 | PASS |
| PublicBookingValidationIntegrationTests | 15 | PASS |
| PublicBookingReceiptRequestTests | 15 | PASS |
| PublicBookingReceiptIntegrationTests | 19 | PASS |
| PublicBookingReceiptSchemaUpgradeTests | 1 | PASS |
| PaymentContractTests | 17 | PASS |
| SimulatedPaymentGatewayAdapterTests | 9 | PASS |
| SimulatedPaymentGatewayIntegrationTests | 9 | PASS |
| PublicBookingMappingServiceTests | 14 | PASS |
| PublicBookingMappingIntegrationTests | 21 | PASS |
| PublicBookingServiceTests | 19 | PASS |
| PublicBookingServiceIntegrationTests | 26 | PASS |
| PublicBookingHttpIntegrationTests | 57 | PASS |
| PublicBookingOpenApiIntegrationTests | 5 | PASS |
| **Subtotal propio J1–J6** | **289** | **PASS** |

Los 543 tests restantes son regresiones de la suite completa. Entre los resultados comprobados: DemoRatePolicyTests 20 PASS, InventoryBookingIntegrationTests 6 PASS, ReservationBookingServiceIntegrationTests 7 PASS, PublicBookingPreJ6SecurityHttpIntegrationTests 2 PASS y OpenApiContractIntegrationTests 13 PASS. También corrieron los upgrades y regresiones Guest/Auth incluidos en verify.

Los tests de core usan servicios reales y PostgreSQL, no H2. Los contextos J1/J4/J5/J6 disponen de schemas de fixtures aislados y limpieza propia. Los spies controlan fallos o contabilizan llamadas; no sustituyen las operaciones normales de pricing, admisión, persistencia y confirmación. J6 utiliza `@AutoConfigureMockMvc` con filtros habilitados y servidor HTTP aleatorio real. Los tests sin puerto de booking legacy son casos explícitos de ausencia de dependencias, no el runtime público J4.

Pruebas adicionales fuera de la suite: JAR real, GET availability → POST booking, replays exacto/reordenado, cambios Guest/total, errores de entrada/precio/stock, SQL, reinicio de JVM, diez POST concurrentes, la carrera de Property, NUL, año extendido y validación del OpenAPI vivo. No se añadieron tests al repositorio.

SHA-256 del JAR temporal ejecutado:

```text
45d7f4ea26910d5dfb4494281025d78818a1a06a12aa0c5ed6c5e31153d6a964
```

## 6. J3 — Validación y hash

**Resultado: PARTIAL.** Las reglas normales y el hash están bien implementados e integrados. H2 y H3 revelan límites de validación no cubiertos por la suite.

La clave es opaca: 8–128 code points Unicode, no blank, sin controles ISO y sin normalización. Property es UUID requerido y debe existir. Las fechas rechazan calendarios imposibles y exigen arrival < departure. GTQ es exacto. Se exigen stays no vacíos, tipos UUID, ratePlanId no blank, quantity positiva, responsable requerido, nombres max80, email válido/max320 y SIMULATED_CARD. clientTotalMinor es requerido; su valor se compara contra el precio oficial en J4, no introduce una política monetaria en J3.

Deserializadores del DTO rechazan fracciones no enteras, strings numéricos y overflow de Integer/Long. Las representaciones numéricas enteras equivalentes `1` y `1.0` mantienen valor y hash. Los campos desconocidos se rechazan en raíz, stay y Guest.

Hash: SHA-256 lowercase, versión `PUBLIC_BOOKING_REQUEST_V1`, campos UTF-8 precedidos por longitud de bytes int32 big-endian. Incluye Property, ambas fechas, currency, clientTotalMinor, número de entradas stays, cada roomTypeId/ratePlanId/quantity y firstName/lastName/email. Excluye la key y paymentMode, porque el único modo aceptado es constante. Ordena stays por UUID textual canónico, ratePlanId y quantity; conserva duplicados sin fusionar y no muta la lista. Nombres y correo mantienen caso, espacios y composición Unicode.

| Prueba solicitada | Evidencia ejecutada | Resultado |
| --- | --- | --- |
| 1. Request idéntico | Vector estable unitario y replay HTTP de snapshot completa | PASS |
| 2. Request modificado | Cambios de Property, fechas, total, tipos, plan, cantidad y Guest en tests; HTTP conflict | PASS |
| 3. Fecha inválida | Calendario imposible, mes13, timestamps/non-ISO en tests; `2036-02-30` HTTP400 INVALID_REQUEST | PASS para esos casos; H3 |
| 4. Salida anterior/igual | Tests y HTTP400 INVALID_DATE_RANGE | PASS |
| 5. Quantity = 0 | Unit/JSON/HTTP400 INVALID_REQUEST, sin persistencia | PASS |
| 6. Currency != GTQ | USD/gtq/espacios; HTTP400 con USD y USDGTQ | PASS runtime; H4 metadata |
| 7. Key ausente | Unit y HTTP400 antes de pago/escrituras | PASS |
| 8. Key inválida | Blank/corta/larga/controles/Unicode inválido; límites 8/128 | PASS |
| 9. Orden de stays | Mismo hash; replay HTTP201 con snapshot original | PASS |
| 10. Cambio de nombre | Tests exactitud/caso/espacios/Unicode; HTTP409 IDEMPOTENCY_KEY_REUSED | PASS |
| 11. Cambio de correo | Tests y HTTP409 IDEMPOTENCY_KEY_REUSED | PASS |
| 12. Otros campos | UUID case/orden JSON/números equivalentes; cambios relevantes alteran hash; duplicados preservados | PASS |
| Entrada adicional NUL | Bean Validation 0 violaciones y J3 produce hash; API500 | Hallazgo H2 |
| Fecha adicional año extendido | `+10000-01-01` → 201 y fechas persistidas | Hallazgo H3 |

El vector unitario documentado `4eec960c40c78cd430b6454dc015c1f837b0e883ffde5181ec68e11620fe878c` pasó. Para el payload HTTP de auditoría se calculó independientemente el formato con .NET en memoria y se obtuvo exactamente el hash leído del recibo:

```text
4ada244b8d01f42882b76809f13d0e550557561604aecfd4b5ba006dca949ad6
```

## 7. J1 — Recibo idempotente persistente

**Resultado: PASS técnico dentro del alcance local simulado.** QA manual propio J1 continúa pendiente en la documentación. No se observó duplicación por la misma key.

| Elemento | Verificación |
| --- | --- |
| Identidad | PK global `idempotency_key`, varchar128, collation C; equivale a UNIQUE y NOT NULL |
| Índice | Único índice observado: btree PK `pk_public_booking_receipts`; el lookup por key dispone de ese índice. No se midió su plan con EXPLAIN |
| Hash/estado | SHA-256 lowercase de 64 hex; CHECK de status solo COMPLETED |
| Referencias | reservation_id FK real; confirmation_code/payment_reference no blank |
| Snapshot | JSONB; whitelist de campos y correlación reserva/código/referencia; aplicación valida semántica de respuesta |
| Inmutabilidad | Trigger BEFORE UPDATE OR DELETE append-only; timestamps iguales por CHECK; sin TTL/purga automática |
| Transacción | Writable READ_COMMITTED, validada también con `current_setting` de PostgreSQL |
| Concurrencia | `pg_advisory_xact_lock` por hash64 de la key; lookup/PK conservan key completa, por lo que una colisión del lock solo serializa trabajo extra |
| JPA/JDBC | Flush antes del INSERT para que la FK vea padre/stays en la misma transacción |
| Finalización | Padre persistido CONFIRMED/GTQ y confirmationCode coincidente antes del primer recibo |
| Replay | Lectura de snapshot original, sin callback y sin consultar lifecycle mutable dentro de J1 |

La base ejecutada tenía 28 changesets. `004-reservations-008` quedó aplicado con checksum `9:dd04f2f449986e2ef2c0c678028f058d`. La prueba de upgrade preserva todos los checksums/datos anteriores, añade los cuatro changesets posteriores presentes en el master actual y verifica reapply sin cambios. No debe confundirse ese master actual con el conteo histórico de la entrega inicial de J1.

| Prueba obligatoria | Evidencia | Resultado |
| --- | --- | --- |
| Primer request | Recibo COMPLETED, padre/stays persistidos; HTTP201 y SQL | PASS |
| Replay exacto | Snapshot, IDs, código y referencia iguales; sin callback/pago/filas adicionales | PASS |
| Misma key + otro payload | Conflicto application y HTTP409 IDEMPOTENCY_KEY_REUSED | PASS |
| Concurrencia | Tests de dos conexiones observan wait_event advisory y esperan commit/rollback; 10 POST reales devuelven una reserva | PASS |
| Conflicto de unicidad | INSERT duplicado rechazado SQLSTATE23505 en test real PG | PASS |
| Rollback | Callback fallido, flush, rollback exterior y fallo diferido al commit revierten booking y receipt | PASS |
| Persistencia tras reinicio | JVM real PID805 detenida; JVM1125 arrancada; replay201 idéntico | PASS de reinicio de aplicación |
| Recuperación existente | Repository.find y replay tras cambios de reserva/catálogo/Property | PASS |
| Estados | COMPLETED solamente al éxito; FAILED rechazado por CHECK23514, snapshot/padre verificados | PASS |

El test de constraints comprueba además FK23503, CHECK23514 y rechazo UPDATE/DELETE P0001. La clave se libera tras error o rollback, incluso para otro payload; las conexiones esperan el commit/rollback exterior, no solo el retorno del método.

No se probó reinicio/crash de PostgreSQL, del host o pérdida de volumen: PostgreSQL de auditoría usa tmpfs. Tampoco se ejecutó una carrera entre dos JVM simultáneas; sí entre conexiones PostgreSQL independientes y diez peticiones HTTP en el JAR. La coordinación entre procesos se sustenta en el lock PG, no en un mutex Java.

No se observó doble reserva, doble pago simulado comprometido, pérdida de idempotencia ni corrupción de recibos en los escenarios ejecutados. Los fallos técnicos pueden invocar nuevamente el simulador tras rollback: es correcto en este contrato local sin efectos externos y no constituye una garantía para una futura pasarela real.

## 8. J2 — Pasarela simulada

**Resultado: PASS técnico.** `PaymentGatewayPort.pay(PaymentRequest)` recibe exclusivamente amountMinor y GTQ. No recibe Guest, PAN, CVV, token de tarjeta, titular, expiración o dirección. No existen SDK, webhooks, clientes HTTP, secretos, persistencia, transacciones propias o async en el adaptador.

| Caso ejecutado | Comportamiento observado | Resultado |
| --- | --- | --- |
| Éxito runtime | SIMULATED / APPROVED, referencia `SIM-<UUID lowercase>` | PASS |
| Rechazo fixture | DECLINED, referencia null; J4 no confirma y J6 responde422 | PASS |
| Error fixture | ERROR, referencia null; J4 aborta y J6 responde500 | PASS |
| Referencias sintéticas | Nueva por llamada aprobada; tests de unicidad/concurrencia local y formato | PASS |
| Integración | Un bean runtime; callback de admisión real; cero writes del adaptador y rollback local | PASS |
| Ausencia de selector público | Constructor de fixture package-local; ningún campo HTTP/config toggle para fallar pagos | PASS |

**APPROVED es la única semántica de éxito vigente.** El DOCX original admitía CAPTURED/APPROVED como alternativas; AlanPlan/Handoff registran la elección posterior de APPROVED. PaymentResult, snapshot validator, respuesta y OpenAPI coinciden. No hay contradicción activa entre ambos estados en el flujo público.

Los escenarios DECLINED/ERROR se ejecutaron en tests con fixtures/spies y PostgreSQL; no se simularon mediante parámetros del endpoint de producción. Esa separación es parte del contrato aprobado. No se produjo ningún efecto externo real de pago.

## 9. J5 — Mapping al modelo de reservas

**Resultado: PASS para las entradas válidas del contrato normal.** El mapper prepara un único comando y no persiste; la persistencia ocurre dentro del booking/admisión existente. H2 documenta una entrada que J3 admite y que falla al integrarse con este lookup.

| Requisito | Implementación/integración/prueba ejecutada | Resultado |
| --- | --- | --- |
| Una sola Reservation | Un CreateBookingCommand y padre compartido; tests multi-categoría y SQL HTTP | PASS |
| Quantity = 1 | Un ReservationStay real | PASS |
| Quantity > 1 | Expansión exacta por unidad, 1/3 en tests; 3 STD + 1 DLX en HTTP | PASS |
| roomId = null | Comando sin asignación; response, snapshot y SQL con NULL | PASS |
| RoomType real/scoped | Lookup roomTypeId+propertyId; rechazo tipo inexistente o de otra Property | PASS |
| Perfil nuevo | Solo responsable con nombre/apellido/email y Property; account/contactos adicionales null | PASS |
| Perfil existente | Solo candidato único ACTIVE, misma Property, sin GuestAccount, igualdad exacta de los tres campos | PASS |
| Candidatos excluidos | INACTIVE, otra Property, sin Property o con cuenta no se reutilizan ni modifican | PASS |
| Ambigüedad | LIMIT2 detecta varios candidatos; crea nuevo sin sobrescribirlos | PASS según decisión aprobada |
| Exactitud | COLLATE C; no trim/case-fold/normalización en lookup/hash; trim legacy solo al escribir | PASS según decisión aprobada |
| Sin ocupantes ficticios | Lista occupants vacía; cero ReservationGuest por inferencia de adults/children | PASS |
| Asociación | UUIDs distintos de stays y reservation_id común, fechas y Property correctas | PASS |
| Canal | WEB_DIRECTA, sourceReference y notes null | PASS |
| Atomicidad | Rollback exterior/falta de stock no deja perfiles, reservas, stays o audit parciales | PASS |
| Mapper sin writes | Tests comparan nueve tablas antes/después de preparar comandos | PASS |

No se agregó account linking. Reutilizar un GuestProfile no concede sesión Guest ni titularidad. Los RatePlan IDs del request son identidades demo devueltas por availability y validadas por DemoRatePolicy; no se fuerza una relación física con un RatePlan persistido que el contrato no exige.

En el JAR real, las reservas de pruebas posteriores con el mismo responsable reutilizaron un solo perfil en la Property demo; SQL mostró `profiles=1`. El booking inicial confirmó una Reservation, tres stays STD y uno DLX, todos con room_id NULL, y cero occupants ficticios.

## 10. J4 — PublicBookingService

**Resultado: PARTIAL.** Happy path, precio, pago, stock, confirmación, snapshot y transacciones pasan; H1 expone una carrera de elegibilidad y H2 una entrada que llega demasiado lejos en la orquestación.

| Requisito | Evidencia ejecutada | Resultado |
| --- | --- | --- |
| Consultar recibo/replay primero respecto a efectos | J1 ejecuta callback solo si no existe; tests verifican cero segundo pago/booking | PASS |
| Property real/ACTIVE y GTQ para nueva reserva | Rechazo404/500 normal antes de pago; consulta PG real | PASS normal; riesgo H1 |
| RoomTypes reales de la Property | Catálogo scoped y plan demo validado | PASS |
| Única fuente de pricing | Bean DemoRatePolicy compartido con availability; total exacto por noches×cantidad | PASS |
| Cliente no decide precio | Recalcula y compara; 0/negativos/totales alterados → PRICE_CHANGED antes de pago | PASS |
| Revisión tras esperar inventario | Refresca RoomTypes bajo lock y recalcula; test detecta precio concurrente | PASS para RoomTypes; no refresca Property |
| Stock/admisión | Demanda agregada antes de expansión; doble entrada no pierde unidades | PASS |
| Pago con precio oficial | PaymentRequest exacto, dentro de la misma conexión/tx | PASS |
| Pago rechazado/error | No mapping/creación/confirmación; rollback y key libre | PASS |
| Booking y confirmación | CreateBookingCommand → createBooking → confirm; padre CONFIRMED persistido | PASS |
| Demanda persistida | Compara cantidades por tipo, padre, Property, roomId, fechas e IDs únicos antes de aceptar resultado | PASS |
| Snapshot/receipt | Roundtrip y validación dentro de transacción; luego COMPLETED | PASS |
| Fallo tardío/serialización/commit | Tests de PG restauran filas/ATS y permiten reintento | PASS |
| Carrera por última capacidad con keys distintas | Solo uno paga/persiste, otro NO_AVAILABILITY | PASS |

La disponibilidad es una lectura, no un hold ni garantía de stock. El POST vuelve a admitir transaccionalmente la demanda. El booking legacy vuelve a entrar al mismo protocolo dentro de esa transacción; no crea otra transacción ni una reserva por habitación.

Los efectos del pago son locales y solo se conserva su referencia en la respuesta/receipt. No se exige en este incremento un ledger financiero real ni una fila de captura externa; no se calificó esa ausencia como incumplimiento del simulador.

## 11. J6 — HTTP, seguridad y OpenAPI

**Resultado: PARTIAL.** El endpoint público y su integración A4 funcionan. Las diferencias H2/H3/H4 impiden afirmar paridad total entre todas las entradas, runtime y OpenAPI.

Contrato vigente: POST `/api/v1/public/bookings`, JSON, key obligatoria, SIMULATED_CARD, creación/replay201. ProblemDetail con code sanitizado; INVALID_REQUEST/INVALID_DATE_RANGE400, PROPERTY_NOT_FOUND404, NO_AVAILABILITY/PRICE_CHANGED/IDEMPOTENCY_KEY_REUSED409, PAYMENT_DECLINED422 y BOOKING_FAILED500.

La excepción RequestRejectedException de binding de headers se traduce a400 en advice exclusivo. No se cambió firewall global. Se rechazan campos ajenos en raíz, Guest y stay, incluidas las categorías de campos de tarjeta cubiertas por la suite. Los errores no devuelven key, nombres, email, payload o cause. La respuesta normal tampoco contiene Guest, tarjetas ni cookies de autenticación.

El JAR real respondió sin Authorization: booking201, replay201, availability200, Swagger UI200 tras seguir el redirect y `/v3/api-docs`200. GET booking401 y GET `/api/v1/properties`401. La suite cubrió además otros métodos, vecinos y dispatch de errores; no se abrió un prefijo entero de negocio Staff. Guest y Staff conservan filtros y sesiones separados.

OpenAPI vivo: **3.1.0; 42 operaciones, 32 paths, 47 schemas, 13 tags**. Booking tiene operationId publicBooking, `security: []`, x-audience public, header requerido de longitud8..128, DTO cerrado a additionalProperties, UUIDs, quantity integer >0, total int64, enum SIMULATED_CARD, respuesta CONFIRMED/GTQ/SIMULATED/APPROVED y roomId nullable. La suite global de paridad pasó con las rutas Guest registration integradas desde main. H3/H4 son restricciones de valores que esa paridad estructural no detecta.

## 12. Evidencia HTTP y PostgreSQL adicional

GET availability para Property demo real `3032709f-a48b-300b-b860-1110bc6f1f13`, rango 2036-01-01 a 2036-01-03 y rooms1 devolvió seis categorías reales, cuatro unidades por categoría. STD valía130000 por dos noches y DLX170000. El POST seleccionó 3 STD + 1 DLX, total oficial560000, con responsable sintético de auditoría.

Resultado inicial:

```text
key: audit-baseline-20261008
reservationId: dd17c0c4-df77-4e06-a672-678641a94591
confirmationCode: QKNBCZVNZB
status: CONFIRMED
currency/totalMinor: GTQ / 560000
payment: SIMULATED / APPROVED
reference: SIM-14d0604d-dd89-4952-8f94-52c09caed728
receipt status: COMPLETED
stays: 3 STD + 1 DLX, mismo padre, room_id NULL
reservation_guests: 0
sourceChannel: WEB_DIRECTA; sourceReference/notes: NULL
created_at = updated_at del recibo: true
```

| Probe independiente | Resultado HTTP real |
| --- | --- |
| Replay idéntico | 201, JSON idéntico al inicial |
| Replay con stays invertidos | 201, JSON original idéntico |
| Cambio de nombre / correo / total con key inicial | 409 IDEMPOTENCY_KEY_REUSED en los tres casos |
| Fecha2036-02-30 | 400 INVALID_REQUEST |
| Departure anterior | 400 INVALID_DATE_RANGE |
| Quantity0 | 400 INVALID_REQUEST |
| USD / USDGTQ | 400 INVALID_REQUEST |
| Nombre vacío | 400 INVALID_REQUEST |
| Campo cvv con valor ficticio | 400 INVALID_REQUEST |
| Plan equivocado | 400 INVALID_REQUEST |
| Precio alterado con key nueva | 409 PRICE_CHANGED |
| 5 STD frente a ATS4 con precio correcto | 409 NO_AVAILABILITY |
| Key ausente / corta | 400 INVALID_REQUEST |
| Replay tras reiniciar JVM | 201, snapshot completa idéntica |
| 10 POST simultáneos con key nueva | Los 10 retornan201, misma reserva y referencia; SQL confirma un recibo y un stay |

La carrera de diez requests empleó `audit-10-concurrent-20261008`, rango2039-01-01 a2039-01-03, quantity1. Todos retornaron:

```text
reservationId: 83bab011-0026-43ca-b2e8-4d4627269c2d
reference: SIM-f1e4db5d-d809-4ee2-875e-644a19abeb34
SQL: CONFIRMED, stays=1, profiles=1
```

El pago se contabiliza directamente en los tests mediante spies; en estos diez requests al JAR sin spies, el resultado idéntico y las filas se contrastaron con el camino de replay de J1. No se presenta la referencia compartida por sí sola como medición independiente de todas las invocaciones internas.

## 13. Hallazgos reproducidos

### H1 — Carrera entre elegibilidad de Property y admisión

Severidad: **MEDIA**. Afecta J4/J6. Observación confirmada; falta definir explícitamente el punto de corte de ACTIVE ante cambios concurrentes.

Fuente: AlanPlan J4 y PublicBookingController declaran Property ACTIVE para nuevas reservas. En `PublicBookingServiceImpl.java:79`, el código lee y valida Property antes de esperar el lock; en `:95` refresca solo RoomTypes y en `:100` inicia pago. No refresca ni coordina el estado de Property después de la espera. `InventoryAdmissionLockRepository.java` bloquea RoomTypes, no Property.

Reproducción exclusivamente en PostgreSQL temporal:

1. Crear Property de fixture `60000000-0000-0000-0000-000000000001`, ACTIVE/GTQ, un RoomType STD `60000000-0000-0000-0000-000000000011` y una Room.
2. Otra conexión: BEGIN; SELECT el RoomType FOR UPDATE; SELECT pg_sleep(30); COMMIT.
3. POST nuevo `audit-inactive-race`, 2037-01-01→2037-01-03, quantity1, total130000.
4. Observar en pg_stat_activity la conexión de booking esperando `Lock / transactionid` en el SELECT FOR UPDATE de RoomType.
5. Mientras espera, UPDATE la Property a INACTIVE y comprometer ese cambio.
6. Liberar el lock. Resultado: **201 / CONFIRMED**, receipt COMPLETED.

SQL final:

```text
property_status=INACTIVE
reservation_status=CONFIRMED
reservationId=81502bdf-735b-4f7c-91ad-334a111c860c
key=audit-inactive-race
```

Esto es un nuevo booking, no un replay permitido de una reserva anterior. La documentación no fija si ACTIVE debe sostenerse hasta admisión/confirmación o basta la evaluación inicial; no se inventa esa semántica. El owner debe decidirla. Si se exige ACTIVE al confirmar, el comportamiento observado incumple esa precondición y necesita coordinación transaccional, además de una prueba de esta carrera. No se observó duplicación ni corrupción del recibo en este escenario.

### H2 — NUL en nombre supera J3 y acaba en 500

Severidad: **MEDIA**. Afecta la frontera de validación J3, su integración con el lookup J5 y el error público J6.

Ubicación: `PublicBookingRequest.java:55`, `PublicBookingValidationServiceImpl.java:41` y `:60`; `PublicBookingMappingRepository.java` usa nombres como parámetros JDBC; `PublicBookingServiceImpl.java:100` llama a pay antes de map.

Se enviaron nombres JSON `"Auditoria\u0000"` y `"\u0000"`, con el resto del request y stock válidos, en rango2038-01-01→2038-01-03. Ambos dieron **500 BOOKING_FAILED**, sin receipt y sin stays para ese rango.

Se invocó adicionalmente la clase J3 compilada, mediante JShell en memoria, con Bean Validation real y un lookup de existencia de Property controlado para aislar la validación. Resultado:

```text
AUDIT_NUL_VIOLATIONS=0
AUDIT_NUL_J3_HASH=9b278bb1b3f002c6e734596b854839d574e2cf7ba3ae069c81743ea75cf9d736
```

Otra consulta JDBC real con `SELECT ?::text` y el nombre NUL produjo **SQLSTATE22021**. La prueba directa confirma que la representación es aceptada por J3 pero no por la frontera PostgreSQL usada en el lookup. UTF-8 encodable no implica texto aceptable por PostgreSQL. El error HTTP es sanitizado y el rollback funciona; la clasificación como fallo técnico y la detección tardía siguen siendo una brecha.

Por el orden del código, el pago simulado precede ese lookup; no hay cobro externo, pero la validación no garantiza rechazo antes de alcanzar esa etapa. La corrección futura debería resolver esta incompatibilidad de entrada en la frontera apropiada y cubrirla con prueba; no necesita inventar una regla general sobre nombres humanos ni cambiar la normalización aprobada. No se aplicó cambio alguno.

### H3 — Año extendido aceptado frente a format: date

Severidad: **BAJA**, diferencia de contrato/interoperabilidad. Afecta J3/J6.

Ubicación: `PublicBookingRequest.java:25` y `:27`, patrón `uuuu-MM-dd`; serialización de fechas en `PublicBookingView.java`. Ese patrón permite un año extendido con signo.

POST con arrival `+10000-01-01`, departure `+10000-01-03`, precio560000 y selección válida dio **201** y persistió cuatro stays. Reserva `669c5f22-cf16-45f3-b9eb-180bbb848792`, key `audit-extendedYear-20261008`. PostgreSQL confirmó arrival10000-01-01 y departure10000-01-03; la respuesta JSON conserva `+10000-...`.

El OpenAPI vivo declara `format: date` para request y response. Ese formato representa full-date de RFC3339, con año de cuatro dígitos. Por ello la respuesta observada no respeta el formato anunciado. Esto es una diferencia de formato verificable, no una decisión inventada de limitar reservas a determinada cantidad de años futuros. Fuentes primarias: [registro oficial del formato date](https://spec.openapis.org/registry/format/date) y [RFC3339, sección5.6](https://www.rfc-editor.org/rfc/rfc3339.html#section-5.6).

Se requiere alinear el formato aceptado/devuelto con el contrato aprobado o decidir explícitamente un contrato distinto. La suite verifica formato declarado y calendarios imposibles, pero no esta frontera.

### H4 — OpenAPI admite valores que el runtime rechaza

Severidad: **BAJA**. Afecta J6/DoD de paridad de restricciones.

El documento vivo muestra:

```json
{
  "currency": {"type":"string","minLength":1,"pattern":"GTQ"},
  "firstName": {"type":"string","maxLength":80,"minLength":0},
  "lastName": {"type":"string","maxLength":80,"minLength":0}
}
```

La regex de JSON Schema no está implícitamente anclada: `USDGTQ` satisface el pattern publicado, pero la API respondió400 INVALID_REQUEST. Nombres vacíos satisfacen los límites publicados y required solo exige la presencia de la propiedad; el runtime respondió400 al nombre vacío. Se verificó además `new RegExp("GTQ").test("USDGTQ") === true` sobre el patrón extraído del OpenAPI. Semántica normativa: [JSON Schema2020-12, minLength y pattern](https://json-schema.org/draft/2020-12/json-schema-validation#section-6.3).

`PublicBookingOpenApiIntegrationTests.java:58` comprueba campos, máximos y quantity, pero no protege contra estos valores admitidos por el schema y rechazados por HTTP. La metadata debería describir GTQ exacto y la obligación no blank. No se modificaron anotaciones o tests.

## 14. Riesgos, límites y estado de entrega

| Tema | Evaluación |
| --- | --- |
| Doble reserva por misma key | No observado; PK, lock y pruebas directas respaldan prevención |
| Doble pago real | No existe pago real en este incremento; no extrapolar rollback local a proveedor externo |
| Sobreventa entre bookings participantes | Pruebas PASS, incluido último stock con keys distintas |
| Sobreventa en todo el PMS | Garantía limitada: contrato13 advierte que otros escritores de capacidad/demanda deben participar en el mismo protocolo; no es una garantía global |
| Estado elegible de Property concurrente | Riesgo H1 confirmado; decisión sobre punto de corte pendiente |
| Entradas incompatibles con persistencia | H2 confirmado; no deja filas parciales, pero responde500 |
| Paridad OpenAPI completa | H3/H4 confirmados pese al PASS estructural |
| Rangos/stays grandes y espera de locks | Inspección: trabajo por noche y expansión por unidad, sin límite pequeño de rango/lista ni timeout específico de lock en este flujo. Riesgo operativo no medido; no se hizo stress/DoS ni se inventaron límites de negocio |
| Crecimiento de recibos | Sin TTL por decisión aprobada; tamaño/retención/capacidad no se midieron |
| Integridad vía SQL privilegiado | DB valida PK/FK/shape/referencias; la semántica completa de payment y stays vive también en aplicación. No se garantiza integridad ante bypass administrativo de esos servicios |
| Durabilidad ante crash DB/host | No probada; reinicio de aplicación sí probado |
| Despliegue real/frontends | No se ejecutó navegador/BFF ni entorno desplegado; alcance Backend y JAR aislado |

Estado operativo leído, sin alterarlo:

- **J3/J1/J2/J5/J4: EN_QA**, con evidencia técnica histórica y QA manual propio pendiente en AlanPlan/Handoff.
- **J6: COMPLETADA**, con QA manual PASS registrado por Juan el2026-10-08.
- **A4: seguimiento de cierre pendiente** en sus entradas, aunque su matcher y pruebas integradas actuales funcionan. No se cambió el estado de la tarea de Alan.

La ejecución de esta auditoría no sustituye la confirmación manual del owner ni autoriza modificar esos estados. Tampoco invalida retroactivamente la confirmación de J6; informa diferencias adicionales observadas en el código actual.

## 15. Reproducción y decisión siguiente

Comandos de inspección utilizados, todos de lectura:

```text
git status --short
git branch --show-current
git branch -av
git log --first-parent --format=... --date=iso-strict
git log --all --oneline --grep=public-booking --grep=simulated
git show --format=fuller --stat <commits J1-J6>
git diff --name-status <commit>^ <commit>
git diff --stat origin/main...HEAD
git diff origin/main HEAD -- <configuración y migraciones>
git diff --check
git ls-files
rg --files / rg -n sobre fuentes y tests
```

Para las pruebas se montó Backend solo lectura y se ejecutó Maven offline sobre su copia temporal. Se inició el JAR resultante con `--spring.profiles.active=demo --pms.demo.data.enabled=true --server.address=127.0.0.1`, en contenedor sin puertos. Las peticiones fueron con curl dentro de ese contenedor; PostgreSQL se inspeccionó con psql en el contenedor de la base temporal. Los snippets JShell y el cálculo .NET se ejecutaron en memoria, sin crear fuentes dentro del proyecto.

Consultas de contraste representativas, ejecutadas sobre fixtures propios:

```sql
SELECT r.id,r.confirmation_code,r.status,r.currency,r.source_channel,
       r.source_reference,r.notes,g.first_name,g.last_name,g.email,g.guest_account_id
FROM reservations r JOIN guest_profiles g ON g.id=r.booking_guest_id
WHERE r.id='dd17c0c4-df77-4e06-a672-678641a94591';

SELECT reservation_id,room_type_id,room_id,arrival,departure,count(*)
FROM reservation_stays
WHERE reservation_id='dd17c0c4-df77-4e06-a672-678641a94591'
GROUP BY reservation_id,room_type_id,room_id,arrival,departure;

SELECT idempotency_key,request_hash,status,reservation_id,confirmation_code,
       payment_reference,created_at=updated_at
FROM public_booking_receipts WHERE idempotency_key='audit-baseline-20261008';

SELECT conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='public_booking_receipts'::regclass;
```

Prioridad de revisión: resolver la semántica concurrente de ACTIVE/H1 y la incompatibilidad NUL/H2; después alinear formato y restricciones OpenAPI/H3–H4. Cualquier corrección o cambio documental requiere una tarea autorizada posterior. **Esta auditoría termina con el informe, sin implementar cambios ni avanzar a otra tarea.**
