package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot.PropertyAccess;
import java.sql.ResultSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class StaffAuthorizationRepository {
    private final JdbcClient jdbc;
    public StaffAuthorizationRepository(JdbcClient jdbc) { this.jdbc = jdbc; }

    public Optional<Membership> findActiveMembership(UUID staffUserId) {
        return jdbc.sql("""
                select organization_id, role_code from organization_memberships
                where staff_user_id = :staffUserId and status = 'ACTIVE'
                """).param("staffUserId", staffUserId).query((rs, row) ->
                    new Membership(rs.getObject("organization_id", UUID.class), rs.getString("role_code"))).optional();
    }
    public Set<String> findPermissions(String roleCode) {
        return Set.copyOf(jdbc.sql("select permission_code from role_permissions where role_code = :roleCode")
                .param("roleCode", roleCode).query(String.class).list());
    }
    public List<PropertyAccess> findActiveProperties(UUID staffUserId, UUID organizationId, boolean allActiveProperties) {
        if (allActiveProperties) {
            return jdbc.sql("select id, code, name, timezone, currency from properties where organization_id = :organizationId and status = 'ACTIVE' order by code")
                    .param("organizationId", organizationId).query((rs, row) -> property(rs)).list();
        }
        return jdbc.sql("select p.id, p.code, p.name, p.timezone, p.currency from membership_properties mp join properties p on p.id = mp.property_id where mp.staff_user_id = :staffUserId and mp.organization_id = :organizationId and mp.status = 'ACTIVE' and p.status = 'ACTIVE' order by p.code")
                .param("staffUserId", staffUserId).param("organizationId", organizationId).query((rs, row) -> property(rs)).list();
    }
    public void ensureSuperAdminMembership(UUID staffUserId, UUID organizationId) {
        jdbc.sql("""
                insert into organization_memberships (staff_user_id, organization_id, role_code, status, created_at, updated_at)
                values (:staffUserId, :organizationId, 'SUPER_ADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                on conflict (staff_user_id, organization_id) do nothing
                """).param("staffUserId", staffUserId).param("organizationId", organizationId).update();
    }
    private PropertyAccess property(ResultSet rs) throws java.sql.SQLException {
        return new PropertyAccess(rs.getObject("id", UUID.class), rs.getString("code"), rs.getString("name"),
                rs.getString("timezone"), rs.getString("currency"));
    }
    public record Membership(UUID organizationId, String roleCode) { }
}
