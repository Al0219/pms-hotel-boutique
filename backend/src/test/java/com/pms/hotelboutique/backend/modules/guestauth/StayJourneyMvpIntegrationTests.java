package com.pms.hotelboutique.backend.modules.guestauth;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.operations.application.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class StayJourneyMvpIntegrationTests {
 private static final String SCHEMA="journey_"+UUID.randomUUID().toString().replace("-","");
 private static final UUID PROPERTY=UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
 @DynamicPropertySource static void schema(DynamicPropertyRegistry p){p.add("spring.datasource.hikari.connection-init-sql",()->"CREATE SCHEMA IF NOT EXISTS "+SCHEMA+"; SET search_path TO "+SCHEMA);p.add("spring.liquibase.default-schema",()->SCHEMA);p.add("spring.liquibase.liquibase-schema",()->SCHEMA);p.add("spring.jpa.properties.hibernate.default_schema",()->SCHEMA);}
 @org.springframework.boot.test.web.server.LocalServerPort int port;
 @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper json; @Autowired GuestJwtService jwt; @Autowired StaffJwtService staffJwt;
 @Autowired RoomServiceRequestService roomService; @Autowired StayJourneyService journey;
 @AfterAll void cleanup(){jdbc.execute("DROP SCHEMA "+SCHEMA+" CASCADE");}
 private GuestPrincipal guest; private StaffPrincipal staff; private UUID reservation,stay,profile,room,type,folio;
 @BeforeEach void setup(){
  guest=account();staff=operator("RECEPCION");profile=UUID.randomUUID();reservation=UUID.randomUUID();stay=UUID.randomUUID();type=UUID.randomUUID();room=UUID.randomUUID();folio=UUID.randomUUID();
  jdbc.update("INSERT INTO guest_profiles(id,first_name,last_name,email,status,created_at,updated_at) VALUES (?,'Journey','QA',?,'ACTIVE',now(),now())",profile,guest.email());
  jdbc.update("INSERT INTO reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,?,'CONFIRMED','GTQ','WEB_DIRECTA',now(),now())",reservation,PROPERTY,profile,reservation.toString().substring(0,16));
  jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,'Standard')",type,PROPERTY,type.toString());
  jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",room,PROPERTY,type,room.toString());
  var today=LocalDate.now(ZoneId.of("America/Guatemala"));
  jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,room_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'RESERVED',now(),now())",stay,reservation,PROPERTY,type,room,today,today.plusDays(2));
  jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,'INSPECTED',false,now(),now())",UUID.randomUUID(),PROPERTY,room);
  link(guest);jdbc.update("INSERT INTO folios(id,property_id,type,status,reservation_id,currency,created_at,updated_at) VALUES (?,?,'GUEST','OPEN',?,'GTQ',now(),now())",folio,PROPERTY,reservation);
  jdbc.update("INSERT INTO folio_movements(id,folio_id,kind,amount_minor,currency,description,created_at) VALUES (?,?,'CHARGE',10000,'GTQ','Alojamiento',now())",UUID.randomUUID(),folio);
 }
 private String path(){return "/api/v1/guest-auth/account/reservations/"+reservation+"/stays/"+stay+"/journey";}
 private String staffPath(){return "/api/v1/properties/"+PROPERTY+"/stay-journey/"+reservation+"/"+stay;}
 private String bearer(GuestPrincipal p){return "Bearer "+jwt.issue(p,Instant.now());}
 private String token(StaffPrincipal p){return "Bearer "+staffJwt.issue(p,Instant.now());}
 private String version(){return jdbc.queryForObject("SELECT updated_at FROM reservation_stays WHERE id=?",java.sql.Timestamp.class,stay).toInstant().toString();}
 private tools.jackson.databind.JsonNode request(String kind,String key)throws Exception{return json.readTree(mvc.perform(post(path()+"/requests").header("Authorization",bearer(guest)).header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(Map.of("kind",kind,"expectedUpdatedAt",version())))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());}
 private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder payment(String key,String amount,String instrument){return post(path()+"/payments").header("Authorization",bearer(guest)).header("Idempotency-Key",key).contentType("application/json").content("{\"amount\":\""+amount+"\",\"currency\":\"GTQ\",\"instrumentToken\":\""+instrument+"\"}");}
 private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder travel(String action,String key)throws Exception{return post("/api/v1/reservations/"+reservation+"/stays/"+stay+"/"+action+"?propertyId="+PROPERTY).header("Authorization",token(staff)).header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(Map.of("expectedStatus",action.equals("check-in")?"RESERVED":"IN_HOUSE","expectedUpdatedAt",version(),"expectedRoomId",room)));}
 private long balance(){return jdbc.queryForObject("SELECT sum(amount_minor) FROM folio_movements WHERE folio_id=?",Long.class,folio);}
 @Test void guestRequestsStaffConfirmsAndPaymentsProduceRecoverableImmutableDocument()throws Exception{
  request("CHECK_IN",UUID.randomUUID().toString());assertEquals("RESERVED",jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?",String.class,stay));
  mvc.perform(travel("check-in",UUID.randomUUID().toString())).andExpect(status().isOk());
  request("CHECK_OUT",UUID.randomUUID().toString()); // Early request with debt is allowed; Staff remains authoritative.
  mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isConflict());
  for(String t:List.of("demo_card_declined","demo_gateway_error"))mvc.perform(payment(UUID.randomUUID().toString(),"30.00",t)).andExpect(status().isOk()).andExpect(jsonPath("$.movementId").isEmpty());
  assertEquals(10000,balance());String key=UUID.randomUUID().toString();
  String first=mvc.perform(payment(key,"30.00","demo_visa_approved")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  assertEquals(first,mvc.perform(payment(key,"30.00","demo_visa_approved")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());assertEquals(7000,balance());
  mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isConflict());
  mvc.perform(payment(UUID.randomUUID().toString(),"70.00","demo_mastercard_approved")).andExpect(status().isOk());
  var checkout=travel("check-out",UUID.randomUUID().toString());mvc.perform(checkout).andExpect(status().isOk());mvc.perform(checkout).andExpect(status().isOk());
  String doc=mvc.perform(get(path()+"/document").header("Authorization",bearer(guest))).andExpect(status().isOk()).andExpect(jsonPath("$.snapshot.disclaimer").value("Documento informativo — sin validez fiscal")).andExpect(jsonPath("$.snapshot.balance").value("0.00")).andExpect(jsonPath("$.snapshot.charges").value("100.00")).andExpect(jsonPath("$.snapshot.payments").value("100.00")).andReturn().getResponse().getContentAsString();
  jdbc.update("UPDATE guest_profiles SET first_name='Changed' WHERE id=?",profile);
  assertEquals(doc,mvc.perform(get(staffPath()+"/document").header("Authorization",token(staff))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  assertEquals("DIRTY",jdbc.queryForObject("SELECT status FROM hk_room_states WHERE room_id=?",String.class,room));
  assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM stay_informative_documents WHERE stay_id=?",Integer.class,stay));
  assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM stay_journey_requests WHERE stay_id=? AND status='DONE'",Integer.class,stay));
  assertThrows(Exception.class,()->jdbc.update("UPDATE stay_informative_documents SET snapshot='{}' WHERE stay_id=?",stay));
  assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events a JOIN folio_movements m ON m.id=a.entity_id WHERE m.folio_id=? AND a.actor_type='GUEST'",Integer.class,folio));
 }
 @Test void financialOwnershipIsVerifiedBeyondStayLinkAndRevalidatedOnReplay()throws Exception{
  var stranger=account();jdbc.update("UPDATE guest_profiles SET email=? WHERE id=?",stranger.email(),profile);
  mvc.perform(get(path()+"/requests").header("Authorization",bearer(guest))).andExpect(status().isOk());
  mvc.perform(get(path()+"/summary").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
  mvc.perform(post(path()+"/payments").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content("{\"amount\":\"10.00\",\"currency\":\"GTQ\",\"instrumentToken\":\"demo_visa_approved\"}")).andExpect(status().isNotFound());
  jdbc.update("UPDATE guest_profiles SET email=? WHERE id=?",guest.email(),profile);
  String key=UUID.randomUUID().toString();mvc.perform(payment(key,"10.00","demo_visa_approved")).andExpect(status().isOk());
  jdbc.update("UPDATE guest_profiles SET email='other@example.test' WHERE id=?",profile);
  mvc.perform(payment(key,"10.00","demo_visa_approved")).andExpect(status().isNotFound());assertEquals(9000,balance());
 }
 @Test void authorizationClosedBodiesAndUnsupportedScenariosFailSafely()throws Exception{
  mvc.perform(get(path()+"/summary")).andExpect(status().isUnauthorized());
  mvc.perform(get(staffPath()+"/summary").header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
  mvc.perform(get(staffPath()+"/summary").header("Authorization",token(operator("OPERACIONES")))).andExpect(status().isForbidden());
  mvc.perform(get(staffPath().replace(PROPERTY.toString(),UUID.randomUUID().toString())+"/summary").header("Authorization",token(staff))).andExpect(status().isForbidden());
  mvc.perform(payment(UUID.randomUUID().toString(),"101.00","demo_visa_approved")).andExpect(status().isConflict());
  mvc.perform(payment(UUID.randomUUID().toString(),"0.00","demo_visa_approved")).andExpect(status().isBadRequest());
  mvc.perform(payment(UUID.randomUUID().toString(),"1.00","untrusted-token")).andExpect(status().isBadRequest());
  mvc.perform(post(path()+"/payments").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content("{\"amount\":\"10.00\",\"currency\":\"GTQ\",\"instrumentToken\":\"demo_visa_approved\",\"pan\":\"synthetic-forbidden\"}")).andExpect(status().isBadRequest());
  jdbc.update("UPDATE folios SET currency='USD' WHERE id=?",folio);mvc.perform(get(path()+"/summary").header("Authorization",bearer(guest))).andExpect(status().isConflict());assertEquals(10000,balance());
 }
 @Test void concurrentClientsCannotOverpayAndLostResponseUsesSameReceipt()throws Exception{
  var gate=new CountDownLatch(1);String a=UUID.randomUUID().toString(),b=UUID.randomUUID().toString();
  try(var pool=Executors.newFixedThreadPool(2)){
   var x=pool.submit(()->{gate.await();return mvc.perform(payment(a,"70.00","demo_visa_approved")).andReturn().getResponse().getStatus();});
   var y=pool.submit(()->{gate.await();return mvc.perform(payment(b,"70.00","demo_visa_approved")).andReturn().getResponse().getStatus();});gate.countDown();assertEquals(Set.of(200,409),Set.of(x.get(30,TimeUnit.SECONDS),y.get(30,TimeUnit.SECONDS)));
  }
  assertEquals(3000,balance());assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM simulated_folio_payments WHERE reservation_id=?",Integer.class,reservation));
  String winning=jdbc.queryForObject("SELECT request_key FROM simulated_folio_payments WHERE reservation_id=?",String.class,reservation);
  mvc.perform(payment(winning,"70.00","demo_visa_approved")).andExpect(status().isOk());assertEquals(3000,balance());
  mvc.perform(payment(winning,"10.00","demo_visa_approved")).andExpect(status().isConflict());
 }
 @Test void roomServiceDoneChargesPersistedTotalOnceAndPendingOrdersBlockCheckout()throws Exception{
  jdbc.update("UPDATE reservation_stays SET status='IN_HOUSE' WHERE id=?",stay);
  mvc.perform(payment(UUID.randomUUID().toString(),"100.00","demo_visa_approved")).andExpect(status().isOk());
  UUID product=jdbc.queryForObject("SELECT id FROM room_service_products WHERE property_id=? AND code='coffee'",UUID.class,PROPERTY);
  String body=json.writeValueAsString(Map.of("serviceDate",LocalDate.now(ZoneId.of("America/Guatemala")).plusDays(1).toString(),"deliveryTime","09:00","items",List.of(Map.of("productId",product,"quantity",2,"mealPeriod","BEVERAGES")),"notes",""));
  var order=json.readTree(mvc.perform(post(path().replace("/journey","/room-service-orders")).header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
  mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isConflict());
  var ops=operator("OPERACIONES");UUID id=UUID.fromString(order.path("id").asText());
  var started=roomService.staffTransition(ops,PROPERTY,id,new RoomServiceModels.Transition(Instant.parse(order.path("updatedAt").asText()),"IN_PROGRESS"));
  jdbc.update("UPDATE room_service_products SET unit_price_minor=999999 WHERE id=?",product);
  RoomServiceModels.Order done;var gate=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   java.util.concurrent.Callable<RoomServiceModels.Order> complete=()->{gate.await();return roomService.staffTransition(ops,PROPERTY,id,new RoomServiceModels.Transition(started.updatedAt(),"DONE"));};
   var first=pool.submit(complete);var second=pool.submit(complete);gate.countDown();done=first.get(30,TimeUnit.SECONDS);assertEquals(done,second.get(30,TimeUnit.SECONDS));
  }
  roomService.staffTransition(ops,PROPERTY,id,new RoomServiceModels.Transition(started.updatedAt(),"DONE"));
  assertEquals(order.path("totalMinor").asLong(),balance());
  assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM room_service_folio_postings WHERE order_id=?",Integer.class,id));
  mvc.perform(post(staffPath()+"/reconcile").header("Authorization",token(staff))).andExpect(status().isOk());assertEquals(done.totalMinor(),balance());
  var projected=journey.guestSummary(guest,reservation,stay);
  var serviceLine=projected.movements().stream().filter(line->line.description().startsWith("Room Service")).findFirst().orElseThrow();
  assertEquals("Room Service · "+LocalDate.now(ZoneId.of("America/Guatemala")).plusDays(1).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM"))+" · 09:00",serviceLine.description());
  assertFalse(serviceLine.description().contains(id.toString()));
  assertEquals("Room Service · "+id,jdbc.queryForObject("SELECT m.description FROM folio_movements m JOIN room_service_folio_postings p ON p.movement_id=m.id WHERE p.order_id=?",String.class,id));

  mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isConflict());
 }
 @Autowired ServiceRequestService serviceIntake;
 private ServiceRequestService.OpenRequestCommand intake(UUID target,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category category){return new ServiceRequestService.OpenRequestCommand(PROPERTY,category,"QA service",null,null,reservation,target,null,profile,null,null);}
 @Test void checkoutIntakeIsStayScopedAndExistingRequestsRemainManageable()throws Exception{
  jdbc.update("UPDATE reservation_stays SET status='IN_HOUSE' WHERE id=?",stay);
  var previous=serviceIntake.openRequest(intake(stay,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.HOUSEKEEPING));
  UUID other=UUID.randomUUID();jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) SELECT ?,reservation_id,property_id,room_type_id,arrival,departure,'IN_HOUSE',now(),now() FROM reservation_stays WHERE id=?",other,stay);
  request("CHECK_OUT",UUID.randomUUID().toString());
  for(var category:List.of(com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.ROOM_SERVICE,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.AMENITIES,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.VALET,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.HOUSEKEEPING))assertThrows(ServiceIntakeClosed.class,()->serviceIntake.openRequest(intake(stay,category)));
  assertNotNull(serviceIntake.openRequest(intake(other,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.HOUSEKEEPING)));
  assertNotNull(serviceIntake.startProgress(previous.id(),staff.staffUserId()));
  assertEquals(10000,balance());
 }
 @Test void checkoutAndServiceCreationRaceHasASerialOutcome()throws Exception{
  jdbc.update("UPDATE reservation_stays SET status='IN_HOUSE' WHERE id=?",stay);String version=version();var gate=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var checkout=pool.submit(()->{gate.await();return journey.request(guest,reservation,stay,UUID.randomUUID().toString(),new StayJourneyService.RequestInput("CHECK_OUT",Instant.parse(version)));});
   var service=pool.submit(()->{gate.await();try{serviceIntake.openRequest(intake(stay,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.AMENITIES));return true;}catch(ServiceIntakeClosed e){return false;}});gate.countDown();assertEquals("OPEN",checkout.get(30,TimeUnit.SECONDS).status());service.get(30,TimeUnit.SECONDS);
  }
  assertThrows(ServiceIntakeClosed.class,()->serviceIntake.openRequest(intake(stay,com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Category.VALET)));
  assertEquals(10000,balance());
 }
 @Test void emissionRejectsClientSuppliedContent()throws Exception{mvc.perform(post(path()+"/document-file").header("Authorization",bearer(guest)).contentType("application/json").content("{\"pdfBase64\":\"not-authoritative\"}")).andExpect(status().isBadRequest());}
 @Test void guestIssuesAndStaffRecoversOriginalOverHttp()throws Exception{issueAndRead(true);}
 @Test void staffIssuesAndGuestRecoversOriginalOverHttp()throws Exception{issueAndRead(false);}
 private void issueAndRead(boolean nativeFirst)throws Exception{
  mvc.perform(travel("check-in",UUID.randomUUID().toString())).andExpect(status().isOk());mvc.perform(payment(UUID.randomUUID().toString(),"100.00","demo_visa_approved")).andExpect(status().isOk());mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isOk());
  var first=json.readTree(mvc.perform(post((nativeFirst?path():staffPath())+"/document-file").header("Authorization",nativeFirst?bearer(guest):token(staff))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  var second=json.readTree(mvc.perform(get((nativeFirst?staffPath():path())+"/document-file").header("Authorization",nativeFirst?token(staff):bearer(guest))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());assertEquals(first,second);
 }
 @Test void pdfIsExplicitImmutableAndConcurrentAcrossGuestAndStaff()throws Exception{
  mvc.perform(get(path()+"/document-file").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
  mvc.perform(post(path()+"/document-file").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
  mvc.perform(travel("check-in",UUID.randomUUID().toString())).andExpect(status().isOk());
  mvc.perform(payment(UUID.randomUUID().toString(),"100.00","demo_visa_approved")).andExpect(status().isOk());
  mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isOk());
  mvc.perform(get(path()+"/document-file").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
  var gate=new CountDownLatch(1);StayJourneyService.DocumentFile first,second;
  try(var pool=Executors.newFixedThreadPool(2)){
   var a=pool.submit(()->{gate.await();return journey.guestFile(guest,reservation,stay,true);});
   var b=pool.submit(()->{gate.await();return journey.staffFile(staff,PROPERTY,reservation,stay,true);});gate.countDown();first=a.get(30,TimeUnit.SECONDS);second=b.get(30,TimeUnit.SECONDS);
  }
  assertEquals(first,second);assertEquals(first,journey.guestFile(guest,reservation,stay,false));
  byte[] bytes=Base64.getDecoder().decode(first.pdfBase64());java.nio.file.Files.write(java.nio.file.Path.of("target/stay-original-qa.pdf"),bytes);
  assertEquals(first.sha256(),HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes)));
  assertTrue(new String(bytes,java.nio.charset.Charset.forName("windows-1252")).contains("Documento informativo — sin validez fiscal"));
  assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM stay_document_files WHERE document_id=?",Integer.class,first.documentId()));
  mvc.perform(get(path()+"/document-file").header("Authorization",bearer(account()))).andExpect(status().isNotFound());
  mvc.perform(get(staffPath()+"/document-file").header("Authorization",token(operator("OPERACIONES")))).andExpect(status().isForbidden());
  mvc.perform(get(path().replace(stay.toString(),UUID.randomUUID().toString())+"/document-file").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
  assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("UPDATE stay_document_files SET pdf=? WHERE document_id=?",new byte[]{1},first.documentId()));
 }
 @Test void checkoutRequestRejectsNewServicesWithoutCreatingOrders()throws Exception{
  jdbc.update("UPDATE reservation_stays SET status='IN_HOUSE' WHERE id=?",stay);
  request("CHECK_OUT",UUID.randomUUID().toString());
  UUID product=jdbc.queryForObject("SELECT id FROM room_service_products WHERE property_id=? AND code='coffee'",UUID.class,PROPERTY);
  String body=json.writeValueAsString(Map.of("serviceDate",LocalDate.now(ZoneId.of("America/Guatemala")).plusDays(1).toString(),"deliveryTime","09:00","items",List.of(Map.of("productId",product,"quantity",1,"mealPeriod","BEVERAGES")),"notes",""));
  mvc.perform(post(path().replace("/journey","/room-service-orders")).header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(body)).andExpect(status().isConflict());
  assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM room_service_orders WHERE stay_id=?",Integer.class,stay));
 }
 @Test void requestReplayAndArrivalDateAreServerAuthoritative()throws Exception{
  jdbc.update("UPDATE reservation_stays SET arrival=arrival+1 WHERE id=?",stay);
  mvc.perform(post(path()+"/requests").header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(json.writeValueAsString(Map.of("kind","CHECK_IN","expectedUpdatedAt",version())))).andExpect(status().isConflict());
  jdbc.update("UPDATE reservation_stays SET arrival=arrival-1 WHERE id=?",stay);String key=UUID.randomUUID().toString();String originalVersion=version();var a=request("CHECK_IN",key);var b=request("CHECK_IN",key);assertEquals(a.path("id"),b.path("id"));
  mvc.perform(travel("check-in",UUID.randomUUID().toString())).andExpect(status().isOk());mvc.perform(post(path()+"/requests").header("Authorization",bearer(guest)).header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(Map.of("kind","CHECK_IN","expectedUpdatedAt",originalVersion)))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DONE"));
 }
 @Test void twoAuthenticatedHttpClientsRaceAndRecoverDiscardedPaymentResponse()throws Exception{
  UUID secondSession=UUID.randomUUID();jdbc.update("INSERT INTO guest_auth_sessions(id,guest_account_id,status,expires_at,created_at) VALUES (?,?,'ACTIVE',now()+interval '1 day',now())",secondSession,guest.guestAccountId());
  var second=new GuestPrincipal(guest.guestAccountId(),secondSession,guest.email());
  var firstClient=java.net.http.HttpClient.newHttpClient();var secondClient=java.net.http.HttpClient.newHttpClient();
  String a=UUID.randomUUID().toString(),b=UUID.randomUUID().toString();
  java.util.function.BiFunction<String,GuestPrincipal,java.net.http.HttpRequest> http=(key,identity)->java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:"+port+path()+"/payments"))
    .header("Authorization",bearer(identity)).header("Content-Type","application/json").header("Idempotency-Key",key)
    .POST(java.net.http.HttpRequest.BodyPublishers.ofString("{\"amount\":\"70.00\",\"currency\":\"GTQ\",\"instrumentToken\":\"demo_visa_approved\"}")).build();
  var gate=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var x=pool.submit(()->{gate.await();return firstClient.send(http.apply(a,guest),java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode();});
   var y=pool.submit(()->{gate.await();return secondClient.send(http.apply(b,second),java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode();});gate.countDown();
   assertEquals(Set.of(200,409),Set.of(x.get(30,TimeUnit.SECONDS),y.get(30,TimeUnit.SECONDS)));
  }
  String winning=jdbc.queryForObject("SELECT request_key FROM simulated_folio_payments WHERE reservation_id=?",String.class,reservation);
  assertEquals(200,secondClient.send(http.apply(winning,second),java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode());
  assertEquals(3000,balance());assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM folio_movements WHERE folio_id=? AND kind='PAYMENT'",Integer.class,folio));
 }
 @Test void zeroPriceRoomServiceDoesNotInventChargeOrBlockZeroBalanceDeparture()throws Exception{
  jdbc.update("UPDATE reservation_stays SET status='IN_HOUSE' WHERE id=?",stay);mvc.perform(payment(UUID.randomUUID().toString(),"100.00","demo_visa_approved")).andExpect(status().isOk());
  UUID product=jdbc.queryForObject("SELECT id FROM room_service_products WHERE property_id=? AND code='coffee'",UUID.class,PROPERTY);
  long original=jdbc.queryForObject("SELECT unit_price_minor FROM room_service_products WHERE id=?",Long.class,product);
  try{
   jdbc.update("UPDATE room_service_products SET unit_price_minor=0 WHERE id=?",product);
   String body=json.writeValueAsString(Map.of("serviceDate",LocalDate.now(ZoneId.of("America/Guatemala")).plusDays(1).toString(),"deliveryTime","09:00","items",List.of(Map.of("productId",product,"quantity",1,"mealPeriod","BEVERAGES")),"notes",""));
   mvc.perform(post(path().replace("/journey","/room-service-orders")).header("Authorization",bearer(guest)).header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json").content(body)).andExpect(status().isCreated());
   mvc.perform(get(path()+"/summary").header("Authorization",bearer(guest))).andExpect(jsonPath("$.pendingOrders").value(0));
   mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isOk());assertEquals(0,balance());
  }finally{jdbc.update("UPDATE room_service_products SET unit_price_minor=? WHERE id=?",original,product);}
 }
    private GuestPrincipal account() {
        UUID id=UUID.randomUUID(), session=UUID.randomUUID(); String email=id+"@example.test";
        jdbc.update("INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES (?,?,now(),'ACTIVE',now(),now())", id,email);
        jdbc.update("INSERT INTO guest_auth_sessions(id,guest_account_id,status,expires_at,created_at) VALUES (?,?,'ACTIVE',now()+interval '1 day',now())", session,id);
        return new GuestPrincipal(id,session,email);
    }
    private StaffPrincipal operator(String role) {
        UUID id=UUID.randomUUID(),session=UUID.randomUUID();UUID org=jdbc.queryForObject("select organization_id from properties where id=?",UUID.class,PROPERTY);
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'synthetic',?,'ACTIVE',now(),now())",id,id.toString(),id+"@example.test",role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,org,role);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())",id,org,PROPERTY);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        return new StaffPrincipal(id,session,id.toString(),role);
    }
    private void link(GuestPrincipal owner) {
        UUID challenge=UUID.randomUUID();
        jdbc.update("INSERT INTO reservation_link_challenges(id,guest_account_id,guest_session_id,reservation_id,property_id,booking_guest_profile_id,confirmation_fingerprint,status,attempt_count,issued_at,expires_at,consumed_at) VALUES (?,?,?,?,?,?,'synthetic','CONSUMED',0,now(),now()+interval '10 minutes',now())",challenge,owner.guestAccountId(),owner.sessionId(),reservation,PROPERTY,profile);
        jdbc.update("INSERT INTO guest_reservation_links(reservation_id,guest_account_id,property_id,challenge_id,linked_at) VALUES (?,?,?,?,now())",reservation,owner.guestAccountId(),PROPERTY,challenge);
    }
}
