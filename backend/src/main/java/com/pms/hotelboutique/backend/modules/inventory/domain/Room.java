package com.pms.hotelboutique.backend.modules.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "rooms")
public class Room extends InventoryEntity {
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;
    @Column(name = "room_type_id", nullable = false)
    private UUID roomTypeId;
    @Column(nullable = false, length = 64)
    private String code;

    protected Room() { }

    public Room(UUID id, UUID propertyId, UUID roomTypeId, String code, Instant now) {
        super(id, now);
        this.propertyId = Objects.requireNonNull(propertyId, "propertyId");
        this.roomTypeId = Objects.requireNonNull(roomTypeId, "roomTypeId");
        this.code = InventoryValues.text(code, "code", 64);
    }

    public UUID getPropertyId() { return propertyId; }
    public UUID getRoomTypeId() { return roomTypeId; }
    public String getCode() { return code; }

    public boolean rename(String code, Instant now) {
        String next = InventoryValues.text(code, "code", 64);
        if (this.code.equals(next)) { return false; }
        this.code = next;
        touch(now);
        return true;
    }
}
