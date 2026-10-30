package com.pms.hotelboutique.backend.modules.guestauth;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.TestInstance;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.Map;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** MockMvc with real Guest/Staff security and an isolated disposable PostgreSQL schema. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class TransferRealIntegrationTests {
    private static final String SCHEMA = "transfers_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql",
                () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @AfterAll
    void removeOwnedSchema() { jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE"); }

    private static final String PATH = "/api/v1/guest-auth/account/reservations";
    private static final UUID PROPERTY = UUID.fromString("3032709f-a48b-300b-b860-1110bc6f1f13");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired ObjectMapper json;
    @Autowired com.pms.hotelboutique.backend.modules.operations.application.TransferRequestService transfers;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    private GuestPrincipal guest;
    private UUID reservation, stay;
    private LocalDate date;
    @BeforeEach void setup() {
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) SELECT ?,organization_id,'TRANSFER-DEMO','Hotel Boutique Demo','America/Guatemala','GTQ','ACTIVE',now(),now() FROM properties LIMIT 1 ON CONFLICT(id) DO NOTHING",PROPERTY);
        guest = account(); date = LocalDate.now(java.time.ZoneId.of("America/Guatemala")).plusDays(1);
        UUID p = profile(null, "Housekeeping", "Fixture", null);
        reservation = reservation(p, "CONFIRMED"); stay = stay(reservation, date, "IN_HOUSE"); link(guest, reservation, p);
        UUID folio=UUID.randomUUID();jdbc.update("INSERT INTO folios(id,property_id,type,status,reservation_id,currency,created_at,updated_at) VALUES (?,?,'GUEST','OPEN',?,'GTQ',now(),now())",folio,PROPERTY,reservation);
        jdbc.update("INSERT INTO folio_movements(id,folio_id,kind,amount_minor,currency,description,created_at) VALUES (?,?,'CHARGE',10000,'GTQ','Alojamiento',now())",UUID.randomUUID(),folio);
    }
    private String path() { return detail(reservation, stay) + "/transfer-requests"; }
    private Map<String,Object> body(){return Map.of("serviceDate",date.toString(),"deliveryTime","09:00","originKey","place-hotel","destinationKey","place-airport","passengers",2,"notes","  Recoger en recepción  ");}
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder create(String key, Object body) throws Exception {
        return post(path()).header("Authorization", bearer(guest)).header("Idempotency-Key", key)
            .contentType("application/json").content(json.writeValueAsString(body));
    }


    private tools.jackson.databind.JsonNode open() throws Exception {
        return json.readTree(mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    private String item(tools.jackson.databind.JsonNode row) { return path()+"/"+row.path("id").asText(); }
    private Map<String,Object> editBody(tools.jackson.databind.JsonNode row,String notes){var input=new java.util.HashMap<String,Object>(body());input.put("expectedUpdatedAt",row.path("updatedAt").asText());input.put("notes",notes);return input;}
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder cancel(tools.jackson.databind.JsonNode row) throws Exception {
        return post(item(row)+"/cancel").header("Authorization",bearer(guest)).contentType("application/json")
            .content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText())));
    }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder edit(tools.jackson.databind.JsonNode row,Object body) throws Exception {
        return put(item(row)).header("Authorization",bearer(guest)).contentType("application/json").content(json.writeValueAsString(body));
    }
    private int audit(tools.jackson.databind.JsonNode row,String action) { return jdbc.queryForObject("select count(*) from reservation_audit_events where entity_id=? and action=?",Integer.class,UUID.fromString(row.path("id").asText()),action); }
    private StaffPrincipal operator(String role) {
        UUID id=UUID.randomUUID(),session=UUID.randomUUID();UUID org=jdbc.queryForObject("select organization_id from properties where id=?",UUID.class,PROPERTY);
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'synthetic',?,'ACTIVE',now(),now())",id,id.toString(),id+"@example.test",role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,org,role);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,org,PROPERTY);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        return new StaffPrincipal(id,session,id.toString(),role);
    }
    private String staffRoute() { return "/api/v1/properties/"+PROPERTY+"/service-requests/transfers"; }
    private String token(StaffPrincipal p) { return "Bearer "+staffJwt.issue(p,Instant.now()); }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder transition(StaffPrincipal p,tools.jackson.databind.JsonNode row,String target) throws Exception {
        return put(staffRoute()+"/"+row.path("id").asText()+"/status").header("Authorization",token(p)).contentType("application/json")
            .content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText(),"targetStatus",target)));
    }

    @Test void bothDirectionsPersistPricedEstimatesWithoutPostingBeforeDone() throws Exception {
        var catalog=json.readTree(mvc.perform(get(detail(reservation,stay)+"/transfer-catalog").header("Authorization",bearer(guest))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());assertEquals(5,catalog.size());
        int movements=jdbc.queryForObject("select count(*) from folio_movements",Integer.class);
        var row=open();assertEquals("place-hotel",row.path("items").get(0).path("origin").path("key").asText());
        var inbound=new java.util.HashMap<String,Object>(body());inbound.put("originKey","place-centro");inbound.put("destinationKey","place-hotel");
        mvc.perform(create(UUID.randomUUID().toString(),inbound)).andExpect(status().isCreated());
        assertEquals(2,json.readTree(mvc.perform(get(path()).header("Authorization",bearer(guest))).andReturn().getResponse().getContentAsString()).size());
        assertEquals(movements,jdbc.queryForObject("select count(*) from folio_movements",Integer.class));
        assertEquals(guest.guestAccountId(),jdbc.queryForObject("select guest_account_id from transfer_requests where id=?",UUID.class,UUID.fromString(row.path("id").asText())));
    }
    @Test void invalidRoutesPassengersDatesAndUnsupportedPropertiesAreRejected() throws Exception {
        for(var pair:Map.of("passengers",4,"originKey","place-airport","destinationKey","unknown","deliveryTime","25:00","serviceDate",date.plusDays(4).toString(),"price",10).entrySet()){
          var input=new java.util.HashMap<String,Object>(body());input.put(pair.getKey(),pair.getValue());mvc.perform(create(UUID.randomUUID().toString(),input)).andExpect(status().isBadRequest());
        }
        var foreign=UUID.randomUUID();var org=jdbc.queryForObject("select organization_id from properties where id=?",UUID.class,PROPERTY);
        jdbc.update("insert into properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) values (?,?,?,'Unsupported hotel','America/Guatemala','GTQ','ACTIVE',now(),now())",foreign,org,foreign.toString().substring(0,8));
        assertEquals(0,transfers.catalog(guest,reservation,stay).stream().filter(p->p.key().equals("unknown")).count());
        // No catalog is provisioned for arbitrary properties; direct resolution also fails closed.
        UUID otherReservation=UUID.randomUUID(),otherStay=UUID.randomUUID(),type=UUID.randomUUID();UUID profile=jdbc.queryForObject("select booking_guest_id from reservations where id=?",UUID.class,reservation);
        jdbc.update("INSERT INTO reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,?,'CONFIRMED','GTQ','WEB_DIRECTA',now(),now())",otherReservation,foreign,profile,otherReservation.toString().substring(0,16));
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,'Other')",type,foreign,type.toString());
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'IN_HOUSE',now(),now())",otherStay,otherReservation,foreign,type,date,date.plusDays(2));
        UUID challenge=UUID.randomUUID();jdbc.update("INSERT INTO reservation_link_challenges(id,guest_account_id,guest_session_id,reservation_id,property_id,booking_guest_profile_id,confirmation_fingerprint,status,attempt_count,issued_at,expires_at,consumed_at) VALUES (?,?,?,?,?,?,'synthetic','CONSUMED',0,now(),now()+interval '10 minutes',now())",challenge,guest.guestAccountId(),guest.sessionId(),otherReservation,foreign,profile);
        jdbc.update("INSERT INTO guest_reservation_links(reservation_id,guest_account_id,property_id,challenge_id,linked_at) VALUES (?,?,?,?,now())",otherReservation,guest.guestAccountId(),foreign,challenge);
        assertEquals(0,transfers.catalog(guest,otherReservation,otherStay).size());
        mvc.perform(post(detail(otherReservation,otherStay)+"/transfer-requests").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(body()))).andExpect(status().isBadRequest());
    }
    @Test void editsCancellationStaleVersionsAndHistoricalRead() throws Exception {
        var row=open();var updated=json.readTree(mvc.perform(edit(row,editBody(row,"Cambio"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(cancel(updated)).andExpect(status().isOk());mvc.perform(cancel(updated)).andExpect(status().isOk());
        assertEquals(1,jdbc.queryForObject("select count(*) from transfer_requests where stay_id=?",Integer.class,stay));assertEquals(1,audit(row,"TRANSFER_CANCELLED"));
    }
    @Test void concurrentCreationAndLostResponseReplayHaveOneIdentity() throws Exception {
        String key=UUID.randomUUID().toString();var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
          var a=pool.submit(()->{gate.await();return mvc.perform(create(key,body())).andReturn().getResponse();});var b=pool.submit(()->{gate.await();return mvc.perform(create(key,body())).andReturn().getResponse();});gate.countDown();var x=a.get(30,TimeUnit.SECONDS);var y=b.get(30,TimeUnit.SECONDS);
          assertEquals(java.util.Set.of(200,201),java.util.Set.of(x.getStatus(),y.getStatus()));assertEquals(json.readTree(x.getContentAsString()).path("id"),json.readTree(y.getContentAsString()).path("id"));
        }
        mvc.perform(create(key,body())).andExpect(status().isOk());var other=new java.util.HashMap<String,Object>(body());other.put("passengers",3);mvc.perform(create(key,other)).andExpect(status().isConflict());
        assertEquals(1,jdbc.queryForObject("select count(*) from transfer_requests where stay_id=?",Integer.class,stay));
    }
    @Test void guestOwnershipStaffPermissionsAndLifecycle() throws Exception {
        var row=open();mvc.perform(get(path())).andExpect(status().isUnauthorized());
        var outsider=account();mvc.perform(get(path()).header("Authorization",bearer(outsider))).andExpect(status().isNotFound());
        mvc.perform(put(item(row)).header("Authorization",bearer(outsider)).contentType("application/json").content(json.writeValueAsString(editBody(row,"forged")))).andExpect(status().isNotFound());
        var manager=operator("OPERACIONES");var inProgress=json.readTree(mvc.perform(transition(manager,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(transition(manager,inProgress,"DONE")).andExpect(status().isOk());
        mvc.perform(get(staffRoute()).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
        mvc.perform(get(staffRoute()).header("Authorization",token(operator("RECEPCION")))).andExpect(status().isOk());
        mvc.perform(transition(operator("RECEPCION"),row,"IN_PROGRESS")).andExpect(status().isForbidden());
    }
    @Test void pendingCheckoutBlocksNewTransfersButExistingRequestsCanBeResolved() throws Exception {
        var row=open();
        var state=json.readTree(mvc.perform(get(detail(reservation,stay)+"/journey/state").header("Authorization",bearer(guest))).andReturn().getResponse().getContentAsString());
        // Legacy pending checkout created before the stricter financial gate: existing service stays resolvable.
        jdbc.update("INSERT INTO stay_journey_requests(id,property_id,reservation_id,stay_id,guest_account_id,kind,status,request_key,expected_stay_updated_at) VALUES(?,?,?,?,?,'CHECK_OUT','OPEN',?,?)",UUID.randomUUID(),PROPERTY,reservation,stay,guest.guestAccountId(),UUID.randomUUID().toString(),java.sql.Timestamp.from(Instant.parse(state.path("stay").path("updatedAt").asText())));
        mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());mvc.perform(transition(operator("OPERACIONES"),row,"IN_PROGRESS")).andExpect(status().isOk());
        assertEquals(1,jdbc.queryForObject("select count(*) from transfer_requests where stay_id=?",Integer.class,stay));
    }
    @Test void openApiExposesOnlyScopedTransferOperationsAndNoPricingInputs() throws Exception {
        var doc=json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("guest-bff-or-native",doc.path("paths").path("/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/transfer-requests").path("post").path("x-audience").asText());
        assertTrue(doc.path("paths").has("/api/v1/properties/{propertyId}/service-requests/transfers/{requestId}/status"));assertFalse(doc.path("components").path("schemas").path("TransferOrderInput").path("properties").has("price"));
    }
    @Test void concurrentCreateAndConcurrentEditsHaveOneWinnerWithoutDuplicateSideEffects() throws Exception {
        var key=UUID.randomUUID().toString();var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{gate.await();return mvc.perform(create(key,body())).andReturn().getResponse().getStatus();});
            var b=pool.submit(()->{gate.await();return mvc.perform(create(key,body())).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(java.util.Set.of(200,201),java.util.Set.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS)));
        }
        var row=json.readTree(mvc.perform(get(path()).header("Authorization",bearer(guest))).andReturn().getResponse().getContentAsString()).get(0);var gate2=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{gate2.await();return mvc.perform(edit(row,editBody(row,"A"))).andReturn().getResponse().getStatus();});
            var b=pool.submit(()->{gate2.await();return mvc.perform(edit(row,editBody(row,"B"))).andReturn().getResponse().getStatus();});gate2.countDown();assertEquals(java.util.Set.of(200,409),java.util.Set.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS)));
        }
        assertEquals(1,jdbc.queryForObject("select count(*) from transfer_requests where stay_id=?",Integer.class,stay));assertEquals(1,audit(row,"TRANSFER_EDITED"));
    }
    @Test void concurrentStaffStartAndGuestCancelSerializeWithoutDoubleTransition() throws Exception {
        var row=open();var ops=operator("OPERACIONES");var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
          var a=pool.submit(()->{gate.await();return mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getStatus();});
          var b=pool.submit(()->{gate.await();return mvc.perform(cancel(row)).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(java.util.Set.of(200,409),java.util.Set.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS)));
        }
        assertEquals(1,audit(row,"REQUEST_STARTED")+audit(row,"TRANSFER_CANCELLED"));
    }
    @Test void checkoutAndTransferCreationSerializeAndDoNotCreateRejectedCharges()throws Exception {
        mvc.perform(post(detail(reservation,stay)+"/journey/payments").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content("{\"amount\":\"100.00\",\"currency\":\"GTQ\",\"instrumentToken\":\"demo_visa_approved\"}")).andExpect(status().isOk());
        var state=json.readTree(mvc.perform(get(detail(reservation,stay)+"/journey/state").header("Authorization",bearer(guest))).andReturn().getResponse().getContentAsString());
        var payload=json.writeValueAsString(Map.of("kind","CHECK_OUT","expectedUpdatedAt",state.path("stay").path("updatedAt").asText()));var gate=new CountDownLatch(1);
        int before=jdbc.queryForObject("select count(*) from folio_movements",Integer.class);
        try(var pool=Executors.newFixedThreadPool(2)){
          var out=pool.submit(()->{gate.await();return mvc.perform(post(detail(reservation,stay)+"/journey/requests").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(payload)).andReturn().getResponse().getStatus();});
          var transfer=pool.submit(()->{gate.await();return mvc.perform(create(UUID.randomUUID().toString(),body())).andReturn().getResponse().getStatus();});gate.countDown();int checkout=out.get(30,TimeUnit.SECONDS),result=transfer.get(30,TimeUnit.SECONDS);assertTrue(checkout==200&&result==409||checkout==409&&result==201);
          if(checkout==200)mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
          assertEquals(result==201?1:0,jdbc.queryForObject("select count(*) from transfer_requests where stay_id=?",Integer.class,stay));
        }
        assertEquals(before,jdbc.queryForObject("select count(*) from folio_movements",Integer.class));
    }
    @Test void rejectsFractionalPassengersAndUsesPersistedCutoff()throws Exception {
        var fractional=new java.util.HashMap<String,Object>(body());fractional.put("passengers",1.5);mvc.perform(create(UUID.randomUUID().toString(),fractional)).andExpect(status().isBadRequest());
        var row=open();jdbc.update("update service_requests set due_at=now()+interval '25 minutes' where id=?",UUID.fromString(row.path("id").asText()));mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(edit(row,editBody(row,"Too late"))).andExpect(status().isConflict());
        assertEquals(0,audit(row,"TRANSFER_CANCELLED"));assertEquals(0,audit(row,"TRANSFER_EDITED"));
    }
    private String detail(UUID r, UUID s) { return PATH+"/"+r+"/stays/"+s; }
    private String bearer(GuestPrincipal p) { return "Bearer " + jwt.issue(p, Instant.now()); }
    private GuestPrincipal account() {
        UUID id=UUID.randomUUID(), session=UUID.randomUUID(); String email=id+"@example.test";
        jdbc.update("INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES (?,?,now(),'ACTIVE',now(),now())", id,email);
        jdbc.update("INSERT INTO guest_auth_sessions(id,guest_account_id,status,expires_at,created_at) VALUES (?,?,'ACTIVE',now()+interval '1 day',now())", session,id);
        return new GuestPrincipal(id,session,email);
    }
    private UUID profile(UUID account, String first, String last, String language) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO guest_profiles(id,guest_account_id,first_name,last_name,email,preferred_language,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'ACTIVE',now(),now())", id,account,first,last,guest.email(),language);
        return id;
    }
    private UUID reservation(UUID profile, String status) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,?,?,'GTQ','WEB_DIRECTA',now(),now())",id,PROPERTY,profile,id.toString().substring(0,16),status);
        return id;
    }
    private UUID stay(UUID reservation, LocalDate arrival, String status) {
        UUID type=UUID.randomUUID(), id=UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,'Synthetic QA type')",type,PROPERTY,type.toString());
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,now(),now())",id,reservation,PROPERTY,type,arrival,arrival.plusDays(2),status);
        return id;
    }
    private void link(GuestPrincipal owner, UUID reservation, UUID profile) {
        UUID challenge=UUID.randomUUID();
        jdbc.update("INSERT INTO reservation_link_challenges(id,guest_account_id,guest_session_id,reservation_id,property_id,booking_guest_profile_id,confirmation_fingerprint,status,attempt_count,issued_at,expires_at,consumed_at) VALUES (?,?,?,?,?,?,'synthetic','CONSUMED',0,now(),now()+interval '10 minutes',now())",challenge,owner.guestAccountId(),owner.sessionId(),reservation,PROPERTY,profile);
        jdbc.update("INSERT INTO guest_reservation_links(reservation_id,guest_account_id,property_id,challenge_id,linked_at) VALUES (?,?,?,?,now())",reservation,owner.guestAccountId(),PROPERTY,challenge);
    }
}
