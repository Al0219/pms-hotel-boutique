package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.LocalOperationRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class LocalOperationServiceImpl implements LocalOperationService {
    private final LocalOperationRepository operations;
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final AuditService audit;

    public LocalOperationServiceImpl(LocalOperationRepository operations, StaffAuthService sessions,
            StaffAuthorizationService authorization, PropertyScopeResolver scopes, AuditService audit) {
        this.operations = operations;
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.audit = audit;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OperationReceipt execute(StaffPrincipal principal, UUID propertyId,
            OperationDefinition definition, LocalOperationRequest request,
            Function<OperationContext, UUID> persistence) {
        Objects.requireNonNull(definition, "definition");
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(persistence, "persistence");
        Integer isolation = TransactionSynchronizationManager.getCurrentTransactionIsolationLevel();
        if (TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                || (isolation != null && isolation != Isolation.READ_COMMITTED.value())) {
            throw new IllegalStateException("local operations require a writable READ_COMMITTED transaction");
        }
        if (!operations.isReadCommitted()) {
            throw new IllegalStateException("local operations require a writable READ_COMMITTED transaction");
        }
        if (principal == null) { throw new StaffAuthenticationException(); }
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission(definition.requiredPermission())) {
            throw new AccessDeniedException("the active Staff session cannot execute this operation");
        }
        var scope = scopes.resolveProperty(snapshot, propertyId);
        String fingerprint = request.fingerprint(definition);
        operations.lock(active.staffUserId(), propertyId, definition.name(), request);
        var previous = operations.find(active.staffUserId(), propertyId, definition.name(), request.key());
        if (previous.isPresent()) {
            if (!previous.get().fingerprint().equals(fingerprint)) {
                throw new LocalOperationConflictException();
            }
            return previous.get().receipt();
        }
        UUID operationId = UUID.randomUUID();
        UUID resultId = Objects.requireNonNull(
                persistence.apply(new OperationContext(operationId, active.staffUserId(), scope)),
                "local persistence must return a result id");
        var receipt = new OperationReceipt(operationId, propertyId, active.staffUserId(),
                definition.name(), resultId, Instant.now().truncatedTo(ChronoUnit.MICROS));
        operations.insert(receipt, definition, request, fingerprint);
        audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,
                active.staffUserId(), "LOCAL_OPERATION_COMPLETED", "LOCAL_OPERATION", operationId,
                propertyId, null, "{\"operation\":\"" + definition.name() + "\",\"resultId\":\""
                        + resultId + "\"}", null, operationId));
        return receipt;
    }
}
