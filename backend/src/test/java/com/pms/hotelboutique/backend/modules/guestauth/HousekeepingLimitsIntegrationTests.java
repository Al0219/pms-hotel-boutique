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
class HousekeepingLimitsIntegrationTests {
    private static final String SCHEMA = "hk_limits_" + UUID.randomUUID().toString().replace("-", "");

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
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired ObjectMapper json;
    @Autowired com.pms.hotelboutique.backend.modules.operations.application.GuestHousekeepingService housekeeping;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    private GuestPrincipal guest;
    private UUID reservation, stay;
    private LocalDate date;
    @BeforeEach void setup() {
        guest = account(); date = LocalDate.now(java.time.ZoneId.of("America/Guatemala")).plusDays(1);
        UUID p = profile(null, "Housekeeping", "Fixture", null);
        reservation = reservation(p, "CONFIRMED"); stay = stay(reservation, date, "IN_HOUSE"); link(guest, reservation, p);
    }
    private String path() { return detail(reservation, stay) + "/housekeeping-requests"; }
    private Map<String, Object> body() { return Map.of("serviceDate", date.toString(), "timeSlot", "10:00–11:00", "cleaningType", "FULL_CLEANING", "notes", "  Silencio, por favor  "); }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder create(String key, Object body) throws Exception {
        return post(path()).header("Authorization", bearer(guest)).header("Idempotency-Key", key)
            .contentType("application/json").content(json.writeValueAsString(body));
    }


    private tools.jackson.databind.JsonNode open() throws Exception {
        return json.readTree(mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    private String item(tools.jackson.databind.JsonNode row) { return path()+"/"+row.path("id").asText(); }
    private Map<String,Object> editBody(tools.jackson.databind.JsonNode row,String notes) {
        var result=new java.util.HashMap<String,Object>(body());result.put("notes",notes);result.put("expectedUpdatedAt",row.path("updatedAt").asText());return result;
    }
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
    private String staffRoute() { return "/api/v1/properties/"+PROPERTY+"/service-requests/housekeeping"; }
    private String token(StaffPrincipal p) { return "Bearer "+staffJwt.issue(p,Instant.now()); }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder transition(StaffPrincipal p,tools.jackson.databind.JsonNode row,String target) throws Exception {
        return put(staffRoute()+"/"+row.path("id").asText()+"/status").header("Authorization",token(p)).contentType("application/json")
            .content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText(),"targetStatus",target)));
    }

    @Autowired com.pms.hotelboutique.backend.modules.operations.application.ServiceRequestService operations;
    @Test void permitsTwoAtEightHoursRejectsThirdAndKeepsDoneInQuota()throws Exception{
        var first=open();var second=new java.util.HashMap<String,Object>(body());second.put("timeSlot","18:00–19:00");mvc.perform(create(UUID.randomUUID().toString(),second)).andExpect(status().isCreated());
        jdbc.update("update service_requests set status='DONE' where id=?",UUID.fromString(first.path("id").asText()));
        var third=new java.util.HashMap<String,Object>(body());third.put("timeSlot","14:00–15:00");mvc.perform(create(UUID.randomUUID().toString(),third)).andExpect(status().isConflict());assertEquals(2,jdbc.queryForObject("select count(*) from service_requests where stay_id=?",Integer.class,stay));
    }
    @Test void excludesCancelledAndOwnRowWhileValidatingEdits()throws Exception{
        var first=open();var changed=json.readTree(mvc.perform(edit(first,editBody(first,"Notas"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var second=new java.util.HashMap<String,Object>(body());second.put("timeSlot","18:00–19:00");var late=json.readTree(mvc.perform(create(UUID.randomUUID().toString(),second)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        var invalid=editBody(changed,"Más tarde");invalid.put("timeSlot","11:00–12:00");mvc.perform(edit(changed,invalid)).andExpect(status().isConflict());
        mvc.perform(cancel(late)).andExpect(status().isOk());mvc.perform(edit(changed,invalid)).andExpect(status().isOk());
    }
    @Test void concurrentConflictingSchedulesHaveOnlyOneWinner()throws Exception{
        var gate=new CountDownLatch(1);var later=new java.util.HashMap<String,Object>(body());later.put("timeSlot","11:00–12:00");
        try(var pool=Executors.newFixedThreadPool(2)){
          var a=pool.submit(()->{gate.await();return mvc.perform(create(UUID.randomUUID().toString(),body())).andReturn().getResponse().getStatus();});var b=pool.submit(()->{gate.await();return mvc.perform(create(UUID.randomUUID().toString(),later)).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(java.util.Set.of(201,409),java.util.Set.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS)));
        }
        assertEquals(1,jdbc.queryForObject("select count(*) from service_requests where stay_id=?",Integer.class,stay));
    }
    @Test void twoStaysOfSameReservationHaveIndependentLimits()throws Exception{
        open();UUID another=stay(reservation,date,"IN_HOUSE");mvc.perform(post(detail(reservation,another)+"/housekeeping-requests").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(body()))).andExpect(status().isCreated());
    }
    private com.pms.hotelboutique.backend.modules.operations.application.ServiceRequestService.OpenRequestCommand scheduled(java.time.Instant at){return new com.pms.hotelboutique.backend.modules.operations.application.ServiceRequestService.OpenRequestCommand(PROPERTY,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.HOUSEKEEPING,"Limpieza",null,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Priority.MEDIUM,reservation,stay,null,null,null,at);}
    @Test void intervalsAcrossMidnightApplyToStaffIntakeAndReopening()throws Exception{
        var zone=java.time.ZoneId.of("America/Guatemala");var first=open();UUID id=UUID.fromString(first.path("id").asText());jdbc.update("update service_requests set due_at=? where id=?",java.sql.Timestamp.from(date.atTime(23,0).atZone(zone).toInstant()),id);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->operations.openRequest(scheduled(date.plusDays(1).atTime(6,0).atZone(zone).toInstant())));
        var next=operations.openRequest(scheduled(date.plusDays(1).atTime(7,0).atZone(zone).toInstant()));assertNotNull(next.id());
        jdbc.update("update service_requests set status='CANCELLED' where id=?",id);var close=operations.openRequest(scheduled(date.atTime(22,0).atZone(zone).toInstant()));assertNotNull(close.id());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->operations.reopen(id,null));
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
