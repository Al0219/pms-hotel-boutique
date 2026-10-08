package com.pms.hotelboutique.backend.modules.inventory.support;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import java.util.Objects;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** BD3 tests opt in via @Import; never compiled into the production artifact. */
@TestConfiguration(proxyBeanMethods = false)
public class AvailabilityStubConfiguration {
    @Bean
    public AvailabilityPort availabilityPort() {
        return (propertyId, roomTypeId, dates) -> {
            Objects.requireNonNull(propertyId, "propertyId");
            Objects.requireNonNull(roomTypeId, "roomTypeId");
            Objects.requireNonNull(dates, "dates");
            return 5;
        };
    }
}
