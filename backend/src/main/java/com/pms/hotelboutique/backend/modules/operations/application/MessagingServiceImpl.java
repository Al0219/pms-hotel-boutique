package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.ServiceMessage;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceMessageRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class MessagingServiceImpl implements MessagingService {

    private final ServiceMessageRepository messages;
    private final AuditService audit;

    public MessagingServiceImpl(ServiceMessageRepository messages, AuditService audit) {
        this.messages = messages;
        this.audit = audit;
    }

    @Override
    public MessageView logInbound(@Valid LogMessageCommand command) {
        ServiceMessage message = build(command, ServiceMessage.Direction.INBOUND, null);
        MessageView logged = MessageView.from(messages.save(message));
        record(message, "MESSAGE_LOGGED", null);
        return logged;
    }

    @Override
    public MessageView sendOutbound(@Valid LogMessageCommand command, UUID authorId) {
        // Reception-only answering is a controller duty (BD1 roles); the
        // author is traced here so misuse stays attributable.
        ServiceMessage message = build(command, ServiceMessage.Direction.OUTBOUND, authorId);
        MessageView sent = MessageView.from(messages.save(message));
        record(message, "MESSAGE_SENT", authorId);
        return sent;
    }

    @Override
    @Transactional(readOnly = true)
    public MessageView get(UUID messageId) {
        return MessageView.from(existing(messageId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageView> listByScope(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new MessagingException("an explicit property scope is required");
        }
        return messages.findByPropertyIdIn(scope.propertyIds()).stream()
                .map(MessageView::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageView> conversation(UUID guestProfileId) {
        if (guestProfileId == null) {
            throw new MessagingException("guest profile id is required");
        }
        return messages.findByGuestProfileIdOrderBySentAtAsc(guestProfileId).stream()
                .map(MessageView::from).toList();
    }

    private ServiceMessage build(LogMessageCommand command, ServiceMessage.Direction direction,
            UUID authorId) {
        Instant now = Instant.now();
        ServiceMessage message;
        try {
            message = new ServiceMessage(UUID.randomUUID(), command.propertyId(),
                    command.guestProfileId(), command.channel(), direction, command.body(), now);
        } catch (IllegalArgumentException e) {
            throw new MessagingException(e.getMessage(), e);
        }
        message.linkContext(command.reservationId(), command.requestId());
        if (authorId != null) {
            message.authoredBy(authorId);
        }
        return message;
    }

    private ServiceMessage existing(UUID messageId) {
        if (messageId == null) {
            throw new MessagingException("message id is required");
        }
        return messages.findById(messageId)
                .orElseThrow(() -> new MessagingException("message not found"));
    }

    private void record(ServiceMessage message, String action, UUID actorId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "SERVICE_MESSAGE",
                message.getId(), message.getPropertyId(), null,
                "{\"direction\":\"" + message.getDirection() + "\"}", null, null));
    }
}
