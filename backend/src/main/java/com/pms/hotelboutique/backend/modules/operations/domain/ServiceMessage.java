package com.pms.hotelboutique.backend.modules.operations.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * BD3 guest message.
 *
 * Operations logs inbound traffic and works the underlying task, but only
 * Reception answers the guest externally: outbound sends are recorded with
 * their author, and the reception-only rule is enforced by the future
 * controller layer (roles live in BD1). Counterparty and property ride on
 * foreign keys. Messages are never edited or deleted.
 */
@Entity
@Table(name = "service_messages")
public class ServiceMessage {

    public enum Channel {
        IN_APP,
        SMS,
        EMAIL,
        WHATSAPP
    }

    public enum Direction {
        INBOUND,
        OUTBOUND
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "guest_profile_id", nullable = false)
    private UUID guestProfileId;

    @Column(name = "reservation_id")
    private UUID reservationId;

    @Column(name = "request_id")
    private UUID requestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Channel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ServiceMessage() {
    }

    public ServiceMessage(UUID id, UUID propertyId, UUID guestProfileId, Channel channel,
            Direction direction, String body, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (guestProfileId == null) {
            throw new IllegalArgumentException("guest profile id is required");
        }
        if (channel == null) {
            throw new IllegalArgumentException("channel is required");
        }
        if (direction == null) {
            throw new IllegalArgumentException("direction is required");
        }
        if (body == null || body.isBlank()) {
            throw new IllegalArgumentException("body must not be blank");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.guestProfileId = guestProfileId;
        this.channel = channel;
        this.direction = direction;
        this.body = body.trim();
        this.sentAt = now;
        this.createdAt = now;
    }

    public void linkContext(UUID reservationId, UUID requestId) {
        this.reservationId = reservationId;
        this.requestId = requestId;
    }

    public void authoredBy(UUID actorId) {
        this.createdBy = actorId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public UUID getGuestProfileId() {
        return guestProfileId;
    }

    public UUID getReservationId() {
        return reservationId;
    }

    public UUID getRequestId() {
        return requestId;
    }

    public Channel getChannel() {
        return channel;
    }

    public Direction getDirection() {
        return direction;
    }

    public String getBody() {
        return body;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
