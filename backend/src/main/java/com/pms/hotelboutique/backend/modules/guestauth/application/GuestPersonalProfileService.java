package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class GuestPersonalProfileService {
    private final GuestAuthService auth;
    private final JdbcClient jdbc;
    public GuestPersonalProfileService(GuestAuthService auth, JdbcClient jdbc) { this.auth=auth; this.jdbc=jdbc; }
    public record Input(String firstName,String lastName,String phone,String country,String preferredLanguage,
        String bedType,String roomVibe,String floorPreference,long version,Instant expectedUpdatedAt) {
        @Override public String toString() { return "PersonalProfileInput[redacted]"; }
    }
    @Transactional(readOnly=true)
    public GuestPersonalProfile get(GuestPrincipal principal) { return read(active(principal)); }
    @Transactional
    public GuestPersonalProfile save(GuestPrincipal principal, Input input) {
        var own=active(principal);
        // Serializes first creation and updates without selecting any historical profile.
        jdbc.sql("SELECT id FROM guest_accounts WHERE id=:account AND status='ACTIVE' FOR UPDATE")
            .param("account",own.guestAccountId()).query(UUID.class).optional().orElseThrow(GuestAuthenticationException::new);
        boolean valid=jdbc.sql("SELECT EXISTS(SELECT 1 FROM guest_auth_sessions WHERE id=:session AND guest_account_id=:account AND status='ACTIVE' AND expires_at>CURRENT_TIMESTAMP)")
            .param("session",own.sessionId()).param("account",own.guestAccountId()).query(Boolean.class).single();
        if(!valid) throw new GuestAuthenticationException();
        var current=read(own).profile();
        if (current!=null) {
            jdbc.sql("SELECT id FROM guest_profiles WHERE id=:id FOR UPDATE").param("id",current.profileId()).query(UUID.class).single();
            current=read(own).profile();
            // Repeated identical PUT is a safe retry, even with the previous version.
            if (same(current,input)) return new GuestPersonalProfile(own.guestAccountId(),own.email(),current);
        }
        if ((current==null && (input.version()!=0 || input.expectedUpdatedAt()!=null)) ||
            (current!=null && (current.version()!=input.version() || !current.updatedAt().equals(input.expectedUpdatedAt()))))
            throw conflict();
        UUID id=current==null ? UUID.randomUUID() : current.profileId();
        if (current!=null) {
            boolean used=jdbc.sql("SELECT EXISTS(SELECT 1 FROM reservations WHERE booking_guest_id=:id UNION ALL SELECT 1 FROM reservation_guests WHERE guest_profile_id=:id)")
                .param("id",id).query(Boolean.class).single();
            if (used) throw conflict();
        }
        var now=java.sql.Timestamp.from(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        long version=current==null ? 1 : current.version()+1;
        if (current==null) {
            jdbc.sql("INSERT INTO guest_profiles(id,guest_account_id,first_name,last_name,email,phone,preferred_language,status,created_at,updated_at) VALUES (:id,:account,:first,:last,:email,:phone,:language,'ACTIVE',:now,:now)")
                .param("id",id).param("account",own.guestAccountId()).param("first",input.firstName()).param("last",input.lastName())
                .param("email",own.email()).param("phone",input.phone()).param("language",input.preferredLanguage()).param("now",now).update();
            jdbc.sql("INSERT INTO guest_personal_profiles(guest_account_id,profile_id,version,created_at,updated_at) VALUES (:account,:id,1,:now,:now)")
                .param("account",own.guestAccountId()).param("id",id).param("now",now).update();
        } else {
            jdbc.sql("UPDATE guest_profiles SET first_name=:first,last_name=:last,phone=:phone,preferred_language=:language,updated_at=:now WHERE id=:id AND guest_account_id=:account AND property_id IS NULL AND status='ACTIVE'")
                .param("id",id).param("account",own.guestAccountId()).param("first",input.firstName()).param("last",input.lastName())
                .param("phone",input.phone()).param("language",input.preferredLanguage()).param("now",now).update();
        }
        jdbc.sql("UPDATE guest_personal_profiles SET country=:country,bed_type=:bed,room_vibe=:vibe,floor_preference=:floor,version=:version,updated_at=:now WHERE guest_account_id=:account")
            .param("country",input.country()).param("bed",input.bedType()).param("vibe",input.roomVibe()).param("floor",input.floorPreference())
            .param("version",version).param("now",now).param("account",own.guestAccountId()).update();
        jdbc.sql("INSERT INTO guest_personal_profile_audit(id,guest_account_id,profile_id,session_id,action,version,occurred_at) VALUES (:id,:account,:profile,:session,:action,:version,:now)")
            .param("id",UUID.randomUUID()).param("account",own.guestAccountId()).param("profile",id).param("session",own.sessionId())
            .param("action",current==null ? "CREATE" : "UPDATE").param("version",version).param("now",now).update();
        return read(own);
    }
    private GuestPersonalProfile read(GuestPrincipal own) {
        var profile=jdbc.sql("""
            SELECT p.id,p.first_name,p.last_name,p.phone,p.preferred_language,p.updated_at,
                   m.country,m.bed_type,m.room_vibe,m.floor_preference,m.version
            FROM guest_personal_profiles m JOIN guest_profiles p ON p.id=m.profile_id AND p.guest_account_id=m.guest_account_id
            WHERE m.guest_account_id=:account AND p.property_id IS NULL AND p.status='ACTIVE'
            """).param("account",own.guestAccountId()).query((rs,n)->new GuestPersonalProfile.Details(rs.getObject("id",UUID.class),rs.getString("first_name"),rs.getString("last_name"),rs.getString("phone"),rs.getString("country"),rs.getString("preferred_language"),rs.getString("bed_type"),rs.getString("room_vibe"),rs.getString("floor_preference"),rs.getLong("version"),rs.getTimestamp("updated_at").toInstant())).optional().orElse(null);
        if (profile==null && jdbc.sql("SELECT EXISTS(SELECT 1 FROM guest_personal_profiles WHERE guest_account_id=:account)").param("account",own.guestAccountId()).query(Boolean.class).single()) throw conflict();
        return new GuestPersonalProfile(own.guestAccountId(),own.email(),profile);
    }
    private GuestPrincipal active(GuestPrincipal p) { if(p==null) throw new GuestAuthenticationException(); return auth.getActivePrincipal(p); }
    private ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"Personal profile changed or unavailable"); }
    private boolean same(GuestPersonalProfile.Details p,Input i) {
        return java.util.Objects.equals(p.firstName(),i.firstName()) && java.util.Objects.equals(p.lastName(),i.lastName()) && java.util.Objects.equals(p.phone(),i.phone()) && java.util.Objects.equals(p.country(),i.country()) && java.util.Objects.equals(p.preferredLanguage(),i.preferredLanguage()) && java.util.Objects.equals(p.bedType(),i.bedType()) && java.util.Objects.equals(p.roomVibe(),i.roomVibe()) && java.util.Objects.equals(p.floorPreference(),i.floorPreference());
    }
}
