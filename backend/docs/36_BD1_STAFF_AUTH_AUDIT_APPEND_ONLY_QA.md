# BE-008B-AUTH-01 — QA de protección append-only Staff

La migración aditiva `003-staff-auth-007` instala
`trg_staff_auth_audit_append_only` sobre `auth_audit_events`: UPDATE y DELETE
de filas existentes fallan con SQLSTATE `P0001`. INSERT y el rollback de una
inserción no confirmada conservan su comportamiento. Las migraciones aplicadas
y los eventos anteriores no se modifican.

Este incremento protege la persistencia Staff. No añade HTTP/BFF, lecturas
administrativas, atribución/backfill ni un módulo 008. La corrección del rollback
de intentos fallidos de autenticación/revocación de refresh (C6-D06) sigue fuera
de este incremento. La protección aquí comprobada es contra UPDATE/DELETE;
no se presenta como una restricción de operaciones DDL administrativas.

## Pruebas automatizadas

Desde `backend/`, con Docker disponible, usar exclusivamente la base QA
descartable de `compose.bd2-test.yaml` (PostgreSQL 17 y Maven/Java 21, sin
puertos del host ni secretos del proyecto):

```bash
docker compose -p pms_bd1_authaudit -f compose.bd2-test.yaml up -d postgres
docker compose -p pms_bd1_authaudit -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress '-Dtest=StaffAuthAuditAppendOnlyIntegrationTests,ReservationsSchemaUpgradeTests' test
docker compose -p pms_bd1_authaudit -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
```

La suite focalizada comprueba instalación limpia del master; protección Staff,
Reservations y Guest; rechazo de mutaciones individuales y masivas; INSERT
confirmado visible desde otra conexión; rollback de INSERT y de una transacción
con mutación rechazada; upgrade desde el master anterior con eventos legados,
comparación de todos sus campos y checksums previos; reaplicación sin cambios;
login, refresh válido y logout Staff con sus eventos confirmados. Las fixtures
confirmadas se conservan en esta base descartable: no se borra AuditTrail para
limpiar pruebas. Los esquemas aislados se retiran al finalizar cada test.

Revisar `Tests run`, cero failures/errors/skipped y `BUILD SUCCESS`. Validación
local de esta entrega: 8 pruebas focalizadas y 338 en verify completo PASS,
PostgreSQL 17/Java 21; bloque SQL de la guía comprobado. QA manual del usuario
pendiente. Los resultados se registran en AlanPlan/AlanHandoff. CI remoto se valida
cuando se publique con autorización; una corrida local no acredita CI remoto.

## QA manual del usuario

Ejecutar primero la suite focalizada anterior para aplicar Liquibase a la base
QA. No ejecutar estas instrucciones sobre la base habitual o un entorno
compartido. Luego, desde `backend/`, abrir psql con este bloque:

```bash
docker compose -p pms_bd1_authaudit -f compose.bd2-test.yaml exec -T postgres \
  psql -U pms_test -d pms_bd2_test -v ON_ERROR_STOP=1 <<'SQL'
\set VERBOSITY verbose

-- Comprobar la migración y el trigger (dos filas: UPDATE y DELETE).
SELECT id, author, filename FROM databasechangelog WHERE id = '003-staff-auth-007';
SELECT trigger_name, event_manipulation FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'auth_audit_events'
  AND trigger_name = 'trg_staff_auth_audit_append_only'
ORDER BY event_manipulation;

-- Crear un evento sintético y confirmarlo. \gset conserva el ID en psql.
BEGIN;
INSERT INTO auth_audit_events(id,event_type,occurred_at,detail)
VALUES (gen_random_uuid(),'STAFF_SESSION_REVOKED',
        '2035-01-01T12:34:56.123456Z','qa append-only original')
RETURNING id \gset audit_
COMMIT;

-- Los dos errores P0001 son el resultado esperado; recuperar cada savepoint.
BEGIN;
SAVEPOINT expected_update;
\set ON_ERROR_STOP off
UPDATE auth_audit_events SET detail = 'unauthorized change' WHERE id = :'audit_id';
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT expected_update;
SAVEPOINT expected_delete;
\set ON_ERROR_STOP off
DELETE FROM auth_audit_events WHERE id = :'audit_id';
\set ON_ERROR_STOP on
ROLLBACK TO SAVEPOINT expected_delete;
COMMIT;

-- Debe conservar una fila, el detalle original y la precisión temporal.
SELECT id, event_type, detail, occurred_at,
       detail = 'qa append-only original' AS detail_preserved,
       occurred_at = '2035-01-01T12:34:56.123456Z'::timestamptz AS time_preserved
FROM auth_audit_events WHERE id = :'audit_id';

-- INSERT funciona dentro de una transacción; ROLLBACK elimina solo lo no confirmado.
BEGIN;
INSERT INTO auth_audit_events(id,event_type,occurred_at,detail)
VALUES (gen_random_uuid(),'STAFF_LOGIN_SUCCEEDED',now(),'qa rollback')
RETURNING id \gset pending_
SELECT count(*) AS before_rollback FROM auth_audit_events WHERE id = :'pending_id';
ROLLBACK;
SELECT count(*) AS after_rollback FROM auth_audit_events WHERE id = :'pending_id';
SELECT count(*) AS committed_event_preserved FROM auth_audit_events WHERE id = :'audit_id';
SQL
```

Resultados esperados: changeset presente; trigger para DELETE y UPDATE; ambos
errores con `P0001` y `auth_audit_events is append-only`; `detail_preserved` y
`time_preserved` en `t`; contadores `before_rollback=1`, `after_rollback=0` y
`committed_event_preserved=1`. Un UPDATE/DELETE que tenga éxito o que falle por
otro motivo no es PASS. Conservar salida sanitizada y confirmar el resultado
manual antes de marcar la tarea COMPLETADA.

Al terminar las pruebas y el QA manual, retirar solo este proyecto aislado:

```bash
docker compose -p pms_bd1_authaudit -f compose.bd2-test.yaml down -v
```

La tarea permanece EN_QA hasta la ejecución y confirmación manual del usuario.
Commit, push y merge requieren autorización explícita.
