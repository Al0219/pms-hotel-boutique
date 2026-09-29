# PMS Hotel Boutique — Backend

API del PMS Hotel Boutique. Se implementa como un monolito modular con Spring
Boot, PostgreSQL, Liquibase y Spring Security.

## Seguimiento

El control operativo de Backend se registra en Markdown:

- [`docs/AlanPlan.md`](docs/AlanPlan.md): tareas, dependencias y aceptación.
- [`docs/AlanHandoff.md`](docs/AlanHandoff.md): evidencia y siguiente paso.

No se agregan tareas Backend al XLSX.

## Desarrollo con Docker

Desde la raíz del monorepo, ejecutar `docker compose up --build`. Compose
levanta PostgreSQL, espera su healthcheck, arranca el Backend, comprueba
`/actuator/health` y después inicia Web. El Backend no publica su puerto al
host: se consume desde el BFF Web mediante la red interna.

Para desarrollo aislado del Backend, el mismo servicio puede iniciarse con
`docker compose up --build postgres backend`. Los valores son locales y pueden
sobrescribirse en el archivo `.env` raíz basado en `.env.example`.

Liquibase crea y modifica el esquema. No se crean tablas manualmente ni se usa
`ddl-auto=update`.

## Migraciones

Las migraciones viven bajo `db/changelog/<nnn>Service<Modulo>/`. Cada módulo es
dueño de sus changesets; los aplicados son inmutables. El changelog maestro se
usa en integración y los changelogs de módulo permiten desarrollo parcial.
