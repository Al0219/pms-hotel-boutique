package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.AvailabilityNightCount;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.AvailabilityQueryRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AvailabilityServiceTests {
    private final AvailabilityQueryRepository query = mock(AvailabilityQueryRepository.class);
    private final AvailabilityService service = new AvailabilityService(query);
    private final UUID propertyId = UUID.randomUUID();
    private final UUID roomTypeId = UUID.randomUUID();
    private final StayDateRange dates = new StayDateRange(
            LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 3));

    @Test
    void returnsMinimumSellableRoomsAcrossLocalNights() {
        when(query.calculate(propertyId, roomTypeId, dates)).thenReturn(List.of(
                new AvailabilityNightCount(dates.arrival(), 5, 1, 1),
                new AvailabilityNightCount(dates.arrival().plusDays(1), 5, 0, 3)));

        assertEquals(2, service.calculateATS(propertyId, roomTypeId, dates));
    }

    @Test
    void neverReturnsNegativeAvailability() {
        when(query.calculate(propertyId, roomTypeId, dates)).thenReturn(List.of(
                new AvailabilityNightCount(dates.arrival(), 2, 2, 1),
                new AvailabilityNightCount(dates.arrival().plusDays(1), 2, 0, 0)));

        assertEquals(0, service.calculateATS(propertyId, roomTypeId, dates));
    }

    @Test
    void rejectsMissingPropertyOrRoomTypeInsteadOfTreatingItAsZeroStock() {
        when(query.calculate(propertyId, roomTypeId, dates)).thenReturn(List.of());

        assertThrows(IllegalArgumentException.class,
                () -> service.calculateATS(propertyId, roomTypeId, dates));
    }
}
