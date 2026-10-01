package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.ServiceRequestException;
import com.pms.hotelboutique.backend.modules.operations.application.ServiceRequestService;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceRequestRepository;
import com.pms.hotelboutique.backend.modules.operations.support.OperationsFixtures;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ServiceRequestServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    ServiceRequestService requests;

    @Autowired
    AuditService audit;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    DataSource dataSource;

    @Autowired
    ServiceRequestRepository repository;

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

    private ServiceRequestService.OpenRequestCommand open(ServiceRequest.Category category) {
        return new ServiceRequestService.OpenRequestCommand(SEED_PROPERTY, category,
                "Extra towels", "Two extra towels please", ServiceRequest.Priority.HIGH, null, null,
                room, null, actor, Instant.parse("2026-11-01T18:00:00Z"));
    }

    @Test
    void opensWorksAndCompletes() {
        var opened = requests.openRequest(open(ServiceRequest.Category.HOUSEKEEPING));
        assertEquals(ServiceRequest.Status.OPEN, opened.status());
        assertEquals(room, opened.roomId());
        assertEquals(actor, opened.createdBy());

        requests.startProgress(opened.id(), actor);
        var done = requests.complete(opened.id(), actor);
        assertEquals(ServiceRequest.Status.DONE, done.status());
        assertNotNull(done.completedAt());

        var events = audit.findByEntity("SERVICE_REQUEST", opened.id());
        assertEquals(3, events.size());

        requests.reopen(opened.id(), actor);
        assertEquals(ServiceRequest.Status.OPEN, requests.get(opened.id()).status());
    }

    @Test
    void cancelsAssignsAndGuards() {
        var order = requests.openRequest(open(ServiceRequest.Category.CONCIERGE));
        requests.assign(order.id(), actor, actor);
        assertEquals(actor, requests.get(order.id()).assignedTo());

        requests.cancel(order.id(), actor);
        assertEquals(ServiceRequest.Status.CANCELLED, requests.get(order.id()).status());
        assertThrows(ServiceRequestException.class, () -> requests.complete(order.id(), actor));
    }

    @Test
    void rejectsInvalidRequests() {
        assertThrows(ConstraintViolationException.class, () -> requests.openRequest(
                new ServiceRequestService.OpenRequestCommand(SEED_PROPERTY,
                        ServiceRequest.Category.VALET, "  ", null, null, null, null, null, null,
                        null, null)));
        assertThrows(ServiceRequestException.class, () -> requests.get(UUID.randomUUID()));
    }

    @Test
    void rejectsUnknownRoomThroughForeignKey() {
        requests.openRequest(new ServiceRequestService.OpenRequestCommand(SEED_PROPERTY,
                ServiceRequest.Category.VALET, "Ghost pickup", null, null, null, null,
                UUID.randomUUID(), null, actor, null));
        assertThrows(DataIntegrityViolationException.class, repository::flush);
    }

    @Test
    void listsByScope() {
        var opened = requests.openRequest(open(ServiceRequest.Category.VALET));
        assertEquals(1, requests.listByScope(scope(SEED_PROPERTY)).size());
        assertTrue(requests.listByScope(scope(UUID.randomUUID())).isEmpty());
        assertThrows(ServiceRequestException.class, () -> requests.listByScope(null));
        assertNotNull(opened.id());
    }
}
