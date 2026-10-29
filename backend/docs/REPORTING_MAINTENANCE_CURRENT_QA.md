# BE-010B-MTCUR-01 — QA de mantenimiento actual

Contrato: [BE-010A-MTCUR-01](REPORTING_MAINTENANCE_CURRENT_CONTRACT_PROPOSAL.md).
Fecha: 2026-10-22. Estado **EN_QA**; la consulta está integrada con Backend
real. El usuario confirmó QA manual PASS; faltan las suites integrales para
cerrarla.
Owner fuente Juan / BD3, HTTP/acceso Alan / BD1, consumidor WEB-3 y sesión/
scope WEB-2.

## Matriz

| Caso | Resultado |
| --- | --- |
| Órdenes OPEN/IN_PROGRESS, RESOLVED/CANCELLED excluidas, reapertura y refresh | PASS Backend focal. |
| Property sin órdenes, room opcional, urgentes y sin asignar solapados | PASS Backend focal. |
| OPERACIONES, GERENCIA/ALL, RECEPCIÓN, Guest, property ajena, sesión y membership revocadas | PASS Backend focal. |
| Query estricta, 400/401/403/503, no-store y error sanitizado | PASS Backend focal y BFF Web. |
| BFF allowlist e invariantes de contadores, DTO/mapper/hook/UI | Web focal: 5 archivos 50/50 PASS; catálogo/vista/BFF: 3 archivos 34/34 PASS. |
| OpenAPI audiencia, Bearer, filtros y esquema; Postman | PASS prueba Backend focal; Postman válido. OpenAPI vivo: 50 operaciones, 39 paths, 62 schemas, 13 tags. |
| Docker Backend/Web y QA manual con Staff OPERACIONES y GERENCIA | Build, runtime y QA manual del usuario PASS. |

`npm run typecheck` y `npm run lint` pasaron sobre el código Web preparado.
Los dos grupos de pruebas Web comparten archivos y no
se suman como 84 pruebas distintas. Backend focal
`CurrentMaintenanceReportIntegrationTests` y
`CurrentMaintenanceReportServletTests`: **8/8 PASS** con Java 21/PostgreSQL
17 en build y base QA separados. El `mvn verify` integral anterior se
interrumpió cuando Docker Desktop perdió el motor; no se atribuye PASS a esa
ejecución. Tras recuperarlo, `docker compose up --build -d` dejó PostgreSQL,
Backend y Web saludables. El nuevo `mvn verify` integral está en curso.

Smoke HTTP real: en Compose principal, RECEPCIÓN obtuvo 403, filtro inválido
400 y anónimo 401. En runtime aislado `localhost:13001`, con PostgreSQL QA
`tmpfs` y fixtures sintéticas, OPERACIONES obtuvo 200 para su property y 403
para ALL. GERENCIA obtuvo 200 para ALL con dos properties autorizadas, una
con ceros; la property ajena obtuvo 403 y no apareció en la vista. La UI mostró
3 órdenes sin resolver (2 OPEN, 1 IN_PROGRESS), 1 urgente, 2 sin asignar,
2 con habitación y 1 de área común. Al resolver una orden en la base QA y
pulsar «Actualizar estado actual», bajó a 2 sin resolver y 0 urgentes; al
reabrirla, volvió a 3 y 1. Ninguna cifra corresponde al hotel real.

El usuario respondió «PASS: coincide con lo esperado» al revisar la vista
GERENCIA/ALL, el enlace Reportes y la actualización.

## Recorrido manual — PASS confirmado por el usuario

1. Con OPERACIONES, abrir `/reportes` y «Ver mantenimiento actual»; confirmar
   que RECEPCIÓN no ve esa acción y recibe 403 si solicita la ruta.
2. Comparar abiertos, en progreso, urgentes, sin asignar, con habitación y
   área común con órdenes persistidas. Una property sin órdenes muestra ceros.
3. Resolver y reabrir una orden de QA; «Actualizar estado actual» debe reflejar
   el cambio sin presentar un historial o SLA fabricado.
4. Con GERENCIA y `MULTI_PROPERTY_READ`, ALL muestra solo properties autorizadas
   y una fila por property; una property ajena devuelve 403.
5. Verificar carga, error/reintento, regreso al catálogo, no-store y ausencia
   de datos sensibles o importes.
