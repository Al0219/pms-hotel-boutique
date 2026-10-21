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
realizada ni una reconstrucción histórica. Ingresos, ADR, RevPAR y CSV quedan
fuera de esta integración: la fuente financiera y el contrato de exportación
siguen pendientes en C7/BE-010B.

## Catálogo V3 — 08 Reporting

El catálogo de Figma muestra Operación, Finanzas, Cumplimiento y Comercial.
La vista Web presenta las cuatro categorías a Staff autorizado. Solo el
reporte on-books de Operación permite consulta real; las demás categorías,
programación, vistas guardadas y exportaciones indican que la integración está
pendiente, sin cifras de ejemplo ni acciones simuladas. El detalle usa el
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
