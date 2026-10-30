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
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class StayDocumentRestartIntegrationTests {
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

 private static GuestPrincipal originalGuest;private static UUID originalReservation,originalStay;private static StayJourneyService.DocumentFile original;
 @Test @Order(1) @DirtiesContext(methodMode=DirtiesContext.MethodMode.AFTER_METHOD)
 void issueBeforeBackendRestart()throws Exception{
  mvc.perform(travel("check-in",UUID.randomUUID().toString())).andExpect(status().isOk());mvc.perform(payment(UUID.randomUUID().toString(),"100.00","demo_visa_approved")).andExpect(status().isOk());mvc.perform(travel("check-out",UUID.randomUUID().toString())).andExpect(status().isOk());
  original=journey.guestFile(guest,reservation,stay,true);originalGuest=guest;originalReservation=reservation;originalStay=stay;
 }
 @Test @Order(2) void recoverIdenticalBytesAfterContextAndConnectionPoolRestart(){assertNotNull(original);assertEquals(original,journey.guestFile(originalGuest,originalReservation,originalStay,false));assertEquals(original,journey.guestFile(originalGuest,originalReservation,originalStay,true));}
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
