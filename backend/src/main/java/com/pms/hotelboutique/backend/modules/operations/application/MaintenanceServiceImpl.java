package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.MaintenanceOrder;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.MaintenanceOrderRepository;
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
public class MaintenanceServiceImpl implements MaintenanceService {

    private final MaintenanceOrderRepository orders;
    private final AuditService audit;

    public MaintenanceServiceImpl(MaintenanceOrderRepository orders, AuditService audit) {
        this.orders = orders;
        this.audit = audit;
    }

    @Override
    public MaintenanceOrderView openOrder(@Valid OpenOrderCommand command) {
        Instant now = Instant.now();
        MaintenanceOrder order = new MaintenanceOrder(UUID.randomUUID(), command.propertyId(),
                command.title(), now);
        order.describe(blankToNull(command.description()),
                command.priority() == null ? MaintenanceOrder.Priority.MEDIUM : command.priority());
        if (command.roomId() != null) {
            order.targetRoom(command.roomId());
        }
        if (command.reportedBy() != null) {
            order.reportBy(command.reportedBy());
        }
        // Room and reporter existence ride on foreign keys (BD2 rooms and BD1
        // staff tables); no parallel lookups are kept here.
        MaintenanceOrderView opened = MaintenanceOrderView.from(orders.save(order));
        record(order, "MAINTENANCE_OPENED", null, "{\"status\":\"OPEN\"}",
                command.reportedBy());
        return opened;
    }

    @Override
    public MaintenanceOrderView startProgress(UUID orderId, UUID actorId) {
        return transition(orderId, "MAINTENANCE_STARTED", actorId,
                (order, now) -> order.startProgress(now));
    }

    @Override
    public MaintenanceOrderView resolve(UUID orderId, UUID actorId) {
        return transition(orderId, "MAINTENANCE_RESOLVED", actorId,
                (order, now) -> order.resolve(now));
    }

    @Override
    public MaintenanceOrderView cancel(UUID orderId, UUID actorId) {
        return transition(orderId, "MAINTENANCE_CANCELLED", actorId,
                (order, now) -> order.cancel(now));
    }

    @Override
    public MaintenanceOrderView reopen(UUID orderId, UUID actorId) {
        return transition(orderId, "MAINTENANCE_REOPENED", actorId,
                (order, now) -> order.reopen(now));
    }

    @Override
    public MaintenanceOrderView assign(UUID orderId, UUID assigneeId, UUID actorId) {
        MaintenanceOrder order = existing(orderId);
        MaintenanceOrder.Status before = order.getStatus();
        try {
            order.assignTo(assigneeId, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new MaintenanceException(e.getMessage(), e);
        }
        record(order, "MAINTENANCE_ASSIGNED", "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + order.getStatus() + "\"}", actorId);
        return MaintenanceOrderView.from(order);
    }

    @Override
    public MaintenanceOrderView linkOutage(UUID orderId, UUID oooRecordId, UUID actorId) {
        MaintenanceOrder order = existing(orderId);
        try {
            order.linkOutage(oooRecordId);
        } catch (IllegalArgumentException e) {
            throw new MaintenanceException(e.getMessage(), e);
        }
        // The outage row itself lives on BD2's table; its existence rides on
        // the foreign key at flush time.
        record(order, "MAINTENANCE_OUTAGE_LINKED", null,
                "{\"oooRecordId\":\"" + order.getOooRecordId() + "\"}", actorId);
        return MaintenanceOrderView.from(order);
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenanceOrderView get(UUID orderId) {
        return MaintenanceOrderView.from(existing(orderId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceOrderView> listByScope(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new MaintenanceException("an explicit property scope is required");
        }
        return orders.findByPropertyIdIn(scope.propertyIds()).stream()
                .map(MaintenanceOrderView::from).toList();
    }

    private MaintenanceOrderView transition(UUID orderId, String action, UUID actorId,
            OrderTransition transition) {
        MaintenanceOrder order = existing(orderId);
        MaintenanceOrder.Status before = order.getStatus();
        try {
            transition.apply(order, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new MaintenanceException(e.getMessage(), e);
        }
        record(order, action, "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + order.getStatus() + "\"}", actorId);
        return MaintenanceOrderView.from(order);
    }

    private MaintenanceOrder existing(UUID orderId) {
        if (orderId == null) {
            throw new MaintenanceException("order id is required");
        }
        return orders.findById(orderId)
                .orElseThrow(() -> new MaintenanceException("maintenance order not found"));
    }

    private void record(MaintenanceOrder order, String action, String before, String after,
            UUID actorId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action,
                "MAINTENANCE_ORDER", order.getId(), order.getPropertyId(), before, after, null,
                null));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @FunctionalInterface
    private interface OrderTransition {
        void apply(MaintenanceOrder order, Instant now);
    }
}
