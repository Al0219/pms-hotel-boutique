package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.AuditException;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import jakarta.validation.ConstraintViolationException;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AuditServiceIntegrationTests {

    @Autowired
    AuditService audit;

    @Autowired
    DataSource dataSource;

    private AuditService.RecordAuditCommand command(String action, UUID entityId, UUID correlation) {
        return new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,
                UUID.randomUUID(), action, "RESERVATION", entityId, null,
                "{\"status\":\"PENDING\"}", "{\"status\":\"CONFIRMED\"}", "Desk confirmation", correlation);
    }

    @Test
    void recordsAndReadsBack() {
        UUID entity = UUID.randomUUID();
        UUID correlation = UUID.randomUUID();

        AuditService.AuditEventView first = audit.record(command("RESERVATION_CREATED", entity, correlation));
        audit.record(command("RESERVATION_CONFIRMED", entity, correlation));

        assertNotNull(first.id());
        assertNotNull(first.occurredAt());
        assertEquals(2, audit.findByEntity("RESERVATION", entity).size());
        assertEquals(2, audit.findByCorrelation(correlation).size());
        assertEquals(first.id(), audit.get(first.id()).id());
    }

    @Test
    void rejectsInvalidCommands() {
        assertThrows(ConstraintViolationException.class, () -> audit.record(
                new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF, null,
                        "  ", "RESERVATION", UUID.randomUUID(), null, null, null, null, null)));
        assertThrows(ConstraintViolationException.class, () -> audit.record(
                new AuditService.RecordAuditCommand(null, null,
                        "CREATED", "RESERVATION", UUID.randomUUID(), null, null, null, null, null)));
        assertThrows(AuditException.class, () -> audit.get(UUID.randomUUID()));
        assertThrows(AuditException.class, () -> audit.findByEntity("  ", UUID.randomUUID()));
    }

    @Test
    void databaseRejectsAuditMutation() throws Exception {
        // Self-contained on one manual transaction: the trigger rejects the
        // write and the savepoint rollback keeps the connection usable.
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID id = UUID.randomUUID();
                try (var insert = connection.prepareStatement(
                        "INSERT INTO reservation_audit_events(id,occurred_at,actor_type,action,"
                                + "entity_type,entity_id,created_at)"
                                + " VALUES (?,'2026-09-30T12:00:00Z','SYSTEM','CREATED','RESERVATION',?,now())")) {
                    insert.setObject(1, id);
                    insert.setObject(2, UUID.randomUUID());
                    assertEquals(1, insert.executeUpdate());
                }
                rejected(connection, "UPDATE reservation_audit_events SET reason='Edited' WHERE id=?", id);
                rejected(connection, "DELETE FROM reservation_audit_events WHERE id=?", id);
                // INSERT stays legal: history only grows.
                try (var insert = connection.prepareStatement(
                        "INSERT INTO reservation_audit_events(id,occurred_at,actor_type,action,"
                                + "entity_type,entity_id,created_at)"
                                + " VALUES (?,'2026-09-30T12:00:00Z','SYSTEM','CONFIRMED','RESERVATION',?,now())")) {
                    insert.setObject(1, UUID.randomUUID());
                    insert.setObject(2, UUID.randomUUID());
                    assertEquals(1, insert.executeUpdate());
                }
            } finally {
                connection.rollback();
            }
        }
    }

    private void rejected(java.sql.Connection connection, String sql, Object... values)
            throws java.sql.SQLException {
        var savepoint = connection.setSavepoint();
        try {
            try (var statement = connection.prepareStatement(sql)) {
                for (int i = 0; i < values.length; i++) {
                    statement.setObject(i + 1, values[i]);
                }
                var error = org.junit.jupiter.api.Assertions.assertThrows(
                        java.sql.SQLException.class, statement::executeUpdate);
                org.junit.jupiter.api.Assertions.assertEquals("P0001", error.getSQLState());
            }
        } finally {
            connection.rollback(savepoint);
            connection.releaseSavepoint(savepoint);
        }
    }
}
