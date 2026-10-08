package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.support.AvailabilityStubConfiguration;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import static org.junit.jupiter.api.Assertions.*;

class AvailabilityContractTests {
    @Test
    void requiresAtLeastOneNight() {
        var arrival = LocalDate.of(2026, 9, 30);
        assertEquals(LocalDate.of(2026, 10, 1), new StayDateRange(arrival, arrival.plusDays(1)).departure());
        assertThrows(IllegalArgumentException.class, () -> new StayDateRange(arrival, arrival));
        assertThrows(IllegalArgumentException.class, () -> new StayDateRange(arrival, arrival.minusDays(1)));
        assertThrows(NullPointerException.class, () -> new StayDateRange(null, arrival));
    }

    @Test
    void bd3CanOptIntoFixedAvailabilityForTests() {
        try (var context = new AnnotationConfigApplicationContext(AvailabilityStubConfiguration.class)) {
            var port = context.getBean(AvailabilityPort.class);
            var dates = new StayDateRange(LocalDate.of(2026, 9, 30), LocalDate.of(2026, 10, 3));
            assertEquals(5, port.calculateATS(UUID.randomUUID(), UUID.randomUUID(), dates));
            assertThrows(NullPointerException.class, () -> port.calculateATS(null, UUID.randomUUID(), dates));
        }
    }
}
