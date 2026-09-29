# 04 — Persistence Rules

No borrar historial financiero/audit.

Preservar:
- Reservation/Stay distinction;
- Folio movements;
- Payment references;
- OOO/OOS history;
- consent history;
- audit.

Soft-delete/append-only según dominio.

## Liquibase

- Liquibase es el único mecanismo de creación y evolución del esquema.
- Hibernate valida el esquema con `ddl-auto=validate`; no lo crea ni actualiza.
- Cada módulo mantiene sus changesets bajo
  `db/changelog/<nnn>Service<Modulo>/`.
- El changelog completo usa inclusiones explícitas y respeta dependencias entre
  módulos; cada módulo puede tener un changelog de entrada para desarrollo
  local con sus dependencias.
- Un changeset aplicado en un entorno compartido no se edita. Las correcciones
  se hacen mediante un changeset nuevo y, cuando proceda, rollback declarado.
