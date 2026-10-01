package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.OutageKind;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * BD3 operational OOO/OOS flows (Fase 9).
 *
 * The {@code out_of_order_records} table belongs to BD2 and has no JPA
 * entity here on purpose: this service reads and writes it with plain SQL
 * so BD2's future entities never compete for the same rows. Registering and
 * releasing always require reason, dates, status and actor, and both are
 * audited. Releasing never deletes history.
 */
public interface OutageService {

    OutageView registerOutage(@Valid RegisterOutageCommand command);

    OutageView releaseOutage(UUID recordId, @Valid ReleaseOutageCommand command);

    OutageView getScoped(AuthorizedPropertyScope scope, UUID recordId);

    List<OutageView> listByScope(AuthorizedPropertyScope scope);

    record RegisterOutageCommand(
            @NotNull UUID propertyId,
            @NotNull UUID roomId,
            @NotNull OutageKind kind,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            @NotBlank @Size(max = 500) String reason,
            UUID actorId) {
    }

    record ReleaseOutageCommand(
            @NotBlank @Size(max = 500) String releaseReason,
            UUID actorId) {
    }

    record OutageView(UUID id, UUID propertyId, UUID roomId, OutageKind kind,
            LocalDate startDate, LocalDate endDate, String reason, UUID createdBy,
            java.time.Instant createdAt, java.time.Instant releasedAt, UUID releasedBy,
            String releaseReason) {
    }
}
