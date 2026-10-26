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
class GuestHousekeepingIntegrationTests {
    private static final String SCHEMA = "guest_hk_" + UUID.randomUUID().toString().replace("-", "");

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


    @Test void createsPersistsAndListsWithoutChangingPhysicalRoomState() throws Exception {
        int physical = jdbc.queryForObject("select count(*) from hk_room_states", Integer.class);
        var response = mvc.perform(create(UUID.randomUUID().toString(), body())).andExpect(status().isCreated())
            .andExpect(header().string("Cache-Control", "no-store, private"))
            .andExpect(jsonPath("$.status").value("OPEN")).andExpect(jsonPath("$.notes").value("Silencio, por favor"))
            .andExpect(jsonPath("$.stayId").value(stay.toString())).andReturn();
        UUID id = UUID.fromString(json.readTree(response.getResponse().getContentAsString()).path("id").asText());
        assertEquals("HOUSEKEEPING", jdbc.queryForObject("select category from service_requests where id=?", String.class, id));
        assertEquals(date, jdbc.queryForObject("select service_date from service_requests where id=?", LocalDate.class, id));
        assertEquals(date.atTime(10,0).atZone(java.time.ZoneId.of("America/Guatemala")).toInstant(),
            jdbc.queryForObject("select due_at from service_requests where id=?", java.sql.Timestamp.class, id).toInstant());
        assertEquals(1, jdbc.queryForObject("select count(*) from reservation_audit_events where entity_id=? and actor_type='GUEST' and actor_id=?", Integer.class, id, guest.guestAccountId()));
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(id.toString())).andExpect(jsonPath("$[0].guestProfileId").doesNotExist());
        jdbc.update("update service_requests set status='IN_PROGRESS' where id=?",id);
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));
        assertEquals(physical,jdbc.queryForObject("select count(*) from hk_room_states", Integer.class));
    }
    @Test void ownRequestDoesNotAuthorizeOtherGuestsOrCrossReservationStay() throws Exception {
        mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isCreated());
        var other=account();
        mvc.perform(get(path()).header("Authorization",bearer(other))).andExpect(status().isNotFound());
        mvc.perform(post(path()).header("Authorization",bearer(other)).header("Idempotency-Key",UUID.randomUUID().toString())
            .contentType("application/json").content(json.writeValueAsString(body()))).andExpect(status().isNotFound());
        mvc.perform(get(detail(UUID.randomUUID(),stay)+"/housekeeping-requests").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
    }
    @Test void rejectsIdentityInjectionBadDatesNotesAndUnapprovedOptions() throws Exception {
        for (var change: Map.of("propertyId", PROPERTY.toString(), "guestAccountId",guest.guestAccountId().toString(),
                "roomId",UUID.randomUUID().toString(),"notes","x".repeat(501),"timeSlot","09:00–10:00",
                "cleaningType","LIGHT_CLEANING","serviceDate",date.plusDays(3).toString()).entrySet()) {
            var body=new java.util.HashMap<String,Object>(body()); body.put(change.getKey(),change.getValue());
            mvc.perform(create(UUID.randomUUID().toString(),body)).andExpect(status().isBadRequest());
        }
        var past = new java.util.HashMap<String,Object>(body());past.put("serviceDate",date.minusDays(2).toString());
        mvc.perform(create(UUID.randomUUID().toString(),past)).andExpect(status().isBadRequest());
        mvc.perform(create("short",body())).andExpect(status().isBadRequest());
        assertEquals(0,jdbc.queryForObject("select count(*) from service_requests where stay_id=?",Integer.class,stay));
    }
    @Test void rejectsCancelledNoShowCheckedOutAndUnconfirmedStays() throws Exception {
        for(String status: new String[]{"CANCELLED","NO_SHOW","CHECKED_OUT"}) {
            jdbc.update("update reservation_stays set status=? where id=?",status,stay);
            mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
        }
        jdbc.update("update reservation_stays set status='IN_HOUSE' where id=?",stay);
        jdbc.update("update reservations set status='CANCELLED' where id=?",reservation);
        mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
    }
    @Test void replaysOriginalEvenAfterCheckoutAndRejectsChangedPayload() throws Exception {
        String key=UUID.randomUUID().toString();
        var original=mvc.perform(create(key,body())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);
        mvc.perform(create(key,body())).andExpect(status().isOk()).andExpect(content().json(original));
        var changed=new java.util.HashMap<String,Object>(body());changed.put("notes","Otro pedido");
        mvc.perform(create(key,changed)).andExpect(status().isConflict());
        assertEquals(1,jdbc.queryForObject("select count(*) from service_requests where stay_id=?",Integer.class,stay));
    }
    @Test void concurrentNetworkRetriesCreateExactlyOneRequest() throws Exception {
        String key=UUID.randomUUID().toString();var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            Callable<Integer> call=()->{ready.countDown();assertTrue(start.await(10,TimeUnit.SECONDS));return mvc.perform(create(key,body())).andReturn().getResponse().getStatus();};
            var first=pool.submit(call);var second=pool.submit(call);assertTrue(ready.await(10,TimeUnit.SECONDS));start.countDown();
            assertEquals(java.util.Set.of(200,201),java.util.Set.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)));
        }
        assertEquals(1,jdbc.queryForObject("select count(*) from service_requests where stay_id=?",Integer.class,stay));
        assertEquals(1,jdbc.queryForObject("select count(*) from reservation_audit_events where action='HOUSEKEEPING_REQUESTED' and actor_id=?",Integer.class,guest.guestAccountId()));
    }
    @Test void anonymousStaffAndRevokedGuestCannotAccessGuestRequests() throws Exception {
        mvc.perform(get(path())).andExpect(status().isUnauthorized());
        var staff = new StaffPrincipal(UUID.randomUUID(),UUID.randomUUID(),"fixture","SUPER_ADMIN");
        mvc.perform(get(path()).header("Authorization","Bearer "+staffJwt.issue(staff,Instant.now()))).andExpect(status().isUnauthorized());
        jdbc.update("update guest_auth_sessions set status='REVOKED',revoked_at=now() where id=?",guest.sessionId());
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
    }
    @Test void staffReadsAuthorizedPropertyAndGuestCannotUseStaffEndpoint() throws Exception {
        mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isCreated());
        String endpoint="/api/v1/properties/"+PROPERTY+"/service-requests/housekeeping";
        mvc.perform(get(endpoint).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
        UUID id=UUID.randomUUID(),session=UUID.randomUUID();
        UUID org=jdbc.queryForObject("select organization_id from properties where id=?",UUID.class,PROPERTY);
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'synthetic','OPERACIONES','ACTIVE',now(),now())",id,id.toString(),id+"@example.test");
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,'OPERACIONES','ACTIVE',now(),now())",id,org);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,org,PROPERTY);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        var principal=new StaffPrincipal(id,session,id.toString(),"OPERACIONES");String token="Bearer "+staffJwt.issue(principal,Instant.now());
        mvc.perform(get(endpoint).header("Authorization",token)).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.serviceDate == '"+date+"')]").isNotEmpty());
        mvc.perform(get("/api/v1/properties/"+UUID.randomUUID()+"/service-requests/housekeeping").header("Authorization",token)).andExpect(status().isForbidden());
        jdbc.update("delete from role_permissions where role_code='OPERACIONES' and permission_code in ('OPERATIONS_MANAGE','SERVICE_REQUEST_INTAKE')");
        try { mvc.perform(get(endpoint).header("Authorization",token)).andExpect(status().isForbidden()); }
        finally { jdbc.update("insert into role_permissions(role_code,permission_code) values ('OPERACIONES','OPERATIONS_MANAGE') on conflict do nothing"); }
    }
    @Test void whitespaceNotesNormalizeToNullAndReplayWithOmittedNotes() throws Exception {
        String key=UUID.randomUUID().toString();var body=new java.util.HashMap<String,Object>(body());body.put("notes","   ");
        mvc.perform(create(key,body)).andExpect(status().isCreated()).andExpect(jsonPath("$.notes").isEmpty());
        body.remove("notes");mvc.perform(create(key,body)).andExpect(status().isOk());
    }
    @Test void requestAndGuestAuditRollBackTogether() {
        assertThrows(IllegalStateException.class,()->new org.springframework.transaction.support.TransactionTemplate(transactions).execute(tx->{
            housekeeping.create(guest,reservation,stay,UUID.randomUUID().toString(),date,"10:00–11:00","FULL_CLEANING",null);
            throw new IllegalStateException("Synthetic rollback");
        }));
        assertEquals(0,jdbc.queryForObject("select count(*) from service_requests where stay_id=?",Integer.class,stay));
        assertEquals(0,jdbc.queryForObject("select count(*) from reservation_audit_events where action='HOUSEKEEPING_REQUESTED' and actor_id=?",Integer.class,guest.guestAccountId()));
    }
    @Test void generatedOpenApiDocumentsGuestCreateReadAndStaffRead() throws Exception {
        var doc=json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String guest="/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/housekeeping-requests";
        for(String verb:new String[]{"get","post"}) {
            var op=doc.path("paths").path(guest).path(verb);assertTrue(op.path("security").get(0).has("guestBearerAuth"));
            for(String code:new String[]{"400","401","404"}) assertTrue(op.path("responses").has(code),code);
        }
        var post=doc.path("paths").path(guest).path("post");
        assertTrue(post.path("responses").has("201"));assertTrue(post.path("responses").has("409"));
        assertTrue(post.path("parameters").toString().contains("Idempotency-Key"));
        var body=doc.path("components").path("schemas").path("CreateGuestHousekeeping");assertEquals(500,body.path("properties").path("notes").path("maxLength").asInt());
        assertFalse(body.path("additionalProperties").asBoolean(true));
        assertTrue(post.path("responses").path("201").path("content").has("application/json"));
        assertTrue(post.path("responses").path("201").path("headers").has("Cache-Control"));
        var staffSchema=doc.path("components").path("schemas").path("HousekeepingRequestView");
        assertTrue(staffSchema.path("properties").path("roomCode").path("type").toString().contains("null"));
        assertEquals("FULL_CLEANING",body.path("properties").path("cleaningType").path("enum").get(0).asText());
        var staff=doc.path("paths").path("/api/v1/properties/{propertyId}/service-requests/housekeeping").path("get");
        assertTrue(staff.path("security").get(0).has("bearerAuth"));assertTrue(staff.path("responses").has("403"));
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
