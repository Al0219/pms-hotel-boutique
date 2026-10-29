package com.pms.hotelboutique.backend.modules.guestauth;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional(isolation = Isolation.REPEATABLE_READ)
class GuestReservationSummaryIntegrationTests {
    private static final String PATH = "/api/v1/guest-auth/account/reservations";
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired EntityManager em;
    private GuestPrincipal guest;

    @BeforeEach void setup() { guest = account(); }


    @Test void linkedAccountCanReadAllStaysWithoutExposingUnlinkedData() throws Exception {
        UUID booker=profile(null,"Original","Guest",null),r=reservation(booker,"CONFIRMED");
        UUID first=stay(r,LocalDate.now().plusDays(2),"RESERVED");stay(r,LocalDate.now().plusDays(5),"CHECKED_OUT");link(guest,r,booker);
        mvc.perform(get(PATH+"/"+r+"/summary").header("Authorization",bearer(guest)))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store, private"))
            .andExpect(jsonPath("$.stays.length()").value(2)).andExpect(jsonPath("$.details.length()").value(2))
            .andExpect(jsonPath("$.accommodations.length()").value(2)).andExpect(jsonPath("$.overview.currency").value("GTQ"))
            .andExpect(jsonPath("$.overview.confirmedTotalMinor").isEmpty()).andExpect(jsonPath("$.email").doesNotExist());
        var other=account();
        mvc.perform(get(PATH+"/"+r+"/summary").param("accountId",guest.guestAccountId().toString()).header("Authorization",bearer(other))).andExpect(status().isNotFound());
        mvc.perform(get(PATH+"/"+UUID.randomUUID()+"/summary").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
    }
    @Test void sameEmailAndProfileOwnershipDoNotReplaceExplicitReservationLink() throws Exception {
        UUID booker=profile(guest.guestAccountId(),"Own","Contact",null),r=reservation(booker,"CONFIRMED");stay(r,LocalDate.now().plusDays(2),"RESERVED");
        mvc.perform(get(PATH+"/"+r+"/summary").header("Authorization",bearer(guest))).andExpect(status().isNotFound());
    }
    @Test void noGuestJwtOrStaffTokenCannotReadSummary() throws Exception {
        String url=PATH+"/"+UUID.randomUUID()+"/summary";
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        var staff=new StaffPrincipal(UUID.randomUUID(),UUID.randomUUID(),"synthetic","SUPER_ADMIN");
        mvc.perform(get(url).header("Authorization","Bearer "+staffJwt.issue(staff,Instant.now()))).andExpect(status().isUnauthorized());
    }
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
