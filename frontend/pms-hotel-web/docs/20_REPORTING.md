# 20 — Reporting

Owner UI: WEB-3.
Data contributors: múltiples dominios.

## Regla
Reporting no redefine source-of-truth.

## Scope
Cada reporte debe declarar:
- property scope;
- date range;
- metric definition;
- currency;
- timezone/business date cuando aplique.

## Metrics
ADR/RevPAR/Occupancy deben usar definiciones consistentes.

## Multi-property
Agregar después de cálculo por property.

## Export
Acciones sensibles pueden requerir permiso/audit.

## Integración On-books diario (IMP-WEB-0908)

`/reportes` consulta el reporte Backend aprobado `GET /api/v1/reports/on-books/daily`
mediante el BFF Staff `GET /api/v1/private/reports/on-books/daily`. Usa la cookie
Staff HttpOnly, `RESERVATION_MANAGE` o `COMMERCIAL_MANAGE`, fechas locales inclusivas explícitas y el
scope seleccionado en la sesión. `ALL_PROPERTIES` requiere además
`MULTI_PROPERTY_READ`. Backend sigue siendo la autoridad final de permisos y
membership. El BFF devuelve solo `calculatedAt` y las filas autorizadas, con
`Cache-Control: private, no-store`.

La pantalla presenta habitaciones físicas, OOO, disponibles, on-books y
porcentaje on-books por noche. Es una consulta del estado actual, no ocupación
realizada ni una reconstrucción histórica. Ingresos, ADR y RevPAR dependen de la
fuente financiera C7-D03. El CSV tiene un incremento específico aprobado abajo.

## Catálogo V3 — 08 Reporting

El catálogo de Figma muestra Operación, Finanzas, Cumplimiento y Comercial.
La vista Web presenta las cuatro categorías a Staff autorizado. Operación
incluye on-books diario, llegadas/salidas pendientes, housekeeping actual y
mantenimiento actual con consultas Backend;
las demás categorías,
programación, vistas guardadas y exportación contable indican que la integración
está pendiente, sin cifras de ejemplo ni acciones simuladas. El detalle usa el
lenguaje visual de Figma y etiqueta las métricas como on-books, nunca como
ocupación realizada. RECEPCION accede con `RESERVATION_MANAGE` solo a las
properties de su sesión; no recibe permiso de escritura comercial.

## QA del catálogo y on-books (2026-10-20)

Web lint, typecheck, build y suite completa (301 archivos, 1827 pruebas) PASS.
Backend on-books y OpenAPI (25 pruebas) PASS. Con Docker Backend/Web/PostgreSQL
healthy, una sesión RECEPCION mostró Reportes y consultó Hotel Boutique Demo
para 2026-10-20: 24 disponibles, 3 on-books, 0 OOO y 12.50% en tarjetas y tabla.
El usuario revisó la pantalla y confirmó QA manual PASS. Este cierre se limita
al catálogo y al reporte on-books real; las demás funciones siguen pendientes
de contrato e integración.

## Pendientes del catálogo V3 (revisión 2026-10-21)

Preparación e integración por contrato:
[Plan de integración de Reportes](../../../docs/PLAN_INTEGRACION_REPORTES.md).

Control Web: `IMP-WEB-0908` (WEB-3, revisión WEB-2; depende de
`IMP-WEB-0017` y `IMP-WEB-0905`) exige contrato de reporte listo, scope y fechas
explícitos, resultado y estados de carga/error/vacío con pruebas RTL. El slice
on-books satisface ese alcance con el contrato BE-010B aprobado y el QA anterior;
la tarea completa del catálogo no equivale a todos los reportes conectados.
`IMP-WEB-0909` (exportación; WEB-3, revisión WEB-2) depende de 0908 y exige
contrato de exportación, autorización, scope, auditoría y ausencia de caché
sensible. La fila XLSX permanece sin edición.

| Reporte o vista | Clasificación actual | Definición o dependencia que falta |
| --- | --- | --- |
| Reservaciones on-books diario | Implementable con contrato aprobado; integrado y QA manual PASS | Solo seguimiento de revisión de paridad ATS/ReservationStay y BFF. No ampliar su semántica a ocupación realizada. |
| Ocupación realizada e histórica | Requiere decisión de métrica y datos fuente | Definir noches efectivamente ocupadas, denominador y business date por property; persistir eventos o snapshots que permitan reconstrucción histórica. El estado actual de `ReservationStay` y OOO liberados no la reconstruye. Después, aprobar contrato HTTP BE-010B. |
| Llegadas y salidas pendientes | Contrato aprobado por delegación; Backend/BFF/UI integrados y smoke HTTP PASS, EN_QA | Cuenta Stay según estado actual/fechas programadas. Backend verify y componentes del gate Web PASS; falta QA manual. Realizados siguen sin fuente de fechas efectivas ni contrato de eventos. |
| Housekeeping actual | [Contrato aprobado bajo delegación](../../../backend/docs/REPORTING_HOUSEKEEPING_CURRENT_CONTRACT_PROPOSAL.md); Backend/BFF/UI implementados, QA manual PASS; verify Backend integral pendiente tras caída Docker | Fuente `rooms` + `hk_room_states` verificada. El centro PRI-24 de Figma incluye housekeeping en Operación, sin marco de detalle HK; usa el shell existente y distingue habitaciones sin estado de DIRTY. |
| Mantenimiento actual | [Contrato aprobado bajo delegación](../../../backend/docs/REPORTING_MAINTENANCE_CURRENT_CONTRACT_PROPOSAL.md); Backend/BFF/UI desplegados, EN_QA | `maintenance_orders` conserva órdenes actuales. Backend focal, OpenAPI vivo, smoke Docker OPERACIONES/GERENCIA y QA manual del usuario PASS; faltan suites integrales. Sin historia ni SLA. |
| Historial/SLA de mantenimiento y housekeeping | Bloqueado por fuente temporal y contrato propio | Validar cobertura de eventos, reaperturas, asignaciones y tiempos antes de agregar por periodo. `updated_at` no reconstruye todas las transiciones. |
| Ingresos | Bloqueado por fuente financiera y C7-D03 | BD2/BD3/Producto deben designar origen persistido del ingreso neto de habitación por noche y separar impuestos, servicios, descuentos y reembolsos. Definir business date y correcciones de días cerrados (C7-D06), moneda y contrato HTTP. `PAYMENT` contable no prueba capture. |
| ADR y RevPAR | Bloqueado por ingresos C7-D03 | C7-D04 fija fórmulas condicionadas; falta numerador financiero verificable y contrato de consulta. No calcular desde RatePlan, total de reserva o folio sin desglose. |
| Pickup/pace comercial | Bloqueado por snapshots C7-D05 | Definir cortes comparables y persistir on-books por fecha de corte; `created_at` más el estado actual no reconstruyen el pasado. |
| Cumplimiento (INGUAT, FEL/SAT, DIACO, auditoría) y demás vistas financieras/comerciales | Requiere contrato Backend aprobado | Cada vista necesita fuente, campos, periodo, permiso, scope, datos sensibles y aceptación propios. Los nombres del catálogo Figma no aprueban rutas ni DTOs. |
| CSV on-books diario | Contrato aprobado; implementación BE-010B-CSV-01 en validación | Gate automatizado y QA integrado/manual propios; no cierra exportación contable ni CSV de otros reportes. |
| Exportación contable y CSV de otros reportes | Requiere contrato específico aprobado | C7-D09 fija límites/seguridad; faltan fuente, campos y transporte para cada salida. El alcance general de `IMP-WEB-0909` no se declara cerrado por el CSV on-books. |
| Programación, alertas y vistas guardadas | Requiere decisión de producto y contrato Backend | Definir persistencia, propietario/scope, permisos, filtros/versionado, entrega, zona horaria, cadencia y fallos. El `localStorage` provisional del módulo no es una integración ni debe exponerse como función terminada. |

Propuesta para el siguiente contrato BE-010B: elegir **un** reporte con fuente
persistida verificable; registrar primero definición, owner y aceptación,
fechas/timezone, moneda si aplica, autorización y scope; después fijar ruta,
DTO, errores y OpenAPI. Hasta aprobarlo, el catálogo solo informa que esas
vistas están pendientes y no ofrece valores o acciones simulados.

## Housekeeping actual — BE-010B-HKCUR-01

El contrato BE-010A-HKCUR-01 aprobado bajo delegación define GET Backend
`/api/v1/reports/housekeeping/current` y BFF Staff
`/api/v1/private/reports/housekeeping/current`. No acepta fechas: la fotografía
se calcula al consultar. `OPERATIONS_MANAGE` habilita la vista; ALL requiere
además `MULTI_PROPERTY_READ` y se limita a memberships activas. Una sesión
solo de Operaciones ve el enlace Staff a Reportes y housekeeping sin acciones
de reservaciones; RECEPCIÓN no ve la acción HK. Backend sigue siendo autoridad
para denegar accesos.

Backend cuenta `rooms` físicas con `hk_room_states` opcional, incluidas OOO/OOS,
sin convertir habitaciones sin seguimiento en DIRTY. La tabla muestra una fila
por property, incluso cero habitaciones, y separa con seguimiento, sin
seguimiento, DIRTY, CLEAN, INSPECTED y DND transversal. `calculatedAt` es UTC;
`timezone` pertenece a cada property. No se derivan ocupación, SLA, actividad
histórica, disponibilidad vendible ni importes.

Service → DTO → Mapper → Domain → Hook → UI. El BFF exige cookie Staff HttpOnly,
valida filtro y respuesta con allowlist, omite campos privados y envía
`private, no-store` en éxito/error. El hook aísla sesión y scope, cancela
peticiones anteriores, rechaza propiedades ajenas y no reintenta fallos sin
acción del usuario. La vista presenta carga/error/vacío, actualización explícita
y el instante consultado. Docker y QA manual PASS del usuario confirmados;
estado EN_QA hasta el resultado de `mvn verify` integral. El centro Figma
PRI-24 no contiene un detalle HK.

## Mantenimiento actual — BE-010B-MTCUR-01

El contrato BE-010A-MTCUR-01 aprobado bajo delegación define GET Backend
`/api/v1/reports/maintenance/current` y BFF Staff
`/api/v1/private/reports/maintenance/current`. `OPERATIONS_MANAGE` habilita
la vista; ALL requiere `MULTI_PROPERTY_READ` y solo devuelve properties
autorizadas por Backend. Sin filtro de fecha: es una fotografía actual de
`maintenance_orders` OPEN/IN_PROGRESS. RESOLVED/CANCELLED quedan fuera;
urgentes y sin asignar se pueden solapar. Las órdenes con habitación y de área
común dividen el total sin resolver. No se atribuyen SLA, historia, OOO ni
ocupación a estos contadores. `calculatedAt` es UTC y la zona horaria se
indica por property.

El BFF usa sesión Staff HttpOnly, allowlist y `private, no-store`. La UI sigue
Service → DTO → Mapper → Domain → Hook → UI, presenta carga/error/vacío,
refresh explícito y una fila con ceros para una property sin órdenes. Backend
focal 8/8, OpenAPI vivo, Docker y smoke UI OPERACIONES/GERENCIA/ALL PASS con
fixtures sintéticas; [QA técnica](../../../backend/docs/REPORTING_MAINTENANCE_CURRENT_QA.md)
EN_QA hasta suites integrales; QA manual PASS del usuario. Figma PRI-24 muestra el
centro de Reportes, sin detalle específico de mantenimiento.

## CSV on-books — BE-010B-CSV-01 / IMP-WEB-0909

El usuario aprobó íntegro el
[contrato CSV](../../../backend/docs/REPORTING_ON_BOOKS_CSV_CONTRACT_PROPOSAL.md)
el 2026-10-21. GET Backend `/api/v1/reports/on-books/daily/export` y BFF
`/api/v1/private/reports/on-books/daily/export` usan los mismos filtros/permisos
que JSON. Staff HttpOnly, Backend autoriza scope; no-store en todas las
respuestas y headers de descarga de allowlist. Backend genera UTF-8/BOM,
coma/CRLF y 11 columnas, con audit transaccional por property antes de responder.

La UI permite exportar únicamente el rango aplicado y válido, después de una
consulta exitosa; editar fechas sin aplicar deshabilita exportación. El CSV
recalcula el estado actual, puede diferir de la tabla anterior y no representa
ocupación histórica. Service → DTO binario → Mapper → Hook → UI; sin generación
local ni persistencia sensible. Un 401 restaura Staff una vez; no se repiten
fallos de red/5xx automáticamente. Cambio de sesión/scope o desmontaje aborta
la petición; se revoca el object URL de descarga. El mensaje de éxito acredita
archivo preparado, no recepción/guardado por el usuario.

Estado: **EN_QA**. Gate Web completo PASS (306 archivos/1881 pruebas,
lint/typecheck/build; VITEST_MAX_WORKERS=4), Backend 883 PASS y Docker sin mocks.
Smoke HTTP real RECEPCIÓN/GERENCIA, paridad JSON/CSV, scope/errores/audit y
máximo 50 000 filas PASS. OpenAPI vivo coincide con generado. La repetición Web
acotada resuelve timeouts de pruebas previas bajo carga sin cambiar sus límites.
[Evidencia y guía QA CSV](../../../backend/docs/REPORTING_ON_BOOKS_CSV_QA.md).
La herramienta visual falló en intentos iniciales; QA manual CSV pendiente de
confirmación del usuario. Un reintento posterior comprobó en el Compose
principal que el botón CSV se habilita tras consultar y que aparece «Archivo
preparado para descargar»; no se verificó contenido guardado ni se extiende
el PASS manual de on-books JSON del 2026-10-20 al CSV.

## Llegadas y salidas pendientes — BE-010B-ARRDEP-01

[Contrato aprobado bajo delegación del usuario](../../../backend/docs/REPORTING_ARRIVALS_DEPARTURES_CONTRACT.md)
el 2026-10-21. GET Backend `/api/v1/reports/arrivals-departures/daily`, BFF
`/api/v1/private/reports/arrivals-departures/daily`; mismas cuatro claves estrictas
de filtros, 366 días inclusivos/50 000 filas y permisos de lectura on-books.
Cuenta por Stay, no Reservation: llegada pendiente RESERVED; salida pendiente
RESERVED/IN_HOUSE; padre PENDING/CONFIRMED. Fechas arrival/departure locales,
incluye ceros reales por property/día y mantiene timezone/currency separados.
No eventos realizados, PII, dinero, porcentajes, exportación ni histórico.

La vista reutiliza catálogo/tokens/filtros/tabla del módulo y requiere rango
explícito. Muestra moneda y zona horaria por property; pagina de 100 en 100
filas en el cliente y retira el resultado previo si el rango enviado es inválido.
Service → DTO → mapper → domain → hook → UI, sin mock fallback;
hook incluye sesión, conjunto autorizado y rango en clave, cancela peticiones
y rechaza filas ajenas o fuera del rango. Backend resuelve acceso antes de SQL;
BFF usa cookie Staff HttpOnly, allowlist y private/no-store en éxito/error.
Estado y evidencia se mantienen en AlanPlan/Handoff; no extender el QA de CSV
u on-books a esta vista ni declarar paridad Figma de un detalle no verificado.
Gate Web: 311 archivos/1936 pruebas PASS, lint y typecheck PASS; builds local y
Docker de producción con mocks desactivados PASS. El primer build local se
detuvo por `EPERM` en `.next` generado dentro del sandbox Windows; el reintento
sin borrar archivos pasó. El smoke HTTP y ambos builds usan la misma fuente;
QA manual de la vista continúa pendiente. Un reintento de `npm run check`
compuesto quedó sin progreso en ESLint por ~10 minutos y se detuvo; no se
declara PASS de ese comando, aunque sus cuatro componentes tienen PASS
individual. Un intento del compuesto en Docker completó lint/typecheck, pero
Vitest agotó el tiempo en pruebas Guest preexistentes bajo carga; se detuvo
sin atribuir PASS al comando. Otro reintento local sin Maven permaneció en
ESLint ~2.5 minutos y se detuvo. Smoke visual técnico en Compose principal:
RECEPCIÓN vio 3/0 y 0/3 para 2026-10-20/21, y un rango invertido retiró la
tabla previa y mostró validación. QA manual del usuario sigue pendiente.
