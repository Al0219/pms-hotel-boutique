package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryAdmissionPort;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.application.BookingView;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateBookingCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileView;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationBookingServiceImpl;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayView;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationView;
import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.ObjectProvider;

/**
 * BD3-only fail-open contract: when neither {@code AvailabilityPort} nor
 * {@code InventoryAdmissionPort} beans exist, the booking proceeds without
 * ATS precheck or atomic admission.
 *
 * <p>No Spring context is started here on purpose, so the real ATS/admission
 * engine (BD2) is never loaded. No stub is imported either
 * ({@code ControllableAvailabilityConfiguration} nor {@code AvailabilityStubConfiguration}),
 * so this suite proves both ports are truly optional at the service level.
 * Production is untouched: {@code ReservationBookingServiceImpl} already
 * resolves both ports via {@code ObjectProvider.getIfAvailable()}.</p>
 */
class ReservationBookingNoPortTests {

    @SuppressWarnings("unchecked")
    private static ReservationBookingServiceImpl bookingWithoutPort(
            ReservationService reservations,
            ReservationStayService stays,
            GuestProfileService profiles,
            AuditService audit) {
        ObjectProvider<AvailabilityPort> availability = mock(ObjectProvider.class);
        when(availability.getIfAvailable()).thenReturn(null);
        ObjectProvider<InventoryAdmissionPort> admission = mock(ObjectProvider.class);
        when(admission.getIfAvailable()).thenReturn(null);
        return new ReservationBookingServiceImpl(
                reservations, stays, profiles, audit, availability, admission);
    }

    private static CreateBookingCommand command(UUID propertyId, UUID roomTypeId) {
        return new CreateBookingCommand(propertyId,
                new CreateBookingCommand.BookerBooking(null, new CreateGuestProfileCommand(
                        null, null, "Ana", "Lopez", null, "+502 5555 0501", null, null, null)),
                "GTQ", "WEB_DIRECTA", null, null,
                List.of(new CreateBookingCommand.StayBookingCommand(roomTypeId, null,
                        LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                        List.of())));
    }

    @Test
    void portIsExplicitlyAbsentInThisContext() {
        @SuppressWarnings("unchecked")
        ObjectProvider<AvailabilityPort> availability = mock(ObjectProvider.class);
        when(availability.getIfAvailable()).thenReturn(null);
        @SuppressWarnings("unchecked")
        ObjectProvider<InventoryAdmissionPort> admission = mock(ObjectProvider.class);
        when(admission.getIfAvailable()).thenReturn(null);

        assertNull(availability.getIfAvailable());
        assertNull(admission.getIfAvailable());
    }

    @Test
    void booksWithoutAvailabilityPort() {
        UUID propertyId = UUID.randomUUID();
        UUID roomTypeId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();
        UUID reservationId = UUID.randomUUID();
        UUID stayId = UUID.randomUUID();
        Instant now = Instant.now();

        ReservationService reservations = mock(ReservationService.class);
        ReservationStayService stays = mock(ReservationStayService.class);
        GuestProfileService profiles = mock(GuestProfileService.class);
        AuditService audit = mock(AuditService.class);
        AvailabilityPort neverWired = mock(AvailabilityPort.class);

        when(profiles.create(any())).thenReturn(new GuestProfileView(profileId, null, propertyId,
                "Ana", "Lopez", null, "+502 5555 0501", null, null, null,
                GuestProfile.Status.ACTIVE, now, now));
        when(reservations.create(any())).thenReturn(new ReservationView(reservationId, propertyId,
                profileId, "CONF-001", Reservation.Status.PENDING, "GTQ", "WEB_DIRECTA",
                null, null, null, null, now, now));
        ReservationStayView stayView = new ReservationStayView(stayId, reservationId, propertyId,
                roomTypeId, null, LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                ReservationStay.Status.RESERVED, List.of(), now, now);
        when(stays.addStay(any())).thenReturn(stayView);
        when(stays.get(stayId)).thenReturn(stayView);
        when(audit.record(any())).thenReturn(new AuditService.AuditEventView(UUID.randomUUID(),
                now, ReservationAuditEvent.ActorType.SYSTEM, null, "RESERVATION_CREATED",
                "RESERVATION", reservationId, propertyId, null, "{\"status\":\"PENDING\"}",
                null, UUID.randomUUID(), now));

        BookingView result = bookingWithoutPort(reservations, stays, profiles, audit)
                .createBooking(command(propertyId, roomTypeId));

        assertEquals(1, result.stays().size());
        assertEquals(Reservation.Status.PENDING, result.reservation().status());
        verify(neverWired, never()).calculateATS(any(), any(), any());
    }
}
