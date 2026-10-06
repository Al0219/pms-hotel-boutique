package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PublicAvailabilityCatalogRepository;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Currency;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicAvailabilityServiceTests {
    private final PublicAvailabilityCatalogRepository catalog = mock(PublicAvailabilityCatalogRepository.class);
    private final AvailabilityPort ats = mock(AvailabilityPort.class);
    private final DemoRatePolicy rates = spy(new DemoRatePolicy());
    private final PublicAvailabilityService service = new PublicAvailabilityService(catalog, ats, rates);
    private final UUID propertyId = UUID.randomUUID();
    private final LocalDate arrival = LocalDate.of(2026, 11, 1);
    private final LocalDate departure = arrival.plusDays(3);

    @Test
    void delegatesWholeRangeAndTotalToExistingAuthorities() {
        var type = new RoomType(UUID.randomUUID(), propertyId, "DLX", "Real Deluxe", Instant.now());
        var property = new Property(propertyId, UUID.randomUUID(), "PROP", "Property",
                "America/Guatemala", Currency.getInstance("GTQ"), Property.Status.ACTIVE, Instant.now());
        when(catalog.findProperty(propertyId)).thenReturn(Optional.of(property));
        when(catalog.findRoomTypes(propertyId)).thenReturn(List.of(type));
        var dates = new StayDateRange(arrival, departure);
        when(ats.calculateATS(propertyId, type.getId(), dates)).thenReturn(4);
        // A distinctive policy total detects accidental formula duplication in the facade.
        doReturn(new MonetaryAmount(new MinorUnits(777L), rates.currency()))
                .when(rates).totalFor(type, arrival, departure);

        var offer = service.search(new PublicAvailabilityQuery(propertyId, arrival, departure, 2))
                .offers().getFirst();
        assertEquals(4, offer.availableUnits());
        assertEquals(85000L, offer.nightlyRateMinor());
        assertEquals(777L, offer.totalMinor());
        assertEquals("DEMO_DELUXE", offer.ratePlanId());
        assertEquals(offer.ratePlanId(), offer.ratePlanCode());
        verify(ats).calculateATS(propertyId, type.getId(), dates);
        verify(rates).rateFor(type);
        verify(rates).totalFor(type, arrival, departure);
    }

    @Test
    void rejectsMissingPropertyId() {
        assertThrows(IllegalArgumentException.class,
                () -> new PublicAvailabilityQuery(null, arrival, departure, 1));
    }

    @Test
    void rejectsMissingArrival() {
        assertThrows(IllegalArgumentException.class,
                () -> new PublicAvailabilityQuery(propertyId, null, departure, 1));
    }

    @Test
    void rejectsMissingDeparture() {
        assertThrows(IllegalArgumentException.class,
                () -> new PublicAvailabilityQuery(propertyId, arrival, null, 1));
    }

    @Test
    void rejectsEqualDates() {
        assertThrows(IllegalArgumentException.class,
                () -> new PublicAvailabilityQuery(propertyId, arrival, arrival, 1));
    }

    @Test
    void rejectsReversedDates() {
        assertThrows(IllegalArgumentException.class,
                () -> new PublicAvailabilityQuery(propertyId, departure, arrival, 1));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1})
    void rejectsNonPositiveRoomsRequested(int units) {
        assertThrows(IllegalArgumentException.class,
                () -> new PublicAvailabilityQuery(propertyId, arrival, departure, units));
    }
}
