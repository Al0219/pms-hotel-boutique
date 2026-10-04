# BE-014B-COM-02 — QA manual de property scope comercial

Ejecutar desde `backend/`, en la rama `feature/bd1-commercial-scope`. Este
incremento protege **servicios internos**: no crea rutas HTTP Commercial, por
lo que la comprobación manual reproducible es la suite Spring/PostgreSQL.
El Compose usa PostgreSQL 17 en una base temporal, sin puertos host.

## 1. Confirmar rama y cambios

```bash
git branch --show-current
git status --short
```

Esperado: `feature/bd1-commercial-scope`. Antes de tu confirmación no hay commit
ni push de esta tarea. La carpeta ajena `../docs/entregables/` ya existía y no
forma parte de este cambio.

## 2. Ejecutar casos Commercial

```bash
docker compose -p pms-bd1-commercial-scope-qa -f compose.bd2-test.yaml run --rm verify \
  ./mvnw -B --no-transfer-progress \
  -Dtest=CommercialServiceIntegrationTests,GroupServiceIntegrationTests,PromotionRewardIntegrationTests,CommercialPermissionIntegrationTests test
```

Esperado: `Tests run: 48, Failures: 0, Errors: 0, Skipped: 0` y `BUILD SUCCESS`.
La suite cubre permiso COMMERCIAL_MANAGE, scope de organización y membership,
`ALL_PROPERTIES` con permiso y conjunto exacto, escritura solo en PROPERTY,
consultas/vínculos por property y flujos comerciales existentes. En especial,
`CommercialPermissionIntegrationTests` debe reportar 10 casos.

## 3. Verificar toda la regresión Backend

```bash
docker compose -p pms-bd1-commercial-scope-qa -f compose.bd2-test.yaml run --rm verify \
  ./mvnw -B --no-transfer-progress verify
```

Esperado: `Tests run: 300, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`
y JAR empaquetado. Si un comando falla, comparte el nombre del test y las
últimas líneas del error antes de cerrar la tarea.

## 4. Limpiar los contenedores y volumen temporales

```bash
docker compose -p pms-bd1-commercial-scope-qa -f compose.bd2-test.yaml down -v
```

Tras tu resultado y confirmación, se marcará COMPLETADA y se hará commit/push
de esta rama. La integración a `main` se revisa por separado.
