package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

/** Real ATS and catalog, deterministic transaction-local fixtures; no production seeds. */
@SpringBootTest
@Transactional
class PublicAvailabilityServiceIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired PublicAvailabilityService service;

    private final UUID property = id("property");
    private final LocalDate arrival = LocalDate.of(2026, 11, 1);
    private final LocalDate departure = arrival.plusDays(3);

    @BeforeEach
    void fixtures() { insertProperty(property, "A2-PUBLIC", "GTQ"); }

    @Test
    void returnsRealIdentityAndPricingWithoutChangingInventoryOrAssigningRooms() {
        UUID type = insertType(property, "STD", "Standard actual", 2);
        var result = search(1);
        assertEquals(property, result.propertyId());
        assertEquals(arrival, result.arrival());
        assertEquals(departure, result.departure());
        assertEquals("GTQ", result.currency());
        assertEquals(List.of(new PublicAvailabilityOfferView(type, "STD", "Standard actual",
                "DEMO_STANDARD", "DEMO_STANDARD", 2, 65000L, 195000L)), result.offers());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM rooms WHERE property_id=?", Integer.class, property));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM reservation_stays WHERE property_id=?", Integer.class, property));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM rate_plans WHERE property_id=?", Integer.class, property));
    }

    @ParameterizedTest
    @CsvSource({"0,1,false", "1,2,false", "2,2,true", "3,2,true"})
    void includesOnlyTypesWithEnoughRealUnits(int physicalRooms, int requested, boolean included) {
        insertType(property, "KING", "King", physicalRooms);
        var offers = search(requested).offers();
        assertEquals(included ? 1 : 0, offers.size());
        if (included) { assertEquals(physicalRooms, offers.getFirst().availableUnits()); }
    }

    @Test
    void usesEachRateAndStableCodeOrderWhileExcludingOtherProperties() {
        insertType(property, "SUITE", "A Suite", 1);
        insertType(property, "STD", "Z Standard", 1);
        insertType(property, "DLX", "M Deluxe", 1);
        UUID foreignProperty = id("other-property");
        insertProperty(foreignProperty, "A2-OTHER", "GTQ");
        UUID foreign = insertType(foreignProperty, "UNCONFIGURED", "Other property", 5);
        var result = search(1);
        assertEquals(List.of("DLX", "STD", "SUITE"), result.offers().stream()
                .map(PublicAvailabilityOfferView::roomTypeCode).toList());
        assertEquals(List.of(85000L, 65000L, 120000L), result.offers().stream()
                .map(PublicAvailabilityOfferView::nightlyRateMinor).toList());
        assertEquals(List.of(255000L, 195000L, 360000L), result.offers().stream()
                .map(PublicAvailabilityOfferView::totalMinor).toList());
        assertEquals(List.of("DEMO_DELUXE", "DEMO_STANDARD", "DEMO_SUITE"), result.offers().stream()
                .map(PublicAvailabilityOfferView::ratePlanCode).toList());
        assertTrue(result.offers().stream().noneMatch(offer -> offer.roomTypeId().equals(foreign)));
        assertEquals(result, search(1));
    }

    @Test
    void composesRestrictiveWholeRangeAtsWithMultiNightPolicyTotal() {
        UUID type = insertType(property, "DLX", "Deluxe", 4);
        outage(type, arrival.plusDays(1), departure);
        stay(type, "middle", arrival.plusDays(1), arrival.plusDays(2));
        stay(type, "last-one", arrival.plusDays(2), departure);
        stay(type, "last-two", arrival.plusDays(2), departure);
        var offer = search(1).offers().getFirst();
        assertEquals(1, offer.availableUnits()); // Nights have 4, 2, 1 vendible rooms.
        assertEquals(255000L, offer.totalMinor());
        assertTrue(search(2).offers().isEmpty());
    }

    @Test
    void outOfOrderRoomDiscountsPublicOffer() {
        UUID type = insertType(property, "TWIN", "Twin", 2);
        outage(type, arrival, departure);
        assertEquals(1, search(1).offers().getFirst().availableUnits());
    }

    @Test
    void consumingStayDiscountsPublicOfferWithoutPhysicalAssignment() {
        UUID type = insertType(property, "SUITE", "Suite", 2);
        stay(type, "reserved", arrival, departure);
        assertEquals(1, search(1).offers().getFirst().availableUnits());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM reservation_stays WHERE property_id=? AND room_id IS NULL",
                Integer.class, property));
    }

    @Test
    void missingPropertyFailsExplicitly() {
        assertThrows(PropertyNotFoundException.class, () -> service.search(
                new PublicAvailabilityQuery(id("missing-property"), arrival, departure, 1)));
    }

    @Test
    void sellableTypeWithoutDemoRateFailsExplicitly() {
        insertType(property, "UNCONFIGURED", "Suite", 1);
        var error = assertThrows(DemoRateNotConfiguredException.class, () -> search(1));
        assertEquals("DEMO_RATE_NOT_CONFIGURED: UNCONFIGURED", error.getMessage());
    }

    @Test
    void emptyRealCatalogProducesNoOffers() {
        assertTrue(search(1).offers().isEmpty());
        assertEquals("GTQ", search(1).currency());
    }

    @Test
    void incompatiblePropertyCurrencyFailsEvenWithEmptyCatalog() {
        jdbc.update("UPDATE properties SET currency='USD' WHERE id=?", property);
        var error = assertThrows(IllegalStateException.class, () -> search(1));
        assertTrue(error.getMessage().startsWith("DEMO_CURRENCY_MISMATCH:"));
    }

    private PublicAvailabilityView search(int rooms) {
        return service.search(new PublicAvailabilityQuery(property, arrival, departure, rooms));
    }

    private void insertProperty(UUID propertyId, String code, String currency) {
        UUID organization = jdbc.queryForObject("SELECT id FROM organizations WHERE code='HOTEL_BOUTIQUE'", UUID.class);
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?,?,'America/Guatemala',?,'ACTIVE',now(),now())",
                propertyId, organization, code, "Public test property", currency);
    }

    private UUID insertType(UUID propertyId, String code, String name, int rooms) {
        UUID type = id(propertyId + "/" + code);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,?)", type, propertyId, code, name);
        for (int i = 0; i < rooms; i++) {
            jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",
                    id(type + "/room/" + i), propertyId, type, code + "-" + i);
        }
        return type;
    }

    private void outage(UUID type, LocalDate start, LocalDate end) {
        UUID actor = id("actor");
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                + "VALUES (?,'a2-public-qa','a2-public@example.test','unused-test-hash','SUPER_ADMIN','ACTIVE',now(),now())", actor);
        jdbc.update("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by) "
                + "VALUES (?,?,?,'OOO',?,?,'A2 fixture',?)", id("outage"), property, id(type + "/room/0"), start, end, actor);
    }

    private void stay(UUID type, String label, LocalDate start, LocalDate end) {
        UUID reservation = id("reservation/" + label);
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) "
                + "VALUES (?,?,?,'CONFIRMED','GTQ','TEST',now(),now())", reservation, property, "A2-" + label);
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) "
                + "VALUES (?,?,?,?,?,?,'RESERVED',now(),now())", id("stay/" + label), reservation, property, type, start, end);
    }

    private static UUID id(String label) {
        return UUID.nameUUIDFromBytes(("public-a2/" + label).getBytes(StandardCharsets.UTF_8));
    }
}
