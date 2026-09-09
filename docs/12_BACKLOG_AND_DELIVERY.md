# 12 — Backlog and Delivery

## Estado de diseño
V3-0001 -> V3-0201 completadas.

## Backlog de implementación activo

Archivo canónico:

`docs/Backlog_Implementacion_PMS_V1.xlsx`

Cubre Web y Android. No mantener copias independientes dentro de un subproyecto.

## IDs
- `IMP-WEB-xxxx`
- `IMP-WEB-Sxxx` para shared Web cuando exista uso real
- `IMP-AND-xxxx`

## Workflow obligatorio

```text
PENDIENTE
  -> READY
  -> EN_PROGRESO
  -> EN_QA
     -> EN_PROGRESO si falla
     -> COMPLETADA si Acceptance + DoD PASS
```

No avanzar una tarea dependiente si la dependencia no está `COMPLETADA`.

## Cada tarea debe especificar
ID, área, owner, reviewer, módulo, dependencias, Figma/fuente, ruta, pasos, Acceptance Criteria, DoR, DoD, pruebas, archivos esperados y evidencia.

## Regla de Figma
El nombre de sección/pantalla es suficiente para trazabilidad cuando no existe Node ID verificado. Está prohibido inventar IDs.

## Vertical slices
Priorizar journeys completos sobre pantallas inconexas.
