package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PublicAvailabilityCatalogRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Public offers are a read snapshot, never inventory allocation or a booking guarantee. */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class PublicAvailabilityService {
    private final PublicAvailabilityCatalogRepository catalog;
    private final AvailabilityPort availability;
    private final DemoRatePolicy rates;

    public PublicAvailabilityService(PublicAvailabilityCatalogRepository catalog,
            AvailabilityPort availability, DemoRatePolicy rates) {
        this.catalog = catalog;
        this.availability = availability;
        this.rates = rates;
    }

    public PublicAvailabilityView search(PublicAvailabilityQuery query) {
        Objects.requireNonNull(query, "query");
        var property = catalog.findProperty(query.propertyId()).orElseThrow(PropertyNotFoundException::new);
        if (!rates.currency().equals(property.getCurrency())) {
            throw new IllegalStateException("DEMO_CURRENCY_MISMATCH: property currency "
                    + property.getCurrency().getCurrencyCode() + "; demo currency "
                    + rates.currency().getCurrencyCode());
        }
        var dates = new StayDateRange(query.arrival(), query.departure());
        var offers = new ArrayList<PublicAvailabilityOfferView>();
        // Java lexical code ordering is independent of database order/collation.
        var types = catalog.findRoomTypes(query.propertyId()).stream()
                .sorted(Comparator.comparing(RoomType::getCode)).toList();
        for (var type : types) {
            int units = availability.calculateATS(property.getId(), type.getId(), dates);
            if (units < query.roomsRequested()) { continue; }
            var nightlyRate = rates.rateFor(type);
            var total = rates.totalFor(type, query.arrival(), query.departure());
            String ratePlan = rates.ratePlanCodeFor(type);
            offers.add(new PublicAvailabilityOfferView(type.getId(), type.getCode(), type.getName(),
                    ratePlan, ratePlan, units, nightlyRate.minorUnits().value(), total.minorUnits().value()));
        }
        return new PublicAvailabilityView(property.getId(), query.arrival(), query.departure(),
                property.getCurrency().getCurrencyCode(), offers);
    }
}
