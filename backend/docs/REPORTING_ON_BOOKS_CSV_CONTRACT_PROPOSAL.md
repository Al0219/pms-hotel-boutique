# BE-010A-CSV-01 — Contrato aprobado CSV de on-books diario

**Estado: APPROVED por el usuario (2026-10-21): «Si Apruebo todo».**
La aprobación incluye rutas, formato, auditoría y reintentos de este documento.
Implementación BE-010B-CSV-01 EN_QA: pruebas técnicas e integración HTTP PASS;
su cierre requiere confirmación QA manual del usuario.
Owner de preparación: Alan / BD1. Consumidor: WEB-3. Colaboración: Juan / BD3
por fuentes/auditoría, WEB-2 por acceso y WEB-4 por disponibilidad.
Rama: `codex/reporting-on-books-csv-contract`; base `67ef77d`.

La solicitud «Entonces empieza a trabajar» inicia la preparación del primer
contrato del [plan de integración](../../docs/PLAN_INTEGRACION_REPORTES.md).
El usuario aprobó el paquete completo y autorizó su implementación vertical.
Las expresiones «propuesto/recomendado» conservadas abajo identifican la
redacción revisada; todas esas decisiones quedan aprobadas por esta entrada.

## 1. Autoridad y alcance

Reglas ya aprobadas: [C7-D01/D02/D06/D07/D09](33_BD1_REPORTING_CONTRACT_C7_PROPOSAL.md)
y [contrato HTTP on-books](34_BD1_ON_BOOKS_HTTP_CONTRACT_PROPOSAL.md).
CSV UTF-8, máximo 366 noches locales inclusivas y 50 000 filas de datos;
filtros/permisos de la consulta, exclusión de PII de huéspedes, escape y
neutralización de fórmulas. On-books representa compromiso actual por noche;
no incluye ingresos, ADR, RevPAR, ocupación realizada ni reconstrucción histórica.

Las recomendaciones de las secciones 3–8 fueron aprobadas conforme a
[Change Control](../../docs/10_CHANGE_CONTROL.md). No modifican el
GET JSON vigente ni incorporan programación, almacenamiento de archivos o CSV
contable. C7-D03 no bloquea este reporte sin importes.

## 2. Capacidades verificadas en la base

Inventario previo a implementar, correspondiente a base `67ef77d`. Las brechas
CSV/BFF descritas en esta tabla se resuelven en BE-010B-CSV-01; la evidencia
actual está en la guía QA. La tabla conserva la trazabilidad de la preparación.

Rutas de código relativas a `src/main/java/com/pms/hotelboutique/backend/`:

| Evidencia | Capacidad real / trabajo necesario |
| --- | --- |
| [DailyOnBooksServiceImpl](../src/main/java/com/pms/hotelboutique/backend/modules/inventory/application/DailyOnBooksServiceImpl.java) | Valida sesión activa, permisos y scope; limita noches × properties antes del repositorio; calcula porcentaje BigDecimal a dos decimales HALF_UP. Es read-only; no insertar audit desde su transacción actual. |
| [DailyOnBooksRepository](../src/main/java/com/pms/hotelboutique/backend/modules/inventory/infrastructure/persistence/DailyOnBooksRepository.java) | SQL por organización/IDs autorizados, noches locales, físicas, OOO únicos activos y Stay elegibles con padre no cancelado. Sin fuente financiera ni PII. |
| [DailyOnBooksController](../src/main/java/com/pms/hotelboutique/backend/modules/inventory/api/DailyOnBooksController.java) y [DailyOnBooksReport](../src/main/java/com/pms/hotelboutique/backend/modules/inventory/application/DailyOnBooksReport.java) | DTO JSON y filtros explícitos; no produce CSV. |
| [AuditService](../src/main/java/com/pms/hotelboutique/backend/modules/reservations/application/AuditService.java), [implementación](../src/main/java/com/pms/hotelboutique/backend/modules/reservations/application/AuditServiceImpl.java) y [esquema](../src/main/resources/db/changelog/004ServiceReservations/005-audit-trail.yaml) | Emisor reutilizable con actor, action/entity, propertyId, snapshots/correlación y protección append-only. No hay taxonomía de exportaciones confirmada; el esquema no tiene columna organizationId. |
| [C6](25_BD1_AUDIT_CONTRACT_C6_PROPOSAL.md) | Actor de confianza, contexto org/property explícito, allowlist y conservación. Una property nula no constituye evento global. Lectura administrativa del nuevo evento queda fuera de este incremento. |
| [BFF JSON](../../frontend/pms-hotel-web/src/app/api/v1/private/reports/on-books/daily/route.ts) | Cookie Staff, Bearer interno, proyección y no-store. La exportación necesita su propia respuesta binaria. |
| [HTTP Web](../../frontend/pms-hotel-web/src/lib/http/client.ts) y [Staff BFF](../../frontend/pms-hotel-web/src/lib/http/staff-bff.ts) | Infraestructura de lecturas JSON y refresh Staff; no ofrece Blob ni cabeceras de descarga. JSON seguido de text sobre el mismo body no sirve como contrato binario. |

En esa base no existía productor CSV de negocio. BE-010B-CSV-01 reutiliza
inventario y auditoría existentes, sin módulo, dependencia externa ni cambios
de esquema. Las pruebas de persistencia/audit verifican la transacción real.

## 3. Decisiones aprobadas

Todas las filas siguientes fueron aprobadas; sus etiquetas son referencias de
revisión de este documento, no nuevos estados ni permisos.

| Tema | Recomendación | Alternativa y efecto |
| --- | --- | --- |
| Transporte | GET dedicado con sufijo `/export`, síncrono, sin body; JSON vigente intacto. | Negociar `Accept` en la ruta actual obliga a ampliar su contrato y sus consumidores. |
| Archivo | UTF-8 con BOM, coma, CRLF, cabecera estable en inglés, 11 columnas. | Punto y coma o nombres traducidos requieren variantes; no ofrecerlas en este primer incremento. BOM favorece reconocimiento de UTF-8 en herramientas de escritorio; importadores deberán tolerarlo. |
| Metadatos | `calculatedAt` repetido por fila, nombres de columnas del DTO vigente. | Preambulo/comentarios agregan un segundo formato y dificultan importar la tabla. |
| Valores | Conteos enteros; porcentaje decimal con punto y exactamente dos decimales; null como celda vacía. | Localizar números altera interpretación entre herramientas. |
| Auditoría | Generación completa, un evento por property autorizada del archivo, transacción única, correlación común. Fallo de audit impide respuesta exitosa. | Un evento con propertyId nulo no describe correctamente ALL_PROPERTIES ni su autorización. |
| Reintentos | Cada petición nueva genera estado actual y un nuevo hecho auditado. Sin reintento automático de red/5xx; refresh Staff solo tras 401 previo a generación. | Replay exacto necesitaría persistir archivos/recibos y acordar retención, fuera de este contrato. |

## 4. Transporte

Rutas aprobadas para la implementación BE-010B-CSV-01:

```text
GET /api/v1/reports/on-books/daily/export
GET /api/v1/private/reports/on-books/daily/export  (BFF Web)
```

Parámetros: `from`, `to` y exactamente uno de `propertyId` UUID o
`scope=ALL_PROPERTIES`. Se conserva íntegra la validación del contrato JSON:
valores obligatorios no vacíos, fechas YYYY-MM-DD reales, rango ordenado,
duplicados/desconocidos rechazados, sin organizationId ni listas de properties.
No se aceptan parámetros para cambiar columnas, formato o extensión.

Sesión Staff activa con `RESERVATION_MANAGE` o `COMMERCIAL_MANAGE`, siguiendo
C7-D09 (mismos permisos que consulta). ALL_PROPERTIES requiere además
`MULTI_PROPERTY_READ`, incluso si solo hay una property autorizada. Membership
y organización se resuelven en Backend antes del SQL; property ajena e inexistente
no autorizada reciben la misma respuesta. AUDIT_READ no concede exportación
ni es requisito adicional para que el servidor emita audit.

Se valida `noches inclusivas × properties autorizadas <= 50 000`, sin truncar
ni paginar el archivo. La cabecera no cuenta como fila de datos. Se conserva
orden `propertyId ASC, stayDate ASC`. Una property sin Rooms devuelve filas
de capacidad cero, como el reporte actual, no una lista vacía artificial.

Respuesta exitosa:

```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=UTF-8
Content-Disposition: attachment; filename="on-books-daily_2035-01-01_2035-01-02.csv"
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
```

El nombre se construye solo con prefijo fijo y fechas validadas; no contiene
nombres de properties, actor o entradas libres. Todos los resultados, incluidos
errores, llevan no-store. No se emiten URL pública, Location, ETag, Last-Modified,
304 ni cookies Backend nuevas para esta descarga. GET no modifica el negocio;
el audit registra el acceso/generación observado.

El CSV se genera completo en memoria dentro del límite de filas y se audita
antes de empezar la respuesta HTTP. No se usa streaming de filas ni archivo
parcial exitoso. La implementación medirá el tamaño y memoria del máximo real;
si ese coste no es aceptable, se revisa la estrategia antes de ampliar límites.

### Errores

| Estado | Backend | BFF Web |
| --- | --- | --- |
| 400 | Filtros o límites inválidos, ProblemDetail público con título `Invalid report filters`. | JSON `{ "error": "Invalid report parameters" }`. |
| 401 | Ausencia/Guest/sesión inválida; cuerpo de filtro puede estar vacío como en Staff actual. | JSON `{ "error": "Staff session required" }` o error público genérico si procede del Backend. |
| 403 | Permiso/membership/scope no autorizados; sin detalles de properties ajenas. | JSON `{ "error": "Report unavailable" }`. |
| 406 | Accept explícitamente incompatible con CSV; sin generación ni audit exitoso. | Si el cliente exige formato incompatible, respuesta pública equivalente; no reenviar Accept del navegador sin validación. |
| 503 | Error al calcular, serializar o confirmar audit; ProblemDetail genérico `Report unavailable`. | JSON `{ "error": "Report unavailable" }` para fallo interno/red, respuesta binaria inválida o 5xx upstream. |

Los errores JSON nunca llevan attachment ni se guardan como `.csv`. El BFF
envía `Accept: text/csv` al Backend; si falta Accept o vale `*/*`, CSV es el
único éxito. OpenAPI documentará también 406/503 y los headers reales.

La descarga de negocio se limita a GET. Backend deniega otros métodos en esa
ruta; BFF responde HEAD 405 directamente, evitando la generación automática
que Next.js haría al resolver HEAD mediante GET. Ninguna sonda HEAD genera audit.

## 5. Esquema y serialización CSV

| Posición / columna | Fuente aprobada | Representación |
| --- | --- | --- |
| 1 `propertyId` | row.propertyId | UUID canónico |
| 2 `timezone` | row.timezone | Texto de property; no conversión de stayDate |
| 3 `currency` | row.currency | Código de moneda; este reporte no lleva importes |
| 4 `stayDate` | row.stayDate | YYYY-MM-DD local |
| 5 `physicalRooms` | row.physicalRooms | Entero >= 0 |
| 6 `outOfOrderRooms` | row.outOfOrderRooms | Entero >= 0; OOS no descuenta |
| 7 `availableRooms` | row.availableRooms | Físicas − OOO |
| 8 `onBooksRooms` | row.onBooksRooms | Stay elegibles por noche; multi-room por Stay |
| 9 `onBooksPercent` | row.onBooksPercent | Decimal `100.00`, sin símbolo %; puede superar 100; vacío si capacidad cero |
| 10 `unavailableReason` | row.unavailableReason | `NO_AVAILABLE_ROOMS` si capacidad cero; vacío en otro caso |
| 11 `calculatedAt` | report.calculatedAt | Instant UTC ISO-8601, mismo valor para todas las filas |

No se vuelve a calcular porcentaje en BFF ni navegador. Usar BigDecimal del
servicio y decimal plano; los ceros finales son una representación CSV, no
otra métrica. Las filas son la respuesta de **esta generación**, no una copia
de la tabla que el usuario consultó antes: cambios concurrentes pueden producir
diferencias; UI explicará que exporta el estado actual del rango aplicado.

Reglas del serializador:

1. Emitir BOM UTF-8 exactamente una vez; luego cabecera y filas, terminadas en CRLF.
2. Escapar cada celda individualmente: duplicar comillas dobles y envolver en
   comillas cuando contenga coma, comillas, CR o LF. No añadir `sep=` ni fórmulas
   como `="valor"` para preservar formatos.
3. En celdas de tipo texto, prefijar apóstrofo si el primer carácter es tab/CR/LF
   o si, tras espacios/controles iniciales, empieza con `=`, `+`, `-` o `@`.
   Conservar el texto restante y aplicar después escape CSV. Las columnas
   numéricas válidas se emiten como números y nunca reciben apóstrofo.
4. No incluir PII, nombre libre de property, token, URL, paths internos ni texto
   del error. Campos obligatorios inválidos abortan generación; no sustituir por
   cero o texto de ejemplo. Null solo se acepta donde lo permite el DTO.
5. Si una respuesta válida excepcionalmente no trae filas, emitir BOM y cabecera
   únicamente, con 200; audit se basa en scope autorizado, no en filas visibles.
   El generador actual produce una fila por property/noche, aun sin Rooms.

### Ejemplo sintético de contrato

No son datos del hotel. El BOM no se representa visualmente en este bloque;
el archivo real propuesto usa CRLF. Las dos filas pertenecen a dos properties
autorizadas del mismo reporte ALL_PROPERTIES:

```csv
propertyId,timezone,currency,stayDate,physicalRooms,outOfOrderRooms,availableRooms,onBooksRooms,onBooksPercent,unavailableReason,calculatedAt
00000000-0000-4000-8000-000000000001,America/Guatemala,GTQ,2035-01-01,3,1,2,3,150.00,,2035-01-01T12:00:00Z
00000000-0000-4000-8000-000000000002,America/Guatemala,USD,2035-01-01,0,0,0,0,,NO_AVAILABLE_ROOMS,2035-01-01T12:00:00Z
```

La sobreventa conserva 150.00; la segunda fila expresa ausencia de denominador,
no porcentaje cero. No se agregan monedas ni se derivan ingresos.

## 6. Auditoría y límite de la evidencia

Nuevos códigos aprobados: action `REPORT_EXPORT_GENERATED`, entityType
`REPORT_EXPORT`. No implican crear entidad/tabla de negocio. `entityId` será un UUID de
generación asignado por Backend, común a los eventos del mismo archivo;
`correlationId` usará ese mismo UUID. Cada evento conserva su ID propio.

Por cada property del scope autorizado se emite `AuditService.record` con:

- actorType STAFF y actorId desde la sesión Backend validada; nunca del cliente.
- propertyId explícito; ninguna fila global con propertyId null para ALL_PROPERTIES.
- beforeState null, reason null y afterState JSON de allowlist:
  `organizationId`, `report` fijo `ON_BOOKS_DAILY`, `format` fijo `CSV`, `from`,
  `to`, `requestedScope` PROPERTY/ALL_PROPERTIES, `calculatedAt` y
  `rowCount` de **esa property**. Organización capturada del snapshot autorizado
  al emitir; no reconstruida de memberships futuras.
- Sin contenido CSV, lista de otras properties, parámetros crudos, token,
  nombre, correo, sessionId, IP, user agent o motivo libre.

Estos nombres/valores de metadatos son parte del contrato aprobado. C6 no garantiza
que su futura proyección administrativa los publique: necesitará mapping y
allowlist explícitos; no exponer afterState crudo ni reutilizar consultas de
audit sin autorización.

La fachada de exportación debe autorizar y resolver scope una sola vez para
el cálculo y la emisión, reutilizando internamente el cálculo on-books. Una
transacción de escritura confirma todos los eventos o ninguno. El servicio
read-only actual necesita una composición/refactor interno con pruebas para
esta fachada; no se adjunta audit a una transacción read-only ni se fabrica
un scope a partir de IDs enviados por Web. Comprobar rollback y flush antes de
escribir la respuesta HTTP.

El hecho auditado es **archivo generado y autorizado para responder**, no prueba
de entrega, guardado ni apertura. Una desconexión posterior al commit puede dejar
un evento válido aunque el usuario no reciba el archivo. No renombrarlo como
descarga completada. Fallos previos no emiten este evento de éxito; ampliar la
taxonomía a intentos fallidos requeriría un contrato propio.

### Reintento e idempotencia de esta lectura

No se crean reservas, pagos, jobs ni entidad de exportación; no se propone
Idempotency-Key o recibo de negocio. Cada solicitud HTTP nueva representa una
nueva generación del estado actual y se audita como tal. Dos generaciones
legítimas no se fusionan por igualdad de filtros; podrían tener datos distintos.

Dentro de una generación se llama al emisor una vez por property, sin retry
aislado de inserts; rollback descarta el conjunto. El BFF/navegador no repite
automáticamente una petición ante red/timeout/5xx: muestra fallo y permite
reintento explícito como generación nueva. Solo se permite una restauración
Staff y repetición tras 401 ocurrido antes de calcular/auditar. No se promete
replay del mismo archivo si hubo desconexión después del commit.

## 7. BFF y consumidor Web

Backend sigue siendo autoridad de permisos y membership. El BFF usa solo cookie
Staff HttpOnly para Bearer interno, `cache: no-store`, lectura dinámica y abort
cuando el cliente cancela. Ignora Bearer aportado por navegador y cookies Guest.
No calcula ni genera CSV localmente a partir de la tabla o de mocks.

Para éxito: admitir solo media type CSV y attachment con nombre generado según
el patrón fijo; construir headers de salida de allowlist, sin copiar Set-Cookie,
Authorization, headers internos o un nombre de archivo libre. Conservar bytes
UTF-8/BOM y no convertir por `.json()`/`.text()`. Rechazar un 200 JSON/HTML o
sin formato contratado con 503. No almacenar en filesystem, caché de Next.js,
React Query persistente, localStorage ni service worker.

El transporte binario se añadirá explícitamente a infraestructura Web aprobada
y devolverá DTO de archivo (Blob y nombre validado), mapper a modelo de
descarga y hook/state. La UI iniciará descarga tras acción del usuario con
filtros ya aplicados/válidos; deshabilitará doble envío y revocará el object URL
tras usarlo o desmontarse. No fetch directo desde el componente.

Cambio de sesión/scope, edición de fechas sin aplicar o error no deben exportar
filtros ambiguos. UI identifica el rango aplicado y que la exportación recalcula
el estado actual; no etiqueta como histórica ni muestra éxito hasta disponer de
archivo válido. Falta de permiso y expiración siguen las reglas Staff existentes.
La ubicación y texto del control se contrastarán con Figma V3 al implementar.

## 8. OpenAPI y archivos de implementación previstos

Tras aprobación, documentar GET CSV en OpenAPI con Bearer Staff real, parámetros
compartidos, respuesta string/binary `text/csv`, headers/errores de este contrato.
Conservar GET JSON y su schema; probar `/v3/api-docs`, cobertura de mappings y
ausencia de un endpoint público anónimo. Añadir solicitud CSV a Postman BD1.

Áreas de la implementación BE-010B-CSV-01:

- Backend inventory: fachada/serializador CSV y controller; reutilización de
  autorización/cálculo del servicio actual sin duplicar SQL; manejo de errores.
- Configuración Security: permitir solo la ruta/método Staff aprobados, no un
  wildcard de exportaciones; emisor AuditService existente.
- Tests Backend: formato, servicio/HTTP/SQL/audit, rollback, Security y OpenAPI.
- Web: ruta BFF candidata, infraestructura binaria Staff, service/DTO/mapper,
  hook y control en DailyOnBooksDashboard; pruebas de descarga, errores y sesión.
- Contrato, guía QA, Postman, Reporting Web y control AlanPlan/Handoff.

Android no tiene consumidor CSV en este incremento; el GET JSON previo no
cambia y no requiere adaptar sus DTOs. Si incorpora esta exportación deberá
definir su transporte Staff propio; no comparte cookies Web ni adopta mocks
como contrato Backend.

## 9. Aceptación y matriz QA para implementar

| Caso | Resultado esperado propuesto |
| --- | --- |
| RECEPCIÓN con RESERVATION_MANAGE, PROPERTY propia | 200 CSV real; filas exactas y un evento de esa property. |
| COMMERCIAL_MANAGE sin permiso de reservas | Puede exportar PROPERTY autorizada; no se exige ambos permisos. |
| Sin sesión, Guest, Staff revocado | 401; no query del reporte ni evento de éxito. |
| Staff sin ambos permisos; property ajena o inexistente no autorizada | 403 indistinguible; sin filas/evento exitoso. |
| ALL_PROPERTIES sin MULTI_PROPERTY_READ, incluso con una property | 403. |
| Perfil autorizado con dos properties y tercera ajena | Solo las dos autorizadas; un evento por cada una, correlación común; sin IDs/filas de la tercera. |
| UUID/fecha inválidos; rango invertido; scope omitido/doble; parámetro repetido/desconocido | 400 antes del SQL del reporte, sin archivo parcial. |
| 366 frente a 367 noches | 366 aceptadas si respeta límite de filas; 367 rechazadas. |
| 50 000 frente a 50 001 filas solicitadas | Límite exacto aceptado; exceso 400 sin truncar. Aislar el guard en prueba; QA HTTP puede usar 137 properties × 366 = 50 142 para exceso. |
| Multi-room, checkout exclusivo, padre cancelado, NO_SHOW/CHECKED_OUT, OOO solapado/liberado y OOS | Paridad con cálculo on-books aprobado; regresión del GET JSON intacta. |
| availableRooms=0 y sobreventa | Vacío + NO_AVAILABLE_ROOMS; porcentaje mayor de 100 conservado, a dos decimales. |
| Texto con coma/comillas/CR/LF y prefijos =,+,-,@, tab y espacios previos | Parseo conserva 11 columnas; escape/neutralización por celda; números no se convierten en fórmula/texto. |
| Sin filas | BOM y cabecera, 200; audit de scope autorizado. Property sin Rooms sigue generando filas cero. |
| Monedas diferentes y dos zonas horarias | Filas separadas; fechas locales y sin sumas/FX; calculatedAt UTC común. |
| Generación/serialización falla o segundo insert audit falla | 503; ningún evento del conjunto ni bytes de éxito. |
| Commit audit seguido de desconexión | Eventos significan generación; no se atribuye entrega. Reintento explícito crea otra generación con otro UUID. |
| 401 BFF antes de generar | Refresh Staff como máximo una vez; Guest intacto; una única generación exitosa. |
| Red/5xx o respuesta 200 HTML/JSON inesperada | Error visible, sin archivo falso ni retry automático. |
| Cualquier estado BFF | private, no-store; tokens/headers internos ausentes. |
| UI: doble clic, cambio de scope y fechas no aplicadas | Una petición activa por acción; filtros explícitos; ninguna descarga de otro scope o de fechas ambiguas. |

Dataset QA controlado y sintético, aislado del hotel: cubrir dos properties
autorizadas y una ajena, capacity cero, multi-room, OOO y sobreventa verificable.
Para comparar JSON/CSV, fijar fuentes sin mutaciones entre peticiones y comparar
campos de negocio; calculatedAt puede variar. Congelar reloj solo en pruebas.

DoR de implementación: aprobación explícita de las recomendaciones y taxonomía,
dependencias verificadas, incremento/owner registrados, contrato consistente,
entorno Java 21/PostgreSQL 17/Docker y plan QA disponibles.

DoD de implementación: tests relevantes y `./mvnw -B verify`, Web `npm run check`,
OpenAPI/Postman/docs alineados, diff limpio, SQL scoped y audit append-only
probados; QA Docker con Backend real, RECEPCIÓN y multi-property autorizado,
y usuario confirma QA manual PASS. Hasta esa confirmación queda EN_QA.

## 10. Aprobación y entrega

El usuario aprobó íntegramente este paquete el 2026-10-21: «Si Apruebo todo».
BE-010A-CSV-01 COMPLETADA; BE-010B-CSV-01 implementa únicamente este CSV.
La aprobación contractual no equivale a QA manual de su implementación.

Evidencia, límites del entorno y pasos para confirmar el cierre:
[guía QA CSV](REPORTING_ON_BOOKS_CSV_QA.md), AlanPlan y AlanHandoff.
