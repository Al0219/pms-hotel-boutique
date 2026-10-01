package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.MaintenanceOrder;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * BD3 maintenance order operations (Fase 9).
 *
 * No REST contract is implied. Reads take an explicit
 * {@code AuthorizedPropertyScope} (C2).
 */
public interface MaintenanceService {

    MaintenanceOrderView openOrder(@Valid OpenOrderCommand command);

    MaintenanceOrderView startProgress(UUID orderId, UUID actorId);

    MaintenanceOrderView resolve(UUID orderId, UUID actorId);

    MaintenanceOrderView cancel(UUID orderId, UUID actorId);

    MaintenanceOrderView reopen(UUID orderId, UUID actorId);

    MaintenanceOrderView assign(UUID orderId, UUID assigneeId, UUID actorId);

    MaintenanceOrderView linkOutage(UUID orderId, UUID oooRecordId, UUID actorId);

    MaintenanceOrderView get(UUID orderId);

    List<MaintenanceOrderView> listByScope(AuthorizedPropertyScope scope);

    record OpenOrderCommand(
            @NotNull UUID propertyId,
            @NotBlank @Size(max = 160) String title,
            @Size(max = 1000) String description,
            MaintenanceOrder.Priority priority,
            UUID roomId,
            UUID reportedBy) {
    }

    record MaintenanceOrderView(UUID id, UUID propertyId, UUID roomId, UUID oooRecordId,
            String title, String description, MaintenanceOrder.Priority priority,
            MaintenanceOrder.Status status, UUID createdBy, UUID assignedTo, Instant resolvedAt,
            Instant createdAt, Instant updatedAt) {

        static MaintenanceOrderView from(MaintenanceOrder order) {
            return new MaintenanceOrderView(order.getId(), order.getPropertyId(), order.getRoomId(),
                    order.getOooRecordId(), order.getTitle(), order.getDescription(), order.getPriority(),
                    order.getStatus(), order.getCreatedBy(), order.getAssignedTo(),
                    order.getResolvedAt(), order.getCreatedAt(), order.getUpdatedAt());
        }
    }
}
