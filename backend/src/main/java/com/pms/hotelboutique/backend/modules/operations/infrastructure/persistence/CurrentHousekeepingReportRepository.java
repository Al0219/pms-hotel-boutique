package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.application.CurrentHousekeepingReport.PropertyRow;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CurrentHousekeepingReportRepository {
    // One scoped statement keeps physical and HK counts on the same database snapshot.
    private static final String SQL = """
            with selected_properties as (
                select id, timezone from properties
                where organization_id = :organizationId and status = 'ACTIVE' and id in (:propertyIds)
            )
            select p.id as property_id, p.timezone,
                   count(r.id) as physical_rooms,
                   count(h.id) as tracked_rooms,
                   count(r.id) - count(h.id) as untracked_rooms,
                   count(h.id) filter (where h.status = 'DIRTY') as dirty_rooms,
                   count(h.id) filter (where h.status = 'CLEAN') as clean_rooms,
                   count(h.id) filter (where h.status = 'INSPECTED') as inspected_rooms,
                   count(h.id) filter (where h.dnd) as dnd_rooms
            from selected_properties p
            left join rooms r on r.property_id = p.id
            left join hk_room_states h on h.property_id = r.property_id and h.room_id = r.id
            group by p.id, p.timezone
            order by p.id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public CurrentHousekeepingReportRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<PropertyRow> findCurrent(AuthorizedPropertyScope scope) {
        return jdbc.query(SQL, new MapSqlParameterSource()
                .addValue("organizationId", scope.organizationId())
                .addValue("propertyIds", scope.propertyIds()), (rs, index) -> new PropertyRow(
                        (UUID) rs.getObject("property_id"), rs.getString("timezone"),
                        rs.getLong("physical_rooms"), rs.getLong("tracked_rooms"), rs.getLong("untracked_rooms"),
                        rs.getLong("dirty_rooms"), rs.getLong("clean_rooms"), rs.getLong("inspected_rooms"),
                        rs.getLong("dnd_rooms")));
    }
}
