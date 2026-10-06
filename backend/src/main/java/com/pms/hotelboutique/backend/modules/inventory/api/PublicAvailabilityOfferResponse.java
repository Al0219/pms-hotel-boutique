package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.PublicAvailabilityOfferView;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

public record PublicAvailabilityOfferResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID roomTypeId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String roomTypeCode,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String roomTypeName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Stable demo identity, not a persisted RatePlan UUID") String ratePlanId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"DEMO_STANDARD", "DEMO_DELUXE", "DEMO_SUITE"}) String ratePlanCode,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", description = "Minimum sellable units across all requested nights") int availableUnits,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", description = "GTQ minor units per room per night; no taxes or discounts") long nightlyRateMinor,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", description = "GTQ minor units per room for the full range; rooms only filters capacity") long totalMinor) {
    static PublicAvailabilityOfferResponse from(PublicAvailabilityOfferView offer) {
        return new PublicAvailabilityOfferResponse(offer.roomTypeId(), offer.roomTypeCode(), offer.roomTypeName(),
                offer.ratePlanId(), offer.ratePlanCode(), offer.availableUnits(), offer.nightlyRateMinor(), offer.totalMinor());
    }
}
