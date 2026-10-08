package com.pms.hotelboutique.backend.modules.inventory.application;

import java.util.UUID;

public record PublicAvailabilityOfferView(UUID roomTypeId, String roomTypeCode,
        String roomTypeName, String ratePlanId, String ratePlanCode,
        int availableUnits, long nightlyRateMinor, long totalMinor) { }
