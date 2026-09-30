package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;
import javax.sql.DataSource;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class InventorySchemaIntegrationTests {
    @Autowired DataSource dataSource;
    @Autowired ApplicationContext context;
    private Connection connection;
    private UUID property;
    private UUID otherProperty;
    private UUID type;
    private UUID room;
    private UUID actor;

    @BeforeEach
    void fixtures() throws SQLException {
        connection = dataSource.getConnection();
        connection.setAutoCommit(false);
        var organization = UUID.randomUUID();
        property = UUID.randomUUID();
        otherProperty = UUID.randomUUID();
        type = UUID.randomUUID();
        room = UUID.randomUUID();
        actor = UUID.randomUUID();
        execute("INSERT INTO organizations(id,name,code,status,created_at,updated_at) VALUES (?, 'Test', ?, 'ACTIVE',now(),now())",
                organization, organization.toString());
        for (var id : new UUID[]{property, otherProperty}) {
            execute("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                    + "VALUES (?,?,'Test',?,'America/Guatemala','GTQ','ACTIVE',now(),now())", id, organization, id.toString());
        }
        execute("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'test-only-unused-hash','SUPER_ADMIN','ACTIVE',now(),now())",
                actor, actor.toString(), actor + "@example.test");
        execute("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','King')", type, property);
        execute("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')", room, property, type);
    }

    @AfterEach
    void cleanup() throws SQLException {
        if (connection != null) {
            try { connection.rollback(); } finally { connection.close(); }
        }
    }

    @Test
    void rejectsCrossPropertyReferences() throws SQLException {
        rejected("23503", "INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'102')",
                UUID.randomUUID(), otherProperty, type);
        rejected("23503", "INSERT INTO rate_plans(id,property_id,room_type_id,code,name,base_amount_minor,currency) "
                + "VALUES (?,?,?,'BAR','Base',10000,'GTQ')", UUID.randomUUID(), otherProperty, type);
        rejected("23503", "INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by) "
                + "VALUES (?,?,?,'OOO','2026-10-01','2026-10-03','Repair',?)", UUID.randomUUID(), otherProperty, room, actor);
    }

    @Test
    void preservesOperationalHistoryAndValidatesPeriods() throws SQLException {
        var outage = UUID.randomUUID();
        execute("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by) "
                + "VALUES (?,?,?,'OOO','2026-10-01','2026-10-03','Repair',?)", outage, property, room, actor);
        execute("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by) "
                + "VALUES (?,?,?,'OOS','2026-10-02','2026-10-03','Inspection',?)", UUID.randomUUID(), property, room, actor);
        rejected("23514", "INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by) "
                + "VALUES (?,?,?,'OOO','2026-10-03','2026-10-03','Repair',?)", UUID.randomUUID(), property, room, actor);
        rejected("23514", "UPDATE out_of_order_records SET released_at=now() WHERE id=?", outage);
        execute("UPDATE out_of_order_records SET released_at=now(), released_by=?, release_reason='Verified' WHERE id=?", actor, outage);
        rejected("23503", "DELETE FROM rooms WHERE id=?", room);
        try (var statement = connection.prepareStatement("SELECT count(*) FROM out_of_order_records WHERE room_id=?")) {
            statement.setObject(1, room);
            try (var result = statement.executeQuery()) {
                assertTrue(result.next());
                assertEquals(2, result.getInt(1));
            }
        }
    }

    @Test
    void storesExactBigintPriceAndRejectsNegativeRatesAndDuplicates() throws SQLException {
        var rate = UUID.randomUUID();
        execute("INSERT INTO rate_plans(id,property_id,room_type_id,code,name,base_amount_minor,currency) "
                + "VALUES (?,?,?,'BAR','Base',?,'GTQ')", rate, property, type, Long.MAX_VALUE);
        try (var statement = connection.prepareStatement("SELECT base_amount_minor,currency FROM rate_plans WHERE id=?")) {
            statement.setObject(1, rate);
            try (var result = statement.executeQuery()) {
                assertTrue(result.next());
                assertEquals(Long.MAX_VALUE, result.getLong(1));
                assertEquals("GTQ", result.getString(2));
            }
        }
        rejected("23514", "UPDATE rate_plans SET base_amount_minor=-1 WHERE id=?", rate);
        rejected("23505", "INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','Duplicate')",
                UUID.randomUUID(), property);
        rejected("23505", "INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')",
                UUID.randomUUID(), property, type);
    }

    @Test
    void defaultRuntimeHasNoFakeAvailability() {
        assertTrue(context.getBeansOfType(AvailabilityPort.class).isEmpty());
    }

    @Test
    void upgradesExistingBd1SchemaWithoutRecreatingProperty() throws Exception {
        // Generated identifier; never derived from user input or an existing schema.
        String schema = "bd2_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try (var isolated = dataSource.getConnection(); var sql = isolated.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try {
                migrate(schema, "classpath:db/changelog/db.changelog-before-bd2.yaml");
                try (var result = sql.executeQuery("SELECT count(*) FROM " + schema + ".databasechangelog")) {
                    assertTrue(result.next());
                    assertEquals(5, result.getInt(1));
                }
                migrate(schema, "classpath:db/changelog/db.changelog-master.yaml");
                // Re-applying must be a no-op, including all pre-existing checksums.
                migrate(schema, "classpath:db/changelog/db.changelog-master.yaml");
                try (var result = sql.executeQuery("SELECT count(*) FROM " + schema + ".databasechangelog")) {
                    assertTrue(result.next());
                    assertEquals(6, result.getInt(1));
                }
                try (var result = sql.executeQuery("SELECT code FROM " + schema + ".properties")) {
                    assertTrue(result.next());
                    assertEquals("HB-GT-001", result.getString(1));
                    assertFalse(result.next());
                }
            } finally {
                sql.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    private void migrate(String schema, String changelog) throws Exception {
        var liquibase = new SpringLiquibase();
        liquibase.setDataSource(new DelegatingDataSource(dataSource) {
            @Override
            public Connection getConnection() throws SQLException {
                var scoped = super.getConnection();
                scoped.setSchema(schema);
                return scoped;
            }
        });
        liquibase.setDefaultSchema(schema);
        liquibase.setLiquibaseSchema(schema);
        liquibase.setChangeLog(changelog);
        liquibase.afterPropertiesSet();
    }

    private void execute(String sql, Object... values) throws SQLException {
        try (var statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            statement.executeUpdate();
        }
    }

    private void rejected(String state, String sql, Object... values) throws SQLException {
        var savepoint = connection.setSavepoint();
        try {
            var error = assertThrows(SQLException.class, () -> execute(sql, values));
            assertEquals(state, error.getSQLState());
        } finally {
            connection.rollback(savepoint);
            connection.releaseSavepoint(savepoint);
        }
    }
}
