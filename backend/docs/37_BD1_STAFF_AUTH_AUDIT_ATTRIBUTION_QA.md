# BE-008B-AUTH-02 — QA de persistencia para atribución futura Staff

AUTH-02 agrega seis columnas nullable, sin defaults, a `auth_audit_events`.
`staff_user_id` sigue siendo el sujeto; `session_id` permanece referencia interna
sensible. No existen columnas físicas subject_id/subject_type. El constructor
legacy y los emisores no asignan atribución; no hay backfill ni proyección/API.
C6-D06 queda fuera. Changeset nuevo: `003-staff-auth-008`; función y trigger
append-only de AUTH-01 preservados.

## Pruebas automatizadas reproducibles

Desde `backend/`, usar únicamente PostgreSQL QA descartable, sin puertos host:

```bash
docker compose -p pms_bd1_authattr -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_bd1_authattr -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress '-Dtest=StaffAuthAuditAttributionIntegrationTests,StaffAuthAuditAppendOnlyIntegrationTests,ReservationsSchemaUpgradeTests' test
docker compose -p pms_bd1_authattr -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
```

Los tests instalan el master en esquema vacío, migran desde un master anterior
exacto a AUTH-02 con eventos legados, comparan campos/checksums y reaplican sin
cambios. También prueban metadata/nullability, constructor JPA e INSERT JDBC
legados, valores de scope/actor, coherencia y FKs, rechazos append-only, rollback
y login/refresh/logout reales. Revisar cero failures/errors/skipped y
BUILD SUCCESS. La evidencia de cada corrida se registra en AlanPlan/AlanHandoff;
CI remoto no se acredita hasta publicación autorizada.

Validación local del agente (2026-10-05): 17 focalizados y 347 en verify PASS,
PostgreSQL 17.11/Java 21.0.9. Bloque SQL siguiente comprobado con los resultados
esperados. QA manual del usuario pendiente: estado EN_QA.

## QA manual del usuario

Ejecutar primero los focalizados para aplicar el master. No usar una base
habitual o compartida. Revisar el resultado automático de vacío, upgrade y
reaplicación; luego ejecutar este bloque en la misma base QA. IDs y eventos son
sintéticos. No borrar AuditTrail confirmado para limpiar fixtures.

```bash
docker compose -p pms_bd1_authattr -f compose.bd2-test.yaml exec -T postgres \
  psql -U pms_test -d pms_bd2_test -v ON_ERROR_STOP=1 <<'SQL'
\set VERBOSITY verbose
SELECT id, exectype FROM databasechangelog WHERE id='003-staff-auth-008';
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='auth_audit_events'
  AND column_name IN ('organization_id','property_id','scope_kind','actor_context','actor_id','correlation_id')
ORDER BY column_name;
SELECT count(*) AS physical_subject_columns FROM information_schema.columns
WHERE table_schema='public' AND table_name='auth_audit_events'
  AND column_name IN ('subject_id','subject_type');
SELECT trigger_name, event_manipulation FROM information_schema.triggers
WHERE trigger_schema='public' AND trigger_name='trg_staff_auth_audit_append_only'
ORDER BY event_manipulation;
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.auth_audit_events'::regclass ORDER BY conname;

-- INSERT legacy: sujeto presente sin inferencia de actor/scope.
INSERT INTO auth_audit_events(id,event_type,staff_user_id,session_id,occurred_at,detail)
VALUES (gen_random_uuid(),'STAFF_LOGIN_SUCCEEDED',gen_random_uuid(),gen_random_uuid(),now(),'qa AUTH-02 legacy')
RETURNING id \gset legacy_
SELECT staff_user_id IS NOT NULL AS subject_preserved,
       organization_id IS NULL AND property_id IS NULL AND scope_kind IS NULL
       AND actor_context IS NULL AND actor_id IS NULL AND correlation_id IS NULL AS metadata_null
FROM auth_audit_events WHERE id=:'legacy_id';

BEGIN;
-- Datos maestros QA se revertirán junto con el evento pendiente.
INSERT INTO organizations(id,name,code,status,created_at,updated_at)
VALUES (gen_random_uuid(),'AUTH-02 QA',gen_random_uuid()::text,'ACTIVE',now(),now())
RETURNING id \gset org_
INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at)
VALUES (gen_random_uuid(),:'org_id','AUTH-02 QA',gen_random_uuid()::text,'America/Guatemala','GTQ','ACTIVE',now(),now())
RETURNING id \gset prop_
INSERT INTO auth_audit_events(id,event_type,occurred_at,detail,organization_id,property_id,scope_kind,actor_context,correlation_id)
VALUES (gen_random_uuid(),'STAFF_SESSION_REVOKED',now(),'qa AUTH-02 scoped',:'org_id',:'prop_id','PROPERTY','SYSTEM',gen_random_uuid())
RETURNING id \gset pending_
SELECT count(*) AS pending_before_rollback FROM auth_audit_events WHERE id=:'pending_id';

-- Cada error esperado se recupera mediante savepoint.
SAVEPOINT invalid_scope;
\set ON_ERROR_STOP off
INSERT INTO auth_audit_events(id,event_type,occurred_at,scope_kind)
VALUES (gen_random_uuid(),'STAFF_LOGIN_SUCCEEDED',now(),'INVALID');
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT invalid_scope;
SAVEPOINT invalid_actor;
\set ON_ERROR_STOP off
INSERT INTO auth_audit_events(id,event_type,occurred_at,actor_context)
VALUES (gen_random_uuid(),'STAFF_LOGIN_SUCCEEDED',now(),'ADMIN');
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT invalid_actor;
SAVEPOINT incomplete_scope;
\set ON_ERROR_STOP off
INSERT INTO auth_audit_events(id,event_type,occurred_at,scope_kind)
VALUES (gen_random_uuid(),'STAFF_LOGIN_SUCCEEDED',now(),'PROPERTY');
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT incomplete_scope;
SAVEPOINT unknown_organization;
\set ON_ERROR_STOP off
INSERT INTO auth_audit_events(id,event_type,occurred_at,scope_kind,organization_id)
VALUES (gen_random_uuid(),'STAFF_LOGIN_SUCCEEDED',now(),'ORGANIZATION',gen_random_uuid());
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT unknown_organization;
SAVEPOINT immutable_update;
\set ON_ERROR_STOP off
UPDATE auth_audit_events SET actor_context='UNKNOWN' WHERE id=:'legacy_id';
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT immutable_update;
SAVEPOINT immutable_delete;
\set ON_ERROR_STOP off
DELETE FROM auth_audit_events WHERE id=:'legacy_id';
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT immutable_delete;
ROLLBACK;
SELECT count(*) AS pending_after_rollback FROM auth_audit_events WHERE id=:'pending_id';
SELECT count(*) AS legacy_preserved FROM auth_audit_events WHERE id=:'legacy_id'
  AND detail='qa AUTH-02 legacy' AND actor_id IS NULL AND actor_context IS NULL;
SQL
```

Esperado: changeset EXECUTED; exactamente seis columnas, UUID o VARCHAR(16),
nullable YES y defaults NULL; cero columnas de sujeto; trigger DELETE/UPDATE;
constraints presentes; subject_preserved y metadata_null en `t`. Los tres
primeros errores son 23514, referencia inválida 23503 y UPDATE/DELETE P0001.
Contadores: pendiente 1 antes de rollback, 0 después y legado preservado 1.
Un error diferente o una operación inválida aceptada no es PASS.

Conservar salida sanitizada y confirmar QA manual PASS al usuario responsable.
AUTH-02 permanece EN_QA hasta esa confirmación. Commit/push/merge no autorizados.
Al terminar el QA, retirar solo este proyecto descartable (incluye su cache):

```bash
docker compose -p pms_bd1_authattr -f compose.bd2-test.yaml down -v
```
