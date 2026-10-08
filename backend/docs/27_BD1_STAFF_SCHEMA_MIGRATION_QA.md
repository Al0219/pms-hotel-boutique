# BE-006B-SCHEMA-01 — Preflight y QA de persistencia Staff

El changeset `003-staff-auth-005` agrega `staff_users.version`, unicidad de
`lower(btrim(work_email))` y una FK compuesta que exige que la property asignada
pertenezca a la organización de la membership. El changeset existente
`003-staff-auth-003` ya garantiza una sola membership por Staff. No se modifican
registros previos ni se agrega una ruta HTTP.

## Antes de migrar una base con datos

Ejecutar en PostgreSQL con una cuenta de solo lectura y revisar el resultado.
Las tres consultas deben devolver **cero filas**. Si hay filas, corregirlas
mediante el procedimiento de datos autorizado antes de aplicar Liquibase;
la migración fallará sin resolverlas ni descartar historia.

```sql
SELECT lower(btrim(work_email)) AS email_normalizado, count(*)
FROM staff_users
GROUP BY lower(btrim(work_email))
HAVING count(*) > 1;

SELECT mp.staff_user_id, mp.organization_id, mp.property_id,
       p.organization_id AS property_organization_id
FROM membership_properties mp
JOIN properties p ON p.id = mp.property_id
WHERE mp.organization_id <> p.organization_id;

SELECT staff_user_id, count(*)
FROM organization_memberships
GROUP BY staff_user_id
HAVING count(*) > 1;
```

## QA manual en base aislada

Desde `backend/`:

```bash
docker compose -p pms_bd1_staff_schema -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress -Dtest=StaffAdminSchemaIntegrationTests test
docker compose -p pms_bd1_staff_schema -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
docker compose -p pms_bd1_staff_schema -f compose.bd2-test.yaml down -v
```

Esperado: dos pruebas `StaffAdminSchemaIntegrationTests` pasan; el primer test
comprueba `version=0` y SQLSTATE `23505` ante dos correos que difieren en
mayúsculas y espacios externos. El segundo comprueba SQLSTATE `23503` ante una property de otra
organización y acepta una de la organización propia. `verify` termina con
`BUILD SUCCESS` y cero fallos/errores. `down -v` elimina solo la base/volumen
de este proyecto Docker aislado.

El CRUD, la revocación y la auditoría Staff permanecen pendientes; esta prueba
solo comprueba las restricciones de base de datos.
