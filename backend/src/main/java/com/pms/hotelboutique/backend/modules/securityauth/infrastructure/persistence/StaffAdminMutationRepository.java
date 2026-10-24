package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Called only inside the shared parent-lock transaction. Every write binds organization. */
@Repository
public class StaffAdminMutationRepository {
    private final JdbcClient jdbc;
    public StaffAdminMutationRepository(JdbcClient jdbc){this.jdbc=jdbc;}
    public void create(UUID id,UUID org,String username,String email,String role,String unusableHash,Set<UUID> properties){
        jdbc.sql("""
            insert into staff_users(id,username,work_email,password_hash,role_code,status,version,created_at,updated_at)
            values(:id,:username,:email,:hash,:role,'SUSPENDED',0,clock_timestamp(),clock_timestamp())
            """).param("id",id).param("username",username).param("email",email).param("hash",unusableHash).param("role",role).update();
        jdbc.sql("""
            insert into organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at)
            values(:id,:org,:role,'ACTIVE',clock_timestamp(),clock_timestamp())
            """).param("id",id).param("org",org).param("role",role).update();
        replaceMembership(id,org,role,properties);
    }
    public Set<UUID> assignments(UUID user,UUID org){
        return Set.copyOf(jdbc.sql("select property_id from membership_properties where staff_user_id=:id and organization_id=:org and status='ACTIVE'")
                .param("id",user).param("org",org).query(UUID.class).list());
    }
    public String legacyRole(UUID user,UUID org){return jdbc.sql("select u.role_code from staff_users u join organization_memberships m on m.staff_user_id=u.id where u.id=:id and m.organization_id=:org")
            .param("id",user).param("org",org).query(String.class).single();}
    public boolean validProperties(Set<UUID> proposed,UUID org,Set<UUID> authorized){
        if(proposed.isEmpty())return true;
        if(!authorized.containsAll(proposed))return false;
        return jdbc.sql("select count(*) from properties where organization_id=:org and status='ACTIVE' and id in (:ids)")
                .param("org",org).param("ids",proposed).query(Long.class).single()==proposed.size();
    }
    public boolean activeRole(String role){return jdbc.sql("select count(*) from roles where code=:role and status='ACTIVE'").param("role",role).query(Long.class).single()==1;}
    public int updateUser(UUID id,UUID org,long version,String field,String value){
        if(!Set.of("work_email","role_code","status").contains(field))throw new IllegalArgumentException("Invalid field");
        return jdbc.sql("update staff_users u set "+field+"=:value,version=version+1,updated_at=clock_timestamp() where u.id=:id and u.version=:version and exists(select 1 from organization_memberships m where m.staff_user_id=u.id and m.organization_id=:org)")
                .param("value",value).param("id",id).param("org",org).param("version",version).update();
    }
    public void replaceMembership(UUID id,UUID org,String role,Set<UUID> ids){
        jdbc.sql("update organization_memberships set role_code=:role,updated_at=clock_timestamp() where staff_user_id=:id and organization_id=:org")
                .param("role",role).param("id",id).param("org",org).update();
        jdbc.sql("update membership_properties set status='INACTIVE',updated_at=clock_timestamp() where staff_user_id=:id and organization_id=:org and status='ACTIVE'")
                .param("id",id).param("org",org).update();
        for(UUID property:ids.stream().sorted().toList())jdbc.sql("""
                insert into membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at)
                values(:id,:org,:property,'ACTIVE',clock_timestamp(),clock_timestamp())
                on conflict(staff_user_id,organization_id,property_id) do update set status='ACTIVE',updated_at=excluded.updated_at
                """).param("id",id).param("org",org).param("property",property).update();
    }
    public List<UUID> revokeSessions(UUID target){
        var revoked=jdbc.sql("update auth_sessions set status='REVOKED',revoked_at=clock_timestamp() where staff_user_id=:id and context='STAFF' and status='ACTIVE' returning id")
                .param("id",target).query(UUID.class).list();
        jdbc.sql("update refresh_tokens t set revoked_at=clock_timestamp() from auth_sessions s where s.id=t.session_id and s.staff_user_id=:id and s.context='STAFF' and t.revoked_at is null")
                .param("id",target).update();
        return revoked;
    }
}
