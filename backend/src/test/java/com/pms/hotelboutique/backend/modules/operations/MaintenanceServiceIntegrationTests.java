package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.MaintenanceException;
import com.pms.hotelboutique.backend.modules.operations.application.MaintenanceService;
import com.pms.hotelboutique.backend.modules.operations.application.OutageService;
import com.pms.hotelboutique.backend.modules.operations.domain.MaintenanceOrder;
import com.pms.hotelboutique.backend.modules.operations.domain.OutageKind;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
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
class MaintenanceServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    MaintenanceService maintenance;

    @Autowired
    OutageService outages;

    @Autowired
    AuditService audit;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    DataSource dataSource;

    private UUID room;
    private UUID actor;

    private static AuthorizedPropertyScope scope(UUID... properties) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(properties));
    }

    @BeforeEach
    void fixtures() {
        room = UUID.randomUUID();
        actor = UUID.randomUUID();
        UUID type = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','King')",
                type, SEED_PROPERTY);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')",
                room, SEED_PROPERTY, type);
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,"
                + "created_at,updated_at) VALUES (?,?,?,'test-only-unused-hash','OPERACIONES','ACTIVE',"
                + "now(),now())", actor, actor.toString(), actor + "@example.test");
    }

    private MaintenanceService.OpenOrderCommand open(String title) {
        return new MaintenanceService.OpenOrderCommand(SEED_PROPERTY, title, "Bathroom sink",
                MaintenanceOrder.Priority.HIGH, room, actor);
    }

    @Test
    void opensProgressesAndResolves() {
        var opened = maintenance.openOrder(open("Leaking faucet"));
        assertEquals(MaintenanceOrder.Status.OPEN, opened.status());
        assertEquals(MaintenanceOrder.Priority.HIGH, opened.priority());
        assertEquals(room, opened.roomId());

        maintenance.startProgress(opened.id(), actor);
        var resolved = maintenance.resolve(opened.id(), actor);
        assertEquals(MaintenanceOrder.Status.RESOLVED, resolved.status());
        assertNotNull(resolved.resolvedAt());

        var events = audit.findByEntity("MAINTENANCE_ORDER", opened.id());
        assertEquals(3, events.size());
    }

    @Test
    void cancelsAssignsAndReopens() {
        var order = maintenance.openOrder(open("Broken lamp"));
        maintenance.assign(order.id(), actor, actor);
        assertEquals(actor, maintenance.get(order.id()).assignedTo());

        maintenance.cancel(order.id(), actor);
        assertEquals(MaintenanceOrder.Status.CANCELLED, maintenance.get(order.id()).status());
        assertThrows(MaintenanceException.class, () -> maintenance.resolve(order.id(), actor));

        var second = maintenance.openOrder(open("Noisy AC"));
        maintenance.resolve(second.id(), actor);
        maintenance.reopen(second.id(), actor);
        assertEquals(MaintenanceOrder.Status.OPEN, maintenance.get(second.id()).status());
    }

    @Test
    void linksOutageWithoutReleasingIt() {
        var order = maintenance.openOrder(open("Flooded bathroom"));
        var outage = outages.registerOutage(new OutageService.RegisterOutageCommand(
                SEED_PROPERTY, room, OutageKind.OOO, LocalDate.parse("2026-11-01"),
                LocalDate.parse("2026-11-04"), "Flooding", actor));

        var linked = maintenance.linkOutage(order.id(), outage.id(), actor);
        assertEquals(outage.id(), linked.oooRecordId());

        // Resolving the order leaves the outage in place: release is explicit.
        maintenance.resolve(order.id(), actor);
        var outageAfterResolve = outages.getScoped(scope(SEED_PROPERTY), outage.id());
        assertNull(outageAfterResolve.releasedAt());
        assertNull(outageAfterResolve.releasedBy());
    }

    @Test
    void rejectsInvalidOrders() {
        assertThrows(ConstraintViolationException.class, () -> maintenance.openOrder(
                new MaintenanceService.OpenOrderCommand(SEED_PROPERTY, "  ", null, null, null, null)));
        assertThrows(MaintenanceException.class, () -> maintenance.get(UUID.randomUUID()));
        assertThrows(MaintenanceException.class,
                () -> maintenance.linkOutage(UUID.randomUUID(), UUID.randomUUID(), actor));
    }

    @Test
    void rejectsUnknownRoomThroughForeignKey() throws Exception {
        // Unknown room bypassing the service: the composite FK must fail.
        try (var connection = TestConnections.publicConnection(dataSource);
                var statement = connection.prepareStatement(
                        "INSERT INTO maintenance_orders(id,property_id,room_id,title,priority,status,"
                                + "created_at,updated_at) VALUES (?,?,?,?,?,'OPEN',now(),now())")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, SEED_PROPERTY);
            statement.setObject(3, UUID.randomUUID());
            statement.setString(4, "Ghost");
            statement.setString(5, "LOW");
            var error = org.junit.jupiter.api.Assertions.assertThrows(
                    java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23503", error.getSQLState());
            // Autocommit connection: the rejected insert is already rolled back.
        }
    }

    @Test
    void listsByScope() {
        var order = maintenance.openOrder(open("Scoped"));
        assertEquals(1, maintenance.listByScope(scope(SEED_PROPERTY)).size());
        assertTrue(maintenance.listByScope(scope(UUID.randomUUID())).isEmpty());
        assertThrows(MaintenanceException.class, () -> maintenance.listByScope(null));
        assertNotNull(order.id());
    }
}
