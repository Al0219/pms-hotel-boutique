package com.pms.hotelboutique.backend.modules.reservations.support;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/**
 * BD3-only controllable ATS stub. Tests opt in via {@code @Import}; it never
 * reaches the production artifact and never touches BD2 sources.
 */
@TestConfiguration(proxyBeanMethods = false)
public class ControllableAvailabilityConfiguration {

    private static final ConcurrentHashMap<UUID, Integer> STOCK = new ConcurrentHashMap<>();

    public static void setStock(UUID roomTypeId, int units) {
        STOCK.put(roomTypeId, units);
    }

    public static void reset() {
        STOCK.clear();
    }

    @Bean
    public AvailabilityPort availabilityPort() {
        return (propertyId, roomTypeId, dates) -> {
            Objects.requireNonNull(propertyId, "propertyId");
            Objects.requireNonNull(roomTypeId, "roomTypeId");
            Objects.requireNonNull(dates, "dates");
            return STOCK.getOrDefault(roomTypeId, 5);
        };
    }
}
