package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.inventory.application.*;
import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.PublicBookingPropertyEligibilityRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.shared.money.*;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Contract55: Staff creation, admission and an unpaid initial lodging charge, one transaction. */
@Service
public class StaffReservationCreationService {
    private final StaffReservationReadService access;
    private final PropertyRepository properties;
    private final RoomTypeRepository types;
    private final PublicBookingPropertyEligibilityRepository eligibility;
    private final AvailabilityPort availability;
    private final InventoryAdmissionPort admission;
    private final DemoRatePolicy rates;
    private final LocalOperationService operations;
    private final ReservationBookingService bookings;
    private final ReservationService reservations;
    private final FolioService folios;
    private final AuditService audit;
    private final Validator validator;
    private final EntityManager entities;

    public StaffReservationCreationService(StaffReservationReadService access, PropertyRepository properties,
            RoomTypeRepository types, PublicBookingPropertyEligibilityRepository eligibility,
            AvailabilityPort availability, InventoryAdmissionPort admission, DemoRatePolicy rates,
            LocalOperationService operations, ReservationBookingService bookings, ReservationService reservations,
            FolioService folios, AuditService audit, Validator validator, EntityManager entities) {
        this.access = access; this.properties = properties; this.types = types; this.eligibility = eligibility;
        this.availability = availability; this.admission = admission; this.rates = rates; this.operations = operations;
        this.bookings = bookings; this.reservations = reservations; this.folios = folios; this.audit = audit;
        this.validator = validator; this.entities = entities;
    }

    @Transactional(readOnly = true)
    public Quote quote(StaffPrincipal principal, UUID propertyId, LocalDate arrival, LocalDate departure, int rooms) {
        var scope = access.authorize(principal, propertyId);
        var property = properties.findByIdInScope(scope, propertyId).orElseThrow(() -> fail(404, "PROPERTY_NOT_FOUND"));
        requireProperty(property); requireDates(property, arrival, departure, rooms);
        var dates = new StayDateRange(arrival, departure);
        var options = new ArrayList<Option>();
        for (var type : types.findAllInScope(scope)) {
            try {
                var rate = rates.rateFor(type);
                int ats = availability.calculateATS(propertyId, type.getId(), dates);
                if (ats < rooms) continue;
                long total = total(type, arrival, departure, rooms);
                options.add(new Option(type.getId(), type.getName(), rates.ratePlanCodeFor(type), ats,
                        rate.minorUnits().value(), total));
            } catch (DemoRateNotConfiguredException ignored) {
                // An unconfigured type has no sellable price; never fabricate one from frontend fixtures.
            }
        }
        options.sort(Comparator.comparing(Option::roomTypeName).thenComparing(o -> o.roomTypeId().toString()));
        return new Quote(propertyId, arrival, departure, rooms, ChronoUnit.DAYS.between(arrival, departure),
                property.getCurrency().getCurrencyCode(), List.copyOf(options));
    }

    @Transactional
    public Created create(StaffPrincipal principal, UUID propertyId, String key, Request request) {
        access.authorize(principal, propertyId);
        if (request == null || !validator.validate(request).isEmpty()) throw fail(400, "INVALID_REQUEST");
        var guest = request.guest();
        for (String value : List.of(guest.firstName(), guest.lastName(), guest.email(), guest.phone(),
                request.notes() == null ? "" : request.notes(), request.ratePlanId())) {
            if (!StandardCharsets.UTF_8.newEncoder().canEncode(value) || value.indexOf('\0') >= 0)
                throw fail(400, "INVALID_REQUEST");
        }
        if (guest.phone().replaceAll("\\D", "").length() < 7) throw fail(400, "INVALID_REQUEST");
        var fields = new HashMap<String, String>();
        fields.put("arrival", request.arrival().toString()); fields.put("departure", request.departure().toString());
        fields.put("rooms", request.rooms().toString()); fields.put("roomTypeId", request.roomTypeId().toString());
        fields.put("ratePlanId", request.ratePlanId()); fields.put("currency", request.currency());
        fields.put("totalMinor", request.clientTotalMinor().toString()); fields.put("firstName", guest.firstName());
        fields.put("lastName", guest.lastName()); fields.put("email", guest.email()); fields.put("phone", guest.phone());
        fields.put("notes", request.notes() == null ? "" : request.notes());
        try {
            var receipt = operations.execute(principal, propertyId,
                    new LocalOperationService.OperationDefinition("STAFF_RESERVATION_CREATE", "RESERVATION_MANAGE"),
                    new LocalOperationRequest(key, 1, fields), context -> {
                var property = properties.findByIdInScope(context.scope(), propertyId)
                        .orElseThrow(() -> fail(404, "PROPERTY_NOT_FOUND"));
                requireProperty(property);
                requireDates(property, request.arrival(), request.departure(), request.rooms());
                var type = types.findByIdInScope(context.scope(), request.roomTypeId())
                        .orElseThrow(() -> fail(404, "ROOM_TYPE_NOT_FOUND"));
                return admission.admit(propertyId, List.of(new InventoryDemand(type.getId(),
                        new StayDateRange(request.arrival(), request.departure()), request.rooms())), () -> {
                    var current = eligibility.lock(propertyId).orElseThrow(() -> fail(404, "PROPERTY_NOT_FOUND"));
                    if (!"ACTIVE".equals(current.status())) throw fail(404, "PROPERTY_NOT_FOUND");
                    if (!rates.currency().getCurrencyCode().equals(current.currency())) throw fail(409, "RATE_CONFIGURATION_UNAVAILABLE");
                    entities.refresh(type);
                    long total;
                    try {
                        if (!rates.ratePlanCodeFor(type).equals(request.ratePlanId())) throw fail(409, "PRICE_CHANGED");
                        total = total(type, request.arrival(), request.departure(), request.rooms());
                    } catch (DemoRateNotConfiguredException error) { throw fail(409, "PRICE_CHANGED"); }
                    if (!rates.currency().getCurrencyCode().equals(request.currency()) || total != request.clientTotalMinor())
                        throw fail(409, "PRICE_CHANGED");
                    var stays = new ArrayList<CreateBookingCommand.StayBookingCommand>();
                    for (int n = 0; n < request.rooms(); n++) stays.add(new CreateBookingCommand.StayBookingCommand(
                            type.getId(), null, request.arrival(), request.departure(), List.of()));
                    var booking = bookings.createBookingAsStaff(new CreateBookingCommand(propertyId,
                            new CreateBookingCommand.BookerBooking(null, new CreateGuestProfileCommand(null, propertyId,
                                    guest.firstName(), guest.lastName(), guest.email(), guest.phone(), null, null, null)),
                            request.currency(), "WALK_IN", null, request.notes(), List.copyOf(stays)),
                            context.actorId(), context.operationId());
                    var confirmed = reservations.confirm(booking.reservation().id());
                    var folio = folios.openFolioAsStaff(new FolioService.OpenFolioCommand(propertyId, Folio.Type.GUEST,
                            request.currency(), confirmed.id(), null, "Reserva de recepción"), context.actorId());
                    folios.postCharge(folio.id(), new FolioService.MovementAmount(
                            new MonetaryAmount(new MinorUnits(total), rates.currency()), "Alojamiento de reserva de recepción"), context.actorId());
                    audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,
                            context.actorId(), "RESERVATION_CONFIRMED", "RESERVATION", confirmed.id(), propertyId,
                            "{\"status\":\"PENDING\"}", "{\"status\":\"CONFIRMED\"}", null, context.operationId()));
                    entities.flush();
                    return confirmed.id();
                });
            });
            return new Created(receipt.operationId(), propertyId, receipt.resultId(), receipt.completedAt());
        } catch (InventoryExhaustedException error) { throw fail(409, "NO_AVAILABILITY"); }
    }

    private void requireProperty(Property property) {
        if (property.getStatus() != Property.Status.ACTIVE) throw fail(404, "PROPERTY_NOT_FOUND");
        if (!rates.currency().equals(property.getCurrency())) throw fail(409, "RATE_CONFIGURATION_UNAVAILABLE");
    }

    private static void requireDates(Property property, LocalDate arrival, LocalDate departure, int rooms) {
        if (arrival == null || departure == null || rooms < 1 || arrival.getYear() < 0 || departure.getYear() > 9999
                || !departure.isAfter(arrival) || arrival.isBefore(LocalDate.now(ZoneId.of(property.getTimezone()))))
            throw fail(400, "INVALID_DATE_RANGE");
    }

    private long total(com.pms.hotelboutique.backend.modules.inventory.domain.RoomType type,
            LocalDate arrival, LocalDate departure, int rooms) {
        try {
            long value = Math.multiplyExact(rates.totalFor(type, arrival, departure).minorUnits().value(), rooms);
            if (value <= 0 || value > 9_007_199_254_740_991L) throw fail(400, "INVALID_REQUEST");
            return value;
        } catch (ArithmeticException error) { throw fail(400, "INVALID_REQUEST"); }
    }

    public static Failure fail(int status, String code) { return new Failure(status, code); }
    public static class Failure extends RuntimeException {
        private final int status; private final String code;
        Failure(int status, String code) { super(code); this.status = status; this.code = code; }
        public int status() { return status; } public String code() { return code; }
    }
    @Schema(name = "StaffReservationCreationGuest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record Guest(@NotBlank @Size(max = 80) String firstName, @NotBlank @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Pattern(regexp = "^\\+?[0-9 ()-]{7,32}$") String phone) {
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown guest field"); }
    }
    @Schema(name = "StaffReservationCreationRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record Request(
            @NotNull @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING,
                    pattern = "uuuu-MM-dd", lenient = com.fasterxml.jackson.annotation.OptBoolean.FALSE) LocalDate arrival,
            @NotNull @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING,
                    pattern = "uuuu-MM-dd", lenient = com.fasterxml.jackson.annotation.OptBoolean.FALSE) LocalDate departure,
            @NotNull @Min(1) @tools.jackson.databind.annotation.JsonDeserialize(using = PublicBookingIntegerDeserializers.Quantity.class) Integer rooms,
            @NotNull UUID roomTypeId, @NotBlank @Size(max = 64) String ratePlanId,
            @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
            @NotNull @Min(1) @Max(9_007_199_254_740_991L)
            @tools.jackson.databind.annotation.JsonDeserialize(using = PublicBookingIntegerDeserializers.ClientTotal.class) Long clientTotalMinor,
            @NotNull @Valid Guest guest, @Size(max = 300) @Schema(types = {"string", "null"}) String notes) {
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown booking field"); }
    }
    @Schema(name = "StaffReservationCreationOption")
    public record Option(UUID roomTypeId, String roomTypeName, String ratePlanId,
            int availableRooms, long nightlyMinor, long totalMinor) { }
    @Schema(name = "StaffReservationCreationQuote")
    public record Quote(UUID propertyId, LocalDate arrival, LocalDate departure, int rooms, long nights,
            String currency, List<Option> options) { }
    @Schema(name = "StaffReservationCreationReceipt", description = "Immutable creation receipt, not the reservation's current status or a payment receipt")
    public record Created(UUID operationId, UUID propertyId, UUID reservationId, Instant completedAt) { }
}
