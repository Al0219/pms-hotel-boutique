# PMS Hotel Boutique

Monorepo oficial del PMS Hotel Boutique.

## Aplicaciones

```text
frontend/
├── pms-hotel-web/
└── pms-hotel-android/

backend/
```

## Stack local integrado con Docker

PostgreSQL + Backend + Web se levantan desde compose.yaml en la raíz.
Preparar `.env` a partir de [`.env.example`](.env.example) (sin sobrescribir uno
existente), completar Google y, para Staff local, los tres PMS_BOOTSTRAP_ADMIN_*.
La cuenta sintética opcional local_staff está documentada en el ejemplo; el
bootstrap permanece deshabilitado si los tres valores quedan vacíos. No usar
esa contraseña en producción ni sustituir credenciales de una BD existente.

```bash
test -f .env || cp .env.example .env
# Editar .env antes del primer arranque; el archivo está ignorado por Git.
docker compose --env-file .env up -d --build
```

Con el ejemplo: Web en http://localhost:3001 y Swagger en
http://localhost:8081/swagger-ui/index.html. PMS_WEB_PORT/PMS_BACKEND_PORT permiten
cambiar esos puertos. PMS_WEB_PUBLIC_URL y GOOGLE_REDIRECT_URI deben usar el mismo
origen Web; el callback es `/api/auth/guest/google/callback`, registrado exactamente
en Google. NEXT_PUBLIC_USE_MOCK_API=false permite consumir el BFF real.

Web usa PMS_BACKEND_INTERNAL_URL=http://backend:8080; Backend usa postgres:5432.
Los puertos host no cambian esas URLs internas. PostgreSQL no publica puerto;
Backend se publica solo en 127.0.0.1 para desarrollo/Swagger. Google recibe las
variables server-side del .env; el navegador pasa por Web/BFF, con cookies
HttpOnly y sin tokens en respuestas JSON al JavaScript de la aplicación.

[Guía completa: preparación, Staff, Google Guest y comprobaciones](docs/13_LOCAL_INTEGRATED_STACK.md).
[QA de login/me/logout y Swagger](backend/docs/41_EXPLICIT_AUTH_ENDPOINTS_QA.md).

```bash
docker compose --env-file .env config --quiet
docker compose --env-file .env ps
docker compose --env-file .env down
```

`down` conserva el volumen local. El reset `down -v` elimina sus datos y se usa
solo cuando se decide descartar esa BD. Android se ejecuta fuera de Compose
mediante Expo. backend/compose.bd2-test.yaml se usa exclusivamente para verify
con PostgreSQL efímero, independiente del stack raíz. Los puertos 18085/18086
pertenecen a evidencia/QA aislada y no son necesarios para Staff/Guest integrados.

## Presentación del Backend con Postman

Desde la raíz, con Docker Desktop abierto:

```powershell
docker compose -f compose.demo.yaml up -d --build --wait --wait-timeout 300
```

Backend real y PostgreSQL con base independiente y usuario local `demo.profesor`,
contraseña de muestra `DemoHotel2026!SoloLocal`. Swagger en
http://127.0.0.1:18080/swagger-ui/index.html. Importar en Postman
`backend/postman/Backend-Demo.postman_collection.json`, seleccionar **No environment**
y ejecutar la colección en orden. No requiere configurar .env ni copiar tokens/IDs.
No incluye Web/Android; valores públicos solo para presentación local.
Pasos y límites: [guía de demostración](backend/docs/22_BACKEND_DEMO.md).

## Estado

- Figma V3 finalizado.
- Backlog de diseño cerrado hasta V3-0201.
- Backlog de implementación activo: `docs/Backlog_Implementacion_PMS_V1.xlsx`.
- Siguiente etapa: Sprint 0 técnico Web y Sprint 0 Android según backlog.

## Antes de desarrollar
Leer `AGENTS.md`, `docs/`, el backlog y el `AGENTS.md` del subproyecto.

## Git
Un único `.git` en la raíz. No inicializar repositorios dentro de subcarpetas.
