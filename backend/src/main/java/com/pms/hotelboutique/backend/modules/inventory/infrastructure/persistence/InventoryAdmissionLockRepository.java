package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Existing room-type rows are lock anchors; no stock counters or tables are added. */
@Repository
public class InventoryAdmissionLockRepository {
    private final JdbcTemplate jdbc;

    public InventoryAdmissionLockRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean lock(UUID propertyId, UUID roomTypeId) {
        var rows = jdbc.query("SELECT id FROM room_types WHERE property_id = ? AND id = ? FOR UPDATE",
                (rs, row) -> rs.getObject("id", UUID.class), propertyId, roomTypeId);
        return !rows.isEmpty();
    }
}
