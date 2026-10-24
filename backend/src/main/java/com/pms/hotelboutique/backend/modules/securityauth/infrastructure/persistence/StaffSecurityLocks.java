package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Shared transaction protocol: users (UUID order), memberships, properties, sessions, tokens.
 * A parent user lock serializes child INSERTs as well as existing rows. */
@Repository
public class StaffSecurityLocks {
    private final JdbcClient jdbc;
    public StaffSecurityLocks(JdbcClient jdbc) { this.jdbc = jdbc; }
    public void users(Collection<UUID> ids) {
        jdbc.sql("select set_config('lock_timeout','5s',true)").query(String.class).single();
        ids.stream().distinct().sorted(Comparator.comparing(UUID::toString)).forEach(id ->
            jdbc.sql("select id from staff_users where id=:id for update").param("id",id).query(UUID.class).optional());
    }
    public void memberships(Collection<UUID> ids, UUID organization) {
        ids.stream().distinct().sorted(Comparator.comparing(UUID::toString)).forEach(id ->
            jdbc.sql("select staff_user_id from organization_memberships where staff_user_id=:id and organization_id=:org for update")
                .param("id",id).param("org",organization).query(UUID.class).optional());
    }
    public void properties(Collection<UUID> ids, UUID organization) {
        if (!ids.isEmpty()) jdbc.sql("select id from properties where organization_id=:org and id in (:ids) order by id for update")
                .param("org",organization).param("ids",ids).query(UUID.class).list();
    }
    public void sessionsAndTokens(UUID user) {
        jdbc.sql("select id from auth_sessions where staff_user_id=:id and context='STAFF' order by id for update")
                .param("id",user).query(UUID.class).list();
        jdbc.sql("select t.id from refresh_tokens t join auth_sessions s on s.id=t.session_id where s.staff_user_id=:id and s.context='STAFF' order by t.id for update of t")
                .param("id",user).query(UUID.class).list();
    }
}
