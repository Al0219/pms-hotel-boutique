package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.DiscrepancyException;
import com.pms.hotelboutique.backend.modules.operations.application.DiscrepancyService;
import com.pms.hotelboutique.backend.modules.operations.domain.HkDiscrepancy;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkDiscrepancyRepository;
import com.pms.hotelboutique.backend.modules.operations.support.OperationsFixtures;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class DiscrepancyServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    DiscrepancyService discrepancies;

    @Autowired
    AuditService audit;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    DataSource dataSource;

    @Autowired
    HkDiscrepancyRepository repository;

    private UUID room;
    private UUID actor;

    private static AuthorizedPropertyScope scope(UUID... properties) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(properties));
    }

    @BeforeEach
    void fixtures() {
        room = OperationsFixtures.room(jdbc, SEED_PROPERTY, "KING");
        actor = OperationsFixtures.staff(jdbc);
    }

    @Test
    void investigatesAndReconcilesWithAudit() {
        var reported = discrepancies.report(new DiscrepancyService.ReportDiscrepancyCommand(
                SEED_PROPERTY, room, HkDiscrepancy.FoStatus.OCCUPIED,
                HkDiscrepancy.HkStatus.CLEAN, actor));
        assertEquals(HkDiscrepancy.Status.OPEN, reported.status());

        discrepancies.investigate(reported.id(), actor);
        var reconciled = discrepancies.reconcile(reported.id(),
                new DiscrepancyService.ReconcileCommand("Late checkout, room soiled"), actor);
        assertEquals(HkDiscrepancy.Status.RECONCILED, reconciled.status());
        assertNotNull(reconciled.resolvedAt());

        var events = audit.findByEntity("HK_DISCREPANCY", reported.id());
        assertEquals(3, events.size());
        assertEquals("DISCREPANCY_RECONCILED", events.get(2).action());
    }

    @Test
    void guardsLifecycle() {
        var reported = discrepancies.report(new DiscrepancyService.ReportDiscrepancyCommand(
                SEED_PROPERTY, room, HkDiscrepancy.FoStatus.VACANT,
                HkDiscrepancy.HkStatus.DIRTY, actor));
        assertThrows(DiscrepancyException.class, () -> discrepancies.reconcile(reported.id(),
                new DiscrepancyService.ReconcileCommand("Skip"), actor));
        assertThrows(jakarta.validation.ConstraintViolationException.class,
                () -> discrepancies.reconcile(reported.id(),
                        new DiscrepancyService.ReconcileCommand("  "), actor));

        discrepancies.cancel(reported.id(), actor);
        assertEquals(HkDiscrepancy.Status.CANCELLED, discrepancies.get(reported.id()).status());
        assertThrows(DiscrepancyException.class, () -> discrepancies.get(UUID.randomUUID()));
    }

    @Test
    void rejectsUnknownRoomThroughForeignKey() throws Exception {
        try (var connection = TestConnections.publicConnection(dataSource);
                var statement = connection.prepareStatement(
                        "INSERT INTO hk_discrepancies(id,property_id,room_id,fo_status,hk_status,"
                                + "status,created_at,updated_at) VALUES (?,?,?,?,?,'OPEN',now(),now())")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, SEED_PROPERTY);
            statement.setObject(3, UUID.randomUUID());
            statement.setString(4, "VACANT");
            statement.setString(5, "DIRTY");
            var error = org.junit.jupiter.api.Assertions.assertThrows(
                    java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23503", error.getSQLState());
            // Autocommit connection: the rejected insert is already rolled back.
        }
    }

    @Test
    void listsByScope() {
        var reported = discrepancies.report(new DiscrepancyService.ReportDiscrepancyCommand(
                SEED_PROPERTY, room, HkDiscrepancy.FoStatus.OCCUPIED,
                HkDiscrepancy.HkStatus.CLEAN, actor));
        assertEquals(1, discrepancies.listByScope(scope(SEED_PROPERTY)).size());
        assertTrue(discrepancies.listByScope(scope(UUID.randomUUID())).isEmpty());
        assertThrows(DiscrepancyException.class, () -> discrepancies.listByScope(null));
        assertNotNull(reported.id());
    }
}
