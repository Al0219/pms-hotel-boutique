package com.pms.hotelboutique.backend.modules.inventory.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/** Persistent operational history; release requires a future audited service. */
@Entity
@Table(name = "out_of_order_records")
public class OutOfOrderRecord {
    public enum Kind { OOO, OOS }

    @Id
    private UUID id;
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;
    @Column(name = "room_id", nullable = false)
    private UUID roomId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private Kind kind;
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;
    @Column(nullable = false, length = 500)
    private String reason;
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "released_at")
    private Instant releasedAt;
    @Column(name = "released_by")
    private UUID releasedBy;
    @Column(name = "release_reason", length = 500)
    private String releaseReason;

    protected OutOfOrderRecord() { }

    public OutOfOrderRecord(UUID id, UUID propertyId, UUID roomId, Kind kind,
            LocalDate startDate, LocalDate endDate, String reason, UUID createdBy, Instant now) {
        Objects.requireNonNull(startDate, "startDate");
        Objects.requireNonNull(endDate, "endDate");
        if (!startDate.isBefore(endDate)) {
            throw new IllegalArgumentException("startDate must precede endDate");
        }
        this.id = Objects.requireNonNull(id, "id");
        this.propertyId = Objects.requireNonNull(propertyId, "propertyId");
        this.roomId = Objects.requireNonNull(roomId, "roomId");
        this.kind = Objects.requireNonNull(kind, "kind");
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = InventoryValues.text(reason, "reason", 500);
        this.createdBy = Objects.requireNonNull(createdBy, "createdBy");
        this.createdAt = Objects.requireNonNull(now, "now");
    }

    public UUID getId() { return id; }
    public UUID getPropertyId() { return propertyId; }
    public UUID getRoomId() { return roomId; }
    public Kind getKind() { return kind; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getReason() { return reason; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReleasedAt() { return releasedAt; }
    public UUID getReleasedBy() { return releasedBy; }
    public String getReleaseReason() { return releaseReason; }
}
