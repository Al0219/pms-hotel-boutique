package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.RewardLedgerEntry;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.RewardLedgerRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.GuestProfileRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class RewardServiceImpl implements RewardService {

    private final RewardLedgerRepository ledger;
    private final GuestProfileRepository profiles;
    private final ReservationStayRepository stays;
    private final AuditService audit;

    public RewardServiceImpl(RewardLedgerRepository ledger, GuestProfileRepository profiles,
            ReservationStayRepository stays, AuditService audit) {
        this.ledger = ledger;
        this.profiles = profiles;
        this.stays = stays;
        this.audit = audit;
    }

    @Override
    public RewardCommands.RewardEntryView earn(StaffAuthorizationSnapshot authorization,
            @Valid RewardCommands.EarnRewardCommand command, UUID actorId) {
        requireSuperAdmin(authorization);
        requirePropertyMembership(authorization, command.propertyId());
        requireProfile(command.guestProfileId());
        ReservationStay stay = stays.findById(command.stayId())
                .orElseThrow(() -> new CommercialException("stay not found"));
        if (stay.getStatus() != ReservationStay.Status.CHECKED_OUT) {
            throw new CommercialException("EARN requires a CHECKED_OUT stay");
        }
        if (stay.getReservation().getStatus() == Reservation.Status.CANCELLED) {
            throw new CommercialException("cancelled reservations never earn");
        }
        if (!stay.getPropertyId().equals(command.propertyId())) {
            throw new AccessDeniedException("stay belongs to another property");
        }
        if (!ledger.findByStayIdAndKind(stay.getId(), RewardLedgerEntry.Kind.EARN).isEmpty()) {
            throw new CommercialException("stay already earned");
        }
        RewardLedgerEntry entry = newEntry(command.guestProfileId(), command.propertyId(),
                RewardLedgerEntry.Kind.EARN, command.points(), stay.getId(), null,
                command.reason(), actorId);
        try {
            // Backstop: the partial unique index rejects concurrent double EARN.
            // A violation here still aborts the tx (documented PostgreSQL behavior).
            RewardLedgerEntry saved = ledger.saveAndFlush(entry);
            record(saved, "REWARD_EARNED", actorId, null);
            return RewardCommands.RewardEntryView.from(saved);
        } catch (DataIntegrityViolationException e) {
            throw new CommercialException("stay already earned", e);
        }
    }

    @Override
    public RewardCommands.RewardEntryView redeem(StaffAuthorizationSnapshot authorization,
            @Valid RewardCommands.SpendRewardCommand command, UUID actorId) {
        return spend(authorization, command, RewardLedgerEntry.Kind.REDEEM, actorId,
                "REWARD_REDEEMED");
    }

    @Override
    public RewardCommands.RewardEntryView expire(StaffAuthorizationSnapshot authorization,
            @Valid RewardCommands.SpendRewardCommand command, UUID actorId) {
        return spend(authorization, command, RewardLedgerEntry.Kind.EXPIRE, actorId,
                "REWARD_EXPIRED");
    }

    @Override
    public RewardCommands.RewardEntryView reverse(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope,
            @Valid RewardCommands.ReverseRewardCommand command, UUID actorId) {
        requireSuperAdmin(authorization);
        AuthorizedPropertyScope resolved = authorizedScope(scope);
        RewardLedgerEntry original = ledger.findById(command.originalEntryId())
                .orElseThrow(() -> new CommercialException("original entry not found"));
        if (!original.getGuestProfileId().equals(command.guestProfileId())) {
            throw new CommercialException("original entry belongs to another profile");
        }
        if (!resolved.propertyIds().contains(original.getPropertyId())) {
            throw new CommercialException("not authorized for this property");
        }
        if (!ledger.findByReversesId(original.getId()).isEmpty()) {
            throw new CommercialException("entry was already reversed");
        }
        RewardLedgerEntry reversal = newEntry(original.getGuestProfileId(),
                original.getPropertyId(), RewardLedgerEntry.Kind.REVERSE, -original.getPoints(),
                original.getStayId(), original.getId(), command.reason(), actorId);
        RewardLedgerEntry saved = ledger.save(reversal);
        record(saved, "REWARD_REVERSED", actorId, null);
        return RewardCommands.RewardEntryView.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public long balanceOf(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID guestProfileId) {
        requireSuperAdmin(authorization);
        AuthorizedPropertyScope resolved = authorizedScope(scope);
        requireProfile(guestProfileId);
        return ledger.balanceOf(guestProfileId, resolved.propertyIds());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RewardCommands.RewardEntryView> historyOf(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID guestProfileId) {
        requireSuperAdmin(authorization);
        AuthorizedPropertyScope resolved = authorizedScope(scope);
        requireProfile(guestProfileId);
        return ledger.findByProfileInScope(guestProfileId, resolved.propertyIds()).stream()
                .map(RewardCommands.RewardEntryView::from).toList();
    }

    private RewardCommands.RewardEntryView spend(StaffAuthorizationSnapshot authorization,
            RewardCommands.SpendRewardCommand command, RewardLedgerEntry.Kind kind,
            UUID actorId, String action) {
        requireSuperAdmin(authorization);
        requirePropertyMembership(authorization, command.propertyId());
        requireProfile(command.guestProfileId());
        long balance = ledger.balanceOf(command.guestProfileId(),
                java.util.Set.of(command.propertyId()));
        if (balance < command.points()) {
            throw new CommercialException("insufficient reward balance");
        }
        RewardLedgerEntry entry = newEntry(command.guestProfileId(), command.propertyId(), kind,
                -command.points(), null, null, command.reason(), actorId);
        RewardLedgerEntry saved = ledger.save(entry);
        record(saved, action, actorId, null);
        return RewardCommands.RewardEntryView.from(saved);
    }

    private RewardLedgerEntry newEntry(UUID profileId, UUID propertyId,
            RewardLedgerEntry.Kind kind, long points, UUID stayId, UUID reversesId,
            String reason, UUID actorId) {
        try {
            return new RewardLedgerEntry(UUID.randomUUID(), profileId, propertyId, kind, points,
                    stayId, reversesId, reason, actorId, Instant.now());
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
    }

    private void requireProfile(UUID profileId) {
        if (profileId == null) {
            throw new CommercialException("guest profile id is required");
        }
        if (profiles.findById(profileId).isEmpty()) {
            throw new CommercialException("guest profile not found");
        }
    }

    private void record(RewardLedgerEntry entry, String action, UUID actorId,
            UUID correlationId) {
        com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType type =
                actorId == null
                        ? com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType.SYSTEM
                        : com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "REWARD_LEDGER",
                entry.getId(), entry.getPropertyId(), null,
                "{\"kind\":\"" + entry.getKind() + "\",\"points\":" + entry.getPoints() + "}",
                null, correlationId));
    }

    private static void requireSuperAdmin(StaffAuthorizationSnapshot authorization) {
        if (authorization == null || !"SUPER_ADMIN".equals(authorization.roleCode())) {
            // TODO(BD1): migrate to a dedicated B2B_MANAGE permission once BD1
            // owns permission_catalog + role_permissions for commercial base.
            throw new AccessDeniedException("F14 rewards base requires SUPER_ADMIN");
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
}
