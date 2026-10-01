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
 * BD3 operational service request (concierge, valet, housekeeping or
 * maintenance task). Operations works the task and reports to Reception;
 * guest-facing answers stay with Reception. Reservation, stay, room and
 * guest links are optional context kept as raw ids: their tables belong to
 * BD1/BD2 or to the reservations module, whose existence rides on foreign
 * keys. No delete API is offered.
 */
@Entity
@Table(name = "service_requests")
public class ServiceRequest {

    public enum Category {
        CONCIERGE,
        VALET,
        HOUSEKEEPING,
        MAINTENANCE,
        OTHER
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }

    public enum Status {
        OPEN,
        IN_PROGRESS,
        DONE,
        CANCELLED
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Column(name = "reservation_id")
    private UUID reservationId;

    @Column(name = "stay_id")
    private UUID stayId;

    @Column(name = "room_id")
    private UUID roomId;

    @Column(name = "guest_profile_id")
    private UUID guestProfileId;

    @Column(nullable = false)
    private String subject;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ServiceRequest() {
    }

    public ServiceRequest(UUID id, UUID propertyId, Category category, String subject, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (category == null) {
            throw new IllegalArgumentException("category is required");
        }
        requireSubject(subject);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.category = category;
        this.subject = subject.trim();
        this.priority = Priority.MEDIUM;
        this.status = Status.OPEN;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void startProgress(Instant now) {
        requireWorkable("start progress on");
        this.status = Status.IN_PROGRESS;
        touch(now);
    }

    public void complete(Instant now) {
        requireWorkable("complete");
        this.status = Status.DONE;
        this.completedAt = now;
        touch(now);
    }

    public void cancel(Instant now) {
        requireWorkable("cancel");
        this.status = Status.CANCELLED;
        touch(now);
    }

    public void reopen(Instant now) {
        if (status != Status.DONE) {
            throw new IllegalStateException("cannot reopen a " + status + " request");
        }
        this.status = Status.OPEN;
        this.completedAt = null;
        touch(now);
    }

    public void linkContext(UUID reservationId, UUID stayId, UUID roomId, UUID guestProfileId) {
        if (stayId != null && reservationId == null) {
            throw new IllegalArgumentException("a stay context requires its reservation");
        }
        this.reservationId = reservationId;
        this.stayId = stayId;
        this.roomId = roomId;
        this.guestProfileId = guestProfileId;
    }

    public void describe(String detail, Priority priority) {
        if (priority == null) {
            throw new IllegalArgumentException("priority is required");
        }
        this.detail = detail;
        this.priority = priority;
    }

    public void reportBy(UUID actorId) {
        this.createdBy = actorId;
    }

    public void assignTo(UUID actorId, Instant now) {
        requireWorkable("assign");
        this.assignedTo = actorId;
        touch(now);
    }

    public void scheduleFor(Instant dueAt, Instant now) {
        this.dueAt = dueAt;
        touch(now);
    }

    private void requireWorkable(String action) {
        if (status != Status.OPEN && status != Status.IN_PROGRESS) {
            throw new IllegalStateException("cannot " + action + " a " + status + " request");
        }
    }

    private static void requireSubject(String subject) {
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("subject must not be blank");
        }
    }

    private void touch(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public Category getCategory() {
        return category;
    }

    public UUID getReservationId() {
        return reservationId;
    }

    public UUID getStayId() {
        return stayId;
    }

    public UUID getRoomId() {
        return roomId;
    }

    public UUID getGuestProfileId() {
        return guestProfileId;
    }

    public String getSubject() {
        return subject;
    }

    public String getDetail() {
        return detail;
    }

    public Priority getPriority() {
        return priority;
    }

    public Status getStatus() {
        return status;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getAssignedTo() {
        return assignedTo;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
