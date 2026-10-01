package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.reservations.domain.FolioMovement;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioMovementRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.Currency;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class FolioServiceImpl implements FolioService {

    private final FolioRepository folios;
    private final FolioMovementRepository movements;
    private final ReservationRepository reservations;
    private final ReservationStayRepository stays;

    public FolioServiceImpl(FolioRepository folios, FolioMovementRepository movements,
            ReservationRepository reservations, ReservationStayRepository stays) {
        this.folios = folios;
        this.movements = movements;
        this.reservations = reservations;
        this.stays = stays;
    }

    @Override
    public FolioView openFolio(@Valid OpenFolioCommand command) {
        Instant now = Instant.now();
        Folio folio = new Folio(UUID.randomUUID(), command.propertyId(), command.type(),
                command.currency(), now);
        if (command.reservationId() != null) {
            Reservation reservation = reservations.findById(command.reservationId())
                    .orElseThrow(() -> new FolioException("reservation not found"));
            folio.linkReservation(reservation);
            if (command.stayId() != null) {
                ReservationStay stay = stays.findById(command.stayId())
                        .orElseThrow(() -> new FolioException("reservation stay not found"));
                if (!stay.getReservation().getId().equals(reservation.getId())) {
                    throw new FolioException("stay does not belong to the reservation");
                }
                folio.linkStay(stay);
            }
        } else if (command.stayId() != null) {
            throw new FolioException("a stay folio requires its reservation");
        }
        if (command.holderLabel() != null && !command.holderLabel().isBlank()) {
            folio.labelHolder(command.holderLabel().trim());
        }
        // Property existence is enforced by the FK (BD1 owns properties, no
        // JPA read model to reuse); no parallel lookup is kept here.
        return FolioView.from(folios.save(folio));
    }

    @Override
    public FolioView.MovementView postCharge(UUID folioId, @Valid MovementAmount charge, UUID actorId) {
        if (charge.signed().minorUnits().value() < 0) {
            throw new FolioException("charge amount must be positive");
        }
        return post(open(folioId), FolioMovement.Kind.CHARGE, charge.signed(),
                charge.description(), null, actorId);
    }

    @Override
    public FolioView.MovementView postPayment(UUID folioId, @Valid MovementAmount payment, UUID actorId) {
        if (payment.signed().minorUnits().value() < 0) {
            throw new FolioException("payment amount must be positive");
        }
        // Payments decrease the balance owed, hence stored negated.
        return post(open(folioId), FolioMovement.Kind.PAYMENT, payment.negated(),
                payment.description(), null, actorId);
    }

    @Override
    public FolioView.MovementView postReversal(UUID folioId, UUID originalMovementId,
            @Valid ReversalReason reason, UUID actorId) {
        Folio folio = existing(folioId);
        if (!folio.acceptsPostings()) {
            throw new FolioException("folio is not open for postings");
        }
        if (originalMovementId == null) {
            throw new FolioException("original movement id is required");
        }
        FolioMovement original = movements.findById(originalMovementId)
                .orElseThrow(() -> new FolioException("original movement not found"));
        if (!original.getFolio().getId().equals(folio.getId())) {
            throw new FolioException("original movement belongs to another folio");
        }
        if (original.getKind() == FolioMovement.Kind.ADJUSTMENT) {
            throw new FolioException("adjustments cannot be reversed; post a new adjustment");
        }
        if (movements.existsByReverses_Id(original.getId())) {
            throw new FolioException("movement was already reversed");
        }
        MonetaryAmount compensation = new MonetaryAmount(
                new MinorUnits(-original.getAmountMinor()),
                Currency.getInstance(original.getCurrency()));
        return post(folio, FolioMovement.Kind.ADJUSTMENT, compensation,
                reason.reason(), original, actorId);
    }

    @Override
    public FolioView settle(UUID folioId) {
        return transition(folioId, "settle", (folio, now) -> folio.settle(now));
    }

    @Override
    public FolioView reopen(UUID folioId) {
        return transition(folioId, "reopen", (folio, now) -> folio.reopen(now));
    }

    @Override
    public FolioView close(UUID folioId) {
        return transition(folioId, "close", (folio, now) -> folio.close(now));
    }

    @Override
    @Transactional(readOnly = true)
    public FolioView get(UUID folioId) {
        return FolioView.from(existing(folioId));
    }

    @Override
    @Transactional(readOnly = true)
    public MonetaryAmount balanceOf(UUID folioId) {
        Folio folio = existing(folioId);
        long total = movements.sumByFolioId(folio.getId());
        return new MonetaryAmount(new MinorUnits(total), Currency.getInstance(folio.getCurrency()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolioView.MovementView> movementsOf(UUID folioId) {
        Folio folio = existing(folioId);
        return movements.findByFolio_IdOrderByCreatedAtAsc(folio.getId()).stream()
                .map(FolioView.MovementView::from).toList();
    }

    private FolioView.MovementView post(Folio folio, FolioMovement.Kind kind, MonetaryAmount amount,
            String description, FolioMovement reverses, UUID actorId) {
        try {
            FolioMovement movement = new FolioMovement(UUID.randomUUID(), folio, kind, amount,
                    description, reverses, actorId, Instant.now());
            return FolioView.MovementView.from(movements.save(movement));
        } catch (IllegalArgumentException e) {
            throw new FolioException(e.getMessage(), e);
        }
    }

    private Folio open(UUID folioId) {
        Folio folio = existing(folioId);
        if (!folio.acceptsPostings()) {
            throw new FolioException("folio is not open for postings");
        }
        return folio;
    }

    private FolioView transition(UUID folioId, String action, FolioTransition transition) {
        Folio folio = existing(folioId);
        try {
            transition.apply(folio, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new FolioException("cannot " + action + ": " + e.getMessage(), e);
        }
        return FolioView.from(folio);
    }

    private Folio existing(UUID folioId) {
        if (folioId == null) {
            throw new FolioException("folio id is required");
        }
        return folios.findById(folioId).orElseThrow(() -> new FolioException("folio not found"));
    }

    @FunctionalInterface
    private interface FolioTransition {
        void apply(Folio folio, Instant now);
    }
}
