# BE-010B-ONBOOKS-01 — QA manual de On-books diario

La ruta Backend `GET /api/v1/reports/on-books/daily` consulta el estado actual
de las noches de estancia, no ocupación realizada ni una reconstrucción
histórica. Requiere Bearer Staff activo con `COMMERCIAL_MANAGE`; el modo
`ALL_PROPERTIES` requiere además `MULTI_PROPERTY_READ`. Hay dos filtros de
scope mutuamente excluyentes: `propertyId=<UUID>` y `scope=ALL_PROPERTIES`.
Las fechas `from` y `to` son inclusivas y locales a cada property.

Desde `backend/`, con Docker disponible:

```bash
docker compose -p pms_bd1_onbooks -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress '-Dtest=DailyOnBooksServiceIntegrationTests' test
docker compose -p pms_bd1_onbooks -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
docker compose -p pms_bd1_onbooks -f compose.bd2-test.yaml down -v
```

La primera suite debe terminar con **10 pruebas PASS** y verifica conteos reales en PostgreSQL, paridad ATS, Guest/Staff,
401/403/400/200, límites, orden, sobreventa, ceros y `Cache-Control`.
La segunda debe terminar con **331 pruebas PASS**, cero fallos/errores y
`BUILD SUCCESS`. `down -v` retira solo el proyecto QA
aislado. Las cifras PASS exactas se registran en AlanHandoff al terminar.

Para comprobar la ruta manualmente, importar
[Postman BD1](../postman/BD1-Backend-APIs.postman_collection.json), definir
`baseUrl`, `staffAccessToken` de una sesión Staff vigente,
`propertyId` autorizada y `from`/`to`. Ejecutar los dos requests de la carpeta
**Staff — reportes On-books diario**. El segundo necesita permiso
`MULTI_PROPERTY_READ`. Verificar `200`, `Cache-Control: private, no-store`,
`calculatedAt` UTC, filas ordenadas por propertyId/stayDate y campos del DTO.
Para una property sin habitaciones debe haber una fila por fecha con ceros,
`onBooksPercent: null` y `unavailableReason: NO_AVAILABLE_ROOMS`.

Luego probar manualmente: sin token, token Guest o sesión Staff revocada →
`401`; Staff sin permiso o property ajena/inexistente → `403`; filtros de scope
ausentes o ambos, scope desconocido, UUID/fecha inválidos, `from > to`, 367
noches, parámetros duplicados o `organizationId` → `400`. Una sobreventa real
puede dar `onBooksPercent > 100`. Ninguna respuesta muestra huéspedes ni dinero.
`ALL_PROPERTIES` devuelve solo properties autorizadas; para comparación ATS
usar exactamente las mismas properties y fechas.

También puede probarse desde Swagger UI, con el Backend levantado en
`http://127.0.0.1:18080/swagger-ui/index.html`. Pulsar **Authorize** e
introducir el JWT Staff vigente; abrir **Reports → GET /api/v1/reports/on-books/daily**,
usar **Try it out** y completar `from`, `to` y exactamente uno de
`propertyId` o `scope=ALL_PROPERTIES`. Swagger permite ver el código HTTP,
los encabezados y la respuesta JSON. No guardar el token en capturas ni
compartirlo. La suite MockMvc/PostgreSQL anterior prueba la ruta sin navegador.

El BFF Web sigue sujeto a revisión de su owner. Esta rama no publica la ruta
Web. Revenue/ADR/RevPAR, llegadas/salidas y CSV quedan fuera de este incremento.
