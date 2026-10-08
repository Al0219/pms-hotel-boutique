package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryAdmissionPort;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryDemand;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryExhaustedException;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class ReservationBookingServiceImpl implements ReservationBookingService {

    private final ReservationService reservations;
    private final ReservationStayService stays;
    private final GuestProfileService profiles;
    private final AuditService audit;
    private final ObjectProvider<AvailabilityPort> availability;
    private final ObjectProvider<InventoryAdmissionPort> admission;

    public ReservationBookingServiceImpl(ReservationService reservations,
            ReservationStayService stays, GuestProfileService profiles, AuditService audit,
            ObjectProvider<AvailabilityPort> availability,
            ObjectProvider<InventoryAdmissionPort> admission) {
        this.reservations = reservations;
        this.stays = stays;
        this.profiles = profiles;
        this.audit = audit;
        this.availability = availability;
        this.admission = admission;
    }

    @Override
    public BookingView createBooking(@Valid CreateBookingCommand command) {
        validateStayDates(command);
        precheckAvailability(command);
        // One correlation id links every event of this flow. The actor is
        // SYSTEM: no authenticated principal reaches the service layer yet;
        // controllers will supply the real actor in a later contract.
        UUID correlation = UUID.randomUUID();
        List<InventoryDemand> demand = command.stays().stream()
                .map(stay -> new InventoryDemand(stay.roomTypeId(),
                        new StayDateRange(stay.arrival(), stay.departure()), 1))
                .toList();
        InventoryAdmissionPort admissionPort = admission.getIfAvailable();
        if (admissionPort == null) {
            // No admission engine wired: persist directly. Same fail-open
            // posture as the ATS precheck when its port is absent.
            return persistBooking(command, correlation);
        }
        try {
            // The whole booking persists inside the admission callback, in the
            // same READ_COMMITTED transaction while BD2 holds the room-type
            // locks. No REQUIRES_NEW, async work or external side effects.
            return admissionPort.admit(command.propertyId(), demand,
                    () -> persistBooking(command, correlation));
        } catch (InventoryExhaustedException e) {
            throw new ReservationBookingException(
                    "no availability for the requested stays", e);
        }
    }

    private BookingView persistBooking(CreateBookingCommand command, UUID correlation) {
        try {
            UUID bookingGuestId = resolveBooker(command);
            ReservationView reservation = reservations.create(new CreateReservationCommand(
                    command.propertyId(), bookingGuestId, command.currency(),
                    command.sourceChannel(), command.sourceReference(), command.notes()));
            audit.record(new AuditService.RecordAuditCommand(
                    ReservationAuditEvent.ActorType.SYSTEM, null, "RESERVATION_CREATED",
                    "RESERVATION", reservation.id(), reservation.propertyId(), null,
                    "{\"status\":\"" + reservation.status() + "\"}", null, correlation));
            List<ReservationStayView> created = new ArrayList<>();
            for (CreateBookingCommand.StayBookingCommand stay : command.stays()) {
                ReservationStayView createdStay = stays.addStay(new CreateStayCommand(
                        reservation.id(), stay.roomTypeId(), stay.roomId(),
                        stay.arrival(), stay.departure()));
                for (CreateBookingCommand.OccupantBooking occupant : stay.occupants()) {
                    UUID profileId = resolveOccupant(occupant);
                    stays.addOccupant(createdStay.id(), profileId, occupant.primary());
                }
                created.add(stays.get(createdStay.id()));
                audit.record(new AuditService.RecordAuditCommand(
                        ReservationAuditEvent.ActorType.SYSTEM, null, "RESERVATION_STAY_ADDED",
                        "RESERVATION_STAY", createdStay.id(), reservation.propertyId(), null,
                        "{\"status\":\"" + createdStay.status() + "\"}", null, correlation));
            }
            return new BookingView(reservation, List.copyOf(created));
        } catch (GuestProfileException | ReservationException | ReservationStayException | AuditException e) {
            throw new ReservationBookingException(e.getMessage(), e);
        }
    }

    private UUID resolveBooker(CreateBookingCommand command) {
        CreateBookingCommand.BookerBooking booker = command.booker();
        if (booker == null) {
            return null;
        }
        if (booker.profileId() != null && booker.newProfile() != null) {
            throw new ReservationBookingException("booker must be an existing profile or a new one, not both");
        }
        if (booker.profileId() != null) {
            return booker.profileId();
        }
        if (booker.newProfile() != null) {
            return profiles.create(booker.newProfile()).id();
        }
        throw new ReservationBookingException("booker must be an existing profile or a new one");
    }

    private UUID resolveOccupant(CreateBookingCommand.OccupantBooking occupant) {
        if (occupant.profileId() != null && occupant.newProfile() != null) {
            throw new ReservationBookingException("occupant must be an existing profile or a new one, not both");
        }
        if (occupant.profileId() != null) {
            return occupant.profileId();
        }
        if (occupant.newProfile() != null) {
            return profiles.create(occupant.newProfile()).id();
        }
        throw new ReservationBookingException("occupant must be an existing profile or a new one");
    }

    private void validateStayDates(CreateBookingCommand command) {
        for (CreateBookingCommand.StayBookingCommand stay : command.stays()) {
            if (stay.arrival() == null || stay.departure() == null
                    || !stay.arrival().isBefore(stay.departure())) {
                throw new ReservationBookingException("arrival must precede departure");
            }
        }
    }

    private void precheckAvailability(CreateBookingCommand command) {
        AvailabilityPort port = availability.getIfAvailable();
        if (port == null) {
            // No ATS engine wired yet (BD2 Fase 2+). The booking proceeds and
            // the gap is tracked: pre-check without atomic consumption cannot
            // promise zero oversell even when the port is present.
            return;
        }
        for (CreateBookingCommand.StayBookingCommand stay : command.stays()) {
            if (stay.arrival() == null || stay.departure() == null
                    || !stay.arrival().isBefore(stay.departure())) {
                throw new ReservationBookingException("arrival must precede departure");
            }
            int ats = port.calculateATS(command.propertyId(), stay.roomTypeId(),
                    new StayDateRange(stay.arrival(), stay.departure()));
            if (ats < 1) {
                throw new ReservationBookingException(
                        "no availability for room type " + stay.roomTypeId());
            }
        }
    }
}
