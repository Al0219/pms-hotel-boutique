package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.*;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.shared.money.*;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;
import static com.pms.hotelboutique.backend.modules.reservations.application.StaffCancellationModels.*;

@Service
public class StaffReservationCancellationService {
    private static final long MAX_MINOR = 9_007_199_254_740_991L;
    private final StaffReservationReadService access;
    private final StaffAuthorizationService authorization;
    private final LocalOperationService operations;
    private final FolioTransactionGuard guard;
    private final ReservationRepository reservations;
    private final ReservationStayRepository stays;
    private final FolioRepository folios;
    private final FolioMovementRepository movements;
    private final StaffCancellationRepository history;
    private final StaffFolioService finance;
    private final AuditService audit;
    private final EntityManager entities;
    private final ObjectMapper json;

    public StaffReservationCancellationService(StaffReservationReadService access, StaffAuthorizationService authorization,
            LocalOperationService operations, FolioTransactionGuard guard, ReservationRepository reservations,
            ReservationStayRepository stays, FolioRepository folios, FolioMovementRepository movements,
            StaffCancellationRepository history, StaffFolioService finance, AuditService audit,
            EntityManager entities, ObjectMapper json) {
        this.access=access; this.authorization=authorization; this.operations=operations; this.guard=guard;
        this.reservations=reservations; this.stays=stays; this.folios=folios; this.movements=movements;
        this.history=history; this.finance=finance; this.audit=audit; this.entities=entities; this.json=json;
    }

    private AuthorizedPropertyScope authorize(StaffPrincipal principal, UUID property) {
        var scope=access.authorize(principal,property);
        if (!authorization.resolve(principal.staffUserId()).hasPermission("FOLIO_PAYMENT_OPERATE"))
            throw new AccessDeniedException("Financial cancellation access denied");
        return scope;
    }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public Preview preview(StaffPrincipal principal, UUID property, UUID reservationId) {
        var scope=authorize(principal,property);
        var reservation=reservations.findByIdInScope(scope,reservationId)
                .orElseThrow(() -> new ReservationQueryException("Reservation not found"));
        var children=stays.findByReservation_IdAndPropertyId(reservationId,property);
        Result completed=reservation.getStatus()==Reservation.Status.CANCELLED
                ? history.completed(property,reservationId,null).map(row -> result(property,reservationId,row)).orElse(null) : null;
        try {
            var plan=plan(reservation,children);
            return new Preview(property,reservationId,reservation.getConfirmationCode(),POLICY,10,true,null,
                    plan.fingerprint(),children.size(),plan.financial(),null);
        } catch (Conflict blocked) {
            return new Preview(property,reservationId,reservation.getConfirmationCode(),POLICY,10,false,
                    blocked.code(),null,children.size(),null,completed);
        }
    }

    @Transactional
    public Result cancel(StaffPrincipal principal, UUID property, UUID reservationId, String key,
            String fingerprint, String reason) {
        authorize(principal,property);
        if (reservationId==null || fingerprint==null || !fingerprint.matches("[a-f0-9]{64}")
                || reason==null || reason.isBlank() || reason.length()>255 || reason.indexOf('\0')>=0
                || !StandardCharsets.UTF_8.newEncoder().canEncode(reason)) throw new IllegalArgumentException("Invalid cancellation request");
        String normalizedReason=reason.trim();
        var receipt=operations.execute(principal,property,
                new LocalOperationService.OperationDefinition(OPERATION,"RESERVATION_MANAGE"),
                new LocalOperationRequest(key,1,Map.of("reservationId",reservationId.toString(),
                        "fingerprint",fingerprint,"reason",normalizedReason)),context -> {
            // Same order as check-in/check-out and all reservation-linked folio writers.
            guard.lock(property,reservationId);
            var reservation=reservations.lockByIdInScope(context.scope(),reservationId)
                    .orElseThrow(() -> new ReservationQueryException("Reservation not found"));
            entities.refresh(reservation);
            var children=new ArrayList<>(stays.findByReservation_IdAndPropertyId(reservationId,property));
            children.sort(Comparator.comparing(s -> s.getId().toString()));
            for (var child:children) {
                var locked=stays.lockInScope(context.scope(),child.getId()).orElseThrow(() -> new Conflict("STALE_PREVIEW"));
                entities.refresh(locked);
            }
            var plan=plan(reservation,children);
            if (!plan.fingerprint().equals(fingerprint)) throw new Conflict("STALE_PREVIEW");
            var compensation=finance.postReversal(principal,property,plan.financial().folioId(),plan.charge().getId(),
                    new FolioService.ReversalReason(normalizedReason));
            UUID penaltyId=null;
            if (plan.financial().penaltyMinor()>0) {
                var charge=finance.postCharge(principal,property,plan.financial().folioId(),new FolioService.MovementAmount(
                        new MonetaryAmount(new MinorUnits(plan.financial().penaltyMinor()),
                                Currency.getInstance(plan.financial().currency())),
                        "Penalización por cancelación 10% — "+reservation.getConfirmationCode()));
                penaltyId=charge.id();
            }
            Instant now=Instant.now();
            for (var child:children) {
                child.cancel(now); // Keep physical room and dates as history; no housekeeping mutation.
                audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,context.actorId(),
                        "RESERVATION_STAY_CANCELLED","RESERVATION_STAY",child.getId(),property,
                        "{\"status\":\"RESERVED\"}","{\"status\":\"CANCELLED\"}",normalizedReason,context.operationId()));
            }
            String previous=reservation.getStatus().name();
            reservation.cancel(now);
            var snapshot=new Snapshot(POLICY,children.size(),plan.financial(),plan.charge().getId(),compensation.id(),penaltyId);
            var event=audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,
                    context.actorId(),ACTION,"RESERVATION",reservationId,property,
                    json.writeValueAsString(Map.of("status",previous)),json.writeValueAsString(snapshot),normalizedReason,context.operationId()));
            entities.flush();
            return event.id();
        });
        return result(property,reservationId,history.completed(property,reservationId,receipt.operationId())
                .orElseThrow(() -> new IllegalStateException("Missing cancellation receipt")));
    }

    private Plan plan(Reservation reservation, List<ReservationStay> children) {
        UUID property=reservation.getPropertyId(), id=reservation.getId();
        if (reservation.getStatus()==Reservation.Status.CANCELLED) throw new Conflict("ALREADY_CANCELLED");
        if (children.isEmpty() || children.stream().anyMatch(s -> s.getStatus()!=ReservationStay.Status.RESERVED))
            throw new Conflict("STAY_NOT_RESERVED");
        if (reservation.getGroupId()!=null || reservation.getRoomBlockId()!=null || history.hasForeignLinks(property,id))
            throw new Conflict("UNSUPPORTED_RESERVATION");
        var linked=folios.findByReservation_IdAndPropertyId(id,property);
        if (linked.size()!=1 || !history.hasCreationProof(property,id)) throw new Conflict("FINANCIAL_REVIEW_REQUIRED");
        var folio=linked.getFirst();
        if (folio.getType()!=Folio.Type.GUEST || folio.getStatus()!=Folio.Status.OPEN
                || !folio.getCurrency().equals(reservation.getCurrency())) throw new Conflict("FINANCIAL_REVIEW_REQUIRED");
        var ledger=movements.findByFolio_IdOrderByCreatedAtAsc(folio.getId());
        var charges=ledger.stream().filter(m -> m.getKind()==FolioMovement.Kind.CHARGE).toList();
        // Both supported creation flows atomically post exactly one initial lodging charge.
        // A second charge or any adjustment is ambiguous: never classify by description or current rate.
        if (charges.size()!=1 || ledger.stream().anyMatch(m -> m.getKind()==FolioMovement.Kind.ADJUSTMENT
                || m.getReverses()!=null || !m.getCurrency().equals(folio.getCurrency())))
            throw new Conflict("FINANCIAL_REVIEW_REQUIRED");
        try {
            var original=charges.getFirst();
            long base=original.getAmountMinor(), paid=0;
            if (base<=0 || base>MAX_MINOR) throw new ArithmeticException();
            for (var movement:ledger) if (movement.getKind()==FolioMovement.Kind.PAYMENT) {
                if (movement.getAmountMinor()>=0) throw new ArithmeticException();
                paid=Math.addExact(paid,Math.negateExact(movement.getAmountMinor()));
            }
            if (paid>MAX_MINOR) throw new ArithmeticException();
            var financial=calculate(folio.getId(),folio.getCurrency(),base,paid);
            var fields=new ArrayList<String>();
            Collections.addAll(fields,POLICY,id.toString(),reservation.getStatus().name(),reservation.getUpdatedAt().toString(),
                    folio.getId().toString(),folio.getStatus().name(),folio.getCurrency());
            children.stream().sorted(Comparator.comparing(s -> s.getId().toString())).forEach(s -> {
                Collections.addAll(fields,s.getId().toString(),s.getStatus().name(),s.getUpdatedAt().toString(),
                        Objects.toString(s.getRoomId(),"null"),s.getArrival().toString(),s.getDeparture().toString());
            });
            ledger.stream().sorted(Comparator.comparing(m -> m.getId().toString())).forEach(m ->
                    Collections.addAll(fields,m.getId().toString(),m.getKind().name(),Long.toString(m.getAmountMinor())));
            return new Plan(original,financial,HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(json.writeValueAsBytes(fields))));
        } catch (ArithmeticException error) { throw new Conflict("FINANCIAL_REVIEW_REQUIRED"); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }

    private Result result(UUID property, UUID reservation, StaffCancellationRepository.Stored stored) {
        var snapshot=json.readValue(stored.snapshot(),Snapshot.class);
        if (!POLICY.equals(snapshot.policyCode()) || snapshot.financial()==null)
            throw new IllegalStateException("Invalid cancellation receipt");
        return new Result(stored.operationId(),property,reservation,"CANCELLED",snapshot.policyCode(),stored.completedAt(),
                snapshot.staysCancelled(),snapshot.financial(),stored.reason());
    }
    static Finance calculate(UUID folio,String currency,long base,long paid) {
        if (base<=0 || base>MAX_MINOR || paid<0 || paid>MAX_MINOR) throw new Conflict("FINANCIAL_REVIEW_REQUIRED");
        long penalty=BigDecimal.valueOf(base).divide(BigDecimal.TEN,0,RoundingMode.HALF_UP).longValueExact();
        long balance=Math.subtractExact(penalty,paid);
        return new Finance(folio,currency,base,paid,penalty,balance,Math.max(0,balance),Math.max(0,-balance));
    }
    private record Plan(FolioMovement charge, Finance financial, String fingerprint) { }
    public static class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) { super(code); this.code=code; }
        public String code() { return code; }
    }
}
