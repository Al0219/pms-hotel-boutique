package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceRequestRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Guest facade: linked context is resolved in SQL before any request access. */
@Service
@Transactional
public class GuestHousekeepingService {
    public static final String MVP_SLOT = "10:00–11:00";
    public static final String MVP_TYPE = "FULL_CLEANING";
    private final GuestAuthService auth;
    private final JdbcClient jdbc;
    private final ServiceRequestService operations;
    private final ServiceRequestRepository requests;
    private final AuditService audit;
    private final EntityManager entities;

    public GuestHousekeepingService(GuestAuthService auth, JdbcClient jdbc,
            ServiceRequestService operations, ServiceRequestRepository requests, AuditService audit, EntityManager entities) {
        this.auth = auth; this.jdbc = jdbc; this.operations = operations; this.requests = requests; this.audit = audit; this.entities = entities;
    }

    @Schema(name = "GuestHousekeepingRequest")
    public record RequestView(UUID id, UUID reservationId, UUID stayId,
            LocalDate serviceDate, String timeSlot, String cleaningType,
            @Schema(nullable = true) String notes, ServiceRequest.Status status, Instant createdAt) {
        public static RequestView from(ServiceRequest request) {
            return new RequestView(request.getId(), request.getReservationId(), request.getStayId(),
                request.getServiceDate(), request.getTimeSlot(), request.getCleaningType(),
                request.getDetail(), request.getStatus(), request.getCreatedAt());
        }
    }

    public record Creation(RequestView request, boolean replay) { }

    public Creation create(GuestPrincipal principal, UUID reservationId, UUID stayId,
            String key, LocalDate date, String slot, String type, String notes) {
        var guest = active(principal);
        if (key == null || !key.matches("[A-Za-z0-9-]{16,100}") || date == null
                || !MVP_SLOT.equals(slot) || !MVP_TYPE.equals(type)) throw invalid();
        String normalized = notes == null || notes.isBlank() ? null : notes.trim();
        if (normalized != null && normalized.length() > 500) throw invalid();
        // Serializes simultaneous attempts for this authorized stay; also protects lifecycle changes.
        var context = context(guest.guestAccountId(), reservationId, stayId, true);
        var prior = requests.findByStayIdAndGuestRequestKey(stayId, key);
        if (prior.isPresent()) {
            var saved = prior.get();
            if (!date.equals(saved.getServiceDate()) || !slot.equals(saved.getTimeSlot())
                    || !type.equals(saved.getCleaningType()) || !Objects.equals(normalized, saved.getDetail()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Request key already used");
            return new Creation(RequestView.from(saved), true);
        }
        validateSchedule(context, date, Instant.now());
        Instant dueAt = date.atTime(10, 0).atZone(ZoneId.of(context.timezone())).toInstant();
        var opened = operations.openRequest(new ServiceRequestService.OpenRequestCommand(
            context.propertyId(), ServiceRequest.Category.HOUSEKEEPING, "Limpieza", normalized,
            ServiceRequest.Priority.MEDIUM, reservationId, stayId, context.roomId(), context.profileId(), null, dueAt));
        var saved = requests.findById(opened.id()).orElseThrow();
        saved.scheduleHousekeeping(date, slot, type, key);
        requests.saveAndFlush(saved);
        entities.refresh(saved); // Return PostgreSQL timestamp precision, identical on replay.
        audit.record(new AuditService.RecordAuditCommand(ActorType.GUEST, guest.guestAccountId(),
            "HOUSEKEEPING_REQUESTED", "SERVICE_REQUEST", saved.getId(), context.propertyId(), null,
            "{\"status\":\"OPEN\"}", null, null));
        return new Creation(RequestView.from(saved), false);
    }

    @Transactional(readOnly = true)
    public List<RequestView> list(GuestPrincipal principal, UUID reservationId, UUID stayId) {
        var context = context(active(principal).guestAccountId(), reservationId, stayId, false);
        return requests.findByPropertyIdAndStayIdAndCategoryOrderByCreatedAtDesc(context.propertyId(), stayId, ServiceRequest.Category.HOUSEKEEPING)
            .stream().filter(r -> r.getServiceDate() != null && reservationId.equals(r.getReservationId()))
            .map(RequestView::from).toList();
    }

    static void validateSchedule(Context c, LocalDate date, Instant now) {
        if (!"CONFIRMED".equals(c.reservationStatus()) || !("RESERVED".equals(c.status()) || "IN_HOUSE".equals(c.status())))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Stay does not allow housekeeping");
        ZoneId zone = ZoneId.of(c.timezone());
        var start = date.atTime(10, 0).atZone(zone);
        var end = date.atTime(11, 0).atZone(zone);
        // Existing MVP checkout policy: noon on departure. No client-side late checkout can extend it.
        if (date.isBefore(c.arrival()) || date.isAfter(c.departure())
                || start.toInstant().isBefore(now.plusSeconds(30 * 60))
                || end.toInstant().isAfter(c.departure().atTime(12, 0).atZone(zone).toInstant())) throw invalid();
    }

    private GuestPrincipal active(GuestPrincipal principal) {
        if (principal == null) throw new GuestAuthenticationException();
        return auth.getActivePrincipal(principal);
    }

    private Context context(UUID accountId, UUID reservationId, UUID stayId, boolean lock) {
        return jdbc.sql("""
            SELECT s.property_id,s.room_id,r.booking_guest_id,s.arrival,s.departure,s.status,
                   r.status reservation_status,p.timezone
            FROM guest_reservation_links l
            JOIN reservations r ON r.id=l.reservation_id AND r.property_id=l.property_id
            JOIN reservation_stays s ON s.reservation_id=r.id AND s.property_id=l.property_id
            JOIN properties p ON p.id=l.property_id
            WHERE l.guest_account_id=:account AND r.id=:reservation AND s.id=:stay
            """ + (lock ? " FOR UPDATE OF s,r,l" : ""))
            .param("account", accountId).param("reservation", reservationId).param("stay", stayId)
            .query((rs, row) -> new Context(rs.getObject("property_id", UUID.class), rs.getObject("room_id", UUID.class),
                rs.getObject("booking_guest_id", UUID.class), rs.getObject("arrival", LocalDate.class),
                rs.getObject("departure", LocalDate.class), rs.getString("status"), rs.getString("reservation_status"),
                rs.getString("timezone")))
            .optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stay unavailable"));
    }
    record Context(UUID propertyId, UUID roomId, UUID profileId, LocalDate arrival, LocalDate departure,
            String status, String reservationStatus, String timezone) { }
    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid housekeeping schedule or notes");
    }
}
