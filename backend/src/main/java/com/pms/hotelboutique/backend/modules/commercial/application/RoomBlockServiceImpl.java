package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.EventGroup;
import com.pms.hotelboutique.backend.modules.commercial.domain.RoomBlock;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.EventGroupRepository;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.RoomBlockRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioView;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class RoomBlockServiceImpl implements RoomBlockService {

    private static final EnumSet<ReservationStay.Status> CONSUMING =
            EnumSet.of(ReservationStay.Status.RESERVED, ReservationStay.Status.IN_HOUSE);

    private final RoomBlockRepository blocks;
    private final EventGroupRepository groups;
    private final ReservationRepository reservations;
    private final ReservationStayRepository stays;
    private final FolioRepository folios;
    private final AuditService audit;

    public RoomBlockServiceImpl(RoomBlockRepository blocks, EventGroupRepository groups,
            ReservationRepository reservations, ReservationStayRepository stays,
            FolioRepository folios, AuditService audit) {
        this.blocks = blocks;
        this.groups = groups;
        this.reservations = reservations;
        this.stays = stays;
        this.folios = folios;
        this.audit = audit;
    }

    @Override
    public RoomBlockView hold(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, @Valid CreateRoomBlockCommand command, UUID actorId) {
        CommercialAuthorization.requireManage(authorization);
        AuthorizedPropertyScope resolved = EventGroupServiceImpl.authorizedScope(scope);
        EventGroup group = groups.findByIdInScope(resolved, command.groupId())
                .orElseThrow(() -> new CommercialException("group not found"));
        if (group.getStatus() == EventGroup.Status.CLOSED) {
            throw new CommercialException("cannot hold units for a CLOSED group");
        }
        if (!group.getPropertyId().equals(command.propertyId())) {
            throw new CommercialException("block property must match the group property");
        }
        // Room type existence is enforced by the composite FK to room_types
        // (BD2-owned table, no parallel lookup kept here).
        Instant now = Instant.now();
        RoomBlock block;
        try {
            block = new RoomBlock(UUID.randomUUID(), group.getId(), command.propertyId(),
                    command.roomTypeId(), command.arrival(), command.departure(),
                    command.unitsHeld(), now);
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        RoomBlock saved = blocks.save(block);
        record(saved.getPropertyId(), "BLOCK_HELD", "ROOM_BLOCK", saved.getId(),
                null, String.valueOf(saved.getUnitsHeld()), actorId, null);
        return RoomBlockView.from(saved, 0);
    }

    @Override
    public RoomBlockView release(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID blockId, UUID actorId) {
        RoomBlock block = scoped(authorization, scope, blockId);
        RoomBlock.Status before = block.getStatus();
        block.release(Instant.now());
        record(block.getPropertyId(), "BLOCK_RELEASED", "ROOM_BLOCK", block.getId(),
                String.valueOf(before), String.valueOf(block.getStatus()), actorId, null);
        return RoomBlockView.from(block, pickupOf(block));
    }

    @Override
    public RoomBlockView reactivate(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID blockId, UUID actorId) {
        RoomBlock block = scoped(authorization, scope, blockId);
        RoomBlock.Status before = block.getStatus();
        block.reactivate(Instant.now());
        record(block.getPropertyId(), "BLOCK_REACTIVATED", "ROOM_BLOCK", block.getId(),
                String.valueOf(before), String.valueOf(block.getStatus()), actorId, null);
        return RoomBlockView.from(block, pickupOf(block));
    }

    @Override
    @Transactional(readOnly = true)
    public RoomBlockView get(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID blockId) {
        RoomBlock block = scoped(authorization, scope, blockId);
        return RoomBlockView.from(block, pickupOf(block));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomBlockView> listByGroup(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId) {
        CommercialAuthorization.requireManage(authorization);
        AuthorizedPropertyScope resolved = EventGroupServiceImpl.authorizedScope(scope);
        if (groupId == null) {
            throw new CommercialException("group id is required");
        }
        groups.findByIdInScope(resolved, groupId)
                .orElseThrow(() -> new CommercialException("group not found"));
        return blocks.findByGroupInScope(resolved, groupId).stream()
                .map(block -> RoomBlockView.from(block, pickupOf(block))).toList();
    }

    @Override
    public void linkReservation(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID reservationId, UUID blockId, UUID actorId) {
        RoomBlock block = scoped(authorization, scope, blockId);
        if (!block.acceptsLinks()) {
            throw new CommercialException("block is RELEASED and accepts no new links");
        }
        if (reservationId == null) {
            throw new CommercialException("reservation id is required");
        }
        Reservation reservation = reservations.findById(reservationId)
                .orElseThrow(() -> new CommercialException("reservation not found"));
        if (!reservation.getPropertyId().equals(block.getPropertyId())) {
            throw new AccessDeniedException("reservation belongs to another property");
        }
        if (reservation.getStatus() == Reservation.Status.CANCELLED) {
            throw new CommercialException("a CANCELLED reservation cannot join a block");
        }
        if (reservation.getGroupId() != null && !reservation.getGroupId().equals(block.getGroupId())) {
            throw new CommercialException("reservation already belongs to another group");
        }
        try {
            reservation.linkBlock(block.getGroupId(), block.getId());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        record(reservation.getPropertyId(), "RESERVATION_LINKED_TO_BLOCK", "RESERVATION",
                reservation.getId(), null, block.getId().toString(), actorId, null);
    }

    @Override
    public void unlinkReservation(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID reservationId, UUID actorId) {
        CommercialAuthorization.requireManage(authorization);
        EventGroupServiceImpl.authorizedScope(scope);
        if (reservationId == null) {
            throw new CommercialException("reservation id is required");
        }
        Reservation reservation = reservations.findById(reservationId)
                .orElseThrow(() -> new CommercialException("reservation not found"));
        if (!scope.propertyIds().contains(reservation.getPropertyId())) {
            throw new CommercialException("not authorized for this property");
        }
        reservation.unlinkBlock();
        record(reservation.getPropertyId(), "RESERVATION_UNLINKED_FROM_BLOCK", "RESERVATION",
                reservation.getId(), null, null, actorId, null);
    }

    @Override
    public FolioView openMasterFolio(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId, String currency, UUID actorId) {
        CommercialAuthorization.requireManage(authorization);
        AuthorizedPropertyScope resolved = EventGroupServiceImpl.authorizedScope(scope);
        if (groupId == null) {
            throw new CommercialException("group id is required");
        }
        requireCurrency(currency);
        EventGroup group = groups.findByIdInScope(resolved, groupId)
                .orElseThrow(() -> new CommercialException("group not found"));
        if (group.getStatus() != EventGroup.Status.DEFINITE
                && group.getStatus() != EventGroup.Status.IN_HOUSE) {
            throw new CommercialException("master folio requires a DEFINITE group");
        }
        boolean exists = folios.findByGroupId(group.getId()).stream()
                .anyMatch(folio -> folio.getType() == Folio.Type.MASTER);
        if (exists) {
            throw new CommercialException("group already has a master folio");
        }
        Instant now = Instant.now();
        Folio folio = new Folio(UUID.randomUUID(), group.getPropertyId(),
                Folio.Type.MASTER, currency, now);
        folio.linkGroup(group.getId());
        folio.labelHolder(group.getName());
        Folio saved = folios.save(folio);
        record(group.getPropertyId(), "GROUP_MASTER_FOLIO_OPENED", "EVENT_GROUP", group.getId(),
                null, saved.getId().toString(), actorId, null);
        return FolioView.from(saved);
    }

    private RoomBlock scoped(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID blockId) {
        CommercialAuthorization.requireManage(authorization);
        if (blockId == null) {
            throw new CommercialException("block id is required");
        }
        AuthorizedPropertyScope resolved = EventGroupServiceImpl.authorizedScope(scope);
        return blocks.findByIdInScope(resolved, blockId)
                .orElseThrow(() -> new CommercialException("block not found"));
    }

    private int pickupOf(RoomBlock block) {
        int pickup = 0;
        for (Reservation reservation : reservations.findByRoomBlockId(block.getId())) {
            if (reservation.getStatus() == Reservation.Status.CANCELLED) {
                continue;
            }
            for (ReservationStay stay : stays.findByReservation_Id(reservation.getId())) {
                if (CONSUMING.contains(stay.getStatus())) {
                    pickup++;
                }
            }
        }
        return pickup;
    }

    private void record(UUID propertyId, String action, String entityType, UUID entityId,
            String before, String after, UUID actorId, UUID correlationId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, entityType,
                entityId, propertyId, before, after, null, correlationId));
    }

    private static void requireCurrency(String currency) {
        if (currency == null || !currency.matches("^[A-Z]{3}$")) {
            throw new CommercialException("currency must be an ISO 4217 code");
        }
    }
}
