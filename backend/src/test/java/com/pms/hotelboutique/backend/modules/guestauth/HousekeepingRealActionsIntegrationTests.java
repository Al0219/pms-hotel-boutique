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
class HousekeepingRealActionsIntegrationTests {
    private static final String SCHEMA = "hk_actions_" + UUID.randomUUID().toString().replace("-", "");

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
    @Test void cancelsSoftlyAndReplaysWithoutAnotherAuditEvenAfterCutoff() throws Exception {
        var row=open();mvc.perform(cancel(row)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        jdbc.update("update service_requests set due_at=now()-interval '1 hour' where id=?",UUID.fromString(row.path("id").asText()));
        mvc.perform(cancel(row)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertEquals(1,audit(row,"HOUSEKEEPING_CANCELLED"));
        assertEquals(1,jdbc.queryForObject("select count(*) from service_requests where id=?",Integer.class,UUID.fromString(row.path("id").asText())));
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].status").value("CANCELLED"));
        assertEquals(guest.guestAccountId(),jdbc.queryForObject("select actor_id from reservation_audit_events where entity_id=? and action='HOUSEKEEPING_CANCELLED'",UUID.class,UUID.fromString(row.path("id").asText())));
    }
    @Test void editsSameIdTrimsNotesAndReplaysWithoutLeakingNotesToAudit() throws Exception {
        var row=open();var input=editBody(row,"  Notas privadas  ");input.put("serviceDate",date.plusDays(1).toString());
        var changed=json.readTree(mvc.perform(edit(row,input)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(row.path("id").asText()))
            .andExpect(jsonPath("$.notes").value("Notas privadas")).andExpect(jsonPath("$.serviceDate").value(date.plusDays(1).toString())).andReturn().getResponse().getContentAsString());
        assertNotEquals(row.path("updatedAt").asText(),changed.path("updatedAt").asText());
        mvc.perform(edit(row,input)).andExpect(status().isOk());assertEquals(1,audit(row,"HOUSEKEEPING_EDITED"));
        String event=jdbc.queryForObject("select after_state from reservation_audit_events where entity_id=? and action='HOUSEKEEPING_EDITED'",String.class,UUID.fromString(row.path("id").asText()));
        assertTrue(event.contains("notesChanged"));assertFalse(event.contains("Notas privadas"));
        assertEquals(1,jdbc.queryForObject("select count(*) from service_requests where stay_id=?",Integer.class,stay));
    }
    @Test void rejectsForeignAccountCrossStayStaffAndAnonymousGuestWrites() throws Exception {
        var row=open();var other=account();
        mvc.perform(post(item(row)+"/cancel").header("Authorization",bearer(other)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText())))).andExpect(status().isNotFound());
        mvc.perform(put(item(row)).header("Authorization",bearer(other)).contentType("application/json").content(json.writeValueAsString(editBody(row,"Otro")))).andExpect(status().isNotFound());
        UUID second=stay(reservation,date,"IN_HOUSE");
        mvc.perform(post(detail(reservation,second)+"/housekeeping-requests/"+row.path("id").asText()+"/cancel").header("Authorization",bearer(guest)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText())))).andExpect(status().isNotFound());
        mvc.perform(put(item(row)).contentType("application/json").content(json.writeValueAsString(editBody(row,"Otro")))).andExpect(status().isUnauthorized());
        mvc.perform(cancel(row).with(request -> { request.removeHeader("Authorization"); request.addHeader("Authorization",token(operator("OPERACIONES"))); return request; })).andExpect(status().isUnauthorized());
        assertEquals(0,audit(row,"HOUSEKEEPING_CANCELLED"));assertEquals(0,audit(row,"HOUSEKEEPING_EDITED"));
    }
    @Test void rejectsClosedStatesAndCutoffForGuest() throws Exception {
        var row=open();UUID id=UUID.fromString(row.path("id").asText());
        for(String state:new String[]{"IN_PROGRESS","DONE"}) {
            jdbc.update("update service_requests set status=? where id=?",state,id);
            mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(edit(row,editBody(row,"Cambio"))).andExpect(status().isConflict());
        }
        jdbc.update("update service_requests set status='CANCELLED' where id=?",id);mvc.perform(edit(row,editBody(row,"Cambio"))).andExpect(status().isConflict());
        jdbc.update("update service_requests set status='OPEN',due_at=now()+interval '24 minutes' where id=?",id);
        mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(edit(row,editBody(row,"Cambio"))).andExpect(status().isConflict());
        assertEquals(0,audit(row,"HOUSEKEEPING_EDITED"));assertEquals(0,audit(row,"HOUSEKEEPING_CANCELLED"));
    }
    @Test void rejectsStaleVersionAndInvalidScheduleNotesOrActorInput() throws Exception {
        var row=open();var stale=editBody(row,"Cambiar");stale.put("expectedUpdatedAt","2000-01-01T00:00:00Z");
        mvc.perform(edit(row,stale)).andExpect(status().isConflict());
        for(var bad:Map.of("notes","x".repeat(501),"timeSlot","08:00–09:00","cleaningType","LIGHT_CLEANING","propertyId",PROPERTY.toString(),"serviceDate",date.plusDays(5).toString()).entrySet()) {
            var body=editBody(row,"Cambiar");body.put(bad.getKey(),bad.getValue());mvc.perform(edit(row,body)).andExpect(status().isBadRequest());
        }
        mvc.perform(post(item(row)+"/cancel").header("Authorization",bearer(guest)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText(),"status","DONE")))).andExpect(status().isBadRequest());
        assertEquals(0,audit(row,"HOUSEKEEPING_EDITED"));
    }
    @Test void concurrentDifferentEditsHaveOneWinnerAndOneAudit() throws Exception {
        var row=open();var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var first=pool.submit(()->{gate.await();return mvc.perform(edit(row,editBody(row,"Primera"))).andReturn().getResponse().getStatus();});
            var second=pool.submit(()->{gate.await();return mvc.perform(edit(row,editBody(row,"Segunda"))).andReturn().getResponse().getStatus();});gate.countDown();
            assertEquals(java.util.Set.of(200,409),java.util.Set.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)));
        }
        assertEquals(1,audit(row,"HOUSEKEEPING_EDITED"));
    }
    @Test void staffStartsThenCompletesWithIdempotentAuditAndGuestReadsRealState() throws Exception {
        var staff=operator("OPERACIONES");
        UUID room=UUID.randomUUID(), hk=UUID.randomUUID();UUID type=jdbc.queryForObject("select room_type_id from reservation_stays where id=?",UUID.class,stay);
        jdbc.update("insert into rooms(id,property_id,room_type_id,code) values(?,?,?,?)",room,PROPERTY,type,room.toString());
        jdbc.update("update reservation_stays set room_id=? where id=?",room,stay);
        jdbc.update("insert into hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) values(?,?,?,'DIRTY',false,now(),now())",hk,PROPERTY,room);
        String physical=jdbc.queryForObject("select to_jsonb(h)::text from hk_room_states h where id=?",String.class,hk);
        var row=open();
        var started=json.readTree(mvc.perform(transition(staff,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(transition(staff,row,"IN_PROGRESS")).andExpect(status().isOk());assertEquals(1,audit(row,"REQUEST_STARTED"));
        mvc.perform(edit(row,editBody(row,"Cambiar"))).andExpect(status().isConflict());
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));
        var done=json.readTree(mvc.perform(transition(staff,started,"DONE")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(transition(staff,started,"DONE")).andExpect(status().isOk());assertEquals(1,audit(row,"REQUEST_COMPLETED"));
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].status").value("DONE"));
        assertEquals(physical,jdbc.queryForObject("select to_jsonb(h)::text from hk_room_states h where id=?",String.class,hk));
        assertEquals(staff.staffUserId(),jdbc.queryForObject("select actor_id from reservation_audit_events where entity_id=? and action='REQUEST_COMPLETED'",UUID.class,UUID.fromString(done.path("id").asText())));
    }
    @Test void intakeIsReadOnlyAndGuestForeignPropertyOrInvalidTransitionsAreRejected() throws Exception {
        var row=open();var reception=operator("RECEPCION");var ops=operator("OPERACIONES");
        mvc.perform(get(staffRoute()).header("Authorization",token(reception))).andExpect(status().isOk());
        mvc.perform(transition(reception,row,"IN_PROGRESS")).andExpect(status().isForbidden());
        mvc.perform(transition(ops,row,"IN_PROGRESS").with(request -> { request.removeHeader("Authorization");request.addHeader("Authorization",bearer(guest));return request; })).andExpect(status().isUnauthorized());
        mvc.perform(transition(ops,row,"DONE")).andExpect(status().isConflict());
        mvc.perform(transition(ops,row,"CANCELLED")).andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/properties/"+UUID.randomUUID()+"/service-requests/housekeeping/"+row.path("id").asText()+"/status").header("Authorization",token(ops)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText(),"targetStatus","IN_PROGRESS")))).andExpect(status().isForbidden());
        mvc.perform(cancel(row)).andExpect(status().isOk());mvc.perform(transition(ops,row,"IN_PROGRESS")).andExpect(status().isConflict());
    }
    @Test void cancellationAndStaffStartCannotBothWin() throws Exception {
        var row=open();var ops=operator("OPERACIONES");var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var first=pool.submit(()->{gate.await();return mvc.perform(cancel(row)).andReturn().getResponse().getStatus();});
            var second=pool.submit(()->{gate.await();return mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getStatus();});gate.countDown();
            assertEquals(java.util.Set.of(200,409),java.util.Set.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)));
        }
        assertEquals(1,audit(row,"HOUSEKEEPING_CANCELLED")+audit(row,"REQUEST_STARTED"));
    }
    @Test void generatedOpenApiIncludesActionsVersionsAndAuthorization() throws Exception {
        var doc=json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String guest="/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/housekeeping-requests/{requestId}";
        for(var endpoint:Map.of(guest,"put",guest+"/cancel","post").entrySet()) {
            var op=doc.path("paths").path(endpoint.getKey()).path(endpoint.getValue());assertTrue(op.path("security").get(0).has("guestBearerAuth"));assertTrue(op.path("responses").has("409"));
        }
        var schema=doc.path("components").path("schemas").path("GuestHousekeepingRequest").path("properties");
        assertTrue(doc.path("components").path("schemas").path("CreateGuestHousekeeping").path("properties").path("timeSlot").path("enum").size()==5);
        assertTrue(schema.has("updatedAt"));assertTrue(schema.has("modifiableUntil"));
        var staff=doc.path("paths").path("/api/v1/properties/{propertyId}/service-requests/housekeeping/{requestId}/status").path("put");
        assertTrue(staff.path("security").get(0).has("bearerAuth"));assertTrue(staff.path("description").asText().contains("OPERATIONS_MANAGE"));assertTrue(staff.path("responses").has("403"));
        assertFalse(doc.path("paths").path(guest).has("delete"));
    }
    @Test void fiveSlotsPersistAndReprogramWithoutChangingIdentityOrRetrySemantics() throws Exception {
        for(String slot:com.pms.hotelboutique.backend.modules.operations.application.GuestHousekeepingService.MVP_SLOTS) {
            var payload=new java.util.HashMap<String,Object>(body());payload.put("timeSlot",slot);var key=UUID.randomUUID().toString();
            var row=json.readTree(mvc.perform(create(key,payload)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
            Instant expected=date.atTime(java.time.LocalTime.parse(slot.split("–")[0])).atZone(java.time.ZoneId.of("America/Guatemala")).toInstant();
            assertEquals(expected,jdbc.queryForObject("SELECT due_at FROM service_requests WHERE id=?",java.sql.Timestamp.class,UUID.fromString(row.path("id").asText())).toInstant());
            mvc.perform(create(key,payload)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(row.path("id").asText()));
            if (slot.startsWith("09:")) {
                var changes=editBody(row,"Reprogramada");changes.put("timeSlot","14:00–15:00");
                mvc.perform(edit(row,changes)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(row.path("id").asText())).andExpect(jsonPath("$.timeSlot").value("14:00–15:00"));
                assertEquals(date.atTime(14,0).atZone(java.time.ZoneId.of("America/Guatemala")).toInstant(),jdbc.queryForObject("SELECT due_at FROM service_requests WHERE id=?",java.sql.Timestamp.class,UUID.fromString(row.path("id").asText())).toInstant());
            }
        }
        assertEquals(5,jdbc.queryForObject("SELECT count(*) FROM service_requests WHERE stay_id=?",Integer.class,stay));
        mvc.perform(get(detail(reservation,stay)).header("Authorization",bearer(guest))).andExpect(status().isOk()).andExpect(jsonPath("$.timezone").value("America/Guatemala"));
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
