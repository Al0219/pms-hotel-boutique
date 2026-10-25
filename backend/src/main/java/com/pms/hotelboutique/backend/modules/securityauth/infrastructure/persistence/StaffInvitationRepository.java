package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class StaffInvitationRepository {
    private final JdbcClient jdbc;
    public StaffInvitationRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public record Flow(UUID id,UUID user,UUID org,UUID generation,String email,Instant expires,Instant sent,Instant consumed,Instant revoked) {
        @Override public String toString(){return "StaffInvitationFlow[redacted]";}
    }
    public Optional<Flow> find(String hash){
        return jdbc.sql("select * from staff_invitation_flows where token_hash=:hash").param("hash",hash).query((rs,n)->new Flow(
            rs.getObject("id",UUID.class),rs.getObject("staff_user_id",UUID.class),rs.getObject("organization_id",UUID.class),rs.getObject("credential_generation",UUID.class),
            rs.getString("work_email"),rs.getTimestamp("expires_at").toInstant(),instant(rs,"sent_at"),instant(rs,"consumed_at"),instant(rs,"revoked_at"))).optional();
    }
    private static Instant instant(java.sql.ResultSet rs,String column)throws java.sql.SQLException{return rs.getTimestamp(column)==null?null:rs.getTimestamp(column).toInstant();}
    public boolean prepared(UUID id,UUID org){return jdbc.sql("""
        select exists(select 1 from staff_users u join staff_invitation_flows f on f.id=u.credential_prepared_flow_id
          where u.id=:id and f.staff_user_id=u.id and f.organization_id=:org and f.work_email=u.work_email
            and u.credential_generation=u.credential_prepared_generation and f.credential_generation=u.credential_generation
            and u.credential_prepared_at is not null and u.credential_prepared_source='INVITATION_CONSUMED'
            and f.consumed_at is not null and f.sent_at is not null and f.revoked_at is null)
        """).param("id",id).param("org",org).query(Boolean.class).single();}
    public boolean recent(UUID id,UUID org){return jdbc.sql("select exists(select 1 from staff_invitation_flows where staff_user_id=:id and organization_id=:org and consumed_at is null and revoked_at is null and sent_at>clock_timestamp()-interval '1 minute')")
        .param("id",id).param("org",org).query(Boolean.class).single();}
    public void issue(UUID id,UUID user,UUID org,UUID generation,String hash,String email){
        jdbc.sql("""
            insert into staff_invitation_flows(id,staff_user_id,organization_id,credential_generation,token_hash,work_email,created_at,expires_at)
            values(:id,:user,:org,:generation,:hash,:email,clock_timestamp(),clock_timestamp()+interval '30 minutes')
            """).param("id",id).param("user",user).param("org",org).param("generation",generation).param("hash",hash).param("email",email).update();
        jdbc.sql("update staff_users set credential_generation=:generation,version=version+1,updated_at=clock_timestamp() where id=:user")
            .param("generation",generation).param("user",user).update();
    }
    public void sent(UUID id){jdbc.sql("update staff_invitation_flows set sent_at=clock_timestamp() where id=:id").param("id",id).update();}
    public record Recipient(String email,boolean eligible,UUID generation){@Override public String toString(){return "StaffInvitationRecipient[redacted]";}}
    public Recipient recipient(UUID user,UUID org){return jdbc.sql("""
        select u.work_email,(u.status='SUSPENDED' and m.status='ACTIVE' and m.role_code<>'SUPER_ADMIN' and u.role_code=m.role_code and r.status='ACTIVE') eligible,u.credential_generation
        from staff_users u join organization_memberships m on m.staff_user_id=u.id join roles r on r.code=m.role_code where u.id=:user and m.organization_id=:org
        """).param("user",user).param("org",org).query((rs,n)->new Recipient(rs.getString(1),rs.getBoolean(2),rs.getObject(3,UUID.class))).single();}
    public void consume(Flow flow,String passwordHash){
        int changed=jdbc.sql("update staff_invitation_flows set consumed_at=clock_timestamp() where id=:id and consumed_at is null and revoked_at is null and sent_at is not null and expires_at>clock_timestamp()")
            .param("id",flow.id()).update();
        if(changed!=1)throw new IllegalStateException("Invitation unavailable");
        int prepared=jdbc.sql("""
            update staff_users set password_hash=:password,credential_generation=:generation,credential_prepared_generation=:generation,
              credential_prepared_at=clock_timestamp(),credential_prepared_source='INVITATION_CONSUMED',credential_prepared_flow_id=:flow,
              version=version+1,updated_at=clock_timestamp() where id=:user and status='SUSPENDED' and credential_generation=:generation
            """).param("password",passwordHash).param("generation",flow.generation()).param("flow",flow.id()).param("user",flow.user()).update();
        if(prepared!=1)throw new IllegalStateException("Invitation unavailable");
    }
    /** Consumption already advanced the global version exactly once in this transaction. */
    public void activate(UUID user,UUID org){
        int changed=jdbc.sql("""
            update staff_users u set status='ACTIVE',initial_activation_pending=false
            where u.id=:user and u.status='SUSPENDED'
              and exists(select 1 from organization_memberships m where m.staff_user_id=u.id and m.organization_id=:org and m.status='ACTIVE')
            """).param("user",user).param("org",org).update();
        if(changed!=1)throw new IllegalStateException("Invitation unavailable");
    }

}
