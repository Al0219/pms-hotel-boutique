package com.pms.hotelboutique.backend.modules.operations.application;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
/** Shared persisted Guest link/reservation/stay/property boundary; caller owns the transaction. */
@Component
public class GuestServiceContext {
    private final JdbcClient jdbc;
    public GuestServiceContext(JdbcClient jdbc) { this.jdbc=jdbc; }
    public Context load(UUID accountId, UUID reservationId, UUID stayId, boolean lock) {
        return jdbc.sql("""
            SELECT s.property_id,s.room_id,r.booking_guest_id,s.arrival,s.departure,s.status,
                   r.status reservation_status,p.timezone
            FROM guest_reservation_links l
            JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
            JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=l.property_id
            JOIN properties p ON p.id=l.property_id
            WHERE l.guest_account_id=:account AND r.id=:reservation AND s.id=:stay
            """ + (lock ? " FOR UPDATE OF s,r,l" : ""))
            .param("account", accountId).param("reservation", reservationId).param("stay", stayId)
            .query((rs, row) -> new Context(rs.getObject("property_id", UUID.class), rs.getObject("room_id", UUID.class),
                rs.getObject("booking_guest_id", UUID.class), rs.getObject("arrival", LocalDate.class),
                rs.getObject("departure", LocalDate.class), rs.getString("status"), rs.getString("reservation_status"),
                rs.getString("timezone")))
            .optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stay unavailable"));
    }
    public record Context(UUID propertyId, UUID roomId, UUID profileId, LocalDate arrival, LocalDate departure,
            String status, String reservationStatus, String timezone) { }
}
