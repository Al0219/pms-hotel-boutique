package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.domain.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.inventory.application.*;
import com.pms.hotelboutique.backend.shared.money.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class StaffCancellationIntegrationTests {
    private static final String SCHEMA="cancel_"+UUID.randomUUID().toString().replace("-","");
    private static final UUID ORG=UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    @DynamicPropertySource static void schema(DynamicPropertyRegistry p) {
        p.add("spring.datasource.hikari.connection-init-sql",() -> "CREATE SCHEMA IF NOT EXISTS "+SCHEMA+"; SET search_path TO "+SCHEMA);
        p.add("spring.liquibase.default-schema",() -> SCHEMA); p.add("spring.liquibase.liquibase-schema",() -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema",() -> SCHEMA);
    }
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper json;
    @Autowired StaffJwtService jwt; @Autowired GuestJwtService guestJwt;
    @Autowired StaffReservationCreationService creation; @Autowired StaffReservationCancellationService cancellation;
    @Autowired StaffFolioService finance; @Autowired PublicBookingService publicBooking;
    @Autowired AvailabilityService availability; @Autowired StaffStayLifecycleService lifecycle;
    @MockitoSpyBean AuditService audit;
    @MockitoSpyBean FolioService postings;
    private UUID property,type,reservation,folio; private StaffPrincipal actor;
    private LocalDate arrival,departure;

    @BeforeEach void fixtures() {
        property=UUID.randomUUID(); type=UUID.randomUUID(); arrival=LocalDate.now(ZoneId.of("America/Guatemala")); departure=arrival.plusDays(2);
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'Cancellation QA','America/Guatemala','GTQ','ACTIVE',now(),now())",property,ORG,property.toString());
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','Cancellation standard')",type,property);
        for(int n=0;n<4;n++)jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",UUID.randomUUID(),property,type,"C"+n);
        actor=staff("RECEPCION",property);
        reservation=creation.create(actor,property,key(),new StaffReservationCreationService.Request(arrival,departure,2,type,"DEMO_STANDARD","GTQ",260000L,
                new StaffReservationCreationService.Guest("QA","Cancellation","cancel@example.test","+50255551234"),"Solicitud original del huésped")).reservationId();
        folio=jdbc.queryForObject("SELECT id FROM folios WHERE reservation_id=?",UUID.class,reservation);
    }
    @AfterAll void cleanup() {jdbc.execute("DROP SCHEMA "+SCHEMA+" CASCADE");}

    @ParameterizedTest @ValueSource(longs={0,10000,104000,260000})
    void httpCancellationUsesOriginalChargeAndKeepsCreditOrDebtWithoutChangingHistory(long paid) throws Exception {
        if(paid>0)pay(paid);
        var before=ledger(); int ats=availability.calculateATS(property,type,new StayDateRange(arrival,departure));
        var preview=preview(); assertTrue(preview.canCancel()); assertEquals(260000,preview.financial().accommodationMinor());
        assertEquals(26000,preview.financial().penaltyMinor()); assertEquals(26000-paid,preview.financial().balanceAfterMinor());
        String key=key(); var body=Map.of("expectedFingerprint",preview.fingerprint(),"reason","Cambio de planes");
        var result=postCancel(key,body,200);
        assertEquals("CANCELLED",result.path("status").asText()); assertEquals(2,result.path("staysCancelled").asInt());
        assertEquals(26000-paid,result.path("financial").path("balanceAfterMinor").asLong());
        assertEquals(26000-paid,jdbc.queryForObject("SELECT SUM(amount_minor) FROM folio_movements WHERE folio_id=?",Long.class,folio));
        assertEquals(ats+2,availability.calculateATS(property,type,new StayDateRange(arrival,departure)));
        assertEquals(2,count("SELECT count(*) FROM reservation_stays WHERE reservation_id=? AND status='CANCELLED'",reservation));
        assertEquals("Solicitud original del huésped",jdbc.queryForObject("SELECT notes FROM reservations WHERE id=?",String.class,reservation));
        assertEquals("OPEN",jdbc.queryForObject("SELECT status FROM folios WHERE id=?",String.class,folio));
        var after=ledger(); before.forEach((id,hash) -> assertEquals(hash,after.get(id)));
        assertEquals(before.size()+2,after.size()); assertEquals(paid>0?1:0,count("SELECT count(*) FROM folio_movements WHERE folio_id=? AND kind='PAYMENT'",folio));
        assertEquals(1,count("SELECT count(*) FROM reservation_audit_events WHERE entity_id=? AND action='STAFF_RESERVATION_CANCELLED'",reservation));
        assertEquals(result,postCancel(key,body,200)); assertEquals(after,ledger());
        assertEquals("IDEMPOTENCY_KEY_REUSED",postCancel(key,Map.of("expectedFingerprint",preview.fingerprint(),"reason","Otro motivo"),409).path("code").asText());
        assertEquals("ALREADY_CANCELLED",postCancel(key(),body,409).path("code").asText());
        // HTTP JSON may use IntNode for small numbers; the Java receipt correctly uses long minor units.
        // Compare the typed contract rather than Jackson's internal numeric node representation.
        assertEquals(json.treeToValue(result,StaffCancellationModels.Result.class),cancellation.preview(actor,property,reservation).completed());
    }

    @Test void publicPaidBookingCancellationDoesNotChangeItsImmutableOriginalReceipt() {
        var request=new PublicBookingRequest(property,arrival,departure,"GTQ",130000L,
                List.of(new PublicBookingRequest.Stay(type,"DEMO_STANDARD",1)),new PublicBookingRequest.BookingGuest("Public","QA","public@example.test"),PublicBookingRequest.PaymentMode.SIMULATED_CARD);
        String publicKey=key(); var booked=publicBooking.book(publicKey,request);
        var p=cancellation.preview(actor,property,booked.reservationId());
        var result=cancellation.cancel(actor,property,booked.reservationId(),key(),p.fingerprint(),"Cancelación de QA");
        assertEquals(117000,result.financial().creditMinor());
        assertEquals(booked,publicBooking.book(publicKey,request));
    }

    @Test void laterDebtCollectionDoesNotRepriceTheCancellationReceiptAndRevokedSessionsCannotReplayIt() throws Exception {
        var p=preview(); String operationKey=key();
        var result=cancellation.cancel(actor,property,reservation,operationKey,p.fingerprint(),"Solicitud del huésped");
        pay(10000);
        assertEquals(16000,jdbc.queryForObject("SELECT SUM(amount_minor) FROM folio_movements WHERE folio_id=?",Long.class,folio));
        assertEquals(result,cancellation.cancel(actor,property,reservation,operationKey,p.fingerprint(),"Solicitud del huésped"));
        assertEquals(result,preview().completed());
        var before=ledger();
        jdbc.update("UPDATE auth_sessions SET status='REVOKED' WHERE id=?",actor.sessionId());
        mvc.perform(post(path()).param("propertyId",property.toString()).header("Authorization",bearer(actor))
                .header("Idempotency-Key",operationKey).contentType("application/json")
                .content(json.writeValueAsString(Map.of("expectedFingerprint",p.fingerprint(),"reason","Solicitud del huésped"))))
                .andExpect(status().isUnauthorized());
        assertEquals(before,ledger());
    }

    @Test void additionalPaymentOrAssignmentMakesThePreviewStaleWithoutPartialChanges() throws Exception {
        var p=preview(); pay(10000); var before=ledger();
        assertEquals("STALE_PREVIEW",postCancel(key(),Map.of("expectedFingerprint",p.fingerprint(),"reason","QA"),409).path("code").asText());
        assertEquals(before,ledger()); assertEquals("CONFIRMED",bookingStatus());
        var next=preview(); UUID room=jdbc.queryForObject("SELECT id FROM rooms WHERE property_id=? ORDER BY code LIMIT 1",UUID.class,property);
        jdbc.update("UPDATE reservation_stays SET room_id=? WHERE id=(SELECT id FROM reservation_stays WHERE reservation_id=? ORDER BY id LIMIT 1)",room,reservation);
        assertEquals("STALE_PREVIEW",postCancel(key(),Map.of("expectedFingerprint",next.fingerprint(),"reason","QA"),409).path("code").asText());
        assertEquals(before,ledger());
    }

    @ParameterizedTest @ValueSource(strings={"IN_HOUSE","CHECKED_OUT","NO_SHOW","CANCELLED"})
    void anyNonReservedStayBlocksTheEntireGroup(String state) {
        var before=ledger(); var p=preview();
        jdbc.update("UPDATE reservation_stays SET status=? WHERE id=(SELECT id FROM reservation_stays WHERE reservation_id=? ORDER BY id LIMIT 1)",state,reservation);
        assertFalse(preview().canCancel());
        assertThrows(StaffReservationCancellationService.Conflict.class,() -> cancellation.cancel(actor,property,reservation,key(),p.fingerprint(),"QA"));
        assertEquals(before,ledger()); assertEquals("CONFIRMED",bookingStatus());
    }

    @Test void unknownFinancialBasisAdditionalChargesOrAdjustmentsRequireReview() {
        finance.postCharge(actor,property,folio,new FolioService.MovementAmount(new MonetaryAmount(new MinorUnits(100),Currency.getInstance("GTQ")),"Servicio adicional"));
        assertEquals("FINANCIAL_REVIEW_REQUIRED",preview().blockingCode());
    }

    @Test void failureInAuditRollsBackCompensationPenaltyAndAllStatusChanges() {
        var before=ledger(); var p=preview();
        doAnswer(call -> {var command=(AuditService.RecordAuditCommand)call.getArgument(0);
            if(command.action().equals("STAFF_RESERVATION_CANCELLED"))throw new IllegalStateException("synthetic rollback");
            return call.callRealMethod();}).when(audit).record(any());
        assertThrows(IllegalStateException.class,() -> cancellation.cancel(actor,property,reservation,key(),p.fingerprint(),"QA"));
        assertEquals(before,ledger()); assertEquals("CONFIRMED",bookingStatus());
        assertEquals(2,count("SELECT count(*) FROM reservation_stays WHERE reservation_id=? AND status='RESERVED'",reservation));
    }

    @Test void assignedPhysicalRoomAndCleaningStateArePreserved() {
        UUID room=jdbc.queryForObject("SELECT id FROM rooms WHERE property_id=? ORDER BY code LIMIT 1",UUID.class,property);
        jdbc.update("UPDATE reservation_stays SET room_id=? WHERE id=(SELECT id FROM reservation_stays WHERE reservation_id=? ORDER BY id LIMIT 1)",room,reservation);
        jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,'INSPECTED',false,now(),now())",UUID.randomUUID(),property,room);
        int cleaningBefore=count("SELECT count(*) FROM hk_room_states WHERE property_id=?",property);
        var cleaningHash=jdbc.queryForObject("SELECT md5(row_to_json(h)::text) FROM hk_room_states h WHERE property_id=? AND room_id=?",String.class,property,room);
        var p=preview(); cancellation.cancel(actor,property,reservation,key(),p.fingerprint(),"QA");
        assertEquals(1,count("SELECT count(*) FROM reservation_stays WHERE reservation_id=? AND room_id=?",reservation,room));
        assertEquals(4,count("SELECT count(*) FROM rooms WHERE property_id=?",property));
        assertEquals(cleaningBefore,count("SELECT count(*) FROM hk_room_states WHERE property_id=?",property));
        assertEquals(cleaningHash,jdbc.queryForObject("SELECT md5(row_to_json(h)::text) FROM hk_room_states h WHERE property_id=? AND room_id=?",String.class,property,room));
    }

    @Test void simultaneousReplayProducesOnePenaltyAndProtectsTerminalStays() throws Exception {
        var p=preview(); String key=key();
        try(var pool=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            Callable<StaffCancellationModels.Result> work=() -> {assertTrue(start.await(10,TimeUnit.SECONDS));return cancellation.cancel(actor,property,reservation,key,p.fingerprint(),"QA");};
            var a=pool.submit(work); var b=pool.submit(work); start.countDown();
            assertEquals(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS));
        }
        assertEquals(3,ledger().size()); assertEquals("CANCELLED",bookingStatus());
        var stay=jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=? LIMIT 1",UUID.class,reservation);
        var version=jdbc.queryForObject("SELECT updated_at FROM reservation_stays WHERE id=?",java.sql.Timestamp.class,stay).toInstant();
        assertThrows(StaffStayLifecycleService.Conflict.class,() -> lifecycle.checkIn(actor,property,reservation,stay,key(),
                new StaffStayLifecycleService.Expectation(ReservationStay.Status.RESERVED,version,null)));
    }

    @Test void checkInWaitsForCancellationTransactionAndCannotEnterACancelledStay() throws Exception {
        var p=preview(); var reached=new CountDownLatch(1); var release=new CountDownLatch(1);
        UUID stay=jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=? LIMIT 1",UUID.class,reservation);
        Instant version=jdbc.queryForObject("SELECT updated_at FROM reservation_stays WHERE id=?",java.sql.Timestamp.class,stay).toInstant();
        doAnswer(call -> {var result=call.callRealMethod();reached.countDown();assertTrue(release.await(10,TimeUnit.SECONDS));return result;})
                .when(postings).postReversal(eq(folio),any(),any(),any());
        try(var pool=Executors.newFixedThreadPool(2)) {
            var cancel=pool.submit(() -> cancellation.cancel(actor,property,reservation,key(),p.fingerprint(),"QA carrera"));
            try {
                assertTrue(reached.await(10,TimeUnit.SECONDS));
                var checkIn=pool.submit(() -> lifecycle.checkIn(actor,property,reservation,stay,key(),
                        new StaffStayLifecycleService.Expectation(ReservationStay.Status.RESERVED,version,null)));
                assertThrows(TimeoutException.class,() -> checkIn.get(300,TimeUnit.MILLISECONDS));
                release.countDown(); assertEquals("CANCELLED",cancel.get(15,TimeUnit.SECONDS).status());
                var failure=assertThrows(ExecutionException.class,() -> checkIn.get(15,TimeUnit.SECONDS));
                assertInstanceOf(StaffStayLifecycleService.Conflict.class,failure.getCause());
            } finally {release.countDown();}
        }
        assertEquals(3,ledger().size()); assertEquals("CANCELLED",bookingStatus());
        assertEquals(0,count("SELECT count(*) FROM reservation_stays WHERE reservation_id=? AND status='IN_HOUSE'",reservation));
    }

    @Test void authorizationQueryAndBodiesFailClosed() throws Exception {
        mvc.perform(get(path()+"-preview").param("propertyId",property.toString())).andExpect(status().isUnauthorized());
        String guest=guestJwt.issue(new GuestPrincipal(UUID.randomUUID(),UUID.randomUUID(),"guest@example.test"),Instant.now());
        mvc.perform(get(path()+"-preview").param("propertyId",property.toString()).header("Authorization","Bearer "+guest)).andExpect(status().isUnauthorized());
        var foreign=staff("RECEPCION",UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d"));
        mvc.perform(get(path()+"-preview").param("propertyId",property.toString()).header("Authorization",bearer(foreign))).andExpect(status().isForbidden());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='RECEPCION' AND permission_code='FOLIO_PAYMENT_OPERATE'");
        try {mvc.perform(get(path()+"-preview").param("propertyId",property.toString()).header("Authorization",bearer(actor))).andExpect(status().isForbidden());}
        finally {jdbc.update("INSERT INTO role_permissions(role_code,permission_code) VALUES ('RECEPCION','FOLIO_PAYMENT_OPERATE')");}
        var p=preview();
        for(String reason:List.of(" ","x".repeat(256),"A\0B"))postCancel(key(),Map.of("expectedFingerprint",p.fingerprint(),"reason",reason),400);
        postCancel(key(),Map.of("expectedFingerprint",p.fingerprint(),"reason","QA","penaltyMinor",1),400);
        mvc.perform(get(path()+"-preview").param("propertyId",property.toString(),property.toString()).header("Authorization",bearer(actor))).andExpect(status().isBadRequest());
        assertEquals("CONFIRMED",bookingStatus()); assertEquals(1,ledger().size());
    }

    @Test void openApiDocumentsPolicyRolesClosedBodyAndNullableBlockedPreview() throws Exception {
        var doc=json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var op=doc.path("paths").path("/api/v1/reservations/{reservationId}/cancellation").path("post");
        assertEquals("staff",op.path("x-audience").asText()); assertTrue(op.path("security").get(0).has("bearerAuth"));
        var schemas=doc.path("components").path("schemas");
        assertFalse(schemas.path("StaffCancellationRequest").path("additionalProperties").asBoolean(true));
        assertEquals(255,schemas.path("StaffCancellationRequest").path("properties").path("reason").path("maxLength").asInt());
        assertEquals("null",schemas.path("StaffCancellationPreview").path("properties").path("financial").path("anyOf").get(1).path("type").asText());
    }

    private StaffCancellationModels.Preview preview(){return cancellation.preview(actor,property,reservation);}
    private void pay(long amount){finance.postPayment(actor,property,folio,new FolioService.MovementAmount(new MonetaryAmount(new MinorUnits(amount),Currency.getInstance("GTQ")),"Abono QA"));}
    private String path(){return "/api/v1/reservations/"+reservation+"/cancellation";}
    private String key(){return "cancel-"+UUID.randomUUID();}
    private String bearer(StaffPrincipal p){return "Bearer "+jwt.issue(p,Instant.now());}
    private String bookingStatus(){return jdbc.queryForObject("SELECT status FROM reservations WHERE id=?",String.class,reservation);}
    private int count(String sql,Object...args){return jdbc.queryForObject(sql,Integer.class,args);}
    private JsonNode postCancel(String key,Object body,int expected) throws Exception {
        return json.readTree(mvc.perform(post(path()).param("propertyId",property.toString()).header("Authorization",bearer(actor))
                .header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(body)))
                .andExpect(status().is(expected)).andExpect(header().string("Cache-Control","private, no-store")).andReturn().getResponse().getContentAsString());
    }
    private Map<UUID,String> ledger(){var result=new HashMap<UUID,String>(); jdbc.query("SELECT id,md5(row_to_json(m)::text) AS hash FROM folio_movements m WHERE folio_id=?",row -> {result.put(row.getObject("id",UUID.class),row.getString("hash"));},folio);return result;}
    private StaffPrincipal staff(String role,UUID prop){
        UUID id=UUID.randomUUID(),session=UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'test-only',?,'ACTIVE',now(),now())",id,id.toString(),id+"@example.test",role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,ORG,role);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,ORG,prop);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        return new StaffPrincipal(id,session,id.toString(),role);
    }
}
