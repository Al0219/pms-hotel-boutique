package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestReservationReadPort;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GuestReservationReadAdapter implements GuestReservationReadPort {
    private final JdbcClient jdbc;
    public GuestReservationReadAdapter(JdbcClient jdbc) { this.jdbc = jdbc; }

    private static final String OWN_STAYS = """
            FROM guest_reservation_links l
            JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
            JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=l.property_id
            JOIN properties p ON p.id=l.property_id
            JOIN room_types rt ON rt.id=s.room_type_id AND rt.property_id=l.property_id
            LEFT JOIN rooms room ON room.id=s.room_id AND room.property_id=l.property_id
            WHERE l.guest_account_id=:accountId
            """;

    @Override
    public List<LinkedStay> list(UUID accountId) {
        return jdbc.sql("""
                SELECT r.id reservation_id,s.id stay_id,r.confirmation_code,p.name property_name,
                       s.arrival,s.departure,room.code room_code,s.status,r.status reservation_status
                """ + OWN_STAYS + " ORDER BY s.arrival,r.confirmation_code,s.id")
                .param("accountId", accountId).query((rs, row) -> new LinkedStay(
                        rs.getObject("reservation_id", UUID.class), rs.getObject("stay_id", UUID.class),
                        rs.getString("confirmation_code"), rs.getString("property_name"), rs.getString("reservation_status"),
                        rs.getObject("arrival", LocalDate.class), rs.getObject("departure", LocalDate.class),
                        rs.getString("room_code"), rs.getString("status"))).list();
    }

    @Override
    public Optional<Stay> find(UUID accountId, UUID reservationId, UUID stayId) {
        return jdbc.sql("""
                SELECT r.id reservation_id,s.id stay_id,r.confirmation_code,rt.id type_id,rt.name type_name,
                       room.id room_id,room.code room_code,s.arrival,s.departure,s.status
                """ + OWN_STAYS + " AND r.id=:reservationId AND s.id=:stayId")
                .param("accountId", accountId).param("reservationId", reservationId).param("stayId", stayId)
                .query((rs, row) -> new Stay(rs.getObject("stay_id", UUID.class),
                        rs.getObject("reservation_id", UUID.class), rs.getString("confirmation_code"),
                        new RoomType(rs.getObject("type_id", UUID.class), rs.getString("type_name")),
                        rs.getObject("room_id") == null ? null : new Room(rs.getObject("room_id", UUID.class), rs.getString("room_code")),
                        rs.getObject("arrival", LocalDate.class), rs.getObject("departure", LocalDate.class),
                        rs.getString("status"))).optional();
    }
}
