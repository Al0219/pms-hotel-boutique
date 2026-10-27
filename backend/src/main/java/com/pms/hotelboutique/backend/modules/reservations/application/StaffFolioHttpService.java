package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.application.StaffFolioModels.*;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffFolioModels.PaymentRequest;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioMovementRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.shared.money.*;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** HTTP orchestration over the existing financial ledger, authorization and operation receipt ports. */
@Service
public class StaffFolioHttpService {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final StaffFolioService folios;
    private final ReservationRepository reservations;
    private final FolioMovementRepository movements;
    private final LocalOperationService operations;
    private final FolioTransactionGuard guard;
    private final JdbcClient jdbc;
    private final EntityManager entities;

    public StaffFolioHttpService(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, StaffFolioService folios, ReservationRepository reservations,
            FolioMovementRepository movements, LocalOperationService operations, FolioTransactionGuard guard,
            JdbcClient jdbc, EntityManager entities) {
        this.sessions = sessions; this.authorization = authorization; this.scopes = scopes; this.folios = folios;
        this.reservations = reservations; this.movements = movements; this.operations = operations;
        this.guard = guard; this.jdbc = jdbc; this.entities = entities;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public FolioPage list(StaffPrincipal principal, UUID propertyId, UUID reservationId, int limit, String cursor) {
        var scope = access(principal, propertyId);
        reservations.findByIdInScope(scope, reservationId).orElseThrow(() -> new ReservationQueryException("Folio not found"));
        limit(limit);
        String context = "folios/" + propertyId + "/" + reservationId;
        var position = StaffFolioCursor.decode(cursor, context);
        var query = jdbc.sql("SELECT f.* FROM folios f JOIN properties p ON p.id=f.property_id "
                + "WHERE f.property_id=:property AND p.organization_id=:organization AND f.reservation_id=:reservation "
                + (position == null ? "" : "AND (f.created_at,f.id) > (:created,:id) ")
                + "ORDER BY f.created_at,f.id LIMIT :limit")
                .param("property", propertyId).param("organization", scope.organizationId())
                .param("reservation", reservationId).param("limit", limit + 1);
        if (position != null) query.param("created", java.sql.Timestamp.from(position.createdAt())).param("id", position.id());
        var rows = query.query((rs, n) -> header(rs)).list();
        var items = List.copyOf(rows.subList(0, Math.min(limit, rows.size())));
        Header last = items.isEmpty() ? null : items.getLast();
        return new FolioPage(propertyId, reservationId, items, rows.size() > limit
                ? StaffFolioCursor.encode(context, last.createdAt(), last.id()) : null);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Detail detail(StaffPrincipal principal, UUID propertyId, UUID folioId) {
        access(principal, propertyId);
        var folio = folio(principal, propertyId, folioId);
        return new Detail(Header.from(folio), Money.from(folios.balanceOf(principal, propertyId, folioId)), movements.countByFolio_Id(folioId));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public MovementPage movements(StaffPrincipal principal, UUID propertyId, UUID folioId, int limit, String cursor) {
        access(principal, propertyId); folio(principal, propertyId, folioId); limit(limit);
        String context = "movements/" + propertyId + "/" + folioId;
        var position = StaffFolioCursor.decode(cursor, context);
        var query = jdbc.sql("SELECT m.* FROM folio_movements m JOIN folios f ON f.id=m.folio_id "
                + "WHERE f.property_id=:property AND m.folio_id=:folio "
                + (position == null ? "" : "AND (m.created_at,m.id) > (:created,:id) ")
                + "ORDER BY m.created_at,m.id LIMIT :limit").param("property", propertyId)
                .param("folio", folioId).param("limit", limit + 1);
        if (position != null) query.param("created", java.sql.Timestamp.from(position.createdAt())).param("id", position.id());
        var rows = query.query((rs, n) -> movement(rs)).list();
        var items = List.copyOf(rows.subList(0, Math.min(limit, rows.size())));
        Movement last = items.isEmpty() ? null : items.getLast();
        return new MovementPage(propertyId, folioId, items, rows.size() > limit
                ? StaffFolioCursor.encode(context, last.createdAt(), last.id()) : null);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PaymentReceipt pay(StaffPrincipal principal, UUID propertyId, UUID folioId, String key, PaymentRequest body) {
        access(principal, propertyId);
        MonetaryAmount amount = amount(body);
        String description = body.description().strip();
        if (description.isBlank() || description.length() > 255) throw new IllegalArgumentException("Description required");
        var request = new LocalOperationRequest(key, 1, Map.of("folioId", folioId.toString(),
                "amountMinor", Long.toString(amount.minorUnits().value()), "currency", amount.currency().getCurrencyCode(),
                "description", description));
        var receipt = operations.execute(principal, propertyId, new LocalOperationService.OperationDefinition(
                "STAFF_FOLIO_PAYMENT", "FOLIO_PAYMENT_OPERATE"), request, context -> {
            var before = folio(principal, propertyId, folioId);
            if (before.reservationId() == null) throw new Conflict("FOLIO_NOT_PAYABLE");
            guard.lock(propertyId, before.reservationId());
            // JDBC avoids a stale JPA first-level snapshot while waiting for the financial lock.
            var current = jdbc.sql("SELECT * FROM folios WHERE id=:id AND property_id=:property")
                    .param("id", folioId).param("property", propertyId).query((rs, n) -> header(rs)).single();
            if (!current.type().equals("GUEST")) throw new Conflict("FOLIO_NOT_PAYABLE");
            if (!current.status().equals("OPEN")) throw new Conflict("FOLIO_NOT_OPEN");
            if (!current.currency().equals(amount.currency().getCurrencyCode())) throw new IllegalArgumentException("Currency mismatch");
            if (movements.countByFolio_Id(folioId) == 0) throw new Conflict("BALANCE_UNVERIFIABLE");
            long balance = folios.balanceOf(principal, propertyId, folioId).minorUnits().value();
            if (amount.minorUnits().value() > balance) throw new Conflict("PAYMENT_EXCEEDS_BALANCE");
            var posted = folios.postPayment(principal, propertyId, folioId, new FolioService.MovementAmount(amount, description));
            entities.flush();
            return posted.id();
        });
        // Immutable original movement, including replay after the balance or folio status changes.
        var posted = movements.findByIdAndFolio_IdAndFolio_PropertyId(receipt.resultId(), folioId, propertyId)
                .orElseThrow(() -> new IllegalStateException("Missing completed payment"));
        return new PaymentReceipt(receipt.operationId(), propertyId, folioId, posted.getId(),
                Money.from(new MonetaryAmount(new MinorUnits(Math.negateExact(posted.amount().minorUnits().value())), posted.amount().currency())),
                receipt.completedAt());
    }

    private AuthorizedPropertyScope access(StaffPrincipal principal, UUID propertyId) {
        if (principal == null) throw new StaffAuthenticationException();
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission("FOLIO_PAYMENT_OPERATE")) throw new AccessDeniedException("Folio permission required");
        return scopes.resolveProperty(snapshot, propertyId);
    }
    private FolioView folio(StaffPrincipal principal, UUID property, UUID id) {
        // Existence checked inside authorized SQL scope; same missing result for a foreign id.
        if (!jdbc.sql("SELECT EXISTS(SELECT 1 FROM folios WHERE id=:id AND property_id=:property)")
                .param("id", id).param("property", property).query(Boolean.class).single())
            throw new ReservationQueryException("Folio not found");
        return folios.get(principal, property, id);
    }
    private static MonetaryAmount amount(PaymentRequest body) {
        try {
            if (body == null || body.amount() == null || body.description() == null
                    || body.amount().amount() == null || !body.amount().amount().matches("[0-9]{1,19}(\\.[0-9]{1,3})?")
                    || body.amount().currency() == null || !body.amount().currency().matches("[A-Z]{3}")) throw new IllegalArgumentException();
            var amount = MonetaryAmount.of(new BigDecimal(body.amount().amount()), Currency.getInstance(body.amount().currency()));
            if (amount.minorUnits().value() <= 0) throw new IllegalArgumentException();
            return amount;
        } catch (RuntimeException error) { throw new IllegalArgumentException("Invalid positive exact payment amount"); }
    }
    private static void limit(int value) { if (value < 1 || value > 100) throw new IllegalArgumentException("Invalid page limit"); }
    private static Header header(ResultSet rs) throws SQLException {
        return new Header(rs.getObject("id", UUID.class), rs.getObject("property_id", UUID.class), rs.getString("type"),
                rs.getString("status"), rs.getObject("reservation_id", UUID.class), rs.getObject("stay_id", UUID.class),
                rs.getObject("group_id", UUID.class), rs.getString("currency").strip(), rs.getString("holder_label"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
    private static Movement movement(ResultSet rs) throws SQLException {
        var value = new MonetaryAmount(new MinorUnits(rs.getLong("amount_minor")), Currency.getInstance(rs.getString("currency").strip()));
        return new Movement(rs.getObject("id", UUID.class), rs.getObject("folio_id", UUID.class), rs.getString("kind"),
                Money.from(value), rs.getString("description"), rs.getObject("reverses_id", UUID.class),
                rs.getObject("created_by", UUID.class), rs.getTimestamp("created_at").toInstant());
    }
    public static class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) { super(code); this.code = code; }
        public String code() { return code; }
    }
}
