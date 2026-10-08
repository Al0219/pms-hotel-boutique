package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestAccountSummaryPort;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.GuestProfileRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GuestAccountSummaryAdapter implements GuestAccountSummaryPort {
    private final GuestProfileRepository profiles;
    private final JdbcClient jdbc;

    public GuestAccountSummaryAdapter(GuestProfileRepository profiles, JdbcClient jdbc) {
        this.profiles = profiles;
        this.jdbc = jdbc;
    }

    @Override
    public AccountData readForAccount(UUID guestAccountId) {
        var ownProfiles = profiles.findByGuestAccount_Id(guestAccountId).stream()
                .map(p -> new Profile(p.getId(), p.getFirstName(), p.getLastName(), p.getPreferredLanguage(), p.getStatus().name()))
                .sorted(Comparator.comparing(Profile::profileId)).toList();
        long count = jdbc.sql("""
                SELECT count(*) FROM guest_reservation_links l
                JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
                WHERE l.guest_account_id=:accountId
                """).param("accountId", guestAccountId).query(Long.class).single();
        var next = jdbc.sql("""
                SELECT r.id AS reservation_id,s.id AS stay_id,r.confirmation_code,s.arrival,s.departure
                FROM guest_reservation_links l
                JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
                JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=l.property_id
                JOIN properties p ON p.id=l.property_id
                WHERE l.guest_account_id=:accountId AND r.status='CONFIRMED' AND s.status='RESERVED'
                  AND s.arrival >= (CURRENT_TIMESTAMP AT TIME ZONE p.timezone)::date
                ORDER BY s.arrival,r.confirmation_code,s.id LIMIT 1
                """).param("accountId", guestAccountId).query((rs, row) -> new UpcomingStay(
                        rs.getObject("reservation_id", UUID.class), rs.getObject("stay_id", UUID.class),
                        rs.getString("confirmation_code"), rs.getObject("arrival", LocalDate.class),
                        rs.getObject("departure", LocalDate.class))).optional().orElse(null);
        return new AccountData(ownProfiles, count, next);
    }
}
