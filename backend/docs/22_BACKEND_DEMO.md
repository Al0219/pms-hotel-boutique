# Presentación Backend: Docker y Postman

## Arranque

Abrir Docker Desktop y una terminal en la raíz de esta entrega. Ejecutar:

```powershell
docker compose -f compose.demo.yaml up -d --build --wait --wait-timeout 300
```

El comando construye el backend real, inicia PostgreSQL 17, aplica Liquibase y
provisiona un Staff SUPER_ADMIN mediante el bootstrap existente. Espera a que
ambos servicios estén saludables. No requiere Java instalado, .env ni variables
manuales. La primera construcción descarga dependencias y puede tardar varios minutos.

| Acceso | Valor |
| --- | --- |
| Base API | http://127.0.0.1:18080 |
| Health | http://127.0.0.1:18080/actuator/health |
| Swagger | http://127.0.0.1:18080/swagger-ui/index.html |
| Usuario Staff | demo.profesor |
| Contraseña de muestra | DemoHotel2026!SoloLocal |

Estos valores son públicos, exclusivamente de demostración. Compose usa un
proyecto/volumen propios (pms-backend-demo), publica solo el backend en loopback
y mantiene PostgreSQL interno. No reutiliza la base habitual ni secretos de .env;
Google/Resend quedan sin configurar. No desplegar este Compose en la nube.
El backend conserva JWT, permisos, scope y auditoría reales; no es una API mock.

## Postman: una importación

1. Abrir Postman Desktop y usar Import con
   `backend/postman/Backend-Demo.postman_collection.json`.
2. Seleccionar **No environment**: esta colección contiene sus propias variables,
   incluido el usuario de muestra. Un environment previo podría sobrescribirlas.
3. Usar **Run collection**, incluir todas las carpetas y ejecutar en orden una
   iteración. Alternativamente, abrir las solicitudes y usar Send en ese orden.
4. Revisar Test Results: las respuestas negativas esperadas también deben pasar.

La colección hace login, guarda tokens y propaga IDs automáticamente. Cada
ejecución crea una propiedad/tipo/habitación/tarifa nuevos, y los conserva. No
requiere copiar IDs, insertar SQL ni importar cinco colecciones separadas.
No exportar la colección ejecutada con tokens guardados; usar el JSON original
del repositorio si se comparte. La sesión final se revoca mediante logout.

| Carpeta | Evidencia |
| --- | --- |
| 00 | Backend UP y contrato OpenAPI real |
| 01 | Login Staff, propiedad C/R/U, códigos duplicados, validación y revocación |
| 02 | Tipo de habitación C/R/U |
| 03 | Tipo nuevo sin habitaciones físicas: ATS = 0 |
| 04 | Habitación física C/R/U |
| 05 | Tarifa C/R/U, dinero exacto y disponibilidad sin cambios |
| 06 | ATS = 1, sesión/permisos y rechazos 400/401/403/404 |
| 07 | Logout y rechazo de sesión revocada |

200 significa consulta/edición correcta; 201, creación. En las solicitudes
negativas, 400 indica datos inválidos; 401, sesión inválida; 403, scope rechazado;
404, tipo inexistente; 409, código duplicado. No confundir un rechazo esperado
con un fallo de la demostración.

## Qué incluye de cada BD

El mismo proceso Spring Boot carga todos los módulos incorporados en esta
versión. BD1 se muestra mediante Docker, migraciones, login, permisos y scope;
BD2 mediante catálogos y disponibilidad. Reservas/estancias BD3 y la nueva base
idempotente BD2 se verifican mediante servicios reales en las pruebas Java.
No se agregan endpoints para mostrar funciones que aún no tienen contrato HTTP.
El frontend/BFF, Google externo y funcionalidades de pagos/lifecycle pendientes
no se demuestran con esta colección. No se levantan Web/Android en esta demo de API.

## Pruebas automáticas, en una base distinta

Desde la misma raíz:

```powershell
docker compose -p pms-demo-tests -f backend/compose.bd2-test.yaml run --rm verify ./mvnw -B verify
```

Ejecuta verify completo con Java 21/PostgreSQL 17. La base efímera de tests es
distinta de la demostración. Revisar BUILD SUCCESS y cero failures/errors/skipped;
el número de tests corresponde a la versión ejecutada. Cubre booking integrado,
admisión concurrente, rollback, permisos y recibos locales idempotentes.
Construir la imagen de runtime por sí solo no ejecuta estas pruebas.

## Detener y volver a usar

```powershell
docker compose -f compose.demo.yaml stop
```

Conserva datos. El comando de arranque los vuelve a usar; el bootstrap no duplica
al Staff ni modifica su contraseña existente. Reiniciar backend exige nuevo login:
la demo usa claves JWT efímeras, no una clave pública fija en Git.

Para retirar contenedores/red sin borrar datos:

```powershell
docker compose -f compose.demo.yaml down
docker compose -p pms-demo-tests -f backend/compose.bd2-test.yaml down
```

No hace falta vaciar la base: cada ejecución de Postman genera códigos nuevos.
Si el puerto 18080 está ocupado, cerrar la demo previa que lo use antes de arrancar.
Para diagnóstico: `docker compose -f compose.demo.yaml logs --tail 100 backend`.

## Validación de la entrega

Arranque/reinicio y persistencia PASS. Dos ejecuciones Newman de 53 solicitudes
y 81 comprobaciones cada una, sin fallos. `./mvnw -B verify`: BUILD SUCCESS,
281 tests, 0 failures/errors/skipped, Java 21/PostgreSQL 17. Evidencia y límites en
AlanHandoff, tarea BE-DEMO-001. Reviewer BD1; PR/checks GitHub pendientes.
