package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestReservationReadPort.*;
import com.pms.hotelboutique.backend.modules.guestauth.application.PublicReservationLookupReadPort;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PublicReservationLookupReadAdapter implements PublicReservationLookupReadPort {
    private final JdbcClient jdbc;
    public PublicReservationLookupReadAdapter(JdbcClient jdbc) { this.jdbc = jdbc; }

    @Override public Result find(String email, String confirmationCode) {
        // Scope is applied in SQL before returning any row. One query gives a coherent N-stay snapshot.
        var rows = jdbc.sql("""
            SELECT r.id reservation_id,s.id stay_id,r.confirmation_code,p.name property_name,r.status reservation_status,
                   s.arrival,s.departure,room.code room_code,s.status,rt.id type_id,rt.name type_name,
                   room.id room_id,p.timezone,rt.code type_code,r.created_at,r.source_channel,r.currency,
                   receipt.confirmed_total
            FROM reservations r JOIN guest_profiles g ON g.id=r.booking_guest_id
            JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=r.property_id
            JOIN properties p ON p.id=r.property_id
            JOIN room_types rt ON rt.id=s.room_type_id AND rt.property_id=r.property_id
            LEFT JOIN rooms room ON room.id=s.room_id AND room.property_id=r.property_id AND room.room_type_id=s.room_type_id
            LEFT JOIN LATERAL (
                SELECT CASE WHEN count(DISTINCT b.response_snapshot->>'totalMinor')=1
                       THEN min((b.response_snapshot->>'totalMinor')::bigint) END confirmed_total
                FROM public_booking_receipts b
                WHERE b.reservation_id=r.id AND b.confirmation_code=r.confirmation_code AND b.status='COMPLETED'
                  AND b.response_snapshot->>'currency'=r.currency
            ) receipt ON true
            WHERE lower(btrim(g.email))=:email AND upper(r.confirmation_code)=:code
            ORDER BY s.arrival,s.id
            """).param("email", email).param("code", confirmationCode).query((rs,n) -> {
                UUID reservation = rs.getObject("reservation_id",UUID.class), stay = rs.getObject("stay_id",UUID.class);
                LocalDate arrival = rs.getObject("arrival",LocalDate.class), departure = rs.getObject("departure",LocalDate.class);
                var summary = new LinkedStay(reservation,stay,rs.getString("confirmation_code"),rs.getString("property_name"),
                    rs.getString("reservation_status"),arrival,departure,rs.getString("room_code"),rs.getString("status"));
                var detail = new Stay(stay,reservation,rs.getString("confirmation_code"),
                    new RoomType(rs.getObject("type_id",UUID.class),rs.getString("type_name")),
                    rs.getObject("room_id")==null ? null : new Room(rs.getObject("room_id",UUID.class),rs.getString("room_code")),
                    arrival,departure,rs.getString("status"),rs.getString("timezone"));
                var overview = new Overview(rs.getTimestamp("created_at").toInstant(),rs.getString("source_channel"),
                    rs.getString("currency"),rs.getObject("confirmed_total",Long.class));
                return new Row(summary,detail,overview,new Accommodation(stay,rs.getString("type_code"),rs.getString("timezone")));
            }).list();
        if (rows.stream().map(row -> row.summary().reservationId()).distinct().count() > 1) {
            return new Result(java.util.List.of(), java.util.List.of(),null,java.util.List.of());
        }
        var stays = new ArrayList<LinkedStay>();
        var details = new ArrayList<Stay>();
        var accommodations = new ArrayList<Accommodation>();
        for (var row : rows) { stays.add(row.summary()); details.add(row.detail()); accommodations.add(row.accommodation()); }
        return new Result(stays,details,rows.isEmpty() ? null : rows.getFirst().overview(),accommodations);
    }
    private record Row(LinkedStay summary, Stay detail, Overview overview, Accommodation accommodation) { }
}
