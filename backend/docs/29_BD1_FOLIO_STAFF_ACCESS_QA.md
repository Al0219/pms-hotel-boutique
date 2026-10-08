# BE-014B-FIN-01 — QA del acceso Staff interno a folios

La entrada interna `StaffFolioService` valida sesión, permiso
`FOLIO_PAYMENT_OPERATE` y PROPERTY antes de consultar o escribir. Un reverso de
PAYMENT exige además `PAYMENT_REFUND_VOID`; el actor de los postings se toma de
la sesión. No se crea una ruta HTTP ni se ejecuta refund del proveedor.

Desde `backend/`, con Docker disponible:

```bash
docker compose -p pms_bd1_folio -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress \
  '-Dtest=StaffFolioServiceIntegrationTests,FolioServiceIntegrationTests,FolioScopeIntegrationTests' test
docker compose -p pms_bd1_folio -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
docker compose -p pms_bd1_folio -f compose.bd2-test.yaml down -v
```

La primera ejecución debe pasar 18 pruebas: 4 nuevas y 14 de regresión.
La suite nueva comprueba lectura/postings con actor Staff, CHARGE reversible por
Recepción, PAYMENT reversible solo por Gerencia, rechazo de AUDITOR/sesión
revocada/property ajena, movimientos originales scoped y cambio de rol efectivo.
El `verify` completo debe terminar con `BUILD SUCCESS`, sin failures/errors.
`down -v` elimina únicamente el volumen del proyecto aislado de QA.

No hay endpoint para Postman en esta entrega. FP-D02 y las APIs financieras
requieren confirmación contractual e integración con este puerto protegido.
