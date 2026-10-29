# Plan de contratos e integración de Reportes

Fecha: 2026-10-21. Estado: ejecución incremental autorizada.
El usuario delegó elegir reglas/contratos según el contexto y autorizó comenzar
los incrementos. Cada decisión se registra y contrasta con fuentes antes de
implementar; no se atribuye aprobación docente ni QA manual a esa delegación.
Los números de etapa son orden del plan, no nuevos IDs de backlog.

Avance: on-books consulta con QA PASS; CSV implementado EN_QA; contrato
[llegadas/salidas pendientes](../backend/docs/REPORTING_ARRIVALS_DEPARTURES_CONTRACT.md)
aprobado por delegación, implementación BE-010B-ARRDEP-01 integrada en Backend,
BFF y UI con smoke HTTP PASS y Compose actualizado. Backend verify completo
895/895 PASS y Web 1936/1936 PASS, lint/typecheck y build Docker PASS.
Queda EN_QA hasta el recorrido manual del usuario. El build local Next pasó en
el reintento sin borrar archivos tras un `EPERM` transitorio del sandbox Windows.
Los movimientos realizados requieren captura de fechas efectivas en origen;
no se reconstruyen desde updated_at. La situación actual de housekeeping ya
está implementada en Backend, OpenAPI, BFF y UI, con smoke real OPERACIONES y
GERENCIA en QA aislado. El usuario confirmó QA manual PASS; sigue EN_QA
hasta recibir el resultado de `mvn verify` integral. El resto conserva sus
dependencias.

Inspección para la etapa 3: `rooms` es el censo de habitaciones físicas y
`hk_room_states` guarda como máximo una fila actual por habitación seguida;
las habitaciones sin fila no tienen estado housekeeping conocido. Los estados
persistidos son DIRTY, CLEAN e INSPECTED, con DND como indicador independiente.
El permiso existente para operaciones es `OPERATIONS_MANAGE`; ALL_PROPERTIES
requiere además `MULTI_PROPERTY_READ`. Esto permite preparar un contrato de
**situación actual** que distinga habitaciones sin seguimiento, sin convertir
el estado presente en actividad o cumplimiento histórico. La vista de detalle
Figma se verificó: el centro PRI-24 (`233:1756`) nombra housekeeping en
Operación, sin marco de detalle HK. La
[propuesta de fotografía actual de housekeeping](../backend/docs/REPORTING_HOUSEKEEPING_CURRENT_CONTRACT_PROPOSAL.md)
define contadores trazados al esquema, scope Staff y casos QA. Permanece
**APPROVED por delegación** tras cotejar Figma. La vista usa el shell de
Reportes sin atribuir paridad
de un detalle inexistente. El endpoint y la vista consultan la fuente real;
las cifras del smoke corresponden solo a fixtures de QA.
Mantenimiento sigue siendo un contrato distinto.

## Base y control operativo

On-books diario ya tiene contrato Backend aprobado, BFF Staff y QA manual PASS
del 2026-10-20. Las demás funciones se mantienen pendientes según la
[matriz Web](../frontend/pms-hotel-web/docs/20_REPORTING.md).

- Backend: BE-010A/B en [AlanPlan](../backend/docs/AlanPlan.md) y evidencia en
  [AlanHandoff](../backend/docs/AlanHandoff.md). Allí se registrarán los IDs de
  cada incremento al abrirlo, su owner, dependencias, DoR y estado.
- Web: `IMP-WEB-0908` para catálogo/ejecución; `IMP-WEB-0909` para exportación.
  El XLSX canónico conserva su autoridad sobre Web y no se edita con este plan.
- Fuente visual: `V3 — 08 Reporting` del
  [catálogo Figma](../frontend/pms-hotel-web/docs/01_FIGMA_SCREEN_CATALOG.md).
  Antes de cada vista, identificar sus marcos y controles verificables.
- Semántica: [C7](../backend/docs/33_BD1_REPORTING_CONTRACT_C7_PROPOSAL.md),
  [on-books HTTP](../backend/docs/34_BD1_ON_BOOKS_HTTP_CONTRACT_PROPOSAL.md),
  [C2](../backend/docs/09_AUTHORIZATION_SCOPE_CONTRACT_C2.md) y
  [property scope](05_PROPERTY_SCOPE.md).

Cada contrato empieza con una comprobación del código, esquema, pruebas y
decisiones vigentes. El inventario histórico de C7 se revalida: un snapshot de
precio de booking que exista hoy debe analizarse, pero no acredita por sí solo
ingreso neto reconocido por noche ni capacidad histórica.

## Responsables

| Trabajo | Responsable de preparación | Colaboración |
| --- | --- | --- |
| Reportes Backend, contrato HTTP, acceso y exportación | Alan / BD1 | Juan / BD3 por fuentes de reservas y operaciones |
| Reservas, housekeeping, mantenimiento y Night Audit | Juan / BD3, dentro de su dominio vigente | Alan / BD1 para transporte, acceso y auditoría |
| Fuente financiera y capacidad histórica del antiguo dominio BD2 | Alan y Juan deben acordar un owner de entrega antes de iniciar | Producto resuelve reconocimiento, correcciones y métricas |
| Catálogo, BFF y vistas de Reportes Web | WEB-3 | WEB-2 para sesión/scope; WEB-4 para finanzas, disponibilidad y revenue |
| Reglas nuevas de negocio | Usuario/Producto, conforme a la jerarquía del repo | Owners aportan alternativas y evidencia |

El [traspaso BD2](../backend/docs/23_BD2_BACKEND_HANDOVER.md) mantiene pendiente
el reparto concreto entre Alan y Juan; este plan no asigna ese trabajo a José.
Las revisiones colaborativas no sustituyen decisiones necesarias de producto ni
bloquean por sí solas si no existe un requisito expreso de aprobación.

## Orden recomendado

| Etapa | Contrato a preparar | Decisiones y entrega concreta | Dependencia para integrar |
| --- | --- | --- | --- |
| 1 | CSV de on-books diario | Completar transporte de exportación, columnas, formato, errores y auditoría sobre C7-D09. Primera propuesta revisable descrita abajo. | Contrato CSV aprobado; consulta on-books existente. No depende de ingresos. |
| 2 | Llegadas y salidas | Separar previsto y realizado; definir unidad por Stay, elegibilidad, fecha local, cancelación/no-show, cambios de fechas y si habrá detalle o solo agregados. Contrastar datos persistidos antes de ofrecer realizados. | Decisiones BD3/Producto y contrato específico aprobado; eventos reales si la vista los requiere. |
| 3 | Housekeeping y mantenimiento | Contrato HK actual aprobado bajo delegación: `rooms` más `hk_room_states`, con habitaciones sin seguimiento explícitas y DND transversal. BE-010B-HKCUR-01 EN_QA con QA manual PASS. [Contrato de mantenimiento actual](../backend/docs/REPORTING_MAINTENANCE_CURRENT_CONTRACT_PROPOSAL.md) aprobado bajo delegación sobre órdenes OPEN/IN_PROGRESS; Backend/BFF/Web desplegados, smoke Docker OPERACIONES/GERENCIA, OpenAPI vivo y QA manual del usuario PASS; BE-010B-MTCUR-01 EN_QA. El historial de transiciones y SLA exige fuente/contrato separados. | Cerrar verify Backend y suite Web integral. Figma solo aporta el centro, sin detalles HK/mantenimiento para paridad pixel a pixel. |
| 4 | Ingresos de habitación, C7-D03/D06 | Acordar owner y fuente por noche/business date; separar alojamiento, impuestos, extras, descuentos, reembolsos y compensaciones; moneda, reconocimiento y corrección de días cerrados. Documentar si requiere nueva persistencia. | Contrato financiero y cambios de fuente necesarios aprobados e implementados. Su preparación puede iniciarse sin esperar CSV, en un incremento propio autorizado. |
| 5 | Ocupación realizada e histórica | Definir noche efectivamente ocupada, tratamiento de estancias parciales y denominador físico histórico; determinar qué eventos/snapshots existen y desde qué fecha hay cobertura verificable. | Definición aprobada y fuente histórica disponible. No depende automáticamente del contrato financiero. |
| 6 | ADR y RevPAR | Aplicar C7-D04 al ingreso neto confirmado; fijar noches elegibles, denominadores, redondeo, ceros, moneda y agregación por property antes de dividir. | Etapa 4 cerrada; definición y fuente aprobadas para cada denominador. Etapa 5 solo si el contrato de ese denominador la requiere. |
| 7 | Pickup/pace | Fijar cortes comparables, horizonte de estancia, cadencia de captura, correcciones y cobertura inicial de snapshots C7-D05. | Snapshots persistidos y contrato de comparación aprobado; sin reconstrucción ficticia anterior al primer corte. |
| 8 | Cumplimiento, exportación contable y demás vistas comerciales/financieras | Inventariar cada salida de Figma y precisar finalidad, campos, fuente, acceso, formato, retención y destino. Tratar INGUAT, FEL/SAT, DIACO y auditoría como contratos separados. | Owner y alcance de cada salida confirmados; reglas fiscales/regulatorias verificadas cuando corresponda. Exportación contable depende de su fuente financiera específica. |
| 9 | Vistas guardadas, programación y alertas | Primero persistencia de filtros por usuario/property y cambios de permisos; después entrega, destinatarios autorizados, zona horaria, cadencia, dedupe, reintentos, fallos y retención. | Reporte objetivo integrado y contratos de persistencia/entrega aprobados; transporte/proveedor cuando aplique. |

Este orden prioriza entregas pequeñas verificables. No crea una dependencia
global entre etapas: cada reporte puede avanzar cuando sus propias fuentes y
decisiones estén listas. No se fijan fechas hasta conocer el tamaño de los
contratos, la disponibilidad de los responsables y las dependencias de datos.

## Primer paquete: contrato CSV de on-books

El usuario aprobó íntegro el contrato CSV el 2026-10-21 («Si Apruebo todo»).
`BE-010A-CSV-01` COMPLETADA; `BE-010B-CSV-01` implementa el alcance aprobado,
con pruebas técnicas y QA manual propios. Disponibles el
[contrato aprobado](../backend/docs/REPORTING_ON_BOOKS_CSV_CONTRACT_PROPOSAL.md)
y la [guía QA](../backend/docs/REPORTING_ON_BOOKS_CSV_QA.md).

Owner de preparación: Alan / BD1; consumidor WEB-3; revisión de acceso WEB-2
y de fuente Juan / BD3. Trazabilidad: BE-010 y futuro alcance de IMP-WEB-0909.
Estado de implementación: en validación; no COMPLETADA hasta QA manual PASS.

1. Verificar la consulta y pruebas on-books vigentes, C6/auditoría y el flujo de
   descarga Staff. Reutilizar la consulta autorizada y la definición actual de
   las filas; no crear otro cálculo de inventario o de noches.
2. Redactar la propuesta en `backend/docs/REPORTING_ON_BOOKS_CSV_CONTRACT_PROPOSAL.md`
   al iniciar ese incremento. Incluir método/ruta Backend y BFF para revisión,
   request, response de archivo, errores, headers, auth, scope, auditoría y QA.
   Este plan no fija rutas nuevas ni DTOs.
3. Incorporar las reglas ya aprobadas: UTF-8, hasta 366 días y 50 000 filas,
   filtros/permisos de la consulta, exclusión de PII, escape de celdas y
   neutralización de prefijos de fórmula en texto.
4. Proponer columnas a partir de la respuesta aprobada: propertyId, timezone,
   currency, stayDate, físicas, OOO, disponibles, on-books, porcentaje y motivo
   de ausencia; decidir representación de calculatedAt sin romper el CSV.
5. Llevar a decisión las opciones aún abiertas: delimitador y BOM, nombres y
   orden de columnas, decimales/null, archivo vacío, nombre de archivo,
   `Content-Type`/`Content-Disposition`, errores antes de iniciar descarga,
   momento de auditoría y conducta ante fallo parcial. Definir eventos/campos
   de audit conforme al contrato vigente, sin inventar taxonomía.
6. Añadir ejemplos de contrato y dataset QA sintético identificado como tal:
   una property, dos properties autorizadas, capacidad cero, porcentaje mayor
   de 100, ausencia de filas y límites. No presentarlos como datos del hotel.
7. Entregar el borrador con decisiones recomendadas, alternativas e impacto.
   Registrar la aprobación y completar DoR antes de Backend/BFF/UI.

Aceptación del contrato: cada columna traza a un dato aprobado; filtros,
scope y límites son inequívocos; ejemplos y errores coherentes; auditoría y
seguridad CSV definidas; las decisiones pendientes quedan resueltas y registradas.

## Ficha obligatoria para los siguientes contratos

Cada propuesta debe contener:

1. Objetivo, referencia Figma verificada, consumidor y límites de la vista.
2. Owner, reviewers, tarea operativa y dependencias con estado comprobado.
3. Diccionario de métricas: unidad, fórmula, fuente persistida y campo/consulta,
   inclusiones/exclusiones, null frente a cero y casos límite reproducibles.
4. Tiempo: instante de cálculo, noche local o business date, zona horaria,
   inclusividad del rango, correcciones y alcance histórico garantizado.
5. Moneda e importes menores si aplica; reglas de redondeo y agregación por
   property/moneda. Nunca mezclar monedas por omisión.
6. Transporte completo según la
   [política API](../backend/docs/02_API_CONTRACT_POLICY.md): métodos/rutas
   propuestos, filtros, límites, DTO, errores, orden/paginación, sesión Staff,
   permisos existentes que correspondan, scope, auditoría e idempotencia si aplica.
7. Brechas de fuente/persistencia y alternativas; migraciones nuevas solo tras
   aprobarlas, sin modificar migraciones aplicadas.
8. Decisiones aprobadas y abiertas por separado; ejemplos, aceptación, DoR,
   DoD, archivos previstos y matriz QA con resultados esperados.

## Integración de cada contrato aprobado

| Paso | Entrega verificable |
| --- | --- |
| Preparar | Crear rama de implementación y registrar base; validar cambios ajenos, contrato, datos fuente, dependencias y DoR en AlanPlan/Handoff. |
| Backend | Autorización y scope antes de query; cálculo desde fuente real; tests de dominio/SQL/HTTP; OpenAPI generado y Postman alineados en el mismo incremento. |
| BFF | Cookie Staff HttpOnly hacia Bearer interno; proyección permitida, errores públicos y `private, no-store`; conservar Backend como autoridad final y no ampliar scope. |
| Web | Service → DTO → Mapper → Domain → Hook/State → UI; controles Figma solo cuando la función esté integrada; carga, error, vacío, datos no disponibles y accesibilidad. |
| Validar | Backend `./mvnw -B verify` con Java 21/PostgreSQL 17; Web `npm run check`; gates locales/CI aplicables; evidencia breve y sanitizada. |
| QA integrado | Docker activo y build real sin mocks; RECEPCIÓN en property autorizada cuando el contrato lo permita; perfil multi-property autorizado con al menos dos properties; paridad UI/BFF/Backend/dataset. |
| Cerrar | Documentos y OpenAPI coherentes, aceptación PASS y usuario confirma QA manual PASS. Implementación EN_QA hasta esa confirmación, según backend/AGENTS.md. |

La ejecución de un reporte no habilita exportarlo, programarlo ni guardarlo
si esas acciones todavía carecen de contrato propio.

## Matriz mínima de verificación por reporte

- Sesión ausente, Guest, Staff revocado, permiso insuficiente y acceso válido;
  cambio de autorización después de iniciar sesión.
- PROPERTY propia, ajena y no existente; ALL_PROPERTIES sin permiso y con
  MULTI_PROPERTY_READ; ausencia de fallback y filtrado SQL previo a agregación.
- Fechas inválidas/invertidas, límites y rango local; cambio de zona horaria/DST
  cuando aplique; parámetros duplicados/desconocidos según contrato.
- Resultado vacío, dato no disponible y cero real; multi-room por Stay,
  cancelación/no-show y OOO/OOS según la métrica; denominador cero y sobreventa
  para on-books; importes exactos, reembolsos y monedas para finanzas.
- Fallo Backend/red, reintento y recuperación sin duplicar efectos; errores
  públicos y ausencia de tokens/PII o caché sensible en navegador.
- CSV: límites 366/367 y 50 000/50 001, comillas, delimitadores, saltos de línea,
  prefijos de fórmula, paridad de filtros y evidencia de auditoría.

## Inicio y criterio de avance

El CSV y llegadas/salidas pendientes tienen contrato e implementación EN_QA;
falta su QA manual. El incremento activo es **situación actual de housekeeping**,
integrado en Backend/BFF/Web y en cierre de gates y QA. Después continúan
reportes operativos contra sus fuentes verificadas.
El trabajo de preparación financiera empieza con designar al owner C7-D03 y
levantar evidencia de fuentes, en un incremento propio autorizado.

El plan queda entregado cuando referencias, secuencia, responsables, decisiones,
dependencias y gates están revisados. Eso no cambia a READY los reportes
pendientes. Las decisiones de contrato siguen el
[control de cambios](10_CHANGE_CONTROL.md); publicación y avance de tareas
Backend conservan las autorizaciones exigidas por el repositorio.
