package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.application.DailyArrivalsDeparturesReport.Day;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DailyArrivalsDeparturesRepository {
    // Aggregate arrivals and departures independently: joining both would multiply counts.
    private static final String SQL = """
            with selected_properties as (
                select id, timezone, currency from properties
                where organization_id = :organizationId and id in (:propertyIds)
            ), days as (
                select p.id as property_id, p.timezone, p.currency,
                       cast(:fromDate as date) + i as local_date
                from selected_properties p
                cross join generate_series(0, cast(:toDate as date) - cast(:fromDate as date)) as s(i)
            ), movements as (
                select s.property_id, s.arrival as local_date, count(*) as arrivals, 0::bigint as departures
                from reservation_stays s
                join reservations r on r.id = s.reservation_id and r.property_id = s.property_id
                join selected_properties p on p.id = s.property_id
                where r.status in ('PENDING', 'CONFIRMED') and s.status = 'RESERVED'
                    and s.arrival between :fromDate and :toDate
                group by s.property_id, s.arrival
                union all
                select s.property_id, s.departure as local_date, 0::bigint as arrivals, count(*) as departures
                from reservation_stays s
                join reservations r on r.id = s.reservation_id and r.property_id = s.property_id
                join selected_properties p on p.id = s.property_id
                where r.status in ('PENDING', 'CONFIRMED') and s.status in ('RESERVED', 'IN_HOUSE')
                    and s.departure between :fromDate and :toDate
                group by s.property_id, s.departure
            )
            select d.property_id, d.timezone, d.currency, d.local_date,
                   coalesce(sum(m.arrivals), 0) as pending_arrivals,
                   coalesce(sum(m.departures), 0) as pending_departures
            from days d
            left join movements m on m.property_id = d.property_id and m.local_date = d.local_date
            group by d.property_id, d.timezone, d.currency, d.local_date
            order by d.property_id, d.local_date
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public DailyArrivalsDeparturesRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Day> findCurrent(AuthorizedPropertyScope scope, LocalDate from, LocalDate to) {
        return jdbc.query(SQL, new MapSqlParameterSource()
                .addValue("organizationId", scope.organizationId()).addValue("propertyIds", scope.propertyIds())
                .addValue("fromDate", from).addValue("toDate", to), (rs, index) -> new Day(
                        (UUID) rs.getObject("property_id"), rs.getString("timezone"), rs.getString("currency").trim(),
                        rs.getDate("local_date").toLocalDate(), rs.getLong("pending_arrivals"), rs.getLong("pending_departures")));
    }
}
