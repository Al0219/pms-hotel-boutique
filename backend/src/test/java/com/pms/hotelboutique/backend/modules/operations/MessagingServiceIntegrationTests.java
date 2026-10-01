package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.MessagingException;
import com.pms.hotelboutique.backend.modules.operations.application.MessagingService;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceMessage;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceMessageRepository;
import com.pms.hotelboutique.backend.modules.operations.support.OperationsFixtures;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.ConstraintViolationException;
import java.util.Set;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
class MessagingServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    MessagingService messaging;

    @Autowired
    GuestProfileService profiles;

    @Autowired
    AuditService audit;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ServiceMessageRepository repository;

    private UUID profile;
    private UUID actor;

    private static AuthorizedPropertyScope scope(UUID... properties) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(properties));
    }

    @BeforeEach
    void fixtures() {
        profile = profiles.create(new CreateGuestProfileCommand(null, null, "Ana", "Lopez", null,
                "+502 5555 0601", null, null, null)).id();
        actor = OperationsFixtures.staff(jdbc);
    }

    private MessagingService.LogMessageCommand inbound() {
        return new MessagingService.LogMessageCommand(SEED_PROPERTY, profile, null, null,
                ServiceMessage.Channel.WHATSAPP, "Late checkout please");
    }

    @Test
    void logsInboundAndSendsOutbound() {
        var logged = messaging.logInbound(inbound());
        assertEquals(ServiceMessage.Direction.INBOUND, logged.direction());

        var sent = messaging.sendOutbound(new MessagingService.LogMessageCommand(SEED_PROPERTY,
                profile, null, null, ServiceMessage.Channel.WHATSAPP, "Granted until 13:00"),
                actor);
        assertEquals(ServiceMessage.Direction.OUTBOUND, sent.direction());
        assertEquals(actor, sent.createdBy());

        var conversation = messaging.conversation(profile);
        assertEquals(2, conversation.size());
        assertEquals("Late checkout please", conversation.get(0).body());

        var events = audit.findByEntity("SERVICE_MESSAGE", sent.id());
        assertEquals(1, events.size());
        assertEquals("MESSAGE_SENT", events.get(0).action());
    }

    @Test
    void rejectsInvalidMessages() {
        assertThrows(ConstraintViolationException.class, () -> messaging.logInbound(
                new MessagingService.LogMessageCommand(SEED_PROPERTY, profile, null, null,
                        ServiceMessage.Channel.SMS, "  ")));
        assertThrows(MessagingException.class, () -> messaging.get(UUID.randomUUID()));
        assertThrows(MessagingException.class, () -> messaging.conversation(null));
    }

    @Test
    void rejectsUnknownProfileThroughForeignKey() {
        messaging.logInbound(new MessagingService.LogMessageCommand(SEED_PROPERTY,
                UUID.randomUUID(), null, null, ServiceMessage.Channel.SMS, "Ghost"));
        assertThrows(DataIntegrityViolationException.class, repository::flush);
    }

    @Test
    void listsByScope() {
        messaging.logInbound(inbound());
        assertEquals(1, messaging.listByScope(scope(SEED_PROPERTY)).size());
        assertTrue(messaging.listByScope(scope(UUID.randomUUID())).isEmpty());
        assertThrows(MessagingException.class, () -> messaging.listByScope(null));
    }
}
