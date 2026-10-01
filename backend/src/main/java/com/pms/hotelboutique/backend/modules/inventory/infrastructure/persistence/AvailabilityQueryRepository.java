package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Property-ID constrained availability query; callers must authorize the property first. */
@Repository
public class AvailabilityQueryRepository {
    private static final String SQL = """
            with target_type as (
                select p.id as property_id, rt.id as room_type_id
                from properties p
                join room_types rt on rt.property_id = p.id
                where p.id = :propertyId and rt.id = :roomTypeId
            ), nights as (
                select (cast(:arrival as date) + n.day_offset)::date as night
                from generate_series(0,
                    cast(:departure as date) - cast(:arrival as date) - 1) n(day_offset)
            )
            select nights.night,
                   count(distinct rooms.id) as physical_rooms,
                   count(distinct ooo.room_id) as out_of_order_rooms,
                   count(distinct stays.id) as reserved_stays
            from target_type
            cross join nights
            left join rooms on rooms.property_id = target_type.property_id
                and rooms.room_type_id = target_type.room_type_id
            left join out_of_order_records ooo on ooo.property_id = target_type.property_id
                and ooo.room_id = rooms.id and ooo.kind = 'OOO'
                and ooo.released_at is null
                and ooo.start_date <= nights.night and ooo.end_date > nights.night
            left join reservation_stays stays on stays.property_id = target_type.property_id
                and stays.room_type_id = target_type.room_type_id
                and stays.arrival <= nights.night and stays.departure > nights.night
                and stays.status in ('RESERVED', 'IN_HOUSE')
                and exists (select 1 from reservations reservation
                    where reservation.id = stays.reservation_id
                      and reservation.status <> 'CANCELLED')
            group by nights.night
            order by nights.night
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public AvailabilityQueryRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<AvailabilityNightCount> calculate(UUID propertyId, UUID roomTypeId,
            StayDateRange dates) {
        var parameters = new MapSqlParameterSource()
                .addValue("propertyId", propertyId)
                .addValue("roomTypeId", roomTypeId)
                .addValue("arrival", dates.arrival())
                .addValue("departure", dates.departure());
        return jdbc.query(SQL, parameters, (rs, rowNum) -> new AvailabilityNightCount(
                rs.getDate("night").toLocalDate(), rs.getLong("physical_rooms"),
                rs.getLong("out_of_order_rooms"), rs.getLong("reserved_stays")));
    }
}
