package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.AvailabilityNightCount;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.AvailabilityQueryRepository;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Calculates the minimum sellable units across all requested local nights. */
@Service
@Transactional(readOnly = true)
public class AvailabilityService implements AvailabilityPort {
    private final AvailabilityQueryRepository availability;

    public AvailabilityService(AvailabilityQueryRepository availability) {
        this.availability = availability;
    }

    @Override
    public int calculateATS(UUID propertyId, UUID roomTypeId, StayDateRange dates) {
        Objects.requireNonNull(propertyId, "propertyId");
        Objects.requireNonNull(roomTypeId, "roomTypeId");
        Objects.requireNonNull(dates, "dates");

        List<AvailabilityNightCount> nights = availability.calculate(propertyId, roomTypeId, dates);
        if (nights.size() != dates.departure().toEpochDay() - dates.arrival().toEpochDay()) {
            throw new IllegalArgumentException("property or room type does not exist");
        }
        long minimum = nights.stream()
                .mapToLong(night -> Math.max(0L,
                        night.physicalRooms() - night.outOfOrderRooms() - night.reservedStays()))
                .min()
                .orElseThrow(() -> new IllegalArgumentException("stay range has no nights"));
        return Math.toIntExact(minimum);
    }
}
