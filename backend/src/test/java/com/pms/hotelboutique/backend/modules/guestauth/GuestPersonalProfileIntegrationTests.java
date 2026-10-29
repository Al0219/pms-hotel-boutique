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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional(isolation = Isolation.REPEATABLE_READ)
class GuestPersonalProfileIntegrationTests {
    private static final String PATH = "/api/v1/guest-auth/account/profile";
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired EntityManager em;
    private GuestPrincipal guest;

    @BeforeEach void setup() { guest = account(); }


    @Test void noProfileIsValidAndGetDoesNotCreateOne() throws Exception {
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk())
            .andExpect(jsonPath("$.profile").isEmpty()).andExpect(jsonPath("$.email").value(guest.email()))
            .andExpect(header().string("Cache-Control","no-store, private"));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM guest_personal_profiles WHERE guest_account_id=?",Integer.class,guest.guestAccountId()));
    }
    @Test void saveCreatesOwnIsolatedProfileDespiteMultipleHistoricalProfilesAndSafeRetries() throws Exception {
        UUID historical=profile(guest.guestAccountId(),"Booking","Original",null);
        profile(guest.guestAccountId(),"Another","Historical","es");
        UUID reservation=reservation(historical,"CONFIRMED"); stay(reservation,LocalDate.now().plusDays(2),"RESERVED");
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(jsonPath("$.profile").isEmpty());
        String originalReservation=jdbc.queryForObject("SELECT row_to_json(r)::text FROM reservations r WHERE id=?",String.class,reservation);
        int movements=jdbc.queryForObject("SELECT count(*) FROM folio_movements",Integer.class);
        save(payload("Demo",0,null)).andExpect(status().isOk()).andExpect(jsonPath("$.profile.firstName").value("Demo"))
            .andExpect(jsonPath("$.profile.version").value(1)).andExpect(jsonPath("$.profile.country").value("Guatemala"));
        save(payload("Demo",0,null)).andExpect(status().isOk()).andExpect(jsonPath("$.profile.version").value(1));
        assertEquals("Booking",jdbc.queryForObject("SELECT first_name FROM guest_profiles WHERE id=?",String.class,historical));
        assertEquals(originalReservation,jdbc.queryForObject("SELECT row_to_json(r)::text FROM reservations r WHERE id=?",String.class,reservation));
        assertEquals(movements,jdbc.queryForObject("SELECT count(*) FROM folio_movements",Integer.class));
        assertEquals(1,audits());
        assertEquals(3,jdbc.queryForObject("SELECT count(*) FROM guest_profiles WHERE guest_account_id=?",Integer.class,guest.guestAccountId()));
        var other=account();
        mvc.perform(get(PATH).header("Authorization",bearer(other)).param("accountId",guest.guestAccountId().toString()))
            .andExpect(jsonPath("$.profile").isEmpty()).andExpect(jsonPath("$.guestAccountId").value(other.guestAccountId().toString()));
    }
    @Test void updateAndStaleVersionNeverOverwriteAndNeverDuplicateAudit() throws Exception {
        save(payload("Initial",0,null)).andExpect(status().isOk());
        String updated=timestamp();
        save(payload("Updated",1,updated)).andExpect(status().isOk()).andExpect(jsonPath("$.profile.version").value(2));
        save(payload("Updated",1,updated)).andExpect(status().isOk()).andExpect(jsonPath("$.profile.version").value(2));
        save(payload("Stale",1,updated)).andExpect(status().isConflict());
        assertEquals(2,audits());
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(jsonPath("$.profile.firstName").value("Updated"));
    }
    @Test void externalContactChangesAreDetectedEvenIfPreferenceVersionUnchanged() throws Exception {
        save(payload("Initial",0,null)).andExpect(status().isOk()); String updated=timestamp();
        jdbc.update("UPDATE guest_profiles SET first_name='Staff correction',updated_at=updated_at+interval '1 second' WHERE id=(SELECT profile_id FROM guest_personal_profiles WHERE guest_account_id=?)",guest.guestAccountId());
        save(payload("Stale",1,updated)).andExpect(status().isConflict());
    }
    @Test void personalProfileReferencedByReservationCannotBeMutated() throws Exception {
        save(payload("Initial",0,null)).andExpect(status().isOk());
        UUID id=jdbc.queryForObject("SELECT profile_id FROM guest_personal_profiles WHERE guest_account_id=?",UUID.class,guest.guestAccountId());
        reservation(id,"CONFIRMED");
        save(payload("Changed",1,timestamp())).andExpect(status().isConflict());
        assertEquals(1,audits());
    }

    @Test void optionalContactAndPreferencesCanBeEmptyAndCleared() throws Exception {
        save(payload("Initial",0,null)).andExpect(status().isOk());
        String input="""
            {"firstName":"Initial","lastName":"Guest","phone":null,"country":null,"preferredLanguage":null,"bedType":null,"roomVibe":null,"floorPreference":null,"version":1,"expectedUpdatedAt":"%s"}
            """.formatted(timestamp());
        save(input).andExpect(status().isOk()).andExpect(jsonPath("$.profile.version").value(2))
            .andExpect(jsonPath("$.profile.phone").isEmpty()).andExpect(jsonPath("$.profile.country").isEmpty())
            .andExpect(jsonPath("$.profile.preferredLanguage").isEmpty()).andExpect(jsonPath("$.profile.bedType").isEmpty())
            .andExpect(jsonPath("$.profile.roomVibe").isEmpty()).andExpect(jsonPath("$.profile.floorPreference").isEmpty());
        mvc.perform(get(PATH).header("Authorization",bearer(guest))).andExpect(status().isOk()).andExpect(jsonPath("$.profile.phone").isEmpty());
    }

    @Test void oversizedProfileBodyIsRejectedBeforeParsingOrWriting() throws Exception {
        save(" ".repeat(4097)).andExpect(status().isBadRequest());
        assertEquals(0,audits());
    }
    @Test void invalidFieldsAndSpoofedOwnershipAreRejected() throws Exception {
        for(String data:new String[]{payload(" ",0,null),payload("Demo",0,null).replace("+50255555555","invalid"),
            payload("Demo",0,null).replace("KING","INVALID"),payload("Demo",0,null).replace("\"version\":0","\"version\":-1"),
            payload("Demo",0,null).replace("{","{\"guestAccountId\":\""+UUID.randomUUID()+"\","),payload("Demo",0,null).replace("{","{\"email\":\"other@example.test\"," )})
            save(data).andExpect(status().isBadRequest());
        assertEquals(0,audits());
    }
    @Test void guestAuthenticationRequiredForReadAndWrite() throws Exception {
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
        mvc.perform(put(PATH).contentType("application/json").content(payload("Demo",0,null))).andExpect(status().isUnauthorized());
        String token="Bearer "+staffJwt.issue(new StaffPrincipal(UUID.randomUUID(),UUID.randomUUID(),"synthetic","SUPER_ADMIN"),Instant.now());
        mvc.perform(get(PATH).header("Authorization",token)).andExpect(status().isUnauthorized());
        mvc.perform(put(PATH).header("Authorization",token).contentType("application/json").content(payload("Demo",0,null))).andExpect(status().isUnauthorized());
        jdbc.update("UPDATE guest_auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?",guest.sessionId()); em.clear();
        save(payload("Demo",0,null)).andExpect(status().isUnauthorized());
    }
    @Test void auditRejectsUpdateAndDelete() throws Exception {
        save(payload("Demo",0,null)).andExpect(status().isOk());
        // Savepoints let each rejected SQL statement leave the surrounding test transaction usable.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) c -> {
            for(String operation:new String[]{"UPDATE guest_personal_profile_audit SET action='UPDATE'","DELETE FROM guest_personal_profile_audit"}) {
                var point=c.setSavepoint(); assertThrows(java.sql.SQLException.class,()->c.createStatement().execute(operation));c.rollback(point);
            } return null;
        }); assertEquals(1,audits());
    }
    @Test void openApiDocumentsClosedInputAndGuestSecurity() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
            .andExpect(jsonPath("$.paths['/api/v1/guest-auth/account/profile'].put.security[0].guestBearerAuth").isArray())
            .andExpect(jsonPath("$.components.schemas.GuestPersonalProfileInput.additionalProperties").value(false))
            .andExpect(jsonPath("$.components.schemas.GuestPersonalProfile.properties.profile.anyOf").isArray());
    }
    private org.springframework.test.web.servlet.ResultActions save(String data) throws Exception { return mvc.perform(put(PATH).header("Authorization",bearer(guest)).contentType("application/json").content(data)); }
    private int audits() { return jdbc.queryForObject("SELECT count(*) FROM guest_personal_profile_audit WHERE guest_account_id=?",Integer.class,guest.guestAccountId()); }
    private String timestamp() { return jdbc.queryForObject("SELECT p.updated_at FROM guest_profiles p JOIN guest_personal_profiles m ON m.profile_id=p.id WHERE m.guest_account_id=?",java.sql.Timestamp.class,guest.guestAccountId()).toInstant().toString(); }
    private String payload(String name,long version,String updated) {
        return """
            {"firstName":"%s","lastName":"Guest","phone":"+50255555555","country":"Guatemala","preferredLanguage":"es","bedType":"KING","roomVibe":"QUIET","floorPreference":"HIGH","version":%d,"expectedUpdatedAt":%s}
            """.formatted(name,version,updated==null ? "null" : "\""+updated+"\"");
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
