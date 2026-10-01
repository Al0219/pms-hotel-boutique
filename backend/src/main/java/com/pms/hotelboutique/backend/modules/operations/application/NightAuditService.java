package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.BusinessDay;
import com.pms.hotelboutique.backend.modules.operations.domain.NightAuditRun;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * BD3 night audit operations (Fase 11).
 *
 * Closing runs every registered {@link NightAuditBlocker}; any blocker
 * records a BLOCKED run and keeps the day open. A clean close shuts the day,
 * opens its successor and records a COMPLETED run, atomically. Folio charge
 * posting during close belongs to punto 1 and plugs in as a blocker/posting
 * step later — it is not implemented here.
 */
public interface NightAuditService {

    BusinessDayView openDay(@Valid OpenDayCommand command, UUID actorId);

    BusinessDayView currentDay(UUID propertyId);

    CloseDayResult closeDay(UUID propertyId, UUID actorId);

    List<BusinessDayView> listDays(AuthorizedPropertyScope scope);

    List<RunView> listRuns(AuthorizedPropertyScope scope);

    record OpenDayCommand(@NotNull UUID propertyId, @NotNull LocalDate businessDate) {
    }

    record BusinessDayView(UUID id, UUID propertyId, LocalDate businessDate,
            BusinessDay.Status status, UUID closedBy, Instant closedAt) {

        static BusinessDayView from(BusinessDay day) {
            return new BusinessDayView(day.getId(), day.getPropertyId(), day.getBusinessDate(),
                    day.getStatus(), day.getClosedBy(), day.getClosedAt());
        }
    }

    record RunView(UUID id, UUID propertyId, UUID businessDayId, NightAuditRun.Status status,
            String blockers, UUID startedBy, Instant finishedAt) {

        static RunView from(NightAuditRun run) {
            return new RunView(run.getId(), run.getPropertyId(), run.getBusinessDayId(),
                    run.getStatus(), run.getBlockers(), run.getStartedBy(), run.getFinishedAt());
        }
    }

    record CloseDayResult(BusinessDayView closed, BusinessDayView next, RunView run) {
    }
}
