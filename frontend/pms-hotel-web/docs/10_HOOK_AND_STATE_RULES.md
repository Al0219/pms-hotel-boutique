# 10 — Hook and State Rules

## Hook
Orquesta:
Service -> DTO -> Mapper -> state.

## Debe exponer
según caso:
- data Domain;
- loading;
- error;
- retry;
- mutation status.

## No debe
- contener JSX;
- duplicar reglas de negocio backend;
- importar internals de otro módulo.

## State
Elegir en Sprint 0:
- local state;
- server state/query library;
- context global solo cuando aplique.

No elegir librería por costumbre individual.

## Mutation sensible
Evitar doble submit.
No optimistic commit de pago/inventario/night audit sin decisión.
