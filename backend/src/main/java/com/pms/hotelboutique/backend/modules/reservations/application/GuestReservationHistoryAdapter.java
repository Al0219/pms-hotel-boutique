package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestReservationHistoryPort;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GuestReservationHistoryAdapter implements GuestReservationHistoryPort {
    private static final String FROM = """
            FROM guest_reservation_links l
            JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
            JOIN properties p ON p.id=r.property_id
            LEFT JOIN guest_profiles g ON g.id=r.booking_guest_id
            WHERE l.guest_account_id=:accountId
            """;
    private static final String SELECT = """
            SELECT r.id,r.confirmation_code,r.status,r.property_id,p.name,p.timezone,
              NULLIF(btrim(concat_ws(' ',g.first_name,g.last_name)),'') AS booking_guest_name
            """;
    private final JdbcClient jdbc;
    public GuestReservationHistoryAdapter(JdbcClient jdbc) { this.jdbc = jdbc; }

    @Override public Page readPage(UUID accountId, int page, int size) {
        long total = jdbc.sql("SELECT count(*) " + FROM).param("accountId", accountId).query(Long.class).single();
        var heads = jdbc.sql(SELECT + FROM + " ORDER BY r.created_at DESC,r.id DESC LIMIT :size OFFSET :offset")
                .param("accountId", accountId).param("size", size).param("offset", (long) page * size)
                .query(this::head).list();
        return new Page(total, withStays(accountId, heads));
    }

    @Override public Optional<Reservation> readOne(UUID accountId, UUID reservationId) {
        var heads = jdbc.sql(SELECT + FROM + " AND r.id=:reservationId")
                .param("accountId", accountId).param("reservationId", reservationId).query(this::head).list();
        return withStays(accountId, heads).stream().findFirst();
    }

    private Reservation head(ResultSet rs, int row) throws SQLException {
        return new Reservation(rs.getObject("id", UUID.class), rs.getString("confirmation_code"), rs.getString("status"),
                rs.getObject("property_id", UUID.class), rs.getString("name"), rs.getString("timezone"),
                rs.getString("booking_guest_name"), List.of());
    }

    private List<Reservation> withStays(UUID accountId, List<Reservation> heads) {
        if (heads.isEmpty()) return List.of();
        var stays = new HashMap<UUID, List<Stay>>();
        jdbc.sql("""
                SELECT s.reservation_id,s.id,s.room_type_id,t.name,s.arrival,s.departure,s.status
                FROM guest_reservation_links l
                JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
                JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=l.property_id
                JOIN room_types t ON t.id=s.room_type_id AND t.property_id=s.property_id
                WHERE l.guest_account_id=:accountId AND r.id IN (:ids)
                ORDER BY s.arrival,s.id
                """).param("accountId", accountId).param("ids", heads.stream().map(Reservation::reservationId).toList())
                .query((rs, row) -> {
                    var stay = new Stay(rs.getObject("id", UUID.class), rs.getObject("room_type_id", UUID.class),
                            rs.getString("name"), rs.getObject("arrival", LocalDate.class),
                            rs.getObject("departure", LocalDate.class), rs.getString("status"));
                    stays.computeIfAbsent(rs.getObject("reservation_id", UUID.class), key -> new ArrayList<>()).add(stay);
                    return stay;
                }).list();
        return heads.stream().map(r -> new Reservation(r.reservationId(), r.confirmationCode(), r.status(),
                r.propertyId(), r.propertyName(), r.propertyTimeZone(), r.bookingGuestName(),
                List.copyOf(stays.getOrDefault(r.reservationId(), List.of())))).toList();
    }
}
