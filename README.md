# PMS Hotel Boutique

Monorepo oficial del PMS Hotel Boutique.

## Aplicaciones

```text
frontend/
├── pms-hotel-web/
└── pms-hotel-android/

backend/
```

## Ejecución con Docker

Desde la raíz, levantar la pila Web + Backend + PostgreSQL con un solo comando:

```bash
docker compose up --build
```

Abrir `http://localhost:3000`. Si ese puerto está ocupado, usar
`PMS_WEB_PORT=3001 docker compose up --build` y abrir el puerto elegido. El
servicio Web es el único publicado al host; PostgreSQL y Spring Boot se
comunican dentro de la red privada de Compose. Para detener y eliminar los
datos locales: `docker compose down -v`.

Los valores predeterminados son solo para desarrollo local. Copiar
[`.env.example`](.env.example) a `.env` para cambiar el puerto Web o la
contraseña local de PostgreSQL. Android se ejecuta fuera de Compose mediante
Expo, porque requiere un emulador o dispositivo del host.

## Estado

- Figma V3 finalizado.
- Backlog de diseño cerrado hasta V3-0201.
- Backlog de implementación activo: `docs/Backlog_Implementacion_PMS_V1.xlsx`.
- Siguiente etapa: Sprint 0 técnico Web y Sprint 0 Android según backlog.

## Antes de desarrollar
Leer `AGENTS.md`, `docs/`, el backlog y el `AGENTS.md` del subproyecto.

## Git
Un único `.git` en la raíz. No inicializar repositorios dentro de subcarpetas.
