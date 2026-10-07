package com.pms.hotelboutique.backend.modules.inventory.application;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PublicAvailabilityView(UUID propertyId, LocalDate arrival,
        LocalDate departure, String currency, List<PublicAvailabilityOfferView> offers) {
    public PublicAvailabilityView { offers = List.copyOf(offers); }
}
