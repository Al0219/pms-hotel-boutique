# Cómo probar BD2 y usar Postman

## Pruebas automáticas

Con Java 21 y PostgreSQL 17 accesible, desde `backend`, configurar
`PMS_DATABASE_URL`, `PMS_DATABASE_USERNAME` y `PMS_DATABASE_PASSWORD` para una
base exclusiva de pruebas; ejecutar `./mvnw -B verify` (PowerShell:
`.\mvnw.cmd -B verify`). No apuntar esta suite a la base operativa: incluye
fixtures y pruebas de migración/rollback.

La alternativa aislada desde la raíz, sin Java instalado ni puertos publicados:

```powershell
docker compose -p pms-bd2-qa -f backend/compose.bd2-test.yaml run --rm verify ./mvnw -B verify
docker compose -p pms-bd2-qa -f backend/compose.bd2-test.yaml stop postgres
```

Ejecuta todas las pruebas y empaqueta el backend con Java 21/PostgreSQL 17.
No usa el contenedor ni el volumen de la base de la aplicación.

## Qué se puede probar por HTTP

Sí, Postman permite login Staff, sesión/scope, consulta ATS y respuestas
400/401/403/404. Importar `../postman/BD2-Inventory.postman_collection.json`.

Los repositorios JPA no son endpoints CRUD. Tampoco existe actualmente un
controlador REST de booking en las fuentes BD3 revisadas en `origin/main`
`7c060c9`. La creación real, su efecto en ATS y la admisión concurrente se
prueban mediante servicios Java. No usar un supuesto `POST /reservations`.

## Requisitos del runtime

Usar un checkout de integración que contenga Fases 3/4 BD2 y las migraciones
BD3 de `main`. La rama dependiente BD2 por sí sola aún no contiene las tablas
`reservations`/`reservation_stays`; login puede funcionar, pero ATS fallará
sin ellas. No crearlas manualmente: deben llegar por Liquibase al integrar BD3.

Debe existir un Staff provisionado con `RESERVATION_MANAGE` o
`COMMERCIAL_MANAGE` y acceso a la propiedad. Se puede usar un SUPER_ADMIN local
provisionado por las variables `PMS_BOOTSTRAP_ADMIN_USERNAME`,
`PMS_BOOTSTRAP_ADMIN_EMAIL`, `PMS_BOOTSTRAP_ADMIN_PASSWORD` antes de levantar
el backend. Son valores propios de desarrollo, fuera de Git; no hay registro
público Staff. El bootstrap no cambia la contraseña de un usuario existente.

## Acceso local desde Postman Desktop

El Compose raíz publica Web en 3000 y mantiene Backend interno; el puerto 3000
no es la URL directa de esta API. Para la prueba local, crear este override
temporal fuera del repositorio desde PowerShell:

```powershell
$postmanOverride = Join-Path $env:TEMP 'pms-bd2-postman.override.yaml'
@'
services:
  backend:
    ports:
      - "127.0.0.1:18080:8080"
'@ | Set-Content -LiteralPath $postmanOverride
docker compose -f compose.yaml -f $postmanOverride up -d --build postgres backend
```

La publicación temporal queda limitada a loopback. No modifica `compose.yaml`,
no publica PostgreSQL y no se incorpora a despliegue. Para volver al Compose
habitual al terminar:

```powershell
docker compose -f compose.yaml up -d --no-deps --force-recreate backend
Remove-Item -LiteralPath $postmanOverride
```

Swagger: `http://127.0.0.1:18080/swagger-ui/index.html`.
Health: `http://127.0.0.1:18080/actuator/health`.

## Datos mínimos de desarrollo

No hay endpoint para crear RoomType/Rooms en esta entrega. En una base local
de integración migrada, cargar solo estas filas de prueba a través de `psql`
o el cliente SQL. La propiedad demo de Liquibase es
`3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d`.

```sql
BEGIN;
INSERT INTO room_types(id, property_id, code, name)
VALUES ('11111111-1111-4111-8111-111111111111',
        '3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d', 'BD2-DEMO', 'Postman demo')
ON CONFLICT (id) DO NOTHING;
INSERT INTO rooms(id, property_id, room_type_id, code)
VALUES ('11111111-1111-4111-8111-111111111112',
        '3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d',
        '11111111-1111-4111-8111-111111111111', 'BD2-DEMO-01')
ON CONFLICT (id) DO NOTHING;
COMMIT;
```

Por ejemplo, abrir `docker compose exec postgres psql -U pms_app -d pms_hotel`
y pegar el SQL. Son datos de desarrollo, no migraciones ni cambios de esquema.
En una base limpia, sin stays consumidores ni OOO para esas noches, ATS debe ser
1. Los datos reales pueden producir otro resultado válido.

## Secuencia Postman

Crear un environment privado y completar `baseUrl` (`http://127.0.0.1:18080`),
`staffUsername` y `staffPassword` con el usuario local. Mantener credenciales y
tokens como valores privados; no exportar ni compartir un environment poblado.
La colección no contiene contraseñas ni JWT reales.

1. **Login Staff:** `POST {{baseUrl}}/api/v1/staff-auth/sessions`, body JSON
   `{"username":"{{staffUsername}}","password":"{{staffPassword}}"}`.
   Esperar 201; el script guarda `accessToken` en `staffAccessToken` del environment.
2. **Sesión Staff:** esperar 200 y revisar `permissions` y `memberships`.
   Usar una propiedad autorizada como `propertyId`.
3. **Disponibilidad:** el Bearer Token es `{{staffAccessToken}}`:

   ```text
   GET {{baseUrl}}/api/v1/properties/{{propertyId}}/availability
       ?roomTypeId={{roomTypeId}}&arrival={{arrival}}&departure={{departure}}
   ```

   Valores demo: `roomTypeId=11111111-1111-4111-8111-111111111111`,
   `arrival=2026-11-01`, `departure=2026-11-03`.
   Esperar 200 con IDs, fechas locales y `availableUnits` entero no negativo.
4. Ejecutar las solicitudes negativas: sin token o token inválido → 401;
   propiedad ajena → 403; arrival=departure → 400;
   tipo inexistente dentro de una propiedad autorizada → 404.

Para 403 por propiedad, `unauthorizedPropertyId` debe ser un UUID no autorizado
al Staff; no usar SUPER_ADMIN con otra propiedad activa de su organización.
Un JWT Guest tampoco autoriza este endpoint Staff. Un token revocado debe dar
401 en la siguiente consulta.

## Límites de Fase 5

Consultar ATS=0 es 200, no `InventoryExhaustedException`. Esa excepción pertenece
a la admisión de escritura, no al GET. Postman no verifica por sí solo bloqueos,
atomicidad o rollback; usar la suite PostgreSQL para esos casos.

El puerto nuevo necesita conectarse al flujo BD3 conforme a
`13_BD2_INVENTORY_ADMISSION_CONTRACT.md`. Hasta entonces, el booking actual
mantiene su precheck y no garantiza sobreventa cero. Sus dos fixtures de CI
siguen siendo responsabilidad de BD3 y no se deshabilitan para pasar el build.

## Properties: contrato aprobado BD2-006B

Importar también `backend/postman/BD2-Properties.postman_collection.json` y usar
el mismo environment privado (`baseUrl`, `staffUsername`, `staffPassword`).
Ejecutar en una base de pruebas con SUPER_ADMIN y los permisos `STAFF_MANAGE`,
`MULTI_PROPERTY_READ` y `COMMERCIAL_MANAGE`. La colección genera un código único,
crea una propiedad y guarda su ID; no requiere insertar Properties manualmente.

La secuencia comprueba alta 201/Location, scope actualizado, consulta, edición
de nombre, PATCH repetido sin cambios, código duplicado 409, campos rechazados
400, acceso sin token 401 y logout/revocación reales. El logout final exige
nuevo login para seguir usando la sesión. La propiedad creada se conserva; esta entrega no
define DELETE, baja/reactivación ni edición de timezone/moneda. Cada ejecución
genera una propiedad nueva. Los negativos de rol, scope, Guest, revocación,
auditoría, bloqueo y rollback se verifican también en las pruebas Java.

Rutas disponibles: `POST/GET /api/v1/properties` y
`GET/PATCH /api/v1/properties/{propertyId}`. PATCH admite exclusivamente `code`
y/o `name`. Swagger muestra los DTOs, permisos, Bearer y respuestas; acceder a
`{{baseUrl}}/swagger-ui.html`. La organización del POST viene de la sesión,
nunca del body. Los timestamps se devuelven en UTC.

Para repetir solo las pruebas de este incremento, desde `backend`, con Java 21
y PostgreSQL 17 configurado mediante `PMS_DATABASE_*`:

```sh
./mvnw -B -Dtest=PropertyApiIntegrationTests,PropertyAuditRollbackIntegrationTests,PropertyHttpSecurityIntegrationTests test
```

Esta comprobación enfocada no sustituye `./mvnw -B verify` ni cambia la selección
del workflow. Ejecutar el verify completo antes de publicar y distinguir los
errores existentes de integración BD3 de los resultados propios de Properties.

## RoomTypes

Importar `backend/postman/BD2-RoomTypes.postman_collection.json`. Reutilizar el
environment privado y configurar `propertyId` con una propiedad autorizada.
La colección hace login Staff y prueba POST, lista, consulta, PATCH, repetición
sin cambios, campo inmutable 400 y código duplicado 409. Requiere
`COMMERCIAL_MANAGE` para escribir; no contiene credenciales ni JWT reales.
Ejecutar solo en QA: conserva el tipo creado y no añade habitaciones.

Las pruebas Java `RoomTypeApiIntegrationTests`,
`RoomTypeAuditRollbackIntegrationTests` y `RoomTypeHttpIntegrationTests`
comprueban además scope/permisos/Guest/revocación, ATS sin inventario, referencias
físicas y tarifas, auditoría y rollback real, así como timestamps entre requests.
La colección publicada es una ayuda manual; su publicación no implica que Newman
haya sido ejecutado. El verify completo sigue siendo obligatorio.
