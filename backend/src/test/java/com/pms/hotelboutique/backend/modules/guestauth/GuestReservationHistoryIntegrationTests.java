package com.pms.hotelboutique.backend.modules.guestauth;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email.EmailSender;
import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "pms.security.reservation-link-otp-hmac-key=test-only-hmac-key-with-at-least-32-bytes"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional(isolation = Isolation.REPEATABLE_READ)
class GuestReservationHistoryIntegrationTests {
    private static final String PATH = "/api/v1/guest-auth/account/reservations";
    private static final String SCHEMA = "guest_history_" + UUID.randomUUID().toString().replace("-", "");
    @DynamicPropertySource static void schema(DynamicPropertyRegistry p) {
        p.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        p.add("spring.liquibase.default-schema", () -> SCHEMA); p.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt; @Autowired EntityManager em;
    @Autowired ObjectMapper json;
    @MockitoBean EmailSender sender;
    @MockitoBean(name = "otpDeliveryExecutor") Executor deliveryExecutor;
    private GuestPrincipal guest; private UUID property, type, profile;
    @BeforeEach void setup() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        guest = account(); property = UUID.randomUUID(); type = UUID.randomUUID(); profile = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,? ,?,'Guest Hotel','America/Guatemala','GTQ','ACTIVE',now(),now())",
                property,UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1"),property.toString());
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','Deluxe King')",type,property);
        jdbc.update("INSERT INTO guest_profiles(id,guest_account_id,first_name,last_name,email,status,created_at,updated_at) VALUES (?,?,'Booking','Guest',?,'ACTIVE',now(),now())",profile,guest.guestAccountId(),guest.email());
    }
    @Test void emptyIsRealAndClientIdentityNeverChangesTheAccount() throws Exception {
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control","no-store, private")).andExpect(content().json("[]"));
        mvc.perform(get(PATH).param("accountId",account().guestAccountId().toString()).header("Authorization",bearer(guest)))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @Test void persistedLinksAuthorizeAllStaysWithoutPrivateOrFinancialFields() throws Exception {
        UUID own=reservation("CONFIRMED",0), first=stay(own,"RESERVED"); stay(own,"IN_HOUSE"); link(guest,own);
        UUID unlinked=reservation("CONFIRMED",1); stay(unlinked,"RESERVED");
        UUID theirs=reservation("CONFIRMED",2); stay(theirs,"RESERVED"); link(account(),theirs);
        int before=jdbc.queryForObject("SELECT count(*) FROM guest_reservation_links",Integer.class);
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].reservationId").value(own.toString()))
                .andExpect(jsonPath("$[1].reservationId").value(own.toString()))
                .andExpect(jsonPath("$[0].reservationStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$[0].notes").doesNotExist()).andExpect(jsonPath("$[0].totalMinor").doesNotExist())
                .andExpect(jsonPath("$[0].occupants").doesNotExist());
        mvc.perform(get(detail(own,first)).header("Authorization",bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.reservationId").value(own.toString()))
                .andExpect(jsonPath("$.roomType.name").value("Deluxe King"));
        assertEquals(before,jdbc.queryForObject("SELECT count(*) FROM guest_reservation_links",Integer.class));
    }
    @Test void matchingProfileAndForeignIdsDoNotAuthorizeAStay() throws Exception {
        UUID unlinked=reservation("CONFIRMED",0), first=stay(unlinked,"RESERVED");
        UUID foreign=reservation("CONFIRMED",1), second=stay(foreign,"RESERVED"); link(account(),foreign);
        for (String path : new String[]{detail(unlinked,first),detail(foreign,second),detail(UUID.randomUUID(),UUID.randomUUID())})
            mvc.perform(get(path).header("Authorization",bearer(guest))).andExpect(status().isNotFound());
    }
    @Test void anInactiveHotelDoesNotEraseLinkedHistory() throws Exception {
        UUID own=reservation("CANCELLED",0); stay(own,"CANCELLED"); link(guest,own);
        jdbc.update("UPDATE properties SET status='INACTIVE' WHERE id=?",property);
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].reservationStatus").value("CANCELLED"));
    }
    @Test void malformedStayIdsAreRejected() throws Exception {
        mvc.perform(get(PATH+"/bad-id/stays/"+UUID.randomUUID()).header("Authorization",bearer(guest))).andExpect(status().isBadRequest());
    }
    @Test void missingStaffRevokedAndDisabledIdentitiesCannotRead() throws Exception {
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        var staff=new StaffPrincipal(UUID.randomUUID(),UUID.randomUUID(),"synthetic","SUPER_ADMIN");
        mvc.perform(get(PATH).header("Authorization","Bearer "+staffJwt.issue(staff,Instant.now()))).andExpect(status().isUnauthorized());
        jdbc.update("UPDATE guest_auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?",guest.sessionId()); em.clear();
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
        var other=account(); jdbc.update("UPDATE guest_accounts SET status='DISABLED' WHERE id=?",other.guestAccountId()); em.clear();
        mvc.perform(get(PATH).header("Authorization",bearer(other))).andExpect(status().isUnauthorized());
    }
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void anonymousPublicBookingBecomesVisibleOnlyAfterTheRealSessionBoundOtpVerification() throws Exception {
        // Committed fixtures allow the real C3 REQUIRES_NEW transactions to see the booking.
        var delivered = new AtomicReference<String>();
        doAnswer(invocation -> { ((Runnable) invocation.getArgument(0)).run(); return null; })
                .when(deliveryExecutor).execute(any(Runnable.class));
        doAnswer(invocation -> {
            assertEquals(guest.email(), invocation.getArgument(0));
            delivered.set(invocation.getArgument(1)); return null;
        }).when(sender).sendReservationLinkOtp(anyString(), anyString());
        for (int i=0;i<2;i++) jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)", UUID.randomUUID(),property,type,"HISTORY-"+i);
        var arrival=LocalDate.of(2035,1,1);
        var request=new PublicBookingRequest(property,arrival,arrival.plusDays(2),"GTQ",260000L,
                List.of(new PublicBookingRequest.Stay(type,"DEMO_STANDARD",2)),
                new PublicBookingRequest.BookingGuest("Ana","Lopez",guest.email()), PublicBookingRequest.PaymentMode.SIMULATED_CARD);
        var booked=mvc.perform(post("/api/v1/public/bookings").contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key","history-"+UUID.randomUUID()).content(json.writeValueAsString(request)))
                .andExpect(status().isCreated()).andExpect(cookie().doesNotExist("pms_guest_access")).andReturn();
        var booking=json.readTree(booked.getResponse().getContentAsString());
        String reservationId=booking.path("reservationId").asText();
        UUID stayId=jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=? ORDER BY id LIMIT 1",UUID.class,UUID.fromString(reservationId));
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get(detail(UUID.fromString(reservationId),stayId)).header("Authorization",bearer(guest))).andExpect(status().isNotFound());
        var challenge=mvc.perform(post("/api/v1/guest-auth/reservation-links/challenges").header("Authorization",bearer(guest))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(java.util.Map.of("confirmationCode",booking.path("confirmationCode").asText()))))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.otp").doesNotExist()).andReturn();
        assertNotNull(delivered.get()); assertTrue(delivered.get().matches("[0-9]{8}"));
        String requestId=json.readTree(challenge.getResponse().getContentAsString()).path("requestId").asText();
        String wrong=(delivered.get().charAt(0)=='0'?"1":"0")+delivered.get().substring(1);
        mvc.perform(post("/api/v1/guest-auth/reservation-links/verify").header("Authorization",bearer(guest)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(java.util.Map.of("requestId",requestId,"otp",wrong)))).andExpect(status().isUnprocessableEntity());
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/v1/guest-auth/reservation-links/verify").header("Authorization",bearer(guest)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(java.util.Map.of("requestId",requestId,"otp",delivered.get())))).andExpect(status().isNoContent()).andExpect(content().string(""));
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].reservationId").value(reservationId)).andExpect(jsonPath("$[1].reservationId").value(reservationId));
        mvc.perform(get(detail(UUID.fromString(reservationId),stayId)).header("Authorization",bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmationCode").value(booking.path("confirmationCode").asText())).andExpect(jsonPath("$.id").value(stayId.toString()));
        mvc.perform(get(detail(UUID.fromString(reservationId),stayId)).header("Authorization",bearer(account()))).andExpect(status().isNotFound());
    }
    private String detail(UUID reservationId,UUID stayId) { return PATH+"/"+reservationId+"/stays/"+stayId; }
    private String bearer(GuestPrincipal p) { return "Bearer "+jwt.issue(p,Instant.now()); }
    private GuestPrincipal account() {
        UUID id=UUID.randomUUID(),session=UUID.randomUUID(); String email=id+"@example.test";
        jdbc.update("INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES (?,?,now(),'ACTIVE',now(),now())",id,email);
        jdbc.update("INSERT INTO guest_auth_sessions(id,guest_account_id,status,expires_at,created_at) VALUES (?,?,'ACTIVE',now()+interval '1 day',now())",session,id);
        return new GuestPrincipal(id,session,email);
    }
    private UUID reservation(String status,int order) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,notes,created_at,updated_at) VALUES (?,?,?,?,?,'GTQ','WEB_DIRECTA','private staff note',now()+? * interval '1 second',now())",id,property,profile,id.toString().substring(0,16),status,order);
        return id;
    }
    private UUID stay(UUID reservation,String status) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,current_date,current_date+2,?,now(),now())",id,reservation,property,type,status);
        return id;
    }
    private void link(GuestPrincipal actor,UUID reservation) {
        UUID challenge=UUID.randomUUID();
        jdbc.update("INSERT INTO reservation_link_challenges(id,guest_account_id,guest_session_id,reservation_id,property_id,booking_guest_profile_id,confirmation_fingerprint,status,attempt_count,issued_at,expires_at,consumed_at) VALUES (?,?,?,?,?,?,'synthetic','CONSUMED',0,now(),now()+interval '10 minutes',now())",challenge,actor.guestAccountId(),actor.sessionId(),reservation,property,profile);
        jdbc.update("INSERT INTO guest_reservation_links(reservation_id,guest_account_id,property_id,challenge_id,linked_at) VALUES (?,?,?,?,now())",reservation,actor.guestAccountId(),property,challenge);
    }
}
