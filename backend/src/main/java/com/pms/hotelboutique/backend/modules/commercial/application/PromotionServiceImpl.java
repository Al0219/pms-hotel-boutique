package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Promotion;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.PromotionRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class PromotionServiceImpl implements PromotionService {

    private final PromotionRepository promotions;
    private final AuditService audit;

    public PromotionServiceImpl(PromotionRepository promotions, AuditService audit) {
        this.promotions = promotions;
        this.audit = audit;
    }

    @Override
    public PromotionView create(StaffAuthorizationSnapshot authorization,
            @Valid CreatePromotionCommand command, UUID actorId) {
        requireSuperAdmin(authorization);
        requirePropertyMembership(authorization, command.propertyId());
        if (command.validFrom() != null && command.validTo() != null
                && command.validFrom().isAfter(command.validTo())) {
            throw new CommercialException("validFrom must not be after validTo");
        }
        Instant now = Instant.now();
        Promotion promotion;
        try {
            promotion = new Promotion(UUID.randomUUID(), command.propertyId(), command.code(),
                    command.name(), command.priority(), command.stackable(),
                    command.benefitType(), command.benefitValueMinor(), now);
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        promotion.updateRule(command.name(), command.priority(), command.stackable(),
                command.validFrom(), command.validTo(), now);
        Promotion saved = promotions.save(promotion);
        record(saved, "PROMOTION_CREATED", null, "DRAFT", actorId, null);
        return PromotionView.from(saved);
    }

    @Override
    public PromotionView update(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID promotionId,
            @Valid UpdatePromotionCommand command, UUID actorId) {
        Promotion promotion = scoped(authorization, scope, promotionId);
        String before = promotion.getName();
        try {
            promotion.updateRule(command.name(), command.priority(), command.stackable(),
                    command.validFrom(), command.validTo(), Instant.now());
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        record(promotion, "PROMOTION_UPDATED", before, promotion.getName(), actorId, null);
        return PromotionView.from(promotion);
    }

    @Override
    public PromotionView activate(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID promotionId, UUID actorId) {
        return transition(authorization, scope, promotionId, "PROMOTION_ACTIVATED", actorId,
                (promotion, now) -> promotion.activate(now));
    }

    @Override
    public PromotionView pause(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID promotionId, UUID actorId) {
        return transition(authorization, scope, promotionId, "PROMOTION_PAUSED", actorId,
                (promotion, now) -> promotion.pause(now));
    }

    @Override
    public PromotionView expire(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID promotionId, UUID actorId) {
        return transition(authorization, scope, promotionId, "PROMOTION_EXPIRED", actorId,
                (promotion, now) -> promotion.expire(now));
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionView get(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID promotionId) {
        return PromotionView.from(scoped(authorization, scope, promotionId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PromotionView> list(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope) {
        requireSuperAdmin(authorization);
        return promotions.findAllInScope(authorizedScope(scope)).stream()
                .map(PromotionView::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StackView resolveStack(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, LocalDate date, List<UUID> promotionIds) {
        requireSuperAdmin(authorization);
        AuthorizedPropertyScope resolved = authorizedScope(scope);
        if (date == null) {
            throw new CommercialException("date is required");
        }
        List<Promotion> candidates = promotionIds == null ? List.of() : promotionIds.stream()
                .map(id -> promotions.findByIdInScope(resolved, id).orElse(null))
                .filter(promotion -> promotion != null)
                .sorted(Comparator.comparingInt(Promotion::getPriority).reversed()
                        .thenComparing(Promotion::getCode))
                .toList();
        List<PromotionView> winners = new ArrayList<>();
        List<RejectedPromotion> rejected = new ArrayList<>();
        boolean lockedByExclusive = false;
        String locker = null;
        for (Promotion candidate : candidates) {
            if (!candidate.isActiveOn(date)) {
                rejected.add(new RejectedPromotion(candidate.getId(), candidate.getCode(),
                        "not active on date", candidate.getPriority(), null));
                continue;
            }
            if (lockedByExclusive) {
                rejected.add(new RejectedPromotion(candidate.getId(), candidate.getCode(),
                        "conflicts with exclusive winner", candidate.getPriority(), locker));
                continue;
            }
            winners.add(PromotionView.from(candidate));
            if (!candidate.isStackable()) {
                lockedByExclusive = true;
                locker = candidate.getCode();
            }
        }
        return new StackView(List.copyOf(winners), List.copyOf(rejected));
    }

    private PromotionView transition(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID promotionId, String action, UUID actorId,
            PromotionTransition transition) {
        Promotion promotion = scoped(authorization, scope, promotionId);
        Promotion.Status before = promotion.getStatus();
        try {
            transition.apply(promotion, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        record(promotion, action, String.valueOf(before),
                String.valueOf(promotion.getStatus()), actorId, null);
        return PromotionView.from(promotion);
    }

    private Promotion scoped(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID promotionId) {
        requireSuperAdmin(authorization);
        if (promotionId == null) {
            throw new CommercialException("promotion id is required");
        }
        AuthorizedPropertyScope resolved = authorizedScope(scope);
        return promotions.findByIdInScope(resolved, promotionId)
                .orElseThrow(() -> new CommercialException("promotion not found"));
    }

    private void record(Promotion promotion, String action, String before, String after,
            UUID actorId, UUID correlationId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "PROMOTION",
                promotion.getId(), promotion.getPropertyId(), before, after, null, correlationId));
    }

    private static void requireSuperAdmin(StaffAuthorizationSnapshot authorization) {
        if (authorization == null || !"SUPER_ADMIN".equals(authorization.roleCode())) {
            // TODO(BD1): migrate to a dedicated B2B_MANAGE permission once BD1
            // owns permission_catalog + role_permissions for commercial base.
            throw new AccessDeniedException("F14 promotions base requires SUPER_ADMIN");
        }
    }

    private static void requirePropertyMembership(StaffAuthorizationSnapshot authorization,
            UUID propertyId) {
        if (propertyId == null) {
            throw new CommercialException("property id is required");
        }
        boolean allowed = authorization.properties() != null && authorization.properties().stream()
                .anyMatch(property -> property.propertyId().equals(propertyId));
        if (!allowed) {
            throw new AccessDeniedException("The active Staff session is not authorized for this property");
        }
    }

    private static AuthorizedPropertyScope authorizedScope(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new CommercialException("an explicit property scope is required");
        }
        return scope;
    }

    @FunctionalInterface
    private interface PromotionTransition {
        void apply(Promotion promotion, Instant now);
    }
}
