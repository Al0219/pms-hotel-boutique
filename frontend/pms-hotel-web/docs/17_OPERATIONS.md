# 17 — Operations

Owner: WEB-3.

## Housekeeping

Contrato Backend53 agrega checkout interno → DIRTY, transaccional y auditado.
Housekeeping y Habitaciones consumen su estado/motivo mediante las lecturas ya
integradas. No existe todavía checkout HTTP/UI Staff confirmado; no simularlo
con estado local ni presentar la preasignación como inicio/salida de la estancia.

Integración limpieza/entrega: [Web65](65_ROOM_READINESS_QA.md) y contrato Backend52.
Recepción consulta limpieza en Habitaciones; no modifica HK. Preasignación no
equivale a entrega/check-in, que requiere inspección actual en Backend.
Lifecycle:
DIRTY -> CLEAN -> INSPECTED

## Overlays
DND/Turndown/Pickup no reemplazan lifecycle.

## Inspection rejected
Supervisor devuelve a limpieza con motivo.

## Discrepancy
FO vs HK:
investigate -> reason -> reconcile -> audit.

## Maintenance
OT lifecycle.

## OOO/OOS
Maintenance puede bloquear sellable availability.

Resolver OT:
NO libera automáticamente.

Después puede requerir:
- HK readiness;
- release RoomStatus;
- ATS recalculation.

## Room Move
Origen queda por limpiar.
Destino ocupado.

## Messaging
Operaciones no responde directamente huésped.

## Housekeeping real — primera entrega, 2026-10-21

Contrato [Backend51](../../../backend/docs/51_STAFF_HOUSEKEEPING_CONTRACT.md)
aprobado por José para integrar frontend y backend. `/housekeeping` usa sesión
Staff, OPERATIONS_MANAGE y PROPERTY explícito. GET no inicia seguimiento ni
inventa limpieza; el alta explícita inicia DIRTY. DND conserva el ciclo base y
no añade una prohibición automática de limpiar en este incremento aprobado.
No se declaran integrados Turndown/Pickup, discrepancias, automatismos de
recepción ni mantenimiento. Guía y estado:
[64_STAFF_HOUSEKEEPING_REAL_QA.md](64_STAFF_HOUSEKEEPING_REAL_QA.md).
