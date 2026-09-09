# 24 — Error / Loading / Offline

## Remote state
idle/loading/success/empty/error/offline.

## Empty
Resultado válido sin datos.

## Error
Request/operation failed.

## Offline
Network unavailable o estado equivalente.

## Retry
Reejecuta la operación.
No inventa resultado.

## Mutation
submitting state para evitar doble submit.

## Critical operations
No optimistic success en:
- payments;
- inventory commit;
- night audit;
- cross-property rebooking;
- sensitive mutations.
