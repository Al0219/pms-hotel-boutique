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
class AmenitiesRealIntegrationTests {
    private static final String SCHEMA = "amenities_" + UUID.randomUUID().toString().replace("-", "");

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
    @Autowired com.pms.hotelboutique.backend.modules.operations.application.AmenitiesRequestService amenities;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    private GuestPrincipal guest;
    private UUID reservation, stay;
    private LocalDate date;
    @BeforeEach void setup() {
        guest = account(); date = LocalDate.now(java.time.ZoneId.of("America/Guatemala")).plusDays(1);
        UUID p = profile(null, "Housekeeping", "Fixture", null);
        reservation = reservation(p, "CONFIRMED"); stay = stay(reservation, date, "IN_HOUSE"); link(guest, reservation, p);
    }
    private String path() { return detail(reservation, stay) + "/amenities-requests"; }
    private UUID product(String code) { return jdbc.queryForObject("select id from amenities_catalog where property_id=? and code=?",UUID.class,PROPERTY,code); }
    private Map<String,Object> line(String code,int quantity) { return Map.of("itemId",product(code).toString(),"quantity",quantity); }
    private Map<String, Object> body() { return Map.of("serviceDate", date.toString(), "deliveryTime", "09:00", "items",java.util.List.of(line("extra-towels",2),line("dental-kit",1)),"notes","  Entregar en puerta  "); }
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
    private String staffRoute() { return "/api/v1/properties/"+PROPERTY+"/service-requests/amenities"; }
    private String token(StaffPrincipal p) { return "Bearer "+staffJwt.issue(p,Instant.now()); }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder transition(StaffPrincipal p,tools.jackson.databind.JsonNode row,String target) throws Exception {
        return put(staffRoute()+"/"+row.path("id").asText()+"/status").header("Authorization",token(p)).contentType("application/json")
            .content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText(),"targetStatus",target)));
    }
    @Test void catalogCreatePersistAndReadSnapshotsWithoutFinancialOrRoomEffects() throws Exception {
        mvc.perform(get(detail(reservation,stay)+"/amenities-catalog").header("Authorization",bearer(guest))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5));
        int folios=jdbc.queryForObject("select count(*) from folio_movements",Integer.class),payments=jdbc.queryForObject("select count(*) from public_booking_receipts",Integer.class),physical=jdbc.queryForObject("select count(*) from hk_room_states",Integer.class);
        var row=open();assertFalse(row.has("totalMinor"));assertFalse(row.has("currency"));assertEquals("Entregar en puerta",row.path("notes").asText());
        assertEquals("AMENITIES",jdbc.queryForObject("select category from service_requests where id=?",String.class,UUID.fromString(row.path("id").asText())));
        assertEquals(date.atTime(9,0).atZone(java.time.ZoneId.of("America/Guatemala")).toInstant(),jdbc.queryForObject("select due_at from service_requests where id=?",java.sql.Timestamp.class,UUID.fromString(row.path("id").asText())).toInstant());
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(status().isOk()).andExpect(jsonPath("$[0].items.length()").value(2));
        assertEquals(2,jdbc.queryForObject("select count(*) from amenities_request_lines where request_id=?",Integer.class,UUID.fromString(row.path("id").asText())));
        assertEquals(folios,jdbc.queryForObject("select count(*) from folio_movements",Integer.class));assertEquals(payments,jdbc.queryForObject("select count(*) from public_booking_receipts",Integer.class));assertEquals(physical,jdbc.queryForObject("select count(*) from hk_room_states",Integer.class));
        assertEquals(1,audit(row,"AMENITIES_REQUESTED"));
    }
    @Test void retriesReuseSnapshotAfterEditCancellationCatalogOrStayChangesAndRejectDifferentIntent() throws Exception {
        var key=UUID.randomUUID().toString();var payload=body();var row=json.readTree(mvc.perform(create(key,payload)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mvc.perform(edit(row,editBody(row,"Edited"))).andExpect(status().isOk());
        var edited=json.readTree(mvc.perform(get(path()).header("Authorization",bearer(guest))).andReturn().getResponse().getContentAsString()).get(0);
        mvc.perform(cancel(edited)).andExpect(status().isOk());jdbc.update("update reservations set status='CANCELLED' where id=?",reservation);
        mvc.perform(create(key,payload)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(row.path("id").asText())).andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(jsonPath("$.notes").value("Edited"));
        var changed=new java.util.HashMap<String,Object>(payload);changed.put("notes","Otra nota");mvc.perform(create(key,changed)).andExpect(status().isConflict());assertEquals(1,audit(row,"AMENITIES_REQUESTED"));
    }
    @Test void rejectsForgedPricesIdentityDuplicateProductsInvalidQuantitiesAndForeignProducts() throws Exception {
        for(String field:new String[]{"guestAccountId","propertyId","roomId","totalMinor","unitPriceMinor","lateCheckout"}) {var payload=new java.util.HashMap<String,Object>(body());payload.put(field,"forged");mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());}
        for(int quantity:new int[]{0,6,-1}) {var payload=new java.util.HashMap<String,Object>(body());payload.put("items",java.util.List.of(line("dental-kit",quantity)));mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());}
        for(Object lines:java.util.List.of(java.util.List.of(line("dental-kit",1),line("dental-kit",1)),java.util.List.of(Map.of("itemId",UUID.randomUUID().toString(),"quantity",1)),java.util.List.of(Map.of("itemId",product("dental-kit").toString(),"quantity",1,"unitPriceMinor",1)))) {
            var payload=new java.util.HashMap<String,Object>(body());payload.put("items",lines);mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());
        }
        var fractional=new java.util.HashMap<String,Object>(body());fractional.put("items",java.util.List.of(Map.of("itemId",product("dental-kit").toString(),"quantity",1.5)));mvc.perform(create(UUID.randomUUID().toString(),fractional)).andExpect(status().isBadRequest());
        assertEquals(0,jdbc.queryForObject("select count(*) from amenities_requests where stay_id=?",Integer.class,stay));
    }
    @Test void verifiesGuestOwnershipAndKeepsStaffAndGuestCompletelySeparate() throws Exception {
        var row=open();var other=account();
        mvc.perform(get(path()).header("Authorization",bearer(other))).andExpect(status().isNotFound());
        mvc.perform(create(UUID.randomUUID().toString(),body()).with(req->{req.removeHeader("Authorization");req.addHeader("Authorization",bearer(other));return req;})).andExpect(status().isNotFound());
        mvc.perform(cancel(row).with(req->{req.removeHeader("Authorization");req.addHeader("Authorization",bearer(other));return req;})).andExpect(status().isNotFound());
        mvc.perform(edit(row,editBody(row,"Ajena")).with(req->{req.removeHeader("Authorization");req.addHeader("Authorization",bearer(other));return req;})).andExpect(status().isNotFound());
        mvc.perform(get(path()).header("Authorization",token(operator("OPERACIONES")))).andExpect(status().isUnauthorized());mvc.perform(get(path())).andExpect(status().isUnauthorized());
        mvc.perform(get(staffRoute()).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
    }
    @Test void editsSameIdScheduleAndQuantitiesKeepSnapshotAndAuditWithoutNotes() throws Exception {
        var row=open();jdbc.update("update amenities_catalog set name='Nuevo nombre' where id=?",product("dental-kit"));
        try {
            var payload=editBody(row,"  CONFIDENTIAL NOTE  ");payload.put("items",java.util.List.of(line("dental-kit",3)));payload.put("deliveryTime","14:00");
            var changed=json.readTree(mvc.perform(edit(row,payload)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(row.path("id").asText())).andExpect(jsonPath("$.items[0].quantity").value(3)).andExpect(jsonPath("$.items[0].itemName").value("Kit dental")).andExpect(jsonPath("$.notes").value("CONFIDENTIAL NOTE")).andReturn().getResponse().getContentAsString());
            assertEquals(date.atTime(14,0).atZone(java.time.ZoneId.of("America/Guatemala")).toInstant(),jdbc.queryForObject("select due_at from service_requests where id=?",java.sql.Timestamp.class,UUID.fromString(row.path("id").asText())).toInstant());
            mvc.perform(edit(row,payload)).andExpect(status().isOk());assertEquals(1,audit(row,"AMENITIES_EDITED"));
            String audit=jdbc.queryForObject("select after_state from reservation_audit_events where entity_id=? and action='AMENITIES_EDITED'",String.class,UUID.fromString(row.path("id").asText()));assertFalse(audit.contains("CONFIDENTIAL"));assertTrue(audit.contains("quantity"));
            mvc.perform(edit(row,editBody(row,"Stale"))).andExpect(status().isConflict());assertNotEquals(row.path("updatedAt").asText(),changed.path("updatedAt").asText());
        }finally{jdbc.update("update amenities_catalog set name='Kit dental' where id=?",product("dental-kit"));}
    }
    @Test void cancellationIsSoftIdempotentAndCutoffUsesPersistedSchedule() throws Exception {
        var row=open();mvc.perform(cancel(row)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));mvc.perform(cancel(row)).andExpect(status().isOk());assertEquals(1,audit(row,"AMENITIES_CANCELLED"));
        mvc.perform(edit(row,editBody(row,"After cancellation"))).andExpect(status().isConflict());assertEquals(1,jdbc.queryForObject("select count(*) from amenities_requests where stay_id=?",Integer.class,stay));
        var late=open();jdbc.update("update service_requests set due_at=now()+interval '24 minutes' where id=?",UUID.fromString(late.path("id").asText()));
        mvc.perform(cancel(late)).andExpect(status().isConflict());mvc.perform(edit(late,editBody(late,"Too late"))).andExpect(status().isConflict());
    }
    @Test void staffLifecycleHasPermissionsScopeAuditAndNoGuestCompletion() throws Exception {
        var row=open();var intake=operator("RECEPCION");var ops=operator("OPERACIONES");
        mvc.perform(get(staffRoute()).header("Authorization",token(intake))).andExpect(status().isOk());
        mvc.perform(transition(intake,row,"IN_PROGRESS")).andExpect(status().isForbidden());mvc.perform(transition(ops,row,"DONE")).andExpect(status().isConflict());
        mvc.perform(put(staffRoute().replace(PROPERTY.toString(),UUID.randomUUID().toString())+"/"+row.path("id").asText()+"/status").header("Authorization",token(ops)).contentType("application/json").content(json.writeValueAsString(Map.of("expectedUpdatedAt",row.path("updatedAt").asText(),"targetStatus","IN_PROGRESS")))).andExpect(status().isForbidden());
        var started=json.readTree(mvc.perform(transition(ops,row,"IN_PROGRESS")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());mvc.perform(transition(ops,row,"IN_PROGRESS")).andExpect(status().isOk());
        mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(edit(row,editBody(row,"Changed"))).andExpect(status().isConflict());
        mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());mvc.perform(transition(ops,started,"DONE")).andExpect(status().isOk());
        mvc.perform(get(path()).header("Authorization",bearer(guest))).andExpect(jsonPath("$[0].status").value("DONE"));assertEquals(1,audit(row,"REQUEST_STARTED"));assertEquals(1,audit(row,"REQUEST_COMPLETED"));
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
        assertEquals(1,jdbc.queryForObject("select count(*) from amenities_requests where stay_id=?",Integer.class,stay));assertEquals(1,audit(row,"AMENITIES_EDITED"));
    }
    @Test void rejectsForeignItemsDatesNotesCheckoutAndIneligibleStay() throws Exception {
        for(var entry:Map.of("notes","x".repeat(501),"serviceDate",date.plusDays(3).toString(),"deliveryTime","25:00").entrySet()){var payload=new java.util.HashMap<String,Object>(body());payload.put(entry.getKey(),entry.getValue());mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());}
        var payload=new java.util.HashMap<String,Object>(body());payload.put("serviceDate",date.plusDays(2).toString());payload.put("deliveryTime","12:01");mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());
        payload.put("deliveryTime","12:00");mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isCreated());
        jdbc.update("update reservation_stays set status='CHECKED_OUT' where id=?",stay);mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
        jdbc.update("update reservation_stays set status='IN_HOUSE' where id=?",stay);jdbc.update("update reservations set status='CANCELLED' where id=?",reservation);mvc.perform(create(UUID.randomUUID().toString(),body())).andExpect(status().isConflict());
    }
    @Test void openApiHasSevenScopedOperationsClosedBodiesAndNoMoney() throws Exception {
        var doc=json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());String base="/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}";
        for(var pair:Map.of(base+"/amenities-catalog","get",base+"/amenities-requests","post",base+"/amenities-requests/{requestId}","put",base+"/amenities-requests/{requestId}/cancel","post").entrySet()){
          var op=doc.path("paths").path(pair.getKey()).path(pair.getValue());assertTrue(op.path("security").get(0).has("guestBearerAuth"));assertEquals("guest-bff-or-native",op.path("x-audience").asText());
        }
        assertTrue(doc.path("paths").path(base+"/amenities-requests").has("get"));
        var schema=doc.path("components").path("schemas");assertFalse(schema.path("AmenitiesOrderInput").path("additionalProperties").asBoolean(true));assertFalse(schema.path("AmenitiesLineInput").path("additionalProperties").asBoolean(true));
        for(String name:java.util.List.of("AmenitiesOrderInput","AmenitiesOrder","AmenitiesOrderLine","AmenityCatalogItem"))for(String field:java.util.List.of("totalMinor","unitPriceMinor","currency","lateCheckout","price"))assertFalse(schema.path(name).path("properties").has(field));
        var staff=doc.path("paths").path("/api/v1/properties/{propertyId}/service-requests/amenities/{requestId}/status").path("put");assertTrue(staff.path("security").get(0).has("bearerAuth"));assertEquals("staff",staff.path("x-audience").asText());assertTrue(staff.path("description").asText().contains("OPERATIONS_MANAGE"));
    }
    @Test void staleCancelAndRollbackNeverProduceExtraOrdersOrAudit() throws Exception {
        var row=open();var updated=json.readTree(mvc.perform(edit(row,editBody(row,"Updated"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(cancel(row)).andExpect(status().isConflict());mvc.perform(cancel(updated)).andExpect(status().isOk());
        int before=jdbc.queryForObject("select count(*) from amenities_requests where stay_id=?",Integer.class,stay);
        var tx=new org.springframework.transaction.support.TransactionTemplate(transactions);
        assertThrows(IllegalStateException.class,()->tx.execute(status->{amenities.create(guest,reservation,stay,UUID.randomUUID().toString(),new com.pms.hotelboutique.backend.modules.operations.application.AmenitiesModels.OrderInput(date,"09:00",java.util.List.of(new com.pms.hotelboutique.backend.modules.operations.application.AmenitiesModels.LineInput(product("dental-kit"),1)),null));throw new IllegalStateException("force rollback");}));
        assertEquals(before,jdbc.queryForObject("select count(*) from amenities_requests where stay_id=?",Integer.class,stay));
    }
    @Test void futurePropertiesAreProvisionedOnceAndTheirItemsCannotCrossScope() throws Exception {
        UUID property=UUID.randomUUID();UUID org=jdbc.queryForObject("select organization_id from properties where id=?",UUID.class,PROPERTY);
        jdbc.update("insert into properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) values (?,?,?,'Amenities future property','Asia/Tokyo','GTQ','ACTIVE',now(),now())",property,org,"A-"+property.toString().substring(0,8));
        assertEquals(5,jdbc.queryForObject("select count(*) from amenities_catalog where property_id=?",Integer.class,property));
        jdbc.queryForList("select provision_amenities_catalog(?)",property);assertEquals(5,jdbc.queryForObject("select count(*) from amenities_catalog where property_id=?",Integer.class,property));
        var foreign=jdbc.queryForObject("select id from amenities_catalog where property_id=? and code='dental-kit'",UUID.class,property);assertNotEquals(product("dental-kit"),foreign);
        var payload=new java.util.HashMap<String,Object>(body());payload.put("items",java.util.List.of(Map.of("itemId",foreign,"quantity",1)));mvc.perform(create(UUID.randomUUID().toString(),payload)).andExpect(status().isBadRequest());
        assertEquals(0,jdbc.queryForObject("select count(*) from amenities_requests where stay_id=?",Integer.class,stay));
    }
    @Test void concurrentStaffStartAndGuestCancelSerializeWithoutDoubleTransition() throws Exception {
        var row=open();var ops=operator("OPERACIONES");var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
          var a=pool.submit(()->{gate.await();return mvc.perform(transition(ops,row,"IN_PROGRESS")).andReturn().getResponse().getStatus();});
          var b=pool.submit(()->{gate.await();return mvc.perform(cancel(row)).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(java.util.Set.of(200,409),java.util.Set.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS)));
        }
        assertEquals(1,audit(row,"REQUEST_STARTED")+audit(row,"AMENITIES_CANCELLED"));
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
