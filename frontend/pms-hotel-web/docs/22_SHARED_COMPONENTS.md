# 22 — Shared Components

## Ownership
Colectivo; cambio significativo requiere reviewer adicional.

## Catálogo potencial
Button, Input, Modal, ConfirmDialog, DataTable, StatusBadge, EntityRow, EmptyState, LoadingState, ErrorState, OfflineState y PageContainer.

## Regla crítica
Este catálogo NO autoriza crear componentes anticipadamente.
Un componente shared nace solo cuando una tarea `READY` del backlog lo solicita y existe reutilización real.

## Mover a shared solo si
- semántica genérica;
- uso real múltiple;
- API mínima y estable;
- reviewer adicional.

No mover reglas específicas de Reservation, Payment, Availability, Housekeeping, Groups u otro dominio.
