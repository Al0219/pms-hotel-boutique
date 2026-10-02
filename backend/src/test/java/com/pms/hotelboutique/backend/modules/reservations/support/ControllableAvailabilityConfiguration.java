package com.pms.hotelboutique.backend.modules.reservations.support;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * BD3-only controllable ATS stub. Tests opt in via {@code @Import}; it never
 * reaches the production artifact and never touches BD2 sources.
 *
 * <p>Marked {@code @Primary}: since BD2 Fase 4 wires its real ATS engine as a
 * second {@code AvailabilityPort} bean, stub-importing contexts would otherwise
 * fail with {@code NoUniqueBeanDefinitionException} (including BD2's own query
 * service/controller present in the shared context). Production keeps the real
 * engine; only these opt-in test contexts prefer the stub.</p>
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
    @Primary
    public AvailabilityPort availabilityPort() {
        return (propertyId, roomTypeId, dates) -> {
            Objects.requireNonNull(propertyId, "propertyId");
            Objects.requireNonNull(roomTypeId, "roomTypeId");
            Objects.requireNonNull(dates, "dates");
            return STOCK.getOrDefault(roomTypeId, 5);
        };
    }
}
