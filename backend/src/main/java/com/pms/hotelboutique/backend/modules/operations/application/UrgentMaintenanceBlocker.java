package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.MaintenanceOrder;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.MaintenanceOrderRepository;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Required blocker: unresolved URGENT maintenance only. Lower priorities are
 * routine carry-over and never block the close.
 */
@Component
public class UrgentMaintenanceBlocker implements NightAuditBlocker {

    private final MaintenanceOrderRepository orders;

    public UrgentMaintenanceBlocker(MaintenanceOrderRepository orders) {
        this.orders = orders;
    }

    @Override
    public String name() {
        return "urgent-maintenance";
    }

    @Override
    public List<String> blockers(UUID propertyId, LocalDate businessDate) {
        long urgent = orders.findByPropertyIdAndStatusIn(propertyId, EnumSet.of(
                MaintenanceOrder.Status.OPEN, MaintenanceOrder.Status.IN_PROGRESS)).stream()
                .filter(order -> order.getPriority() == MaintenanceOrder.Priority.URGENT)
                .count();
        return urgent == 0 ? List.of() : List.of(urgent + " unresolved urgent maintenance orders");
    }
}
