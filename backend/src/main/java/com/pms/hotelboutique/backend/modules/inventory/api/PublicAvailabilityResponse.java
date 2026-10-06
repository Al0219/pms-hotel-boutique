package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.PublicAvailabilityView;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PublicAvailabilityResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate arrival,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate departure,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = "GTQ") String currency,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Real sellable offers ordered by roomTypeCode; empty when no availability") List<PublicAvailabilityOfferResponse> offers) {
    public PublicAvailabilityResponse { offers = List.copyOf(offers); }

    public static PublicAvailabilityResponse from(PublicAvailabilityView view) {
        return new PublicAvailabilityResponse(view.propertyId(), view.arrival(), view.departure(), view.currency(),
                view.offers().stream().map(PublicAvailabilityOfferResponse::from).toList());
    }
}
