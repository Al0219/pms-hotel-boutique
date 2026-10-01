package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.reservations.domain.FolioMovement;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.time.Instant;
import java.util.UUID;

/** Read models for folios and movements. Entities are never exposed directly. */
public record FolioView(
        UUID id,
        UUID propertyId,
        Folio.Type type,
        Folio.Status status,
        UUID reservationId,
        UUID stayId,
        String currency,
        String holderLabel,
        Instant createdAt,
        Instant updatedAt) {

    public static FolioView from(Folio folio) {
        return new FolioView(
                folio.getId(),
                folio.getPropertyId(),
                folio.getType(),
                folio.getStatus(),
                folio.getReservation() == null ? null : folio.getReservation().getId(),
                folio.getStay() == null ? null : folio.getStay().getId(),
                folio.getCurrency(),
                folio.getHolderLabel(),
                folio.getCreatedAt(),
                folio.getUpdatedAt());
    }

    public record MovementView(
            UUID id,
            UUID folioId,
            FolioMovement.Kind kind,
            MonetaryAmount amount,
            String description,
            UUID reversesId,
            UUID createdBy,
            Instant createdAt) {

        public static MovementView from(FolioMovement movement) {
            return new MovementView(
                    movement.getId(),
                    movement.getFolio().getId(),
                    movement.getKind(),
                    movement.amount(),
                    movement.getDescription(),
                    movement.getReverses() == null ? null : movement.getReverses().getId(),
                    movement.getCreatedBy(),
                    movement.getCreatedAt());
        }
    }
}
