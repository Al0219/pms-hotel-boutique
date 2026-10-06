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
class GuestAccountSummaryIntegrationTests {
    private static final String PATH = "/api/v1/guest-auth/account/summary";
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired EntityManager em;
    private GuestPrincipal guest;

    @BeforeEach void setup() { guest = account(); }

    @Test void ownAccountWithoutProfileOrLinksIsAValidSummary() throws Exception {
        mvc.perform(get(PATH).header("Authorization", bearer(guest)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store, private"))
                .andExpect(jsonPath("$.guestAccountId").value(guest.guestAccountId().toString()))
                .andExpect(jsonPath("$.email").value(guest.email()))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.profiles").isEmpty()).andExpect(jsonPath("$.linkedReservationsCount").value(0))
                .andExpect(jsonPath("$.upcomingStay").isEmpty()).andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test void clientUuidCannotSelectAnotherAccountOrProfile() throws Exception {
        var other = account();
        profile(other.guestAccountId(), "Private", "Other", "en");
        mvc.perform(get(PATH).param("accountId", other.guestAccountId().toString()).header("Authorization", bearer(guest)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.guestAccountId").value(guest.guestAccountId().toString()))
                .andExpect(jsonPath("$.profiles").isEmpty());
    }

    @Test void onlyExplicitlyAssociatedProfilesAreReturnedIncludingMultipleAndNullLanguage() throws Exception {
        UUID own = profile(guest.guestAccountId(), "Real", "Guest", null);
        profile(guest.guestAccountId(), "Second", "Profile", "en");
        profile(null, "SameEmail", "Unlinked", "es");
        var other = account(); profile(other.guestAccountId(), "Other", "Private", "fr");
        mvc.perform(get(PATH).header("Authorization", bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.profiles.length()").value(2))
                .andExpect(jsonPath("$.profiles[?(@.profileId == '" + own + "')].firstName").value("Real"))
                .andExpect(jsonPath("$.profiles[?(@.profileId == '" + own + "')].preferredLanguage").value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())));
    }

    @Test void missingJwtIsUnauthorized() throws Exception { mvc.perform(get(PATH)).andExpect(status().isUnauthorized()); }

    @Test void staffJwtCannotAccessGuestSummary() throws Exception {
        var staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "synthetic", "SUPER_ADMIN");
        mvc.perform(get(PATH).header("Authorization", "Bearer " + staffJwt.issue(staff, Instant.now())))
                .andExpect(status().isUnauthorized());
    }

    @Test void revokedSessionAndDisabledAccountCannotReadSummary() throws Exception {
        jdbc.update("UPDATE guest_auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", guest.sessionId());
        em.clear(); mvc.perform(get(PATH).header("Authorization", bearer(guest))).andExpect(status().isUnauthorized());
        var disabled = account();
        jdbc.update("UPDATE guest_accounts SET status='DISABLED' WHERE id=?", disabled.guestAccountId());
        em.clear(); mvc.perform(get(PATH).header("Authorization", bearer(disabled))).andExpect(status().isUnauthorized());
    }

    @Test void matchingEmailAndEvenLinkedProfileDoNotAuthorizeReservations() throws Exception {
        UUID ownProfile = profile(guest.guestAccountId(), "Booker", "Own", "es");
        UUID unlinked = reservation(ownProfile, "CONFIRMED");
        stay(unlinked, LocalDate.now().plusDays(10), "RESERVED");
        var other = account(); link(other, unlinked, ownProfile);
        mvc.perform(get(PATH).header("Authorization", bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.linkedReservationsCount").value(0)).andExpect(jsonPath("$.upcomingStay").isEmpty());
    }

    @Test void persistentLinkAloneAuthorizesNextStayAndNeverOtherAccountsEarlierStay() throws Exception {
        UUID booker = profile(null, "Booking", "Contact", null);
        UUID ownReservation = reservation(booker, "CONFIRMED");
        UUID ownStay = stay(ownReservation, LocalDate.now().plusDays(10), "RESERVED");
        stay(ownReservation, LocalDate.now().plusDays(20), "RESERVED");
        link(guest, ownReservation, booker);
        var other = account(); UUID their = reservation(booker, "CONFIRMED");
        stay(their, LocalDate.now().plusDays(1), "RESERVED"); link(other, their, booker);
        mvc.perform(get(PATH).header("Authorization", bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.profiles").isEmpty()).andExpect(jsonPath("$.linkedReservationsCount").value(1))
                .andExpect(jsonPath("$.upcomingStay.reservationId").value(ownReservation.toString()))
                .andExpect(jsonPath("$.upcomingStay.stayId").value(ownStay.toString()))
                .andExpect(jsonPath("$.upcomingStay.arrival").value(LocalDate.now().plusDays(10).toString()));
    }

    @Test void historicalCancelledPendingAndNoShowStaysDoNotInventAnUpcomingStay() throws Exception {
        UUID booker = profile(null, "Booking", "Contact", null);
        for (String state : new String[]{"CONFIRMED", "CANCELLED", "PENDING"}) {
            UUID r = reservation(booker, state); link(guest, r, booker);
            stay(r, LocalDate.now().minusDays(10), "RESERVED");
            if (!state.equals("CONFIRMED")) stay(r, LocalDate.now().plusDays(10), "RESERVED");
            for (String status : new String[]{"CANCELLED", "NO_SHOW", "CHECKED_OUT", "IN_HOUSE"})
                stay(r, LocalDate.now().plusDays(10), status);
        }
        mvc.perform(get(PATH).header("Authorization", bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.linkedReservationsCount").value(3)).andExpect(jsonPath("$.upcomingStay").isEmpty());
    }

    @Test void todayIsCalculatedInPropertyTimezoneInsteadOfBrowserTimezone() throws Exception {
        jdbc.update("UPDATE properties SET timezone='Pacific/Kiritimati' WHERE id=?", PROPERTY);
        LocalDate today = jdbc.queryForObject("SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Pacific/Kiritimati')::date", LocalDate.class);
        UUID booker = profile(null, "Booking", "Contact", null);
        UUID r = reservation(booker, "CONFIRMED"); link(guest, r, booker);
        stay(r, today.minusDays(1), "RESERVED"); UUID eligible = stay(r, today, "RESERVED");
        mvc.perform(get(PATH).header("Authorization", bearer(guest))).andExpect(status().isOk())
                .andExpect(jsonPath("$.upcomingStay.stayId").value(eligible.toString()));
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
