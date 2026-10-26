package com.pms.hotelboutique.backend.modules.guestauth;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class GuestReservationRecoveryIntegrationTests {
    private static final String PATH="/api/v1/guest-auth/account/reservations";
    private static final UUID PROPERTY=UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired GuestReservationRecoveryService recovery;
    @Autowired PublicBookingService bookings;
    @MockitoSpyBean AuditService audit;
    private GuestPrincipal guest;
    @BeforeEach void setup() { guest=account(); }

    @Test void restoresConfirmedLinksFromPersistedAccountVerificationWithoutClientAuthority() throws Exception {
        UUID p=profile(null,"Verified","Booker",null), r=reservation(p,"CONFIRMED"), s=stay(r,LocalDate.now(),"RESERVED");
        UUID pending=reservation(p,"PENDING"), cancelled=reservation(p,"CANCELLED");
        mvc.perform(post(PATH+"/reconcile").header("Authorization",bearer(guest)).contentType("application/json")
            .content("{\"accountId\":\""+UUID.randomUUID()+"\",\"reservationId\":\""+pending+"\"}"))
            .andExpect(status().isNoContent());
        assertEquals(1,count("select count(*) from guest_reservation_links where reservation_id=?",r));
        assertEquals(0,count("select count(*) from guest_reservation_links where reservation_id in (?,?)",pending,cancelled));
        assertEquals("ACCOUNT",jdbc.queryForObject("select source from guest_email_verifications where guest_account_id=?",String.class,guest.guestAccountId()));
        assertTrue(jdbc.queryForObject("select v.verified_at=a.email_verified_at from guest_email_verifications v join guest_accounts a on a.id=v.guest_account_id where a.id=?",Boolean.class,guest.guestAccountId()));
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].stayId").value(s.toString()))
            .andExpect(jsonPath("$[0].reservationStatus").value("CONFIRMED"));
    }
    @Test void reusesExistingProofAndRecoversReservationsCreatedAfterVerification() {
        UUID proof=UUID.randomUUID();
        jdbc.update("insert into guest_email_verifications(id,guest_account_id,normalized_email,source,verified_at) values(?,?,?,'GOOGLE',now())",proof,guest.guestAccountId(),guest.email());
        UUID p=profile(null,"Existing","Proof",null), first=reservation(p,"CONFIRMED");
        recovery.recover(guest);UUID later=reservation(p,"CONFIRMED");recovery.recover(guest);recovery.recover(guest);
        assertEquals(1,count("select count(*) from guest_email_verifications where guest_account_id=?",guest.guestAccountId()));
        assertEquals(2,count("select count(*) from guest_reservation_links where guest_account_id=? and email_verification_id=?",guest.guestAccountId(),proof));
        assertEquals(2,count("select count(*) from reservation_audit_events where action='GUEST_RESERVATION_LINKED' and entity_id in (?,?)",first,later));
    }
    @Test void neverTransfersLinksOrProfilesAndNeverMatchesAnotherEmail() {
        var other=account();UUID p=profile(null,"Other","Owner",null), linked=reservation(p,"CONFIRMED");link(other,linked,p);
        UUID ownedProfile=profile(other.guestAccountId(),"Owned","Profile",null), owned=reservation(ownedProfile,"CONFIRMED");
        UUID different=profile(null,"Different","Email",null);jdbc.update("update guest_profiles set email=? where id=?",other.email(),different);
        UUID mismatch=reservation(different,"CONFIRMED");recovery.recover(guest);
        assertEquals(other.guestAccountId(),jdbc.queryForObject("select guest_account_id from guest_reservation_links where reservation_id=?",UUID.class,linked));
        assertEquals(0,count("select count(*) from guest_reservation_links where reservation_id in (?,?)",owned,mismatch));
    }
    @Test void rejectsAnonymousStaffDisabledAndRevokedSessions() throws Exception {
        mvc.perform(post(PATH+"/reconcile")).andExpect(status().isUnauthorized());
        var staff=new StaffPrincipal(UUID.randomUUID(),UUID.randomUUID(),"synthetic","SUPER_ADMIN");
        mvc.perform(post(PATH+"/reconcile").header("Authorization","Bearer "+staffJwt.issue(staff,Instant.now()))).andExpect(status().isUnauthorized());
        jdbc.update("update guest_accounts set status='DISABLED' where id=?",guest.guestAccountId());
        mvc.perform(post(PATH+"/reconcile").header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
        guest=account();jdbc.update("update guest_auth_sessions set status='REVOKED',revoked_at=now() where id=?",guest.sessionId());
        mvc.perform(post(PATH+"/reconcile").header("Authorization",bearer(guest))).andExpect(status().isUnauthorized());
    }
    @Test void concurrentRecoveriesProduceOneLinkProofAndAudit() throws Exception {
        UUID p=profile(null,"Concurrent","Guest",null),r=reservation(p,"CONFIRMED");
        try(var workers=Executors.newFixedThreadPool(2)) {
            var first=workers.submit(()->recovery.recover(guest));var second=workers.submit(()->recovery.recover(guest));
            first.get(15,TimeUnit.SECONDS);second.get(15,TimeUnit.SECONDS);
        }
        assertEquals(1,count("select count(*) from guest_email_verifications where guest_account_id=?",guest.guestAccountId()));
        assertEquals(1,count("select count(*) from guest_reservation_links where reservation_id=?",r));
        assertEquals(1,count("select count(*) from reservation_audit_events where action='GUEST_RESERVATION_LINKED' and entity_id=?",r));
    }
    @Test void anonymousCreationRemainsConfirmedWhenLinkAuditFailsAndReplayNeverRepays() throws Exception {
        UUID property=UUID.randomUUID(),type=UUID.randomUUID();
        jdbc.update("insert into properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) select ?,organization_id,?,'Guest recovery QA','America/Guatemala','GTQ','ACTIVE',now(),now() from properties where id=?",property,"QA-"+property,PROPERTY);
        jdbc.update("insert into room_types(id,property_id,code,name) values(?,?,'STD','Standard')",type,property);
        jdbc.update("insert into rooms(id,property_id,room_type_id,code) values(?,?,?,'101')",UUID.randomUUID(),property,type);
        var input=new PublicBookingRequest(property,LocalDate.of(2036,1,1),LocalDate.of(2036,1,3),"GTQ",130000L,
            List.of(new PublicBookingRequest.Stay(type,"DEMO_STANDARD",1)),new PublicBookingRequest.BookingGuest("Synthetic","Booker",guest.email()),PublicBookingRequest.PaymentMode.SIMULATED_CARD);
        String key="guest-recovery-"+UUID.randomUUID();var confirmed=bookings.book(key,input);
        assertEquals("CONFIRMED",confirmed.status());
        doThrow(new IllegalStateException("synthetic audit failure")).when(audit).record(argThat(c->c!=null && c.action().equals("GUEST_RESERVATION_LINKED")));
        mvc.perform(post(PATH+"/reconcile").header("Authorization",bearer(guest))).andExpect(status().isServiceUnavailable());
        assertEquals(0,count("select count(*) from guest_reservation_links where reservation_id=?",confirmed.reservationId()));
        assertEquals(0,count("select count(*) from guest_email_verifications where guest_account_id=?",guest.guestAccountId()));
        reset(audit);assertEquals(confirmed,bookings.book(key,input));recovery.recover(guest);recovery.recover(guest);
        assertEquals(1,count("select count(*) from reservations where id=? and status='CONFIRMED'",confirmed.reservationId()));
        assertEquals(1,count("select count(*) from reservation_stays where reservation_id=?",confirmed.reservationId()));
        assertEquals(1,count("select count(*) from guest_reservation_links where reservation_id=?",confirmed.reservationId()));
        assertEquals(1,count("select count(*) from folio_movements m join folios f on f.id=m.folio_id where f.reservation_id=? and m.kind='PAYMENT'",confirmed.reservationId()));
        mvc.perform(get(PATH+"/"+confirmed.reservationId()+"/stays/"+confirmed.stays().get(0).reservationStayId()).header("Authorization",bearer(guest))).andExpect(status().isOk());
    }
    private int count(String sql,Object... args) { return jdbc.queryForObject(sql,Integer.class,args); }
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
