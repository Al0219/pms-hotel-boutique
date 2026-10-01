package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.OutageException;
import com.pms.hotelboutique.backend.modules.operations.application.OutageService;
import com.pms.hotelboutique.backend.modules.operations.domain.OutageKind;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
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
class OutageServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    OutageService outages;

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

    private OutageService.RegisterOutageCommand register(OutageKind kind) {
        return new OutageService.RegisterOutageCommand(SEED_PROPERTY, room, kind,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-04"), "AC repair", actor);
    }

    @Test
    void registersOooAndOosWithAudit() {
        var ooo = outages.registerOutage(register(OutageKind.OOO));
        assertEquals(OutageKind.OOO, ooo.kind());
        assertNull(ooo.releasedAt());

        var oos = outages.registerOutage(register(OutageKind.OOS));
        assertEquals(OutageKind.OOS, oos.kind());

        var events = audit.findByEntity("OUT_OF_ORDER", ooo.id());
        assertEquals(1, events.size());
        assertEquals("OUTAGE_REGISTERED", events.get(0).action());
    }

    @Test
    void releasesOnceWithGuards() {
        var registered = outages.registerOutage(register(OutageKind.OOO));

        var released = outages.releaseOutage(registered.id(),
                new OutageService.ReleaseOutageCommand("AC fixed and verified", actor));
        assertNotNull(released.releasedAt());
        assertEquals(actor, released.releasedBy());

        assertThrows(OutageException.class, () -> outages.releaseOutage(registered.id(),
                new OutageService.ReleaseOutageCommand("Again", actor)));
        assertThrows(OutageException.class, () -> outages.releaseOutage(UUID.randomUUID(),
                new OutageService.ReleaseOutageCommand("Ghost", actor)));
    }

    @Test
    void rejectsInvalidOutages() {
        assertThrows(OutageException.class, () -> outages.registerOutage(
                new OutageService.RegisterOutageCommand(SEED_PROPERTY, room, OutageKind.OOO,
                        LocalDate.parse("2026-11-04"), LocalDate.parse("2026-11-04"), "Empty", actor)));
        assertThrows(OutageException.class, () -> outages.registerOutage(
                new OutageService.RegisterOutageCommand(SEED_PROPERTY, UUID.randomUUID(),
                        OutageKind.OOO, LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                        "Ghost room", actor)));
        assertThrows(ConstraintViolationException.class, () -> outages.registerOutage(
                new OutageService.RegisterOutageCommand(SEED_PROPERTY, room, null,
                        LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"), "No kind", actor)));
    }

    @Test
    void scopesReads() {
        var registered = outages.registerOutage(register(OutageKind.OOO));

        assertEquals(1, outages.listByScope(scope(SEED_PROPERTY)).size());
        assertTrue(outages.listByScope(scope(UUID.randomUUID())).isEmpty());
        assertEquals(registered.id(),
                outages.getScoped(scope(SEED_PROPERTY), registered.id()).id());
        assertThrows(OutageException.class,
                () -> outages.getScoped(scope(UUID.randomUUID()), registered.id()));
        assertThrows(OutageException.class, () -> outages.listByScope(null));
    }
}
