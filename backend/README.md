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

### Validación aislada de BD2

Desde la raíz:

```sh
docker compose -p pms-bd2-phase1 -f backend/compose.bd2-test.yaml up --abort-on-container-exit --exit-code-from verify
docker compose -p pms-bd2-phase1 -f backend/compose.bd2-test.yaml down
```

Usa PostgreSQL 17 efímero sin puertos publicados y Maven/JDK 21. No usa la base
de datos de la aplicación ni sus secretos. Ejecuta toda la suite y empaqueta el JAR.
El contrato para BD3 y los límites de Fase 1 están en
[`docs/11_BD2_CORE_FOUNDATION_CONTRACT.md`](docs/11_BD2_CORE_FOUNDATION_CONTRACT.md).
