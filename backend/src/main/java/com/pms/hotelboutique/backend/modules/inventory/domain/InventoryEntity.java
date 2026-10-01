package com.pms.hotelboutique.backend.modules.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Identity and event instants shared by the four existing inventory tables. */
@MappedSuperclass
public abstract class InventoryEntity {
    @Id
    private UUID id;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected InventoryEntity() { }

    protected InventoryEntity(UUID id, Instant now) {
        this.id = Objects.requireNonNull(id, "id");
        this.createdAt = Objects.requireNonNull(now, "now");
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
