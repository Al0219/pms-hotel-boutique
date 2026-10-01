package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.HkDiscrepancy;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkDiscrepancyRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class DiscrepancyServiceImpl implements DiscrepancyService {

    private final HkDiscrepancyRepository discrepancies;
    private final AuditService audit;

    public DiscrepancyServiceImpl(HkDiscrepancyRepository discrepancies, AuditService audit) {
        this.discrepancies = discrepancies;
        this.audit = audit;
    }

    @Override
    public DiscrepancyView report(@Valid ReportDiscrepancyCommand command) {
        HkDiscrepancy discrepancy = new HkDiscrepancy(UUID.randomUUID(), command.propertyId(),
                command.roomId(), command.foStatus(), command.hkStatus(), Instant.now());
        if (command.reportedBy() != null) {
            discrepancy.reportBy(command.reportedBy());
        }
        // Room and reporter existence ride on foreign keys; no parallel
        // lookups are kept here.
        DiscrepancyView reported = DiscrepancyView.from(discrepancies.save(discrepancy));
        record(discrepancy, "DISCREPANCY_REPORTED", null, "{\"status\":\"OPEN\"}",
                command.reportedBy());
        return reported;
    }

    @Override
    public DiscrepancyView investigate(UUID discrepancyId, UUID actorId) {
        return transition(discrepancyId, "DISCREPANCY_INVESTIGATING", actorId,
                (discrepancy, now) -> discrepancy.investigate(now));
    }

    @Override
    public DiscrepancyView reconcile(UUID discrepancyId, @Valid ReconcileCommand command,
            UUID actorId) {
        HkDiscrepancy discrepancy = existing(discrepancyId);
        HkDiscrepancy.Status before = discrepancy.getStatus();
        try {
            discrepancy.reconcile(command.resolution(), actorId, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new DiscrepancyException(e.getMessage(), e);
        }
        record(discrepancy, "DISCREPANCY_RECONCILED", "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + discrepancy.getStatus() + "\"}", actorId);
        return DiscrepancyView.from(discrepancy);
    }

    @Override
    public DiscrepancyView cancel(UUID discrepancyId, UUID actorId) {
        return transition(discrepancyId, "DISCREPANCY_CANCELLED", actorId,
                (discrepancy, now) -> discrepancy.cancel(now));
    }

    @Override
    @Transactional(readOnly = true)
    public DiscrepancyView get(UUID discrepancyId) {
        return DiscrepancyView.from(existing(discrepancyId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiscrepancyView> listByScope(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new DiscrepancyException("an explicit property scope is required");
        }
        return discrepancies.findByPropertyIdIn(scope.propertyIds()).stream()
                .map(DiscrepancyView::from).toList();
    }

    private DiscrepancyView transition(UUID discrepancyId, String action, UUID actorId,
            DiscrepancyTransition transition) {
        HkDiscrepancy discrepancy = existing(discrepancyId);
        HkDiscrepancy.Status before = discrepancy.getStatus();
        try {
            transition.apply(discrepancy, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new DiscrepancyException(e.getMessage(), e);
        }
        record(discrepancy, action, "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + discrepancy.getStatus() + "\"}", actorId);
        return DiscrepancyView.from(discrepancy);
    }

    private HkDiscrepancy existing(UUID discrepancyId) {
        if (discrepancyId == null) {
            throw new DiscrepancyException("discrepancy id is required");
        }
        return discrepancies.findById(discrepancyId)
                .orElseThrow(() -> new DiscrepancyException("discrepancy not found"));
    }

    private void record(HkDiscrepancy discrepancy, String action, String before, String after,
            UUID actorId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "HK_DISCREPANCY",
                discrepancy.getId(), discrepancy.getPropertyId(), before, after, null, null));
    }

    @FunctionalInterface
    private interface DiscrepancyTransition {
        void apply(HkDiscrepancy discrepancy, Instant now);
    }
}
