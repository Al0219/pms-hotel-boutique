package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Currency;
import java.util.List;
import java.util.UUID;

/**
 * BD3 folio operations (Fase 5).
 *
 * Movements are append-only: postings only target OPEN folios, amounts are
 * never edited, and corrections post compensating ADJUSTMENTs linked to the
 * original movement. No delete is offered anywhere.
 */
public interface FolioService {

    FolioView openFolio(@Valid OpenFolioCommand command);

    FolioView.MovementView postCharge(UUID folioId, @Valid MovementAmount amount, UUID actorId);

    FolioView.MovementView postPayment(UUID folioId, @Valid MovementAmount amount, UUID actorId);

    FolioView.MovementView postReversal(UUID folioId, UUID originalMovementId,
            @Valid ReversalReason reason, UUID actorId);

    FolioView settle(UUID folioId);

    FolioView reopen(UUID folioId);

    FolioView close(UUID folioId);

    FolioView get(UUID folioId);

    MonetaryAmount balanceOf(UUID folioId);

    List<FolioView.MovementView> movementsOf(UUID folioId);

    record OpenFolioCommand(
            @NotNull UUID propertyId,
            @NotNull Folio.Type type,
            @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
            UUID reservationId,
            UUID stayId,
            @Size(max = 160) String holderLabel) {
    }

    /** Signed amount plus description; sign convention is documented per method. */
    record MovementAmount(MonetaryAmount amount, @NotBlank @Size(max = 255) String description) {
        public MovementAmount {
            if (amount == null) {
                throw new FolioException("amount is required");
            }
            if (amount.minorUnits().value() == 0) {
                throw new FolioException("amount must not be zero");
            }
        }

        public MonetaryAmount signed() {
            return amount;
        }

        public MonetaryAmount negated() {
            return new MonetaryAmount(new MinorUnits(-amount.minorUnits().value()), amount.currency());
        }

        public Currency currency() {
            return amount.currency();
        }
    }

    record ReversalReason(@NotBlank @Size(max = 255) String reason) {
    }
}
