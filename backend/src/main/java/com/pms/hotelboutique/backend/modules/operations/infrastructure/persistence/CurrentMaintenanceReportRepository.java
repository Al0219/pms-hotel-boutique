package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.application.CurrentMaintenanceReport.PropertyRow;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CurrentMaintenanceReportRepository {
    // One scoped statement keeps every current counter on the same database snapshot.
    private static final String SQL = """
            with selected_properties as (
                select id, timezone from properties
                where organization_id = :organizationId and status = 'ACTIVE' and id in (:propertyIds)
            )
            select p.id as property_id, p.timezone,
                   count(m.id) filter (where m.status = 'OPEN') as open_orders,
                   count(m.id) filter (where m.status = 'IN_PROGRESS') as in_progress_orders,
                   count(m.id) as unresolved_orders,
                   count(m.id) filter (where m.priority = 'URGENT') as urgent_unresolved_orders,
                   count(m.id) filter (where m.assigned_to is null) as unassigned_unresolved_orders,
                   count(m.id) filter (where m.room_id is not null) as room_linked_unresolved_orders,
                   count(m.id) filter (where m.room_id is null) as common_area_unresolved_orders
            from selected_properties p
            left join maintenance_orders m on m.property_id = p.id and m.status in ('OPEN', 'IN_PROGRESS')
            group by p.id, p.timezone
            order by p.id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public CurrentMaintenanceReportRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<PropertyRow> findCurrent(AuthorizedPropertyScope scope) {
        return jdbc.query(SQL, new MapSqlParameterSource()
                .addValue("organizationId", scope.organizationId())
                .addValue("propertyIds", scope.propertyIds()), (rs, index) -> new PropertyRow(
                        (UUID) rs.getObject("property_id"), rs.getString("timezone"),
                        rs.getLong("open_orders"), rs.getLong("in_progress_orders"), rs.getLong("unresolved_orders"),
                        rs.getLong("urgent_unresolved_orders"), rs.getLong("unassigned_unresolved_orders"),
                        rs.getLong("room_linked_unresolved_orders"), rs.getLong("common_area_unresolved_orders")));
    }
}
