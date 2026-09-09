# PMS Hotel Boutique — Patch de consistencia V1

## Objetivo
Alinear documentación, backlog y reglas de Sprint 0 antes de reanudar Codex.

## Aplicación
Copiar el contenido de este paquete sobre la raíz `pms-hotel-boutique/`, conservando las mismas rutas.

Después eliminar manualmente:

1. `MANIFEST.json`
2. `frontend/pms-hotel-web/docs/Backlog_Implementacion_PMS_V1.xlsx`

El backlog canónico pasa a ser:

`docs/Backlog_Implementacion_PMS_V1.xlsx`

## Verificación rápida

Deben existir:

- `docs/Backlog_Implementacion_PMS_V1.xlsx`
- `frontend/pms-hotel-web/docs/04_MODULE_BOUNDARIES.md`
- `frontend/pms-hotel-web/docs/31_DESIGN_TOKEN_FOUNDATION.md`

No debe existir:

- `MANIFEST.json`
- una segunda copia del backlog dentro de `frontend/pms-hotel-web/docs/`

## Regla de Figma
Solo se conservan Node IDs verificados. Si una tarea tiene Node ID vacío, usar el nombre de la sección/pantalla como referencia. Nunca inventar un Node ID.
