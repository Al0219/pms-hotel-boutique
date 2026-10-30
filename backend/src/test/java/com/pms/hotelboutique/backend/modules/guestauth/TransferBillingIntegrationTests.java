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
class TransferBillingIntegrationTests {
    private static final String SCHEMA = "transfer_billing_" + UUID.randomUUID().toString().replace("-", "");

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
        jdbc.update("update transfer_route_prices set total_minor=5800 where property_id=? and origin_key='place-hotel' and destination_key='place-airport'",PROPERTY);
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


    @Autowired com.pms.hotelboutique.backend.modules.reservations.application.StayJourneyService journey;
    private long balance(){return jdbc.queryForObject("select coalesce(sum(m.amount_minor),0) from folio_movements m join folios f on f.id=m.folio_id where f.reservation_id=?",Long.class,reservation);}
    @Test void backendPriceCannotBeForgedAndPendingEstimateIsOutsideDebt()throws Exception{
        var row=open();assertEquals(5800,row.path("items").get(0).path("totalMinor").asLong());assertEquals(10000,balance());
        var summary=journey.guestSummary(guest,reservation,stay);assertEquals("100.00",summary.balance());assertEquals(1,summary.pendingOrders());assertEquals("58.00",summary.estimatedTransfers().getFirst().amount());
        var payload=new java.util.HashMap<String,Object>(body());payload.put("totalMinor",1);mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());
        jdbc.update("update transfer_route_prices set total_minor=9999 where property_id=? and origin_key='place-hotel' and destination_key='place-airport'",PROPERTY);
        var edited=json.readTree(mvc.perform(edit(row,editBody(row,"Solo notas"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());assertEquals(5800,edited.path("items").get(0).path("totalMinor").asLong());
    }
    @Test void donePostsOneChargeAndDescriptionWithScheduleRouteAndPrice()throws Exception{
        var row=open();var staff=operator("OPERACIONES");var started=json.readTree(mvc.perform(transition(staff,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(transition(staff,started,"DONE")).andExpect(status().isOk());mvc.perform(transition(staff,started,"DONE")).andExpect(status().isOk());
        assertEquals(15800,balance());assertEquals(1,jdbc.queryForObject("select count(*) from transfer_folio_postings where request_id=?",Integer.class,UUID.fromString(row.path("id").asText())));
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("update transfer_folio_postings set movement_id=movement_id where request_id=?",UUID.fromString(row.path("id").asText())));
        var summary=journey.guestSummary(guest,reservation,stay);assertEquals(0,summary.pendingOrders());assertTrue(summary.estimatedTransfers().isEmpty());var charge=summary.movements().stream().filter(m->m.description().startsWith("Traslado")).findFirst().orElseThrow();assertEquals("58.00",charge.amount());assertTrue(charge.description().contains("Hotel a Aeropuerto"));assertTrue(charge.description().contains("09:00"));
        mvc.perform(cancel(started)).andExpect(status().isConflict());
    }
    @Test void concurrentStaffCompletionCannotDuplicateMoney()throws Exception{
        var row=open();var a=operator("OPERACIONES");var b=operator("OPERACIONES");var started=json.readTree(mvc.perform(transition(a,row,"IN_PROGRESS")).andReturn().getResponse().getContentAsString());var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){var first=pool.submit(()->{gate.await();return mvc.perform(transition(a,started,"DONE")).andReturn().getResponse().getStatus();});var second=pool.submit(()->{gate.await();return mvc.perform(transition(b,started,"DONE")).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(200,first.get(30,TimeUnit.SECONDS));assertEquals(200,second.get(30,TimeUnit.SECONDS));}
        assertEquals(15800,balance());assertEquals(1,audit(row,"REQUEST_COMPLETED"));
    }
    @Test void cancelledTransferNeverBecomesDebt()throws Exception{var row=open();mvc.perform(cancel(row)).andExpect(status().isOk());assertEquals(10000,balance());assertEquals(0,journey.guestSummary(guest,reservation,stay).pendingOrders());assertTrue(journey.guestSummary(guest,reservation,stay).estimatedTransfers().isEmpty());}
    private UUID roomForCheckout(){UUID type=jdbc.queryForObject("select room_type_id from reservation_stays where id=?",UUID.class,stay),room=UUID.randomUUID();jdbc.update("insert into rooms(id,property_id,room_type_id,code) values (?,?,?,?)",room,PROPERTY,type,room.toString());jdbc.update("update reservation_stays set arrival=?,room_id=? where id=?",LocalDate.now(java.time.ZoneId.of("America/Guatemala")),room,stay);jdbc.update("insert into hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) values (?,?,?,'INSPECTED',false,now(),now())",UUID.randomUUID(),PROPERTY,room);return room;}
    @Test void checkoutBlocksPendingThenDebtAndFinalPdfIncludesExactlyOneCharge()throws Exception{
        UUID room=roomForCheckout();
        var row=open();journey.guestPay(guest,reservation,stay,UUID.randomUUID().toString(),new com.pms.hotelboutique.backend.modules.reservations.application.StayJourneyService.PaymentInput("100.00","GTQ","demo_visa_approved"));
        var staff=operator("RECEPCION");String check="/api/v1/reservations/"+reservation+"/stays/"+stay+"/check-out?propertyId="+PROPERTY;var version=jdbc.queryForObject("select updated_at from reservation_stays where id=?",java.sql.Timestamp.class,stay).toInstant();String expected=json.writeValueAsString(Map.of("expectedStatus","IN_HOUSE","expectedUpdatedAt",version,"expectedRoomId",room));
        mvc.perform(post(check).header("Authorization",token(staff)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(expected)).andExpect(status().isConflict());assertEquals(0,balance());
        var ops=operator("OPERACIONES");var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getContentAsString());mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());assertEquals(5800,balance());
        mvc.perform(post(check).header("Authorization",token(staff)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(expected)).andExpect(status().isConflict());
        journey.guestPay(guest,reservation,stay,UUID.randomUUID().toString(),new com.pms.hotelboutique.backend.modules.reservations.application.StayJourneyService.PaymentInput("58.00","GTQ","demo_visa_approved"));
        mvc.perform(post(check).header("Authorization",token(staff)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(expected)).andExpect(status().isOk());
        var doc=journey.guestDocument(guest,reservation,stay);assertEquals("0.00",doc.snapshot().balance());assertEquals(1,doc.snapshot().movements().stream().filter(m->m.description().startsWith("Traslado")).count());var file=journey.guestFile(guest,reservation,stay,true);assertEquals(file,journey.guestFile(guest,reservation,stay,true));assertTrue(new String(java.util.Base64.getDecoder().decode(file.pdfBase64()),java.nio.charset.Charset.forName("windows-1252")).contains("58.00"));
    }
    @Test void completionAndCheckoutRaceCannotHideNewDebt()throws Exception{
        UUID room=roomForCheckout();var row=open();var ops=operator("OPERACIONES");var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getContentAsString());
        journey.guestPay(guest,reservation,stay,UUID.randomUUID().toString(),new com.pms.hotelboutique.backend.modules.reservations.application.StayJourneyService.PaymentInput("100.00","GTQ","demo_visa_approved"));
        var staff=operator("RECEPCION");var version=jdbc.queryForObject("select updated_at from reservation_stays where id=?",java.sql.Timestamp.class,stay).toInstant();String expected=json.writeValueAsString(Map.of("expectedStatus","IN_HOUSE","expectedUpdatedAt",version,"expectedRoomId",room));var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var complete=pool.submit(()->{gate.await();return mvc.perform(transition(ops,started,"DONE")).andReturn().getResponse().getStatus();});
            var out=pool.submit(()->{gate.await();return mvc.perform(post("/api/v1/reservations/"+reservation+"/stays/"+stay+"/check-out?propertyId="+PROPERTY).header("Authorization",token(staff)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(expected)).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(200,complete.get(30,TimeUnit.SECONDS));assertEquals(409,out.get(30,TimeUnit.SECONDS));
        }
        assertEquals(5800,balance());assertEquals("IN_HOUSE",jdbc.queryForObject("select status from reservation_stays where id=?",String.class,stay));
    }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder guestCheckout(String key) throws Exception {
        var version=jdbc.queryForObject("select updated_at from reservation_stays where id=?",java.sql.Timestamp.class,stay).toInstant();
        return post(detail(reservation,stay)+"/journey/requests").header("Authorization",bearer(guest)).header("Idempotency-Key",key).contentType("application/json")
            .content(json.writeValueAsString(Map.of("kind","CHECK_OUT","expectedUpdatedAt",version)));
    }
    private void settle(String amount){journey.guestPay(guest,reservation,stay,UUID.randomUUID().toString(),new com.pms.hotelboutique.backend.modules.reservations.application.StayJourneyService.PaymentInput(amount,"GTQ","demo_visa_approved"));}
    private void assertRejectedWithoutWrites() throws Exception {
        UUID room=roomForCheckout();var version=jdbc.queryForObject("select updated_at from reservation_stays where id=?",java.sql.Timestamp.class,stay).toInstant();
        long debt=balance();int movements=jdbc.queryForObject("select count(*) from folio_movements m join folios f on f.id=m.folio_id where f.reservation_id=?",Integer.class,reservation);
        String key=UUID.randomUUID().toString();mvc.perform(guestCheckout(key)).andExpect(status().isConflict());mvc.perform(guestCheckout(key)).andExpect(status().isConflict());
        var staff=operator("RECEPCION");mvc.perform(post("/api/v1/reservations/"+reservation+"/stays/"+stay+"/check-out?propertyId="+PROPERTY).header("Authorization",token(staff)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(Map.of("expectedStatus","IN_HOUSE","expectedUpdatedAt",version,"expectedRoomId",room)))).andExpect(status().isConflict());
        assertEquals(debt,balance());assertEquals(movements,jdbc.queryForObject("select count(*) from folio_movements m join folios f on f.id=m.folio_id where f.reservation_id=?",Integer.class,reservation));
        assertEquals(version,jdbc.queryForObject("select updated_at from reservation_stays where id=?",java.sql.Timestamp.class,stay).toInstant());
        assertEquals("IN_HOUSE",jdbc.queryForObject("select status from reservation_stays where id=?",String.class,stay));
        assertEquals(0,jdbc.queryForObject("select count(*) from stay_journey_requests where stay_id=?",Integer.class,stay));
        assertEquals(0,jdbc.queryForObject("select count(*) from stay_informative_documents where stay_id=?",Integer.class,stay));
    }
    @Test void guestAndStaffRejectDebtWithoutTransferAndRetryAfterPaymentSucceeds() throws Exception {
        assertRejectedWithoutWrites();settle("100.00");String key=UUID.randomUUID().toString();
        String receipt=mvc.perform(guestCheckout(key)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(receipt,mvc.perform(guestCheckout(key)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(1,jdbc.queryForObject("select count(*) from stay_journey_requests where stay_id=?",Integer.class,stay));assertEquals(0,balance());
    }
    @org.junit.jupiter.params.ParameterizedTest @org.junit.jupiter.params.provider.ValueSource(strings={"OPEN","IN_PROGRESS"})
    void zeroBalanceDoesNotAllowPendingTransferCheckout(String status)throws Exception {
        var row=open();if(status.equals("IN_PROGRESS"))mvc.perform(transition(operator("OPERACIONES"),row,"IN_PROGRESS")).andExpect(status().isOk());
        settle("100.00");assertRejectedWithoutWrites();
    }
    @Test void doneButUnpostedRejectsWithoutReconciliationOrFinancialMutation()throws Exception {
        var row=open();settle("100.00");jdbc.update("update service_requests set status='DONE' where id=?",UUID.fromString(row.path("id").asText()));
        assertEquals(1,journey.guestSummary(guest,reservation,stay).unpostedOrders());assertRejectedWithoutWrites();
        assertEquals(0,jdbc.queryForObject("select count(*) from transfer_folio_postings where request_id=?",Integer.class,UUID.fromString(row.path("id").asText())));
    }
    @Test void doneUnpaidRejectsThenSettlementAllowsGuestRequest()throws Exception {
        var row=open();var ops=operator("OPERACIONES");var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getContentAsString());mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());
        assertRejectedWithoutWrites();settle("158.00");mvc.perform(guestCheckout(UUID.randomUUID().toString())).andExpect(status().isOk());assertEquals(0,balance());
    }
    @Test void transferCreationAndGuestCheckoutSerializeWithoutAcceptingBoth()throws Exception {
        settle("100.00");var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var request=guestCheckout(UUID.randomUUID().toString());var transfer=create(UUID.randomUUID().toString(),body());
            var a=pool.submit(()->{gate.await();return mvc.perform(request).andReturn().getResponse().getStatus();});
            var b=pool.submit(()->{gate.await();return mvc.perform(transfer).andReturn().getResponse().getStatus();});gate.countDown();
            int checkout=a.get(30,TimeUnit.SECONDS),intake=b.get(30,TimeUnit.SECONDS);assertTrue(checkout==200&&intake==409||checkout==409&&intake==201,"checkout="+checkout+", intake="+intake);
        }
        assertEquals(0,balance());assertEquals(0,jdbc.queryForObject("select count(*) from stay_informative_documents where stay_id=?",Integer.class,stay));
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
