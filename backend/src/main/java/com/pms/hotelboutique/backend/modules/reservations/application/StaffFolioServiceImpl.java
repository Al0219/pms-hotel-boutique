package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.FolioMovement;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioMovementRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class StaffFolioServiceImpl implements StaffFolioService {
    private static final String OPERATE = "FOLIO_PAYMENT_OPERATE";
    private static final String REFUND_VOID = "PAYMENT_REFUND_VOID";

    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final FolioRepository folios;
    private final FolioMovementRepository movements;
    private final FolioService service;

    public StaffFolioServiceImpl(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, FolioRepository folios,
            FolioMovementRepository movements, FolioService service) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.folios = folios;
        this.movements = movements;
        this.service = service;
    }

    @Override
    @Transactional(readOnly = true)
    public FolioView get(StaffPrincipal principal, UUID propertyId, UUID folioId) {
        access(principal, propertyId, folioId);
        return service.get(folioId);
    }

    @Override
    @Transactional(readOnly = true)
    public MonetaryAmount balanceOf(StaffPrincipal principal, UUID propertyId, UUID folioId) {
        access(principal, propertyId, folioId);
        return service.balanceOf(folioId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolioView.MovementView> movementsOf(StaffPrincipal principal, UUID propertyId, UUID folioId) {
        access(principal, propertyId, folioId);
        return service.movementsOf(folioId);
    }

    @Override
    public FolioView.MovementView postCharge(StaffPrincipal principal, UUID propertyId,
            UUID folioId, FolioService.MovementAmount amount) {
        var access = access(principal, propertyId, folioId);
        return service.postCharge(folioId, amount, access.actorId());
    }

    @Override
    public FolioView.MovementView postPayment(StaffPrincipal principal, UUID propertyId,
            UUID folioId, FolioService.MovementAmount amount) {
        var access = access(principal, propertyId, folioId);
        return service.postPayment(folioId, amount, access.actorId());
    }

    @Override
    public FolioView.MovementView postReversal(StaffPrincipal principal, UUID propertyId,
            UUID folioId, UUID originalMovementId, FolioService.ReversalReason reason) {
        var access = access(principal, propertyId, folioId);
        if (originalMovementId == null) {
            throw new FolioException("original movement id is required");
        }
        FolioMovement original = movements.findByIdAndFolio_IdAndFolio_PropertyId(
                originalMovementId, folioId, propertyId)
                .orElseThrow(() -> new FolioException("original movement not found"));
        if (original.getKind() == FolioMovement.Kind.PAYMENT
                && !access.canRefundVoid()) {
            throw new AccessDeniedException("Staff cannot compensate a PAYMENT movement");
        }
        return service.postReversal(folioId, originalMovementId, reason, access.actorId());
    }

    private Access access(StaffPrincipal principal, UUID propertyId, UUID folioId) {
        if (principal == null) {
            throw new StaffAuthenticationException();
        }
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission(OPERATE)) {
            throw new AccessDeniedException("Staff cannot operate folios");
        }
        scopes.resolveProperty(snapshot, propertyId);
        if (folioId == null) {
            throw new FolioException("folio id is required");
        }
        folios.findByIdAndPropertyIdIn(folioId, Set.of(propertyId))
                .orElseThrow(() -> new FolioException("folio not found"));
        return new Access(active.staffUserId(), snapshot.hasPermission(REFUND_VOID));
    }

    private record Access(UUID actorId, boolean canRefundVoid) { }
}
