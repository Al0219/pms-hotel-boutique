package com.pms.hotelboutique.backend.modules.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "room_types")
public class RoomType extends InventoryEntity {
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;
    @Column(nullable = false, length = 64)
    private String code;
    @Column(nullable = false, length = 160)
    private String name;

    protected RoomType() { }

    public RoomType(UUID id, UUID propertyId, String code, String name, Instant now) {
        super(id, now);
        this.propertyId = Objects.requireNonNull(propertyId, "propertyId");
        this.code = InventoryValues.text(code, "code", 64);
        this.name = InventoryValues.text(name, "name", 160);
    }

    public UUID getPropertyId() { return propertyId; }
    public String getCode() { return code; }
    public String getName() { return name; }
}
