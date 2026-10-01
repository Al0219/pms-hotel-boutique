package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.HkDiscrepancy;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkDiscrepancyRepository;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Required blocker: unreconciled FO/HK discrepancies. Closing the books
 * while occupancy itself is disputed would freeze the wrong state.
 */
@Component
public class OpenDiscrepanciesBlocker implements NightAuditBlocker {

    private final HkDiscrepancyRepository discrepancies;

    public OpenDiscrepanciesBlocker(HkDiscrepancyRepository discrepancies) {
        this.discrepancies = discrepancies;
    }

    @Override
    public String name() {
        return "open-discrepancies";
    }

    @Override
    public List<String> blockers(UUID propertyId, LocalDate businessDate) {
        int open = discrepancies.findByPropertyIdAndStatusIn(propertyId,
                EnumSet.of(HkDiscrepancy.Status.OPEN, HkDiscrepancy.Status.INVESTIGATING)).size();
        return open == 0 ? List.of()
                : List.of(open + " unreconciled housekeeping discrepancies");
    }
}
