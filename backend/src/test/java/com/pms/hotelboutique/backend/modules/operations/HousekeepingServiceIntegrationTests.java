package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.HousekeepingException;
import com.pms.hotelboutique.backend.modules.operations.application.HousekeepingService;
import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
class HousekeepingServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    HousekeepingService housekeeping;

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

    @Test
    void tracksRoomDirtyAndCleansIt() {
        var tracked = housekeeping.trackRoom(SEED_PROPERTY, room, actor);
        assertEquals(HkRoomState.Status.DIRTY, tracked.status());

        var cleaned = housekeeping.markClean(SEED_PROPERTY, room, actor);
        assertEquals(HkRoomState.Status.CLEAN, cleaned.status());
        assertEquals(actor, cleaned.updatedBy());

        // Tracking twice returns the same row.
        assertEquals(tracked.id(), housekeeping.trackRoom(SEED_PROPERTY, room, actor).id());
    }

    @Test
    void inspectsAndRejectsWithAudit() {
        housekeeping.trackRoom(SEED_PROPERTY, room, actor);
        housekeeping.markClean(SEED_PROPERTY, room, actor);
        housekeeping.inspect(SEED_PROPERTY, room, actor);

        var rejected = housekeeping.rejectInspection(SEED_PROPERTY, room, "Dust on shelves", actor);
        assertEquals(HkRoomState.Status.DIRTY, rejected.status());

        var events = audit.findByEntity("HK_ROOM_STATE", rejected.id());
        // trackRoom is silent; the three transitions are audited.
        assertEquals(3, events.size());
        assertEquals("HK_INSPECTION_REJECTED", events.get(2).action());
        assertEquals("Dust on shelves", events.get(2).reason());
    }

    @Test
    void guardsTransitions() {
        housekeeping.trackRoom(SEED_PROPERTY, room, actor);
        assertThrows(HousekeepingException.class,
                () -> housekeeping.inspect(SEED_PROPERTY, room, actor));
        assertThrows(HousekeepingException.class,
                () -> housekeeping.rejectInspection(SEED_PROPERTY, room, "Nope", actor));
        assertThrows(HousekeepingException.class,
                () -> housekeeping.rejectInspection(SEED_PROPERTY, room, "  ", actor));
        assertThrows(HousekeepingException.class,
                () -> housekeeping.statusOf(SEED_PROPERTY, UUID.randomUUID()));
    }

    @Test
    void togglesDndAsOverlay() {
        var tracked = housekeeping.trackRoom(SEED_PROPERTY, room, actor);
        var on = housekeeping.setDnd(SEED_PROPERTY, room, true, actor);
        assertTrue(on.dnd());
        assertEquals(HkRoomState.Status.DIRTY, on.status());

        var off = housekeeping.setDnd(SEED_PROPERTY, room, false, actor);
        assertFalse(off.dnd());
        assertEquals(tracked.id(), off.id());
    }

    @Test
    void listsByScope() {
        housekeeping.trackRoom(SEED_PROPERTY, room, actor);
        List<HousekeepingService.HkRoomView> scoped = housekeeping.listByScope(scope(SEED_PROPERTY));
        assertEquals(1, scoped.size());
        assertEquals(room, scoped.get(0).roomId());

        assertTrue(housekeeping.listByScope(scope(UUID.randomUUID())).isEmpty());
        assertThrows(HousekeepingException.class, () -> housekeeping.listByScope(null));
    }

    @Test
    void enforcesRoomForeignKey() throws Exception {
        try (var connection = TestConnections.publicConnection(dataSource);
                var statement = connection.prepareStatement(
                        "INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at)"
                                + " VALUES (?,?,?,'DIRTY',false,now(),now())")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, SEED_PROPERTY);
            statement.setObject(3, UUID.randomUUID());
            var error = org.junit.jupiter.api.Assertions.assertThrows(
                    java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23503", error.getSQLState());
        }
    }
}
