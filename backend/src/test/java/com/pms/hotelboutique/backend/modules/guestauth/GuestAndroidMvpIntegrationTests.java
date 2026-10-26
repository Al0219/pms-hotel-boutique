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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Disposable PostgreSQL only: includes a real TCP login -> reads -> refresh -> logout journey. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class GuestAndroidMvpIntegrationTests {
    private static final String SCHEMA = "android_mvp_" + UUID.randomUUID().toString().replace("-", "");

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
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper json;
    @LocalServerPort int port;
    private GuestPrincipal guest;
    @BeforeEach void setup() { guest = account(); }

    @Test void emptyAccountAndArbitraryAccountIdNeverExposeOtherLinks() throws Exception {
        var other = account(); UUID p = profile(null,"Private","Guest",null);
        UUID r=reservation(p,"CONFIRMED"); stay(r,LocalDate.now(),"RESERVED"); link(other,r,p);
        mvc.perform(get(PATH).param("accountId",other.guestAccountId().toString()).header("Authorization",bearer(guest)))
            .andExpect(status().isOk()).andExpect(content().json("[]"))
            .andExpect(header().string("Cache-Control","no-store, private"));
    }
    @Test void matchingEmailOrAssociatedProfileDoesNotAuthorizeAReservation() throws Exception {
        UUID p=profile(guest.guestAccountId(),"Same","Email",null);
        UUID r=reservation(p,"CONFIRMED"), s=stay(r,LocalDate.now(),"RESERVED");
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(content().json("[]"));
        mvc.perform(get(detail(r,s)).header("Authorization",bearer(guest))).andExpect(status().isNotFound());
    }
    @Test void oneReservationHasMultipleStaysAndAllPersistedStatusesAreReadable() throws Exception {
        UUID p=profile(null,"Booker","Guest",null), r=reservation(p,"CONFIRMED"); link(guest,r,p);
        for(String state: new String[]{"RESERVED","IN_HOUSE","CHECKED_OUT","CANCELLED","NO_SHOW"}) stay(r,LocalDate.now().minusDays(10),state);
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(5)).andExpect(jsonPath("$[0].reservationId").value(r.toString()))
            .andExpect(jsonPath("$[0].roomCode").isEmpty()).andExpect(jsonPath("$[0].guestAccountId").doesNotExist());
    }
    @Test void ownDetailUsesPersistedRoomAndTypeAndDoesNotReturnGuestPii() throws Exception {
        UUID p=profile(null,"Booker","Guest",null), r=reservation(p,"CONFIRMED");link(guest,r,p);
        UUID s=stay(r,LocalDate.now(),"IN_HOUSE");
        UUID type=jdbc.queryForObject("select room_type_id from reservation_stays where id=?",UUID.class,s), room=UUID.randomUUID();
        jdbc.update("insert into rooms(id,property_id,room_type_id,code) values (?,?,?,?)",room,PROPERTY,type,"MVP-"+room);
        jdbc.update("update reservation_stays set room_id=? where id=?",room,s);
        mvc.perform(get(detail(r,s)).header("Authorization",bearer(guest))).andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(s.toString()))
            .andExpect(jsonPath("$.confirmationCode").value(jdbc.queryForObject("select confirmation_code from reservations where id=?",String.class,r)))
            .andExpect(jsonPath("$.room.code").value("MVP-"+room))
            .andExpect(jsonPath("$.roomType.name").value("Synthetic QA type")).andExpect(jsonPath("$.status").value("IN_HOUSE"))
            .andExpect(jsonPath("$.email").doesNotExist()).andExpect(jsonPath("$.bookingGuest").doesNotExist());
    }
    @Test void nullRoomRemainsNullAndCrossReservationStayIs404() throws Exception {
        UUID p=profile(null,"Booker","Guest",null), r=reservation(p,"CONFIRMED"), other=reservation(p,"CONFIRMED");
        link(guest,r,p);link(guest,other,p);UUID s=stay(r,LocalDate.now(),"RESERVED");
        mvc.perform(get(detail(r,s)).header("Authorization",bearer(guest))).andExpect(status().isOk()).andExpect(jsonPath("$.room").isEmpty());
        mvc.perform(get(detail(other,s)).header("Authorization",bearer(guest))).andExpect(status().isNotFound());
        mvc.perform(get(detail(UUID.randomUUID(),s)).header("Authorization",bearer(guest))).andExpect(status().isNotFound());
    }
    @Test void anotherAccountCannotReadOrSelectAnOwnedStay() throws Exception {
        UUID p=profile(null,"Booker","Guest",null), r=reservation(p,"CONFIRMED"), s=stay(r,LocalDate.now(),"RESERVED");link(guest,r,p);
        mvc.perform(get(detail(r,s)).header("Authorization",bearer(account()))).andExpect(status().isNotFound());
    }
    @Test void anonymousStaffRevokedAndDisabledSessionsAreRejected() throws Exception {
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        var staff=new StaffPrincipal(UUID.randomUUID(),UUID.randomUUID(),"synthetic","SUPER_ADMIN");
        mvc.perform(get(PATH).header("Authorization","Bearer "+staffJwt.issue(staff,Instant.now()))).andExpect(status().isUnauthorized());
        jdbc.update("update guest_auth_sessions set status='REVOKED',revoked_at=now() where id=?",guest.sessionId());
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
        guest=account();jdbc.update("update guest_accounts set status='DISABLED' where id=?",guest.guestAccountId());
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
    }
    @Test void nativeHeaderAndBffCookieAreMutuallyExclusiveAndOriginIsRejected() throws Exception {
        mvc.perform(post("/api/v1/guest-auth/refresh").header("X-Guest-Refresh-Token","synthetic").header("Origin","https://example.test"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/guest-auth/refresh").header("X-Guest-Refresh-Token","synthetic")
            .cookie(new jakarta.servlet.http.Cookie("pms_guest_refresh","synthetic"))).andExpect(status().isUnauthorized());
    }
    @Test void realHttpLoginLinkedStaysSummaryRotationAndLogoutAgainstPostgres() throws Exception {
        // Synthetic credentials exist only in this disposable database; never logged or exported.
        String password=UUID.randomUUID().toString();
        jdbc.update("insert into guest_password_credentials(guest_account_id,password_hash,created_at,updated_at) values(?,?,now(),now())",guest.guestAccountId(),encoder.encode(password));
        UUID p=profile(null,"Real","Postgres",null), r=reservation(p,"CONFIRMED"), s=stay(r,LocalDate.now().plusDays(1),"RESERVED");link(guest,r,p);
        var client=java.net.http.HttpClient.newHttpClient();
        var login=client.send(java.net.http.HttpRequest.newBuilder(uri("/api/v1/guest-auth/sessions"))
            .header("Content-Type","application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString(json.writeValueAsString(java.util.Map.of("email",guest.email(),"password",password)))).build(),java.net.http.HttpResponse.BodyHandlers.ofString());
        assertEquals(201,login.statusCode());assertTrue(login.headers().firstValue("Cache-Control").orElse("").contains("no-store"));
        var tokens=json.readTree(login.body());String access=tokens.path("accessToken").asText(), refresh=tokens.path("refreshToken").asText();
        for(String path: new String[]{"/api/v1/guest-auth/me","/api/v1/guest-auth/account/summary",PATH,detail(r,s)}) {
            var response=client.send(java.net.http.HttpRequest.newBuilder(uri(path)).header("Authorization","Bearer "+access).GET().build(),java.net.http.HttpResponse.BodyHandlers.ofString());
            assertEquals(200,response.statusCode(),path);
            if(path.equals(PATH)) assertEquals(s.toString(),json.readTree(response.body()).get(0).path("stayId").asText());
            if(path.equals(detail(r,s))) assertEquals(r.toString(),json.readTree(response.body()).path("reservationId").asText());
        }
        var staffAttempt=client.send(java.net.http.HttpRequest.newBuilder(uri("/api/v1/staff-auth/me")).header("Authorization","Bearer "+access).GET().build(),java.net.http.HttpResponse.BodyHandlers.discarding());
        assertEquals(401,staffAttempt.statusCode());
        var rotated=client.send(java.net.http.HttpRequest.newBuilder(uri("/api/v1/guest-auth/refresh")).header("X-Guest-Refresh-Token",refresh)
            .POST(java.net.http.HttpRequest.BodyPublishers.noBody()).build(),java.net.http.HttpResponse.BodyHandlers.ofString());
        assertEquals(200,rotated.statusCode());var next=json.readTree(rotated.body());assertNotEquals(refresh,next.path("refreshToken").asText());
        String nextAccess=next.path("accessToken").asText();
        // BFF cookie compatibility is preserved on the same refresh service.
        var cookieRotation=client.send(java.net.http.HttpRequest.newBuilder(uri("/api/v1/guest-auth/refresh")).header("Cookie","pms_guest_refresh="+next.path("refreshToken").asText())
            .POST(java.net.http.HttpRequest.BodyPublishers.noBody()).build(),java.net.http.HttpResponse.BodyHandlers.ofString());
        assertEquals(200,cookieRotation.statusCode());
        var logout=client.send(java.net.http.HttpRequest.newBuilder(uri("/api/v1/guest-auth/logout")).header("Authorization","Bearer "+nextAccess)
            .POST(java.net.http.HttpRequest.BodyPublishers.noBody()).build(),java.net.http.HttpResponse.BodyHandlers.discarding());assertEquals(204,logout.statusCode());
        var revoked=client.send(java.net.http.HttpRequest.newBuilder(uri(PATH)).header("Authorization","Bearer "+nextAccess).GET().build(),java.net.http.HttpResponse.BodyHandlers.discarding());assertEquals(401,revoked.statusCode());
        var revokedRefresh=client.send(java.net.http.HttpRequest.newBuilder(uri("/api/v1/guest-auth/refresh"))
            .header("X-Guest-Refresh-Token",json.readTree(cookieRotation.body()).path("refreshToken").asText())
            .POST(java.net.http.HttpRequest.BodyPublishers.noBody()).build(),java.net.http.HttpResponse.BodyHandlers.discarding());
        assertEquals(401,revokedRefresh.statusCode());
    }
    private java.net.URI uri(String path) { return java.net.URI.create("http://127.0.0.1:"+port+path); }
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
