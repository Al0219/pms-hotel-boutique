package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** All source counts use authorized property predicates before aggregation. */
@Repository
public class DailyOnBooksRepository {
    private static final String SQL = """
            with selected_properties as (
                select p.id, p.timezone, p.currency
                from properties p
                where p.organization_id = :organizationId and p.id in (:propertyIds)
            ), nights as (
                select p.id as property_id, p.timezone, p.currency,
                       series.stay_date::date as stay_date
                from selected_properties p
                cross join generate_series(cast(:fromDate as date),
                    cast(:toDate as date), interval '1 day') as series(stay_date)
            ), physical as (
                select r.property_id, count(*) as room_count
                from rooms r
                where r.property_id in (:propertyIds)
                group by r.property_id
            ), ooo as (
                select n.property_id, n.stay_date, count(distinct o.room_id) as room_count
                from nights n
                join out_of_order_records o on o.property_id = n.property_id
                    and o.kind = 'OOO' and o.released_at is null
                    and o.start_date <= n.stay_date and o.end_date > n.stay_date
                group by n.property_id, n.stay_date
            ), booked as (
                select n.property_id, n.stay_date, count(distinct s.id) as stay_count
                from nights n
                join reservation_stays s on s.property_id = n.property_id
                    and s.arrival <= n.stay_date and s.departure > n.stay_date
                    and s.status in ('RESERVED', 'IN_HOUSE')
                join reservations r on r.id = s.reservation_id
                    and r.property_id = n.property_id and r.status <> 'CANCELLED'
                group by n.property_id, n.stay_date
            )
            select n.property_id, n.timezone, n.currency, n.stay_date,
                   coalesce(p.room_count, 0) as physical_rooms,
                   coalesce(o.room_count, 0) as out_of_order_rooms,
                   coalesce(b.stay_count, 0) as on_books_rooms
            from nights n
            left join physical p on p.property_id = n.property_id
            left join ooo o on o.property_id = n.property_id and o.stay_date = n.stay_date
            left join booked b on b.property_id = n.property_id and b.stay_date = n.stay_date
            order by n.property_id, n.stay_date
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public DailyOnBooksRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Counts> findCurrent(AuthorizedPropertyScope scope, LocalDate from, LocalDate to) {
        var parameters = new MapSqlParameterSource()
                .addValue("organizationId", scope.organizationId())
                .addValue("propertyIds", scope.propertyIds())
                .addValue("fromDate", from)
                .addValue("toDate", to);
        return jdbc.query(SQL, parameters, (rs, rowNum) -> new Counts(
                (UUID) rs.getObject("property_id"), rs.getString("timezone"),
                rs.getString("currency").trim(), rs.getDate("stay_date").toLocalDate(),
                rs.getLong("physical_rooms"), rs.getLong("out_of_order_rooms"),
                rs.getLong("on_books_rooms")));
    }

    public record Counts(UUID propertyId, String timezone, String currency, LocalDate stayDate,
            long physicalRooms, long outOfOrderRooms, long onBooksRooms) { }
}
