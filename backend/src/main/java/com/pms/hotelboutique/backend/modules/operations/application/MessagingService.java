package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.ServiceMessage;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * BD3 messaging operations (Fase 10).
 *
 * Inbound guest traffic is logged; outbound answers are recorded with their
 * author. The domain rule that only Reception answers externally is enforced
 * by the future controller layer (roles live in BD1), never trusted here.
 * Messages are write-once: no edit, no delete.
 */
public interface MessagingService {

    MessageView logInbound(@Valid LogMessageCommand command);

    MessageView sendOutbound(@Valid LogMessageCommand command, UUID authorId);

    MessageView get(UUID messageId);

    List<MessageView> listByScope(AuthorizedPropertyScope scope);

    List<MessageView> conversation(UUID guestProfileId);

    record LogMessageCommand(
            @NotNull UUID propertyId,
            @NotNull UUID guestProfileId,
            UUID reservationId,
            UUID requestId,
            @NotNull ServiceMessage.Channel channel,
            @NotBlank String body) {
    }

    record MessageView(UUID id, UUID propertyId, UUID guestProfileId, UUID reservationId,
            UUID requestId, ServiceMessage.Channel channel, ServiceMessage.Direction direction,
            String body, UUID createdBy, Instant sentAt, Instant createdAt) {

        static MessageView from(ServiceMessage message) {
            return new MessageView(message.getId(), message.getPropertyId(),
                    message.getGuestProfileId(), message.getReservationId(), message.getRequestId(),
                    message.getChannel(), message.getDirection(), message.getBody(),
                    message.getCreatedBy(), message.getSentAt(), message.getCreatedAt());
        }
    }
}
