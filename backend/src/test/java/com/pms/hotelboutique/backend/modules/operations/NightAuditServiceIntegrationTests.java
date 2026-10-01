package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.DiscrepancyService;
import com.pms.hotelboutique.backend.modules.operations.application.MaintenanceService;
import com.pms.hotelboutique.backend.modules.operations.application.NightAuditException;
import com.pms.hotelboutique.backend.modules.operations.application.NightAuditService;
import com.pms.hotelboutique.backend.modules.operations.domain.BusinessDay;
import com.pms.hotelboutique.backend.modules.operations.domain.HkDiscrepancy;
import com.pms.hotelboutique.backend.modules.operations.domain.MaintenanceOrder;
import com.pms.hotelboutique.backend.modules.operations.domain.NightAuditRun;
import com.pms.hotelboutique.backend.modules.operations.support.OperationsFixtures;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
class NightAuditServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    NightAuditService nightAudit;

    @Autowired
    DiscrepancyService discrepancies;

    @Autowired
    MaintenanceService maintenance;

    @Autowired
    AuditService audit;

    @Autowired
    JdbcTemplate jdbc;

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

    private void openToday() {
        nightAudit.openDay(new NightAuditService.OpenDayCommand(SEED_PROPERTY,
                LocalDate.parse("2026-11-01")), actor);
    }

    @Test
    void opensOnceAndClosesCleanly() {
        openToday();
        assertThrows(NightAuditException.class, () -> nightAudit.openDay(
                new NightAuditService.OpenDayCommand(SEED_PROPERTY, LocalDate.parse("2026-11-01")),
                actor));
        assertThrows(ConstraintViolationException.class, () -> nightAudit.openDay(
                new NightAuditService.OpenDayCommand(SEED_PROPERTY, null), actor));

        var result = nightAudit.closeDay(SEED_PROPERTY, actor);
        assertEquals(BusinessDay.Status.CLOSED, result.closed().status());
        assertEquals(LocalDate.parse("2026-11-02"), result.next().businessDate());
        assertEquals(BusinessDay.Status.OPEN, result.next().status());
        assertEquals(NightAuditRun.Status.COMPLETED, result.run().status());

        var events = audit.findByEntity("BUSINESS_DAY", result.closed().id());
        assertEquals(2, events.size());
        assertEquals("NIGHT_AUDIT_COMPLETED", events.get(1).action());
    }

    @Test
    void blocksOnOpenDiscrepancyUntilReconciled() {
        openToday();
        var reported = discrepancies.report(new DiscrepancyService.ReportDiscrepancyCommand(
                SEED_PROPERTY, room, HkDiscrepancy.FoStatus.OCCUPIED,
                HkDiscrepancy.HkStatus.CLEAN, actor));

        var blocked = org.junit.jupiter.api.Assertions.assertThrows(NightAuditException.class,
                () -> nightAudit.closeDay(SEED_PROPERTY, actor));
        assertTrue(blocked.getMessage().contains("unreconciled housekeeping discrepancies"));
        // The day stays open and the blocked run is traceable.
        assertEquals(LocalDate.parse("2026-11-01"), nightAudit.currentDay(SEED_PROPERTY).businessDate());
        assertEquals(1, nightAudit.listRuns(scope(SEED_PROPERTY)).size());
        assertEquals(NightAuditRun.Status.BLOCKED,
                nightAudit.listRuns(scope(SEED_PROPERTY)).get(0).status());

        discrepancies.investigate(reported.id(), actor);
        discrepancies.reconcile(reported.id(),
                new DiscrepancyService.ReconcileCommand("Late checkout"), actor);
        var result = nightAudit.closeDay(SEED_PROPERTY, actor);
        assertEquals(NightAuditRun.Status.COMPLETED, result.run().status());
    }

    @Test
    void blocksOnlyOnUrgentMaintenance() {
        openToday();
        maintenance.openOrder(new MaintenanceService.OpenOrderCommand(SEED_PROPERTY, "Touch up paint",
                null, MaintenanceOrder.Priority.LOW, room, actor));
        // Routine carry-over never blocks the close: 11-01 shuts, 11-02 opens.
        nightAudit.closeDay(SEED_PROPERTY, actor);

        maintenance.openOrder(new MaintenanceService.OpenOrderCommand(SEED_PROPERTY, "Gas leak",
                null, MaintenanceOrder.Priority.URGENT, room, actor));
        assertThrows(NightAuditException.class, () -> nightAudit.closeDay(SEED_PROPERTY, actor));
    }

    @Test
    void rejectsCloseWithoutOpenDayAndMissingScope() {
        assertThrows(NightAuditException.class, () -> nightAudit.closeDay(SEED_PROPERTY, actor));
        assertThrows(NightAuditException.class, () -> nightAudit.currentDay(null));
        openToday();
        assertThrows(NightAuditException.class, () -> nightAudit.listDays(null));
        assertEquals(1, nightAudit.listDays(scope(SEED_PROPERTY)).size());
        assertTrue(nightAudit.listDays(scope(UUID.randomUUID())).isEmpty());
    }
}
