package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileView;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationLinkService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationView;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ReservationLinkServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired
    ReservationLinkService links;

    @Autowired
    ReservationService reservations;

    @Autowired
    GuestProfileService profiles;

    private ReservationView reservationWithBooker(String email) {
        GuestProfileView booker = profiles.create(new CreateGuestProfileCommand(
                null, null, "Ana", "Lopez", email, null, null, null, null));
        return reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, booker.id(), "GTQ", "WEB_DIRECTA", null, null));
    }

    @Test
    void resolvesMatchingCodeAndEmail() {
        ReservationView reservation = reservationWithBooker("Ana.Lopez@example.test");

        Optional<ReservationLinkService.ReservationLink> link =
                links.verifyLink(reservation.confirmationCode(), "ana.lopez@EXAMPLE.test");

        assertTrue(link.isPresent());
        assertEquals(reservation.id(), link.get().reservationId());
    }

    @Test
    void staysSilentOnMismatchUnknownOrBlank() {
        ReservationView reservation = reservationWithBooker("ana@example.test");

        // Wrong email, unknown code, blanks and email-less bookers all look identical.
        assertTrue(links.verifyLink(reservation.confirmationCode(), "someone-else@example.test").isEmpty());
        assertTrue(links.verifyLink("NOPE123456", "ana@example.test").isEmpty());
        assertTrue(links.verifyLink("  ", "ana@example.test").isEmpty());
        assertTrue(links.verifyLink(reservation.confirmationCode(), null).isEmpty());

        ReservationView anonymous = reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null));
        assertTrue(links.verifyLink(anonymous.confirmationCode(), "ana@example.test").isEmpty());
    }
}
