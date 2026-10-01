package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationGuest;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.GuestProfileRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationGuestRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class ReservationStayServiceImpl implements ReservationStayService {

    private final ReservationStayRepository stays;
    private final ReservationGuestRepository occupants;
    private final ReservationRepository reservations;
    private final GuestProfileRepository profiles;

    public ReservationStayServiceImpl(ReservationStayRepository stays,
            ReservationGuestRepository occupants, ReservationRepository reservations,
            GuestProfileRepository profiles) {
        this.stays = stays;
        this.occupants = occupants;
        this.reservations = reservations;
        this.profiles = profiles;
    }

    @Override
    public ReservationStayView addStay(@Valid CreateStayCommand command) {
        Reservation reservation = reservations.findById(command.reservationId())
                .orElseThrow(() -> new ReservationStayException("reservation not found"));
        if (!command.arrival().isBefore(command.departure())) {
            throw new ReservationStayException("arrival must precede departure");
        }
        Instant now = Instant.now();
        ReservationStay stay = new ReservationStay(UUID.randomUUID(), reservation,
                reservation.getPropertyId(), command.roomTypeId(),
                command.arrival(), command.departure(), now);
        if (command.roomId() != null) {
            stay.assignRoom(command.roomId(), now);
        }
        // Room type/room existence and property consistency are enforced by
        // composite FKs (tables owned by BD2); no parallel lookup is kept here.
        return view(stays.save(stay));
    }

    @Override
    public ReservationStayView assignRoom(UUID stayId, UUID roomId) {
        ReservationStay stay = existing(stayId);
        if (roomId == null) {
            throw new ReservationStayException("room id is required");
        }
        try {
            stay.assignRoom(roomId, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new ReservationStayException(e.getMessage(), e);
        }
        return view(stay);
    }

    @Override
    public ReservationStayView checkIn(UUID stayId) {
        return transition(stayId, "check in", (stay, now) -> stay.checkIn(now));
    }

    @Override
    public ReservationStayView checkOut(UUID stayId) {
        return transition(stayId, "check out", (stay, now) -> stay.checkOut(now));
    }

    @Override
    public ReservationStayView cancelStay(UUID stayId) {
        return transition(stayId, "cancel", (stay, now) -> stay.cancel(now));
    }

    @Override
    public ReservationStayView markNoShow(UUID stayId) {
        return transition(stayId, "mark no-show", (stay, now) -> stay.markNoShow(now));
    }

    @Override
    public ReservationStayView addOccupant(UUID stayId, UUID profileId, boolean primary) {
        ReservationStay stay = existing(stayId);
        if (profileId == null) {
            throw new ReservationStayException("profile id is required");
        }
        GuestProfile profile = profiles.findById(profileId)
                .orElseThrow(() -> new ReservationStayException("guest profile not found"));
        if (occupants.existsByStay_IdAndProfile_Id(stayId, profileId)) {
            throw new ReservationStayException("profile is already an occupant of this stay");
        }
        ReservationGuest link = new ReservationGuest(UUID.randomUUID(), stay, profile, primary, Instant.now());
        occupants.save(link);
        return view(stay);
    }

    @Override
    public void removeOccupant(UUID stayId, UUID linkId) {
        existing(stayId);
        if (linkId == null) {
            throw new ReservationStayException("occupant link id is required");
        }
        ReservationGuest link = occupants.findById(linkId)
                .orElseThrow(() -> new ReservationStayException("occupant link not found"));
        if (!link.getStay().getId().equals(stayId)) {
            throw new ReservationStayException("occupant link does not belong to this stay");
        }
        occupants.delete(link);
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationStayView get(UUID stayId) {
        return view(existing(stayId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationStayView> listByReservation(UUID reservationId) {
        if (reservationId == null) {
            throw new ReservationStayException("reservation id is required");
        }
        return stays.findByReservation_Id(reservationId).stream().map(this::view).toList();
    }

    private ReservationStayView transition(UUID stayId, String action, StayTransition transition) {
        ReservationStay stay = existing(stayId);
        try {
            transition.apply(stay, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new ReservationStayException("cannot " + action + ": " + e.getMessage(), e);
        }
        return view(stay);
    }

    private ReservationStay existing(UUID stayId) {
        if (stayId == null) {
            throw new ReservationStayException("stay id is required");
        }
        return stays.findById(stayId)
                .orElseThrow(() -> new ReservationStayException("reservation stay not found"));
    }

    private ReservationStayView view(ReservationStay stay) {
        return ReservationStayView.from(stay, occupants.findByStay_Id(stay.getId()));
    }

    @FunctionalInterface
    private interface StayTransition {
        void apply(ReservationStay stay, Instant now);
    }
}
