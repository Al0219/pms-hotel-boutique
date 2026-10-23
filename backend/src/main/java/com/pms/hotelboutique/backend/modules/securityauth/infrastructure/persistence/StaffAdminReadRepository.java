package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadModels.*;

@Repository
public class StaffAdminReadRepository {
    private final JdbcClient jdbc;
    public StaffAdminReadRepository(JdbcClient jdbc) { this.jdbc = jdbc; }

    public List<Role> roles() {
        return jdbc.sql("SELECT code, name FROM roles WHERE status='ACTIVE' ORDER BY CASE code "
                + "WHEN 'SUPER_ADMIN' THEN 0 WHEN 'GERENCIA' THEN 1 WHEN 'RECEPCION' THEN 2 "
                + "WHEN 'OPERACIONES' THEN 3 WHEN 'AUDITOR' THEN 4 ELSE 5 END")
                .query((rs, row) -> new Role(RoleCode.valueOf(rs.getString("code")), rs.getString("name"))).list();
    }

    /** Authorization, selection and limit execute in SQL before property projection. No entity loads. */
    public List<User> users(StaffAuthorizationSnapshot actor, Scope scope, StaffAdminReadQuery query,
            UUID target, StaffAdminCursorCodec.Position after) {
        Map<String, Object> params = new HashMap<>();
        params.put("org", actor.organizationId());
        String assignment = """
                SELECT 1 FROM membership_properties mp
                JOIN properties p ON p.id=mp.property_id AND p.organization_id=mp.organization_id
                WHERE mp.staff_user_id=u.id AND mp.organization_id=m.organization_id
                  AND mp.status='ACTIVE' AND p.status='ACTIVE'
                """;
        StringBuilder where = new StringBuilder(" WHERE m.organization_id=:org ");
        if (!"SUPER_ADMIN".equals(actor.roleCode())) {
            // An authorized GERENCIA always has a nonempty C2 property set.
            var authorized = actor.properties().stream().map(StaffAuthorizationSnapshot.PropertyAccess::propertyId).toList();
            if (authorized.isEmpty()) throw new IllegalArgumentException("Empty management scope");
            params.put("authorized", authorized);
            where.append(" AND m.role_code <> 'SUPER_ADMIN' AND EXISTS (").append(assignment).append(")")
                    .append(" AND NOT EXISTS (").append(assignment)
                    .append(" AND mp.property_id NOT IN (:authorized)) ");
        }
        if (scope.kind() == ScopeKind.PROPERTY) {
            params.put("selected", scope.propertyIds().getFirst());
            where.append(" AND ((m.role_code='SUPER_ADMIN' AND EXISTS (SELECT 1 FROM properties p WHERE p.id=:selected AND p.organization_id=:org AND p.status='ACTIVE'))")
                    .append(" OR (m.role_code<>'SUPER_ADMIN' AND EXISTS (").append(assignment)
                    .append(" AND mp.property_id=:selected))) ");
        }
        if (target != null) { where.append(" AND u.id=:target "); params.put("target", target); }
        if (query.status() != null) { where.append(" AND u.status=:status "); params.put("status", query.status().name()); }
        if (query.roleCode() != null) { where.append(" AND m.role_code=:role "); params.put("role", query.roleCode().name()); }
        if (query.username() != null) {
            // ! is the explicit LIKE escape. User %, _ and ! remain literal characters.
            params.put("username", "%" + query.username().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
            where.append(" AND lower(u.username) LIKE lower(:username) ESCAPE '!' ");
        }
        if (after != null) {
            where.append(" AND (u.username COLLATE \"C\", u.id) > (CAST(:afterName AS text) COLLATE \"C\", :afterId) ");
            params.put("afterName", after.username()); params.put("afterId", after.id());
        }
        params.put("rowLimit", target == null ? query.limit() + 1 : 1);
        String sql = """
                WITH visible_page AS MATERIALIZED (
                  SELECT u.id,u.username,u.work_email,u.status,u.created_at,u.updated_at,u.version,
                         m.role_code,m.status AS membership_status,m.organization_id
                  FROM staff_users u JOIN organization_memberships m ON m.staff_user_id=u.id
                """ + where + " ORDER BY u.username COLLATE \"C\",u.id LIMIT :rowLimit) " + """
                SELECT v.*, ARRAY(
                  SELECT p.id FROM properties p
                  WHERE p.organization_id=v.organization_id AND p.status='ACTIVE'
                    AND (v.role_code='SUPER_ADMIN' OR EXISTS (
                      SELECT 1 FROM membership_properties mp
                      WHERE mp.staff_user_id=v.id AND mp.organization_id=v.organization_id
                        AND mp.property_id=p.id AND mp.status='ACTIVE'))
                  ORDER BY p.id
                ) AS property_ids
                FROM visible_page v ORDER BY v.username COLLATE "C",v.id
                """;
        return jdbc.sql(sql).params(params).query((rs, row) -> user(rs)).list();
    }

    private User user(ResultSet rs) throws SQLException {
        List<UUID> properties;
        java.sql.Array array = rs.getArray("property_ids");
        try { properties = Arrays.asList((UUID[]) array.getArray()); }
        finally { array.free(); }
        return new User(rs.getObject("id", UUID.class), rs.getString("username"), rs.getString("work_email"),
                UserStatus.valueOf(rs.getString("status")), RoleCode.valueOf(rs.getString("role_code")),
                MembershipStatus.valueOf(rs.getString("membership_status")), rs.getObject("organization_id", UUID.class),
                properties, rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(), rs.getLong("version"));
    }
}
