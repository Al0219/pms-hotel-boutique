package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/** Executes participating local writes once; external effects are outside this port. */
public interface LocalOperationService {

    OperationReceipt execute(StaffPrincipal principal, UUID propertyId,
            OperationDefinition definition, LocalOperationRequest request,
            Function<OperationContext, UUID> persistence);

    /** Server-owned policy: never build this definition from client-supplied permissions. */
    record OperationDefinition(String name, String requiredPermission) {
        private static final Set<String> PERMISSIONS = Set.of(
                "FOLIO_PAYMENT_OPERATE", "PAYMENT_REFUND_VOID", "RESERVATION_MANAGE");

        public OperationDefinition {
            if (name == null || !name.matches("[A-Z][A-Z0-9_]{1,63}")
                    || requiredPermission == null || !PERMISSIONS.contains(requiredPermission)) {
                throw new IllegalArgumentException("a local operation needs a server name and existing C2 permission");
            }
        }
    }

    record OperationContext(UUID operationId, UUID actorId, AuthorizedPropertyScope scope) { }

    record OperationReceipt(UUID operationId, UUID propertyId, UUID staffUserId,
            String operationName, UUID resultId, Instant completedAt) { }
}
