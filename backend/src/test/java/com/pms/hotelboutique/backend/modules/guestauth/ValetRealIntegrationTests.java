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
class ValetRealIntegrationTests {
    private static final String SCHEMA = "valet_" + UUID.randomUUID().toString().replace("-", "");

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
    @org.springframework.boot.test.web.server.LocalServerPort int httpPort;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired ObjectMapper json;
    @Autowired com.pms.hotelboutique.backend.modules.operations.application.ValetRequestService valet;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    private GuestPrincipal guest;
    private UUID reservation, stay, vehicle;
    private LocalDate date;
    @BeforeEach void setup() throws Exception {
        guest = account(); date = LocalDate.now(java.time.ZoneId.of("America/Guatemala")).plusDays(1);
        UUID p = profile(null, "Housekeeping", "Fixture", null);
        reservation = reservation(p, "CONFIRMED"); stay = stay(reservation, date, "IN_HOUSE"); link(guest, reservation, p);vehicle=UUID.fromString(json.readTree(mvc.perform(post(detail(reservation,stay)+"/valet-vehicles").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(vehicleBody()))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("id").asText());
    }
    private String path() { return detail(reservation, stay) + "/valet-requests"; }
    private Map<String,Object> vehicleBody(){return Map.of("make"," Toyota ","model","Yaris","platePrefix","P","plateBody","123abc","color"," Azul ","location","PARKED");}
    private Map<String,Object> body(){return Map.of("vehicleId",vehicle,"serviceDate",date.toString(),"deliveryTime","09:00");}
    private tools.jackson.databind.JsonNode vehicleRow()throws Exception{return json.readTree(mvc.perform(get(detail(reservation,stay)+"/valet-vehicles").header("Authorization",bearer(guest))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get(0);}
    private Map<String,Object> vehicleEdit(tools.jackson.databind.JsonNode row,String make){return Map.of("make",make,"model","Yaris","platePrefix","P","plateBody","123ABC","color","Azul","expectedUpdatedAt",row.path("updatedAt").asText());}
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder editVehicle(tools.jackson.databind.JsonNode row,String make)throws Exception{return put(detail(reservation,stay)+"/valet-vehicles/"+vehicle).header("Authorization",bearer(guest)).contentType("application/json").content(json.writeValueAsString(vehicleEdit(row,make)));}
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder create(String key, Object body) throws Exception {
        return post(path()).header("Authorization", bearer(guest)).header("Idempotency-Key", key)
            .contentType("application/json").content(json.writeValueAsString(body));
    }


    private tools.jackson.databind.JsonNode open() throws Exception {
        return json.readTree(mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    private String item(tools.jackson.databind.JsonNode row) { return path()+"/"+row.path("id").asText(); }
    private Map<String,Object> editBody(tools.jackson.databind.JsonNode row,String time){return Map.of("serviceDate",date.toString(),"deliveryTime",time,"expectedUpdatedAt",row.path("updatedAt").asText());}
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
    private String staffRoute() { return "/api/v1/properties/"+PROPERTY+"/service-requests/valet"; }
    private String token(StaffPrincipal p) { return "Bearer "+staffJwt.issue(p,Instant.now()); }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder transition(StaffPrincipal p,tools.jackson.databind.JsonNode row,String target) throws Exception {
        return put(staffRoute()+"/"+row.path("id").asText()+"/status").header("Authorization",token(p)).contentType("application/json")
            .content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText(),"targetStatus",target)));
    }
    @Test void registerNormalizePersistAndBlockActiveVehicleEditsWithoutCustodyChange()throws Exception{
        var v=vehicleRow();assertEquals("Toyota",v.path("make").asText());assertEquals("123ABC",v.path("plateBody").asText());assertEquals("Azul",v.path("color").asText());
        mvc.perform(editVehicle(v,"Honda")).andExpect(status().isOk());var updated=vehicleRow();var row=open();
        assertEquals("PARKED",vehicleRow().path("location").asText());assertTrue(vehicleRow().path("hasActiveRequest").asBoolean());
        mvc.perform(editVehicle(updated,"Changed")).andExpect(status().isConflict());
        mvc.perform(cancel(row)).andExpect(status().isOk());assertEquals("PARKED",vehicleRow().path("location").asText());
        mvc.perform(editVehicle(vehicleRow(),"Nissan")).andExpect(status().isOk());
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].vehicle.make").value("Honda"));
    }
    @Test void duplicatesUnknownFieldsAndMalformedPlatesAreRejected()throws Exception{
        var base=detail(reservation,stay)+"/valet-vehicles";
        mvc.perform(post(base).header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(vehicleBody()))).andExpect(status().isConflict());
        for(String plate:new String[]{"1234ABC","ABC123","12AB","","12A!C"}){var input=new java.util.HashMap<String,Object>(vehicleBody());input.put("plateBody",plate);mvc.perform(post(base).header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isBadRequest());}
        for(String field:new String[]{"guestAccountId","propertyId","location","price","notes"}){var input=new java.util.HashMap<String,Object>(body());input.put(field,"forged");mvc.perform(create(UUID.randomUUID().toString(),input)).andExpect(status().isBadRequest());}
    }
    @Test void requestRetryAfterCancelOrEditPreservesIdentityAndRejectsNewIntent()throws Exception{
        var key=UUID.randomUUID().toString();var row=json.readTree(mvc.perform(create(key,body())).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mvc.perform(create(key,body())).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(row.path("id").asText()));
        mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
        var changed=json.readTree(mvc.perform(edit(row,editBody(row,"10:00"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(edit(row,editBody(row,"11:00"))).andExpect(status().isConflict());mvc.perform(edit(row,editBody(row,"10:00"))).andExpect(status().isOk());
        mvc.perform(cancel(changed)).andExpect(status().isOk());mvc.perform(cancel(changed)).andExpect(status().isOk());
        jdbc.update("update reservations set status='CANCELLED' where id=?",reservation);
        mvc.perform(create(key,body())).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        var other=new java.util.HashMap<String,Object>(body());other.put("deliveryTime","11:00");mvc.perform(create(key,other)).andExpect(status().isConflict());
        assertEquals(1,audit(row,"VALET_REQUESTED"));assertEquals(1,audit(row,"VALET_EDITED"));assertEquals(1,audit(row,"VALET_CANCELLED"));
    }
    @Test void staffOnlyDeliveryAndReturnAreAtomicAndReplayDoesNotRepeatAudit()throws Exception{
        var row=open();var ops=operator("OPERACIONES");var intake=operator("RECEPCION");
        mvc.perform(get(staffRoute()).header("Authorization",token(intake))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/properties/"+PROPERTY+"/valet-vehicles").header("Authorization",token(intake))).andExpect(status().isOk()).andExpect(jsonPath("$[*].id").value(org.hamcrest.Matchers.hasItem(vehicle.toString())));
        mvc.perform(transition(intake,row,"IN_PROGRESS")).andExpect(status().isForbidden());mvc.perform(transition(ops,row,"DONE")).andExpect(status().isConflict());
        var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals("PARKED",vehicleRow().path("location").asText());mvc.perform(cancel(row)).andExpect(status().isConflict());
        mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());
        var delivered=vehicleRow();assertEquals("WITH_GUEST",delivered.path("location").asText());assertFalse(delivered.path("hasActiveRequest").asBoolean());
        mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
        var route="/api/v1/properties/"+PROPERTY+"/valet-vehicles/"+vehicle+"/return";var payload=json.writeValueAsString(Map.of("expectedUpdatedAt",delivered.path("updatedAt").asText()));
        mvc.perform(post(route).header("Authorization",token(intake)).contentType("application/json").content(payload)).andExpect(status().isForbidden());
        for(int i=0;i<2;i++)mvc.perform(post(route).header("Authorization",token(ops)).contentType("application/json").content(payload)).andExpect(status().isOk()).andExpect(jsonPath("$.location").value("PARKED"));
        assertEquals(1,audit(row,"REQUEST_COMPLETED"));assertEquals(1,jdbc.queryForObject("select count(*) from reservation_audit_events where entity_id=? and action='VALET_RETURNED'",Integer.class,vehicle));
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].status").value("DONE"));
        var later=open();var laterStarted=json.readTree(mvc.perform(transition(ops,later,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());mvc.perform(transition(ops,laterStarted,"DONE")).andExpect(status().isOk());
        mvc.perform(post(route).header("Authorization",token(ops)).contentType("application/json").content(payload)).andExpect(status().isConflict());assertEquals("WITH_GUEST",vehicleRow().path("location").asText());
    }
    @Test void authenticatedGuestCannotCompleteOrChangeLocationAndForeignContextsStayHidden()throws Exception{
        var row=open();var other=account();
        mvc.perform(get(path()).header("Authorization",bearer(other))).andExpect(status().isNotFound());
        mvc.perform(get(detail(reservation,stay)+"/valet-vehicles").header("Authorization",bearer(other))).andExpect(status().isNotFound());
        mvc.perform(cancel(row).with(req->{req.removeHeader("Authorization");req.addHeader("Authorization",bearer(other));return req;})).andExpect(status().isNotFound());
        mvc.perform(get(staffRoute()).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
        mvc.perform(transition(operator("OPERACIONES"),row,"IN_PROGRESS").with(req->{req.removeHeader("Authorization");req.addHeader("Authorization",bearer(guest));return req;})).andExpect(status().isUnauthorized());
        var edit=new java.util.HashMap<String,Object>(vehicleEdit(vehicleRow(),"Toyota"));edit.put("location","WITH_GUEST");
        mvc.perform(put(detail(reservation,stay)+"/valet-vehicles/"+vehicle).header("Authorization",bearer(guest)).contentType("application/json").content(json.writeValueAsString(edit))).andExpect(status().isBadRequest());
        mvc.perform(get(path()).header("Authorization",token(operator("OPERACIONES")))).andExpect(status().isUnauthorized());
        var ops=operator("OPERACIONES");mvc.perform(get(staffRoute().replace(PROPERTY.toString(),UUID.randomUUID().toString())).header("Authorization",token(ops))).andExpect(status().isForbidden());
        mvc.perform(get(path())).andExpect(status().isUnauthorized());
    }
    @Test void concurrentDistinctRequestsSameVehicleHaveOneWinnerInPostgres()throws Exception{
        var gate=new CountDownLatch(1);try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->{gate.await();return mvc.perform(create(UUID.randomUUID().toString(),body())).andReturn().getResponse().getStatus();});
            var b=pool.submit(()->{gate.await();return mvc.perform(create(UUID.randomUUID().toString(),body())).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(java.util.Set.of(201,409),java.util.Set.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS)));
        }
        assertEquals(1,jdbc.queryForObject("select count(*) from valet_requests where vehicle_id=? and active",Integer.class,vehicle));
    }
    @Test void concurrentSameIntentReplaysAndStartCancelHaveOneWinner()throws Exception{
        var key=UUID.randomUUID().toString();var gate=new CountDownLatch(1);try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->{gate.await();return mvc.perform(create(key,body())).andReturn().getResponse().getStatus();});var b=pool.submit(()->{gate.await();return mvc.perform(create(key,body())).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(java.util.Set.of(200,201),java.util.Set.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS)));
        }
        var row=json.readTree(mvc.perform(get(path()).header("Authorization",bearer(guest))).andReturn().getResponse().getContentAsString()).get(0);var ops=operator("OPERACIONES");var gate2=new CountDownLatch(1);try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->{gate2.await();return mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getStatus();});var b=pool.submit(()->{gate2.await();return mvc.perform(cancel(row)).andReturn().getResponse().getStatus();});gate2.countDown();assertEquals(java.util.Set.of(200,409),java.util.Set.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS)));
        }
    }
    @Test void snapshotGuardAndPartialIndexCannotBeBypassedWithSql()throws Exception{
        var row=open();UUID id=UUID.fromString(row.path("id").asText());
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("update valet_requests set vehicle_snapshot='{}'::jsonb where id=?",id));
        // active is derived by the trigger; an attempted false cannot release the unique slot.
        jdbc.update("update valet_requests set active=false where id=?",id);assertTrue(jdbc.queryForObject("select active from valet_requests where id=?",Boolean.class,id));
        UUID second=UUID.randomUUID();jdbc.update("insert into service_requests(id,property_id,reservation_id,stay_id,category,subject,priority,status,created_at,updated_at,due_at) values (?,?,?,?,'VALET','Other attempt','MEDIUM','OPEN',now(),now(),now()+interval '1 day')",second,PROPERTY,reservation,stay);
        assertThrows(org.springframework.dao.DuplicateKeyException.class,()->jdbc.update("insert into valet_requests select ?,vehicle_id,stay_id,property_id,guest_account_id,?,initial_payload_hash,current_payload_hash,service_date,delivery_time,vehicle_snapshot,false,saved_vehicle_id from valet_requests where id=?",second,UUID.randomUUID().toString(),id));
    }
    @Test void schedulesCheckoutCutoffAndClosedStayAreServerAuthoritative()throws Exception{
        for(String time:new String[]{"25:00","9:00"}){var payload=new java.util.HashMap<String,Object>(body());payload.put("deliveryTime",time);mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());}
        var beyond=new java.util.HashMap<String,Object>(body());beyond.put("serviceDate",date.plusDays(2).toString());beyond.put("deliveryTime","12:01");mvc.perform(create(UUID.randomUUID().toString(),beyond)).andExpect(status().isBadRequest());
        var row=open();jdbc.update("update service_requests set due_at=now()+interval '24 minutes' where id=?",UUID.fromString(row.path("id").asText()));mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(edit(row,editBody(row,"11:00"))).andExpect(status().isConflict());
        jdbc.update("update reservations set status='CANCELLED' where id=?",reservation);mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
    }
    @Test void transactionRollbackRestoresRequestVehicleAndAuditTogether()throws Exception{
        var row=open();var ops=operator("OPERACIONES");var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getContentAsString());
        var tx=new org.springframework.transaction.support.TransactionTemplate(transactions);
        assertThrows(IllegalStateException.class,()->tx.execute(status->{valet.staffTransition(ops,PROPERTY,UUID.fromString(row.path("id").asText()),new com.pms.hotelboutique.backend.modules.operations.application.ValetModels.Transition(Instant.parse(started.path("updatedAt").asText()),"DONE"));throw new IllegalStateException("rollback");}));
        assertEquals("PARKED",vehicleRow().path("location").asText());assertEquals(0,audit(row,"REQUEST_COMPLETED"));assertEquals("IN_PROGRESS",jdbc.queryForObject("select status from service_requests where id=?",String.class,UUID.fromString(row.path("id").asText())));
    }
    @Test void endedStayRemainsOperationalWhileParkedOrPendingAndBecomesHistoryAfterDelivery()throws Exception{
        var row=open();var ops=operator("OPERACIONES");jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);
        var parked=vehicleRow();assertFalse(parked.path("stayActive").asBoolean());assertTrue(parked.path("operationallyVisible").asBoolean());assertTrue(parked.path("hasActiveRequest").asBoolean());assertEquals(reservation.toString(),parked.path("reservationId").asText());
        var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());
        var delivered=vehicleRow();assertEquals("WITH_GUEST",delivered.path("location").asText());assertFalse(delivered.path("stayActive").asBoolean());assertFalse(delivered.path("operationallyVisible").asBoolean());
        mvc.perform(get(staffRoute().replace("/service-requests/valet","/valet-vehicles")).header("Authorization",token(ops))).andExpect(status().isOk()).andExpect(jsonPath("$[*].id").value(org.hamcrest.Matchers.hasItem(vehicle.toString())));
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].status").value("DONE"));
    }
    private static final String SAVED="/api/v1/guest-auth/account/valet-vehicles";
    private tools.jackson.databind.JsonNode saved()throws Exception{return json.readTree(mvc.perform(get(SAVED).header("Authorization",bearer(guest))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get(0);}
    private UUID[] nextStay() {var profile=profile(null,"Reuse","Fixture",null);var r=reservation(profile,"CONFIRMED");var s=stay(r,date,"IN_HOUSE");link(guest,r,profile);return new UUID[]{r,s};}
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder associate(UUID[] next,tools.jackson.databind.JsonNode saved,String key,String location)throws Exception{
        return post(detail(next[0],next[1])+"/valet-vehicles/associate").header("Authorization",bearer(guest)).header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(Map.of("savedVehicleId",saved.path("id").asText(),"expectedVehicleUpdatedAt",saved.path("updatedAt").asText(),"location",location)));
    }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder release(StaffPrincipal staff,tools.jackson.databind.JsonNode row)throws Exception{
        return post("/api/v1/properties/"+PROPERTY+"/valet-vehicles/"+vehicle+"/release").header("Authorization",token(staff)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText())));
    }
    @Test void savedIdentitySurvivesCheckoutAndReuseKeepsHistoryAndFreshLocation()throws Exception{
        var original=vehicleRow();var row=open();mvc.perform(cancel(row)).andExpect(status().isOk());var snapshot=jdbc.queryForObject("select vehicle_snapshot::text from valet_requests where id=?",String.class,UUID.fromString(row.path("id").asText()));
        var next=nextStay();var saved=saved();assertFalse(saved.path("canAssociate").asBoolean());
        mvc.perform(associate(next,saved,UUID.randomUUID().toString(),"WITH_GUEST")).andExpect(status().isConflict());
        jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);
        assertTrue(vehicleRow().path("operationallyVisible").asBoolean());assertFalse(saved().path("canAssociate").asBoolean());
        mvc.perform(release(operator("OPERACIONES"),vehicleRow())).andExpect(status().isOk());assertTrue(saved().path("canAssociate").asBoolean());
        var key=UUID.randomUUID().toString();var associated=json.readTree(mvc.perform(associate(next,saved,key,"WITH_GUEST")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mvc.perform(associate(next,saved,key,"WITH_GUEST")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(associated.path("id").asText()));
        assertNotEquals(original.path("id").asText(),associated.path("id").asText());assertEquals(original.path("savedVehicleId"),associated.path("savedVehicleId"));assertFalse(associated.path("hasActiveRequest").asBoolean());assertEquals("WITH_GUEST",associated.path("location").asText());
        mvc.perform(get(detail(next[0],next[1])+"/valet-requests").header("Authorization",bearer(guest))).andExpect(content().json("[]"));
        mvc.perform(put(detail(next[0],next[1])+"/valet-vehicles/"+associated.path("id").asText()).header("Authorization",bearer(guest)).contentType("application/json").content(json.writeValueAsString(vehicleEdit(associated,"Honda")))).andExpect(status().isOk());
        assertEquals("Honda",saved().path("make").asText());assertEquals("Toyota",vehicleRow().path("make").asText());assertEquals(snapshot,jdbc.queryForObject("select vehicle_snapshot::text from valet_requests where id=?",String.class,UUID.fromString(row.path("id").asText())));
        mvc.perform(post(detail(next[0],next[1])+"/valet-vehicles").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(vehicleBody()))).andExpect(status().isConflict());
        assertEquals(1,jdbc.queryForObject("select count(*) from valet_saved_vehicles where guest_account_id=?",Integer.class,guest.guestAccountId()));
        // Return against old history must not create a second operative association.
        var old=vehicleRow();mvc.perform(post("/api/v1/properties/"+PROPERTY+"/valet-vehicles/"+vehicle+"/return").header("Authorization",token(operator("OPERACIONES"))).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",old.path("updatedAt").asText())))).andExpect(status().isConflict());
    }
    @Test void exceptionalDeliveryRequiresTerminalStayNoActiveRequestAndStaffScopeAndIsReplaySafe()throws Exception{
        var ops=operator("OPERACIONES");var v=vehicleRow();assertFalse(v.path("canRelease").asBoolean());mvc.perform(release(ops,v)).andExpect(status().isConflict());
        var row=open();jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);assertFalse(vehicleRow().path("canRelease").asBoolean());mvc.perform(release(ops,vehicleRow())).andExpect(status().isConflict());
        // Resolve request through normal Staff delivery; return then use exceptional path.
        var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());
        var delivered=vehicleRow();mvc.perform(post("/api/v1/properties/"+PROPERTY+"/valet-vehicles/"+vehicle+"/return").header("Authorization",token(ops)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",delivered.path("updatedAt").asText())))).andExpect(status().isOk());
        var pending=vehicleRow();assertTrue(pending.path("canRelease").asBoolean());
        mvc.perform(release(operator("RECEPCION"),pending)).andExpect(status().isForbidden());
        mvc.perform(release(ops,pending).with(req->{req.removeHeader("Authorization");req.addHeader("Authorization",bearer(guest));return req;})).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/properties/"+UUID.randomUUID()+"/valet-vehicles/"+vehicle+"/release").header("Authorization",token(ops)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",pending.path("updatedAt").asText())))).andExpect(status().isForbidden());
        var count=jdbc.queryForObject("select count(*) from service_requests",Integer.class);
        mvc.perform(release(ops,v)).andExpect(status().isConflict());
        var deliveryGate=new CountDownLatch(1);try(var pool=Executors.newFixedThreadPool(2)){
            var first=pool.submit(()->{deliveryGate.await();return mvc.perform(release(ops,pending)).andReturn().getResponse().getStatus();});var second=pool.submit(()->{deliveryGate.await();return mvc.perform(release(ops,pending)).andReturn().getResponse().getStatus();});deliveryGate.countDown();assertEquals(200,first.get(20,TimeUnit.SECONDS));assertEquals(200,second.get(20,TimeUnit.SECONDS));
        }
        for(int i=0;i<2;i++)mvc.perform(release(ops,pending)).andExpect(status().isOk()).andExpect(jsonPath("$.location").value("WITH_GUEST")).andExpect(jsonPath("$.operationallyVisible").value(false));
        assertEquals(count,jdbc.queryForObject("select count(*) from service_requests",Integer.class));assertEquals(1,jdbc.queryForObject("select count(*) from reservation_audit_events where entity_id=? and action='VALET_EXCEPTIONAL_DELIVERY' and actor_id=? and property_id=? and after_state::jsonb->>'stayId'=?",Integer.class,vehicle,ops.staffUserId(),PROPERTY,stay.toString()));
        var event=json.readTree(jdbc.queryForObject("select after_state from reservation_audit_events where entity_id=? and action='VALET_EXCEPTIONAL_DELIVERY'",String.class,vehicle));
        assertEquals(vehicleRow().path("savedVehicleId").asText(),event.path("savedVehicleId").asText());assertEquals(PROPERTY.toString(),event.path("propertyId").asText());assertEquals(stay.toString(),event.path("stayId").asText());assertDoesNotThrow(()->Instant.parse(event.path("confirmedAt").asText()));
        assertEquals("DONE",jdbc.queryForObject("select status from service_requests where id=?",String.class,UUID.fromString(row.path("id").asText())));
    }
    @Test void concurrentReuseHasOneWinnerAndDatabaseCannotForgeInactiveAssociation()throws Exception{
        jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);mvc.perform(release(operator("OPERACIONES"),vehicleRow())).andExpect(status().isOk());
        var saved=saved();var a=nextStay();var b=nextStay();var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){var first=pool.submit(()->{gate.await();return mvc.perform(associate(a,saved,UUID.randomUUID().toString(),"WITH_GUEST")).andReturn().getResponse().getStatus();});var second=pool.submit(()->{gate.await();return mvc.perform(associate(b,saved,UUID.randomUUID().toString(),"PARKED")).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(java.util.Set.of(201,409),java.util.Set.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)));}
        assertEquals(1,jdbc.queryForObject("select count(*) from valet_vehicles where saved_vehicle_id=? and operational_active",Integer.class,UUID.fromString(saved.path("id").asText())));
        jdbc.update("update valet_vehicles set operational_active=false where saved_vehicle_id=? and operational_active",UUID.fromString(saved.path("id").asText()));assertFalse(saved().path("canAssociate").asBoolean());
        var foreign=account();mvc.perform(get(SAVED).header("Authorization",bearer(foreign))).andExpect(content().json("[]"));mvc.perform(associate(a,saved,UUID.randomUUID().toString(),"PARKED").with(req->{req.removeHeader("Authorization");req.addHeader("Authorization",bearer(foreign));return req;})).andExpect(status().isNotFound());
    }
    @Test void exceptionalDeliveryRollsBackCustodyAndAuditTogether()throws Exception{
        jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);var pending=vehicleRow();var ops=operator("OPERACIONES");var tx=new org.springframework.transaction.support.TransactionTemplate(transactions);
        assertThrows(IllegalStateException.class,()->tx.execute(status->{valet.exceptionalDelivery(ops,PROPERTY,vehicle,Instant.parse(pending.path("updatedAt").asText()));throw new IllegalStateException("rollback");}));
        assertEquals("PARKED",vehicleRow().path("location").asText());assertFalse(saved().path("canAssociate").asBoolean());assertEquals(0,jdbc.queryForObject("select count(*) from reservation_audit_events where entity_id=? and action='VALET_EXCEPTIONAL_DELIVERY'",Integer.class,vehicle));
    }
    @Test void reuseAcrossAuthorizedGuestPropertiesDoesNotLeakOperationalDataOrBypassSavedOwnership()throws Exception{
        var otherProperty=UUID.randomUUID();var profile=profile(null,"Other","Property",null);var r=UUID.randomUUID();var s=UUID.randomUUID();var type=UUID.randomUUID();
        jdbc.update("insert into properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) select ?,organization_id,'QA other property',?,'America/Guatemala','GTQ','ACTIVE',now(),now() from properties where id=?",otherProperty,otherProperty.toString(),PROPERTY);
        jdbc.update("insert into room_types(id,property_id,code,name) values (?,?,?,'QA type')",type,otherProperty,type.toString());
        jdbc.update("insert into reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) values (?,?,?,?,'CONFIRMED','GTQ','WEB_DIRECTA',now(),now())",r,otherProperty,profile,r.toString().substring(0,16));
        jdbc.update("insert into reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) values (?,?,?,?,?,?,'IN_HOUSE',now(),now())",s,r,otherProperty,type,date,date.plusDays(2));
        var challenge=UUID.randomUUID();jdbc.update("insert into reservation_link_challenges(id,guest_account_id,guest_session_id,reservation_id,property_id,booking_guest_profile_id,confirmation_fingerprint,status,attempt_count,issued_at,expires_at,consumed_at) values (?,?,?,?,?,?,'synthetic','CONSUMED',0,now(),now()+interval '10 minutes',now())",challenge,guest.guestAccountId(),guest.sessionId(),r,otherProperty,profile);
        jdbc.update("insert into guest_reservation_links(reservation_id,guest_account_id,property_id,challenge_id,linked_at) values (?,?,?,?,now())",r,guest.guestAccountId(),otherProperty,challenge);
        var original=saved();mvc.perform(associate(new UUID[]{r,s},original,UUID.randomUUID().toString(),"WITH_GUEST")).andExpect(status().isConflict());
        jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);var ops=operator("OPERACIONES");mvc.perform(release(ops,vehicleRow())).andExpect(status().isOk());
        var result=json.readTree(mvc.perform(associate(new UUID[]{r,s},saved(),UUID.randomUUID().toString(),"WITH_GUEST")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());assertEquals(otherProperty.toString(),result.path("propertyId").asText());assertFalse(result.path("hasActiveRequest").asBoolean());
        mvc.perform(get("/api/v1/properties/"+otherProperty+"/valet-vehicles").header("Authorization",token(ops))).andExpect(status().isForbidden());
        mvc.perform(get(detail(reservation,stay)+"/valet-vehicles").header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].propertyId").value(PROPERTY.toString()));
        // A foreign saved UUID remains hidden even when caller owns the target stay.
        var other=account();var foreignId=UUID.randomUUID();jdbc.update("insert into valet_saved_vehicles(id,guest_account_id,make,model,plate_prefix,plate_body,color,created_at,updated_at) values (?,?,'Other','Vehicle','P','456ABC',null,now(),now())",foreignId,other.guestAccountId());
        var input=Map.of("savedVehicleId",foreignId,"expectedVehicleUpdatedAt",original.path("updatedAt").asText(),"location","PARKED");mvc.perform(post(detail(r,s)+"/valet-vehicles/associate").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isNotFound());
    }
    private GuestPrincipal independentSession(GuestPrincipal owner){
        var session=UUID.randomUUID();jdbc.update("INSERT INTO guest_auth_sessions(id,guest_account_id,status,expires_at,created_at) VALUES (?,?,'ACTIVE',now()+interval '1 day',now())",session,owner.guestAccountId());return new GuestPrincipal(owner.guestAccountId(),session,owner.email());
    }
    private java.net.http.HttpRequest httpPost(GuestPrincipal principal,String route,String key,Object payload)throws Exception{
        return java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:"+httpPort+route)).timeout(java.time.Duration.ofSeconds(20)).header("Authorization",bearer(principal)).header("Content-Type","application/json").header("Idempotency-Key",key).POST(java.net.http.HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
    }
    @Test void independentAuthenticatedHttpClientsRaceAndReplayDiscardedAssociationAndRequestResponses()throws Exception{
        var secondGuest=independentSession(guest);assertNotEquals(guest.sessionId(),secondGuest.sessionId());
        var before=vehicleRow();jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);mvc.perform(release(operator("OPERACIONES"),vehicleRow())).andExpect(status().isOk());
        var saved=saved();var a=nextStay();var b=nextStay();var input=Map.of("savedVehicleId",saved.path("id").asText(),"expectedVehicleUpdatedAt",saved.path("updatedAt").asText(),"location","PARKED");
        var firstPost=httpPost(guest,detail(a[0],a[1])+"/valet-vehicles/associate",UUID.randomUUID().toString(),input);var secondPost=httpPost(secondGuest,detail(b[0],b[1])+"/valet-vehicles/associate",UUID.randomUUID().toString(),input);
        try(var firstClient=java.net.http.HttpClient.newHttpClient();var secondClient=java.net.http.HttpClient.newHttpClient()){
            // Separate sockets/sessions through the real server and disposable PostgreSQL.
            // Discard both response bodies: retry must recover persisted identity, not rely on a local acknowledgement.
            var first=firstClient.sendAsync(firstPost,java.net.http.HttpResponse.BodyHandlers.discarding());var second=secondClient.sendAsync(secondPost,java.net.http.HttpResponse.BodyHandlers.discarding());var firstStatus=first.get(25,TimeUnit.SECONDS).statusCode();var secondStatus=second.get(25,TimeUnit.SECONDS).statusCode();assertEquals(java.util.Set.of(201,409),java.util.Set.of(firstStatus,secondStatus));
            var winner=firstStatus==201?a:b;var retry=firstClient.send(firstStatus==201?firstPost:secondPost,java.net.http.HttpResponse.BodyHandlers.ofString());assertEquals(200,retry.statusCode());var associated=json.readTree(retry.body());var association=UUID.fromString(associated.path("id").asText());
            assertNotEquals(before.path("id").asText(),association.toString());assertEquals(saved.path("id").asText(),associated.path("savedVehicleId").asText());assertEquals(1,jdbc.queryForObject("select count(*) from valet_vehicles where saved_vehicle_id=? and operational_active",Integer.class,UUID.fromString(saved.path("id").asText())));assertEquals(1,jdbc.queryForObject("select count(*) from reservation_audit_events where entity_id=? and action='VALET_VEHICLE_ASSOCIATED'",Integer.class,association));
            var schedule=Map.of("vehicleId",association,"serviceDate",date.toString(),"deliveryTime","09:00");var firstOrder=httpPost(guest,detail(winner[0],winner[1])+"/valet-requests",UUID.randomUUID().toString(),schedule);var secondOrder=httpPost(secondGuest,detail(winner[0],winner[1])+"/valet-requests",UUID.randomUUID().toString(),schedule);
            var firstResult=firstClient.sendAsync(firstOrder,java.net.http.HttpResponse.BodyHandlers.discarding());var secondResult=secondClient.sendAsync(secondOrder,java.net.http.HttpResponse.BodyHandlers.discarding());var firstCode=firstResult.get(25,TimeUnit.SECONDS).statusCode();var secondCode=secondResult.get(25,TimeUnit.SECONDS).statusCode();assertEquals(java.util.Set.of(201,409),java.util.Set.of(firstCode,secondCode));
            var replay=secondClient.send(firstCode==201?firstOrder:secondOrder,java.net.http.HttpResponse.BodyHandlers.ofString());assertEquals(200,replay.statusCode());var order=json.readTree(replay.body());var orderId=UUID.fromString(order.path("id").asText());assertEquals(1,jdbc.queryForObject("select count(*) from valet_requests where saved_vehicle_id=? and active",Integer.class,UUID.fromString(saved.path("id").asText())));assertEquals(1,jdbc.queryForObject("select count(*) from reservation_audit_events where entity_id=? and action='VALET_REQUESTED'",Integer.class,orderId));assertEquals("OPEN",order.path("status").asText());
            assertEquals("PARKED",jdbc.queryForObject("select location from valet_vehicles where id=?",String.class,association));
        }
        // A fresh authenticated session reads the same saved identity; no client-side persistence illusion.
        mvc.perform(get(SAVED).header("Authorization",bearer(secondGuest))).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(saved.path("id").asText()));
    }
    @Test void openInProgressAndEligibleWithGuestAllBlockAnotherOperationalAssociation()throws Exception{
        var next=nextStay();var original=saved();var row=open();var ops=operator("OPERACIONES");
        mvc.perform(associate(next,original,UUID.randomUUID().toString(),"WITH_GUEST")).andExpect(status().isConflict());
        var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());mvc.perform(associate(next,original,UUID.randomUUID().toString(),"PARKED")).andExpect(status().isConflict());
        mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());assertEquals("WITH_GUEST",vehicleRow().path("location").asText());assertFalse(saved().path("canAssociate").asBoolean());mvc.perform(associate(next,original,UUID.randomUUID().toString(),"PARKED")).andExpect(status().isConflict());
        jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);assertTrue(saved().path("canAssociate").asBoolean());mvc.perform(associate(next,original,UUID.randomUUID().toString(),"PARKED")).andExpect(status().isCreated()).andExpect(jsonPath("$.location").value("PARKED")).andExpect(jsonPath("$.hasActiveRequest").value(false));
    }
    @Test void associationHasClosedBodyStrictAuthVersionsAndHttpNegatives()throws Exception{
        var next=nextStay();var saved=saved();var route=detail(next[0],next[1])+"/valet-vehicles/associate";var base=Map.of("savedVehicleId",saved.path("id").asText(),"expectedVehicleUpdatedAt",saved.path("updatedAt").asText(),"location","PARKED");
        var extra=new java.util.HashMap<String,Object>(base);extra.put("propertyId",PROPERTY);
        var invalidLocation=new java.util.HashMap<String,Object>(base);invalidLocation.put("location","GARAGE");
        var missingVersion=new java.util.HashMap<String,Object>(base);missingVersion.remove("expectedVehicleUpdatedAt");
        for(var input:java.util.List.of(extra,invalidLocation,missingVersion))mvc.perform(post(route).header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isBadRequest());
        mvc.perform(post(route).header("Authorization",bearer(guest)).contentType("application/json").content(json.writeValueAsString(base))).andExpect(status().isBadRequest());
        mvc.perform(post(route).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(base))).andExpect(status().isUnauthorized());
        mvc.perform(get(SAVED).header("Authorization",token(operator("OPERACIONES")))).andExpect(status().isUnauthorized());
        mvc.perform(associate(next,saved,UUID.randomUUID().toString(),"PARKED")).andExpect(status().isConflict());
        var forged=new java.util.HashMap<String,Object>(base);forged.put("savedVehicleId",UUID.randomUUID());
        try(var client=java.net.http.HttpClient.newHttpClient()){
            assertEquals(400,client.send(httpPost(guest,route,UUID.randomUUID().toString(),extra),java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode());
            assertEquals(400,client.send(httpPost(guest,route,UUID.randomUUID().toString(),missingVersion),java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode());
            assertEquals(404,client.send(httpPost(guest,route,UUID.randomUUID().toString(),forged),java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode());
            var ops=operator("OPERACIONES");var unauthorizedProperty="/api/v1/properties/"+UUID.randomUUID()+"/valet-vehicles/"+vehicle+"/release";var versionBody=json.writeValueAsString(Map.of("expectedUpdatedAt",vehicleRow().path("updatedAt").asText()));
            var denied=java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:"+httpPort+unauthorizedProperty)).header("Authorization",token(ops)).header("Content-Type","application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString(versionBody)).build();assertEquals(403,client.send(denied,java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode());
            var noSession=java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:"+httpPort+route)).header("Content-Type","application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString(json.writeValueAsString(base))).build();assertEquals(401,client.send(noSession,java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode());
            var directError=java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:"+httpPort+"/error")).GET().build();assertEquals(401,client.send(directError,java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode());
        }
        mvc.perform(post(route).header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(forged))).andExpect(status().isNotFound());
        var revoked=independentSession(guest);jdbc.update("update guest_auth_sessions set status='REVOKED' where id=?",revoked.sessionId());mvc.perform(get(SAVED).header("Authorization",bearer(revoked))).andExpect(status().isUnauthorized());
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
