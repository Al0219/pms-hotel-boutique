package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.OutageKind;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class OutageServiceImpl implements OutageService {

    private static final String SELECT =
            "SELECT id,property_id,room_id,kind,start_date,end_date,reason,created_by,created_at,"
                    + "released_at,released_by,release_reason FROM out_of_order_records";

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public OutageServiceImpl(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Override
    public OutageView registerOutage(@Valid RegisterOutageCommand command) {
        if (!command.startDate().isBefore(command.endDate())) {
            throw new OutageException("outage start must precede end");
        }
        UUID id = UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,"
                    + "end_date,reason,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,now())",
                    id, command.propertyId(), command.roomId(), command.kind().name(),
                    Date.valueOf(command.startDate()), Date.valueOf(command.endDate()),
                    command.reason().trim(), command.actorId());
        } catch (DataIntegrityViolationException e) {
            throw new OutageException("unknown property or room", e);
        }
        OutageView registered = get(id);
        record(registered, "OUTAGE_REGISTERED", null,
                "{\"kind\":\"" + registered.kind() + "\"}", command.actorId());
        return registered;
    }

    @Override
    public OutageView releaseOutage(UUID recordId, @Valid ReleaseOutageCommand command) {
        if (recordId == null) {
            throw new OutageException("outage record id is required");
        }
        OutageView current = get(recordId);
        if (current.releasedAt() != null) {
            throw new OutageException("outage is already released");
        }
        jdbc.update("UPDATE out_of_order_records SET released_at=now(),released_by=?,"
                + "release_reason=? WHERE id=?", command.actorId(), command.releaseReason().trim(),
                recordId);
        OutageView released = get(recordId);
        record(released, "OUTAGE_RELEASED", "{\"released\":false}", "{\"released\":true}",
                command.actorId());
        return released;
    }

    @Override
    @Transactional(readOnly = true)
    public OutageView getScoped(AuthorizedPropertyScope scope, UUID recordId) {
        OutageView view = get(recordId);
        if (!authorizedIds(scope).contains(view.propertyId())) {
            throw new OutageException("not authorized for this property");
        }
        return view;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OutageView> listByScope(AuthorizedPropertyScope scope) {
        java.util.Set<UUID> ids = authorizedIds(scope);
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        List<Object> args = new ArrayList<>(ids);
        return jdbc.query(SELECT + " WHERE property_id IN (" + placeholders + ") ORDER BY start_date",
                (result, row) -> map(result), args.toArray());
    }

    private OutageView get(UUID recordId) {
        if (recordId == null) {
            throw new OutageException("outage record id is required");
        }
        List<OutageView> found =
                jdbc.query(SELECT + " WHERE id=?", (result, row) -> map(result), recordId);
        if (found.isEmpty()) {
            throw new OutageException("outage record not found");
        }
        return found.get(0);
    }

    private static OutageView map(java.sql.ResultSet result) throws java.sql.SQLException {
        Timestamp released = result.getTimestamp("released_at");
        return new OutageView(
                result.getObject("id", UUID.class),
                result.getObject("property_id", UUID.class),
                result.getObject("room_id", UUID.class),
                OutageKind.valueOf(result.getString("kind")),
                result.getDate("start_date").toLocalDate(),
                result.getDate("end_date").toLocalDate(),
                result.getString("reason"),
                result.getObject("created_by", UUID.class),
                result.getTimestamp("created_at").toInstant(),
                released == null ? null : released.toInstant(),
                result.getObject("released_by", UUID.class),
                result.getString("release_reason"));
    }

    private void record(OutageView view, String action, String before, String after, UUID actorId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        // Audit failures abort the operation: an outage without a trace is rejected.
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "OUT_OF_ORDER",
                view.id(), view.propertyId(), before, after, view.reason(), null));
    }

    private static java.util.Set<UUID> authorizedIds(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new OutageException("an explicit property scope is required");
        }
        return scope.propertyIds();
    }
}
