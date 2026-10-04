package com.pms.hotelboutique.backend.modules.securityauth;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class StaffAdminSchemaIntegrationTests {
    @Autowired DataSource dataSource;
    private Connection connection;
    private UUID organization;
    private UUID otherOrganization;
    private UUID property;
    private UUID otherProperty;
    private UUID staff;

    @BeforeEach
    void setUp() throws SQLException {
        connection = dataSource.getConnection();
        connection.setAutoCommit(false);
        organization = UUID.randomUUID();
        otherOrganization = UUID.randomUUID();
        property = UUID.randomUUID();
        otherProperty = UUID.randomUUID();
        staff = UUID.randomUUID();
        insertOrganization(organization);
        insertOrganization(otherOrganization);
        insertProperty(property, organization);
        insertProperty(otherProperty, otherOrganization);
        insertStaff(staff, "staff." + staff + "@example.test");
        execute("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,'GERENCIA','ACTIVE',now(),now())", staff, organization);
    }

    @AfterEach
    void tearDown() throws SQLException {
        if (connection != null) {
            try { connection.rollback(); } finally { connection.close(); }
        }
    }

    @Test
    void rejectsCaseInsensitiveWorkEmailDuplicatesAndStartsVersionAtZero() throws SQLException {
        try (var statement = connection.prepareStatement("SELECT version FROM staff_users WHERE id=?")) {
            statement.setObject(1, staff);
            try (var rows = statement.executeQuery()) {
                assertTrue(rows.next());
                assertEquals(0L, rows.getLong(1));
            }
        }
        var savepoint = connection.setSavepoint();
        var failure = assertThrows(SQLException.class,
                () -> insertStaff(UUID.randomUUID(), " " + ("staff." + staff + "@example.test").toUpperCase() + " "));
        assertEquals("23505", failure.getSQLState());
        connection.rollback(savepoint);
    }

    @Test
    void rejectsPropertyFromAnotherOrganizationAndAllowsOwnProperty() throws SQLException {
        var savepoint = connection.setSavepoint();
        var failure = assertThrows(SQLException.class, () -> insertMembershipProperty(otherProperty));
        assertEquals("23503", failure.getSQLState());
        connection.rollback(savepoint);
        insertMembershipProperty(property);
        try (var statement = connection.prepareStatement(
                "SELECT count(*) FROM membership_properties WHERE staff_user_id=? AND organization_id=?")) {
            statement.setObject(1, staff);
            statement.setObject(2, organization);
            try (var rows = statement.executeQuery()) {
                assertTrue(rows.next());
                assertEquals(1L, rows.getLong(1));
            }
        }
    }

    private void insertOrganization(UUID id) throws SQLException {
        execute("INSERT INTO organizations(id,name,code,status,created_at,updated_at) "
                + "VALUES (?,'Test',?,'ACTIVE',now(),now())", id, id.toString());
    }

    private void insertProperty(UUID id, UUID organizationId) throws SQLException {
        execute("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,'Test',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                id, organizationId, id.toString());
    }

    private void insertStaff(UUID id, String email) throws SQLException {
        execute("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'test-only-unused-hash','GERENCIA','ACTIVE',now(),now())",
                id, id.toString(), email);
    }

    private void insertMembershipProperty(UUID propertyId) throws SQLException {
        execute("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) "
                + "VALUES (?,?,?,'ACTIVE',now(),now())", staff, organization, propertyId);
    }

    private void execute(String sql, Object... values) throws SQLException {
        try (var statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < values.length; i++) {
                statement.setObject(i + 1, values[i]);
            }
            statement.executeUpdate();
        }
    }
}
