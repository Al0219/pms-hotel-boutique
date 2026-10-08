package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationService.*;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.sql.Connection;
import java.util.Currency;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** No enclosing test transaction: all assertions observe committed application results. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class LocalOperationIntegrationTests {
    private static final String SCHEMA = "bd2_local_" + UUID.randomUUID().toString().replace("-", "");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final OperationDefinition CHARGE = new OperationDefinition("TEST_CHARGE", "FOLIO_PAYMENT_OPERATE");
    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }
    @Autowired LocalOperationService operations;
    @Autowired FolioService folios;
    @Autowired StaffAuthService sessions;
    @Autowired AuditService audit;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired PlatformTransactionManager transactions;
    private UUID property;
    private UUID secondProperty;
    private UUID folio;
    private StaffPrincipal staff;

    @BeforeEach
    void fixtures() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = property(); secondProperty = property();
        staff = staff(property, secondProperty);
        folio = folios.openFolio(new FolioService.OpenFolioCommand(property, Folio.Type.GUEST, "GTQ", null, null, null)).id();
    }

    @AfterAll
    void dropOwnedSchema() { jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }

    @Test
    void replayReturnsOriginalReceiptAndOnlyOneFinancialMovementAndAudit() {
        var request = request(folio, 10001);
        var original = operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        var replay = operations.execute(staff, property, CHARGE, request, context -> { fail("replay must not execute persistence"); return null; });
        assertEquals(original, replay);
        assertEquals(staff.staffUserId(), original.staffUserId());
        assertEquals(10001, folios.balanceOf(folio).minorUnits().value());
        assertEquals(1, folios.movementsOf(folio).size());
        assertEquals(staff.staffUserId(), folios.movementsOf(folio).getFirst().createdBy());
        assertEquals(1, receipts());
        var events = audit.findByEntity("LOCAL_OPERATION", original.operationId());
        assertEquals(1, events.size());
        assertEquals(staff.staffUserId(), events.getFirst().actorId());
        assertEquals(property, events.getFirst().propertyId());
        assertEquals(original.operationId(), events.getFirst().correlationId());
        assertFalse(events.getFirst().afterState().contains(request.key()));
    }

    @Test
    void conflictsDoNotAlterOriginalResult() {
        var request = request(folio, 10001);
        operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        assertThrows(LocalOperationConflictException.class, () -> operations.execute(staff, property, CHARGE,
                request(folio, 10002), context -> charge(context, folio, 10002)));
        assertThrows(LocalOperationConflictException.class, () -> operations.execute(staff, property, CHARGE,
                new LocalOperationRequest(request.key(), 2, request.payload()), context -> UUID.randomUUID()));
        assertThrows(LocalOperationConflictException.class, () -> operations.execute(staff, property,
                new OperationDefinition(CHARGE.name(), "RESERVATION_MANAGE"), request, context -> UUID.randomUUID()));
        assertEquals(1, receipts()); assertEquals(10001, folios.balanceOf(folio).minorUnits().value());
    }

    @Test
    void isolatesActorPropertyAndOperationNamespaces() {
        var request = request(folio, 10001);
        var first = operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        var otherActor = staff(property);
        var second = operations.execute(otherActor, property, CHARGE, request, context -> charge(context, folio, 10001));
        var third = operations.execute(staff, property, new OperationDefinition("TEST_OTHER_CHARGE", "FOLIO_PAYMENT_OPERATE"),
                request, context -> charge(context, folio, 10001));
        UUID otherFolio = folios.openFolio(new FolioService.OpenFolioCommand(secondProperty, Folio.Type.GUEST, "GTQ", null, null, null)).id();
        var fourth = operations.execute(staff, secondProperty, CHARGE, request(otherFolio, 10001),
                context -> charge(context, otherFolio, 10001));
        assertEquals(4, Set.of(first.operationId(), second.operationId(), third.operationId(), fourth.operationId()).size());
        assertEquals(3, receipts()); assertEquals(30003, folios.balanceOf(folio).minorUnits().value());
        assertEquals(10001, folios.balanceOf(otherFolio).minorUnits().value());
    }

    @Test
    void anotherActiveSessionOfSameStaffReplaysTheReceipt() {
        var request = request(folio, 10001);
        var original = operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        sessions.logout(staff);
        var nextSession = session(staff.staffUserId());
        assertEquals(original, operations.execute(nextSession, property, CHARGE, request, context -> UUID.randomUUID()));
        assertEquals(1, receipts());
    }

    @Test
    void revokedSessionCannotRecoverAnExistingReceipt() {
        var request = request(folio, 10001);
        operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        sessions.logout(staff);
        assertThrows(StaffAuthenticationException.class, () -> operations.execute(staff, property, CHARGE, request, context -> UUID.randomUUID()));
        assertEquals(1, receipts());
    }

    @Test
    void lostMembershipPreventsReplay() {
        var request = request(folio, 10001);
        operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        jdbc.update("UPDATE organization_memberships SET status='INACTIVE' WHERE staff_user_id=?", staff.staffUserId());
        assertThrows(StaffAuthenticationException.class, () -> operations.execute(staff, property, CHARGE, request, context -> UUID.randomUUID()));
        assertEquals(1, receipts());
    }

    @Test
    void lostPropertyPreventsReplayEvenWithAnotherAuthorizedProperty() {
        var request = request(folio, 10001);
        operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        jdbc.update("UPDATE membership_properties SET status='INACTIVE' WHERE staff_user_id=? AND property_id=?", staff.staffUserId(), property);
        assertThrows(AccessDeniedException.class, () -> operations.execute(staff, property, CHARGE, request, context -> UUID.randomUUID()));
        assertEquals(1, receipts());
    }

    @Test
    void currentPermissionOverridesOldPrincipalRole() {
        var request = request(folio, 10001);
        operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        jdbc.update("UPDATE organization_memberships SET role_code='OPERACIONES' WHERE staff_user_id=?", staff.staffUserId());
        jdbc.update("UPDATE staff_users SET role_code='OPERACIONES' WHERE id=?", staff.staffUserId());
        assertThrows(AccessDeniedException.class, () -> operations.execute(staff, property, CHARGE, request, context -> UUID.randomUUID()));
        assertEquals(1, receipts());
    }

    @Test
    void rejectsUnapprovedScopeMissingSessionAndRefundPermissionBeforeWriting() {
        var request = request(folio, 10001);
        assertThrows(AccessDeniedException.class, () -> operations.execute(staff, property(), CHARGE, request, context -> UUID.randomUUID()));
        assertThrows(StaffAuthenticationException.class, () -> operations.execute(null, property, CHARGE, request, context -> UUID.randomUUID()));
        assertThrows(AccessDeniedException.class, () -> operations.execute(staff, property,
                new OperationDefinition("TEST_REFUND", "PAYMENT_REFUND_VOID"), request, context -> UUID.randomUUID()));
        assertEquals(0, receipts()); assertTrue(folios.movementsOf(folio).isEmpty());
    }

    @Test
    void callbackFailureRollsBackItsEffectsAndTheKeyCanBeRetried() {
        var request = request(folio, 10001);
        assertThrows(IllegalStateException.class, () -> operations.execute(staff, property, CHARGE, request, context -> {
            charge(context, folio, 10001); throw new IllegalStateException("disposable callback failure");
        }));
        assertEquals(0, receipts()); assertTrue(folios.movementsOf(folio).isEmpty());
        assertEquals(0, operationAuditCount());
        assertNotNull(operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001)));
        assertEquals(1, receipts());
    }

    @Test
    void outerRollbackRevertsReceiptMovementAndAuditTogether() {
        var request = request(folio, 10001);
        var uncommitted = new TransactionTemplate(transactions).execute(status -> {
            var result = operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
            status.setRollbackOnly(); return result;
        });
        assertEquals(0, receipts()); assertTrue(folios.movementsOf(folio).isEmpty()); assertEquals(0, operationAuditCount());
        var recovered = operations.execute(staff, property, CHARGE, request, context -> charge(context, folio, 10001));
        assertNotEquals(uncommitted.operationId(), recovered.operationId());
    }

    @Test
    void commitTimeAuditFailureRollsBackFinancialEffectAndReceipt() {
        // Fault injection exists only in this suite's generated schema; no app table is created manually.
        jdbc.execute("CREATE FUNCTION qa_reject_local_audit() RETURNS trigger AS $$ BEGIN IF NEW.action='LOCAL_OPERATION_COMPLETED' "
                + "THEN RAISE EXCEPTION 'disposable audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER qa_local_audit_failure BEFORE INSERT ON reservation_audit_events FOR EACH ROW EXECUTE FUNCTION qa_reject_local_audit()");
        try {
            var failure = assertThrows(RuntimeException.class, () -> operations.execute(staff, property, CHARGE, request(folio, 10001), context -> charge(context, folio, 10001)));
            boolean injectedFailure = false;
            for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
                if (cause.getMessage() != null && cause.getMessage().contains("disposable audit failure")) { injectedFailure = true; }
            }
            assertTrue(injectedFailure, "The rejection must come from the injected audit fault");
            assertEquals(0, receipts()); assertTrue(folios.movementsOf(folio).isEmpty()); assertEquals(0, operationAuditCount());
        } finally {
            jdbc.execute("DROP TRIGGER qa_local_audit_failure ON reservation_audit_events");
            jdbc.execute("DROP FUNCTION qa_reject_local_audit()");
        }
        assertNotNull(operations.execute(staff, property, CHARGE, request(folio, 10001), context -> charge(context, folio, 10001)));
    }

    @Test
    void rejectsReadOnlyAndIncompatibleOuterIsolation() {
        var readOnly = new TransactionTemplate(transactions); readOnly.setReadOnly(true);
        assertThrows(IllegalStateException.class, () -> readOnly.execute(status ->
                operations.execute(staff, property, CHARGE, request(folio, 10001), context -> charge(context, folio, 10001))));
        var repeatable = new TransactionTemplate(transactions); repeatable.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        assertThrows(IllegalStateException.class, () -> repeatable.execute(status ->
                operations.execute(staff, property, CHARGE, request(folio, 10001), context -> charge(context, folio, 10001))));
        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(transactions).execute(status -> {
            jdbc.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
            assertEquals("serializable", jdbc.queryForObject("SHOW transaction_isolation", String.class));
            return operations.execute(staff, property, CHARGE, request(folio, 10001), context -> charge(context, folio, 10001));
        }));
        assertEquals(0, receipts());
    }

    @Test
    void concurrentRetriesWaitForOuterCommitAndExecuteOnlyOnce() throws Exception {
        parallelRetries(false, false);
    }

    @Test
    void concurrentDifferentPayloadWaitsAndThenConflicts() throws Exception {
        parallelRetries(false, true);
    }

    @Test
    void waitingRetryExecutesAfterOriginalTransactionRollsBack() throws Exception {
        parallelRetries(true, false);
    }

    private void parallelRetries(boolean rollbackFirst, boolean differentPayload) throws Exception {
        var persisted = new CountDownLatch(1); var releaseCommit = new CountDownLatch(1);
        var pid = new AtomicInteger(); var calls = new AtomicInteger(); var request = request(folio, 10001);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                var result = operations.execute(staff, property, CHARGE, request, context -> { calls.incrementAndGet(); return charge(context, folio, 10001); });
                persisted.countDown(); await(releaseCommit);
                if (rollbackFirst) { status.setRollbackOnly(); }
                return result;
            }));
            try {
                assertTrue(persisted.await(20, TimeUnit.SECONDS));
                assertEquals(0, receipts());
                var second = workers.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                    pid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    return operations.execute(staff, property, CHARGE, differentPayload ? request(folio, 10002) : request,
                            context -> { calls.incrementAndGet(); return charge(context, folio, differentPayload ? 10002 : 10001); });
                }));
                assertTrue(waitForLock(pid)); assertFalse(second.isDone());
                releaseCommit.countDown();
                var firstResult = first.get(20, TimeUnit.SECONDS);
                if (differentPayload) {
                    var rejected = assertThrows(ExecutionException.class, () -> second.get(20, TimeUnit.SECONDS));
                    assertInstanceOf(LocalOperationConflictException.class, rejected.getCause());
                } else {
                    var secondResult = second.get(20, TimeUnit.SECONDS);
                    if (rollbackFirst) { assertNotEquals(firstResult.operationId(), secondResult.operationId()); }
                    else { assertEquals(firstResult, secondResult); }
                }
                assertEquals(rollbackFirst ? 2 : 1, calls.get());
                assertEquals(1, receipts()); assertEquals(1, operationAuditCount());
            } finally { releaseCommit.countDown(); }
        }
        assertEquals(10001, folios.balanceOf(folio).minorUnits().value());
    }

    @Test
    void databaseEnforcesUniqueIdentityValidFingerprintAndAppendOnly() throws Exception {
        var receipt = operations.execute(staff, property, CHARGE, request(folio, 10001), context -> charge(context, folio, 10001));
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                rejected(connection, "UPDATE local_operation_receipts SET result_id=id WHERE id=?", "P0001", receipt.operationId());
                rejected(connection, "DELETE FROM local_operation_receipts WHERE id=?", "P0001", receipt.operationId());
                String copy = "INSERT INTO local_operation_receipts(id,property_id,staff_user_id,operation_name,request_key,payload_version,request_hash,required_permission,result_id,completed_at) "
                        + "SELECT ?,property_id,staff_user_id,operation_name,request_key,payload_version,request_hash,required_permission,result_id,completed_at FROM local_operation_receipts WHERE id=?";
                rejected(connection, copy, "23505", UUID.randomUUID(), receipt.operationId());
                rejected(connection, copy.replace("request_key,payload_version,request_hash,required_permission,result_id,completed_at FROM",
                        "'different-key',payload_version,'bad-hash',required_permission,result_id,completed_at FROM"), "23514", UUID.randomUUID(), receipt.operationId());
            } finally { connection.rollback(); }
        }
        assertEquals(1, receipts());
    }

    private UUID charge(OperationContext context, UUID targetFolio, long minor) {
        assertEquals(Set.of(folios.get(targetFolio).propertyId()), context.scope().propertyIds());
        return folios.postCharge(targetFolio, new FolioService.MovementAmount(
                new MonetaryAmount(new MinorUnits(minor), Currency.getInstance("GTQ")), "Local posting"), context.actorId()).id();
    }
    private LocalOperationRequest request(UUID targetFolio, long minor) {
        return new LocalOperationRequest("operation-key", 1, Map.of("folioId", targetFolio.toString(),
                "amountMinor", Long.toString(minor), "currency", "GTQ", "description", "Local posting"));
    }
    private int receipts() { return jdbc.queryForObject("SELECT count(*) FROM local_operation_receipts WHERE property_id=?", Integer.class, property); }
    private int operationAuditCount() { return jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=? AND action='LOCAL_OPERATION_COMPLETED'", Integer.class, property); }
    private UUID property() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'Local operations','America/Guatemala','GTQ','ACTIVE',now(),now())", id, ORGANIZATION, "P-" + id);
        return id;
    }
    private StaffPrincipal staff(UUID... allowed) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'unused-test-hash','RECEPCION','ACTIVE',now(),now())", id, "staff-" + id, id + "@example.test");
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,'RECEPCION','ACTIVE',now(),now())", id, ORGANIZATION);
        for (UUID scope : allowed) { jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, scope); }
        return session(id);
    }
    private StaffPrincipal session(UUID actor) {
        UUID session = UUID.randomUUID();
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, actor);
        return new StaffPrincipal(actor, session, "fixture", "RECEPCION");
    }
    private void rejected(Connection connection, String sql, String state, Object... values) throws Exception {
        var savepoint = connection.setSavepoint();
        try (var statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < values.length; i++) { statement.setObject(i + 1, values[i]); }
            assertEquals(state, assertThrows(java.sql.SQLException.class, statement::executeUpdate).getSQLState());
        } finally { connection.rollback(savepoint); connection.releaseSavepoint(savepoint); }
    }
    private boolean waitForLock(AtomicInteger pid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            if (pid.get() != 0 && Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid=? AND wait_event_type='Lock')", Boolean.class, pid.get()))) { return true; }
            Thread.sleep(20);
        }
        return false;
    }
    private static void await(CountDownLatch latch) {
        try { if (!latch.await(30, TimeUnit.SECONDS)) { throw new IllegalStateException("test synchronization timeout"); } }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw new IllegalStateException(exception); }
    }
}
