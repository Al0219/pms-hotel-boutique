package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional
class StaffReservationCreationIntegrationTests {
    private static final String SCHEMA = "staff_creation_" + UUID.randomUUID().toString().replace("-", "");
    @DynamicPropertySource static void schema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }
    private static final UUID ORG = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final String ROUTE = "/api/v1/reservations";
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired StaffJwtService jwt;
    @Autowired StaffReservationCreationService creation; @Autowired ObjectMapper json;
    @Autowired PlatformTransactionManager manager; @Autowired EntityManager entities;
    private UUID property, type; private StaffPrincipal actor;
    private LocalDate arrival, departure;

    @BeforeEach void setup() {
        assertEquals(SCHEMA, jdbc.queryForObject("select current_schema()", String.class));
        property = UUID.randomUUID(); type = UUID.randomUUID();
        arrival = LocalDate.now(ZoneId.of("America/Guatemala")); departure = arrival.plusDays(2);
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) VALUES (?,?,'Staff booking',?,'America/Guatemala','GTQ','ACTIVE',now(),now())", property, ORG, property.toString());
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STANDARD','Standard')", type, property);
        for (int n = 0; n < 2; n++) jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)", UUID.randomUUID(), property, type, "R"+n);
        actor = staff("RECEPCION", property);
    }

    @ParameterizedTest @ValueSource(strings = {"RECEPCION", "SUPER_ADMIN", "GERENCIA"})
    void createsConfirmedMultiStayWithOneUnpaidChargeAndTrustedStaffAudit(String role) throws Exception {
        actor = staff(role, property);
        int accounts = jdbc.queryForObject("SELECT count(*) FROM guest_accounts", Integer.class);
        mvc.perform(get(ROUTE+"/creation-options").param("propertyId", property.toString()).param("arrival", arrival.toString())
                .param("departure", departure.toString()).param("rooms", "2").header("Authorization", bearer(actor)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.options[0].availableRooms").value(2))
                .andExpect(jsonPath("$.options[0].totalMinor").value(260000)).andExpect(jsonPath("$.options[0].capacity").doesNotExist());
        var receipt = create("staff-success-key", request(2));
        UUID id = receipt.reservationId();
        assertEquals("CONFIRMED", scalar("SELECT status FROM reservations WHERE id=?", id));
        assertEquals("WALK_IN", scalar("SELECT source_channel FROM reservations WHERE id=?", id));
        assertEquals(2, count("SELECT count(*) FROM reservation_stays WHERE reservation_id=? AND status='RESERVED' AND room_id IS NULL", id));
        assertEquals(1, count("SELECT count(*) FROM folios WHERE reservation_id=?", id));
        assertEquals(1, count("SELECT count(*) FROM folio_movements m JOIN folios f ON f.id=m.folio_id WHERE f.reservation_id=? AND m.kind='CHARGE' AND m.amount_minor=260000 AND m.created_by=?", id, actor.staffUserId()));
        assertEquals(0, count("SELECT count(*) FROM folio_movements m JOIN folios f ON f.id=m.folio_id WHERE f.reservation_id=? AND m.kind='PAYMENT'", id));
        assertEquals(accounts, jdbc.queryForObject("SELECT count(*) FROM guest_accounts", Integer.class));
        assertEquals(6, count("SELECT count(*) FROM reservation_audit_events WHERE property_id=? AND actor_type='STAFF' AND actor_id=? AND action IN ('RESERVATION_CREATED','RESERVATION_STAY_ADDED','RESERVATION_CONFIRMED','FOLIO_OPENED','FOLIO_MOVEMENT_POSTED')", property, actor.staffUserId()));
        assertEquals("+502 5555 5555", jdbc.queryForObject("SELECT g.phone FROM guest_profiles g JOIN reservations r ON r.booking_guest_id=g.id WHERE r.id=?", String.class, id));
        mvc.perform(get(ROUTE+"/"+id).param("propertyId",property.toString()).header("Authorization",bearer(actor)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.responsibleGuest.firstName").value("Walk"))
                .andExpect(jsonPath("$.stays.length()").value(2));
    }

    @Test void replayRemainsIdenticalAfterStateChangesWithoutDuplicatingAnyEffect() {
        var request = request(1); var first = creation.create(actor, property, "stable-replay-key", request);
        jdbc.update("UPDATE reservations SET status='CANCELLED' WHERE id=?", first.reservationId());
        var replay = creation.create(actor, property, "stable-replay-key", request);
        assertEquals(first, replay);
        assertEquals(1, count("SELECT count(*) FROM reservations WHERE property_id=?",property));
        assertEquals(1, count("SELECT count(*) FROM folios WHERE reservation_id=?",first.reservationId()));
        assertEquals(1, count("SELECT count(*) FROM local_operation_receipts WHERE property_id=?",property));
        var other = new StaffReservationCreationService.Request(arrival, departure.plusDays(1),1,type,"DEMO_STANDARD","GTQ",195000L,request.guest(),null);
        assertThrows(LocalOperationConflictException.class,()->creation.create(actor,property,"stable-replay-key",other));
    }

    @Test void revalidatesPriceAfterAFormerQuoteAndRejectsClientAmounts() throws Exception {
        mvc.perform(command("invalid-price-key", request(1)).content(body(request(1)).replace("130000","1")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PRICE_CHANGED"));
        assertEquals(0,count("SELECT count(*) FROM reservations WHERE property_id=?",property));
        creation.quote(actor,property,arrival,departure,1);
        jdbc.update("UPDATE room_types SET code='DELUXE' WHERE id=?",type);
        mvc.perform(command("stale-price-key",request(1))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PRICE_CHANGED"));
        assertEquals(0,count("SELECT count(*) FROM guest_profiles WHERE property_id=?",property));
    }

    @Test void exhaustedDemandRollsBackWithoutProfilesLedgerOrReceipt() throws Exception {
        mvc.perform(command("exhausted-key",request(3))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NO_AVAILABILITY"));
        for(String table:List.of("reservations","guest_profiles","folios","local_operation_receipts"))
            assertEquals(0,count("SELECT count(*) FROM "+table+" WHERE property_id=?",property));
    }

    @Test void neverTruncatesFractionalRoomsOrMoneyOrCoercesDateArrays() throws Exception {
        String raw=body(request(1));
        for(String invalid:List.of(raw.replace("\"rooms\":1","\"rooms\":1.5"),
                raw.replace("130000","130000.5"),raw.replace("\""+arrival+"\"","[2035,1,1]")))
            mvc.perform(command("exact-input-key",request(1)).content(invalid)).andExpect(status().isBadRequest());
        assertEquals(0,count("SELECT count(*) FROM reservations WHERE property_id=?",property));
    }

    @Test void enforcesScopePermissionsSessionAndStrictInput() throws Exception {
        mvc.perform(command("missing-session",request(1)).with(r->{r.removeHeader("Authorization");r.addHeader("Authorization","Bearer invalid");return r;})).andExpect(status().isUnauthorized());
        var denied=staff("OPERACIONES",property);
        mvc.perform(command("denied-role-key",request(1)).with(r->{r.removeHeader("Authorization");r.addHeader("Authorization",bearer(denied));return r;})).andExpect(status().isForbidden());
        UUID otherProperty=UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) VALUES (?,?,'Other',?,'UTC','GTQ','ACTIVE',now(),now())",otherProperty,ORG,otherProperty.toString());
        var other=staff("RECEPCION",otherProperty);
        mvc.perform(command("denied-scope-key",request(1)).with(r->{r.removeHeader("Authorization");r.addHeader("Authorization",bearer(other));return r;})).andExpect(status().isForbidden());
        mvc.perform(command("unknown-field-key",request(1)).content(body(request(1)).replaceFirst("\\{","{\"actorId\":\""+UUID.randomUUID()+"\","))).andExpect(status().isBadRequest());
        mvc.perform(command("unknown-query-key",request(1)).param("scope","ALL_PROPERTIES")).andExpect(status().isBadRequest());
        mvc.perform(command("past-date-key",new StaffReservationCreationService.Request(arrival.minusDays(1),departure,1,type,"DEMO_STANDARD","GTQ",130000L,request(1).guest(),null))).andExpect(status().isBadRequest());
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?",actor.sessionId());
        mvc.perform(command("revoked-session-key",request(1))).andExpect(status().isUnauthorized());
        assertEquals(0,count("SELECT count(*) FROM reservations WHERE property_id=?",property));
    }

    @Test void dirtyRoomCannotBeAssignedToTheCreatedReservation() throws Exception {
        var created=create("dirty-assignment-key",request(1));
        UUID stay=jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=?",UUID.class,created.reservationId());
        UUID room=jdbc.queryForObject("SELECT id FROM rooms WHERE property_id=? ORDER BY code LIMIT 1",UUID.class,property);
        jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,'DIRTY',false,now(),now())",UUID.randomUUID(),property,room);
        mvc.perform(put(ROUTE+"/"+created.reservationId()+"/stays/"+stay+"/room-assignment").param("propertyId",property.toString())
                .header("Authorization",bearer(actor)).contentType(MediaType.APPLICATION_JSON).content("{\"room_id\":\""+room+"\"}"))
                .andExpect(status().isConflict());
        assertNull(jdbc.queryForObject("SELECT room_id FROM reservation_stays WHERE id=?",UUID.class,stay));
    }

    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void outerRollbackIncludesBookingChargeAuditAndReceipt() {
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(manager).executeWithoutResult(tx->{
            creation.create(actor,property,"outer-rollback-key",request(1));entities.flush();throw new IllegalStateException("rollback");
        }));
        for(String table:List.of("reservations","guest_profiles","folios","local_operation_receipts","reservation_audit_events"))
            assertEquals(0,count("SELECT count(*) FROM "+table+" WHERE property_id=?",property));
    }

    @Test void walkInCanBeAssignedAndCheckedInButUnpaidLodgingBlocksCheckout() throws Exception {
        var created=create("walk-in-full-flow",request(1));
        UUID stay=jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=?",UUID.class,created.reservationId());
        UUID room=jdbc.queryForObject("SELECT id FROM rooms WHERE property_id=? ORDER BY code LIMIT 1",UUID.class,property);
        jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,'INSPECTED',false,now(),now())",UUID.randomUUID(),property,room);
        String route=ROUTE+"/"+created.reservationId()+"/stays/"+stay;
        mvc.perform(put(route+"/room-assignment").param("propertyId",property.toString()).header("Authorization",bearer(actor))
                .contentType(MediaType.APPLICATION_JSON).content("{\"room_id\":\""+room+"\"}")).andExpect(status().isOk());
        entities.flush(); entities.clear();
        var detail=json.readTree(mvc.perform(get(ROUTE+"/"+created.reservationId()).param("propertyId",property.toString())
                .header("Authorization",bearer(actor))).andReturn().getResponse().getContentAsString());
        String expected=detail.path("stays").get(0).path("updatedAt").asText();
        mvc.perform(post(route+"/check-in").param("propertyId",property.toString()).header("Authorization",bearer(actor))
                .header("Idempotency-Key","walk-in-arrival-key").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("expectedStatus","RESERVED","expectedUpdatedAt",expected,"expectedRoomId",room))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_HOUSE"));
        entities.flush(); entities.clear();
        detail=json.readTree(mvc.perform(get(ROUTE+"/"+created.reservationId()).param("propertyId",property.toString())
                .header("Authorization",bearer(actor))).andReturn().getResponse().getContentAsString());
        expected=detail.path("stays").get(0).path("updatedAt").asText();
        mvc.perform(post(route+"/check-out").param("propertyId",property.toString()).header("Authorization",bearer(actor))
                .header("Idempotency-Key","walk-in-departure-key").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("expectedStatus","IN_HOUSE","expectedUpdatedAt",expected,"expectedRoomId",room))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OUTSTANDING_BALANCE"));
        assertEquals("IN_HOUSE",scalar("SELECT status FROM reservation_stays WHERE id=?",stay));
        assertEquals("INSPECTED",scalar("SELECT status FROM hk_room_states WHERE room_id=?",room));
    }

    @ParameterizedTest @ValueSource(booleans={true,false})
    @Transactional(propagation=Propagation.NOT_SUPPORTED)
    void serializesDuplicateRequestsAndCompetingLastInventory(boolean duplicate) throws Exception {
        var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            List<Future<UUID>> futures=new ArrayList<>();
            for(int n=0;n<2;n++){final int index=n;futures.add(pool.submit(()->{
                assertTrue(start.await(15,TimeUnit.SECONDS));
                try{return creation.create(actor,property,duplicate?"concurrent-same-key":"concurrent-key-"+index,request(2)).reservationId();}
                catch(StaffReservationCreationService.Failure error){assertEquals("NO_AVAILABILITY",error.code());return null;}
            }));}
            start.countDown();var one=futures.get(0).get(30,TimeUnit.SECONDS);var two=futures.get(1).get(30,TimeUnit.SECONDS);
            if(duplicate)assertEquals(one,two);else assertTrue((one==null)!=(two==null));
            assertEquals(1,count("SELECT count(*) FROM reservations WHERE property_id=?",property));
            assertEquals(1,count("SELECT count(*) FROM local_operation_receipts WHERE property_id=?",property));
            assertEquals(1,count("SELECT count(*) FROM folios WHERE property_id=?",property));
        } finally{pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    private StaffReservationCreationService.Request request(int rooms){return new StaffReservationCreationService.Request(
            arrival,departure,rooms,type,"DEMO_STANDARD","GTQ",130000L*rooms,
            new StaffReservationCreationService.Guest("Walk","In","walk@example.test","+502 5555 5555"),"Llegada a recepción");}
    private String body(StaffReservationCreationService.Request request){return json.writeValueAsString(request);}
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder command(String key,StaffReservationCreationService.Request request){return post(ROUTE).param("propertyId",property.toString()).header("Authorization",bearer(actor))
            .header("Idempotency-Key",key).contentType(MediaType.APPLICATION_JSON).content(body(request));}
    private StaffReservationCreationService.Created create(String key,StaffReservationCreationService.Request request)throws Exception{
        String body=mvc.perform(command(key,request)).andExpect(status().isCreated()).andExpect(header().string("Cache-Control","private, no-store"))
                .andReturn().getResponse().getContentAsString();return json.readValue(body,StaffReservationCreationService.Created.class);}
    private int count(String sql,Object...args){return jdbc.queryForObject(sql,Integer.class,args);}
    private String scalar(String sql,Object...args){return jdbc.queryForObject(sql,String.class,args);}
    private String bearer(StaffPrincipal principal){return "Bearer "+jwt.issue(principal,Instant.now());}
    private StaffPrincipal staff(String role,UUID allowedProperty){
        UUID id=UUID.randomUUID(),session=UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'unused',?,'ACTIVE',now(),now())",id,id.toString(),id+"@example.test",role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,ORG,role);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,ORG,allowedProperty);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        return new StaffPrincipal(id,session,id.toString(),role);
    }
}
