package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.HkDiscrepancy;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * BD3 housekeeping discrepancy operations (Fase 10).
 *
 * No REST contract is implied. Reads take an explicit
 * {@code AuthorizedPropertyScope} (C2).
 */
public interface DiscrepancyService {

    DiscrepancyView report(@Valid ReportDiscrepancyCommand command);

    DiscrepancyView investigate(UUID discrepancyId, UUID actorId);

    DiscrepancyView reconcile(UUID discrepancyId, @Valid ReconcileCommand command, UUID actorId);

    DiscrepancyView cancel(UUID discrepancyId, UUID actorId);

    DiscrepancyView get(UUID discrepancyId);

    List<DiscrepancyView> listByScope(AuthorizedPropertyScope scope);

    record ReportDiscrepancyCommand(
            @NotNull UUID propertyId,
            @NotNull UUID roomId,
            @NotNull HkDiscrepancy.FoStatus foStatus,
            @NotNull HkDiscrepancy.HkStatus hkStatus,
            UUID reportedBy) {
    }

    record ReconcileCommand(@NotBlank @Size(max = 500) String resolution) {
    }

    record DiscrepancyView(UUID id, UUID propertyId, UUID roomId, HkDiscrepancy.FoStatus foStatus,
            HkDiscrepancy.HkStatus hkStatus, HkDiscrepancy.Status status, String resolution,
            UUID reportedBy, UUID resolvedBy, Instant resolvedAt, Instant createdAt,
            Instant updatedAt) {

        static DiscrepancyView from(HkDiscrepancy discrepancy) {
            return new DiscrepancyView(discrepancy.getId(), discrepancy.getPropertyId(),
                    discrepancy.getRoomId(), discrepancy.getFoStatus(), discrepancy.getHkStatus(),
                    discrepancy.getStatus(), discrepancy.getResolution(), discrepancy.getReportedBy(),
                    discrepancy.getResolvedBy(), discrepancy.getResolvedAt(),
                    discrepancy.getCreatedAt(), discrepancy.getUpdatedAt());
        }
    }
}
