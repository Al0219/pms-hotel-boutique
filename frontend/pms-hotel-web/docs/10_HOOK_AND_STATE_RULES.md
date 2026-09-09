# 10 — Hook and State Rules

## Decisión aprobada
TanStack Query es la estrategia de server state Web.

## Hook de feature
Orquesta Service -> DTO -> Mapper -> Domain y configura query/mutation state.

Puede exponer:
- data Domain;
- loading/pending;
- error;
- retry/refetch;
- mutation status.

## No debe
- contener JSX;
- duplicar reglas backend;
- importar internals de otro módulo;
- exponer DTO a UI.

## Local state
Usar React local state para estado puramente de UI/formulario cuando corresponda. No agregar Redux/Zustand por defecto.

## Mutaciones sensibles
Evitar doble submit. No hacer optimistic success para Payments, Inventory commit, Night Audit o rebooking sensible sin decisión específica.

## Implementación Sprint 0

`src/app/providers.tsx` configura el único `QueryClientProvider` de la aplicación. En esta fase técnica, las consultas y mutaciones no reintentan automáticamente; cada módulo definirá su política cuando su contrato API y sus reglas de dominio estén READY. El provider no contiene queries ni estado de negocio.
