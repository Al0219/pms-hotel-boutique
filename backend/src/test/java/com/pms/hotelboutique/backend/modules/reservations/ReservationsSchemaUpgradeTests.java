package com.pms.hotelboutique.backend.modules.reservations;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;
import javax.sql.DataSource;
import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import liquibase.integration.spring.SpringLiquibase;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.datasource.DelegatingDataSource;

/**
 * BD3 migration validation: a pre-BD3 schema (6 changesets) upgrades to the
 * full master (15 changesets) without touching pre-existing tables, and
 * re-applying the master is a no-op.
 */
@SpringBootTest
class ReservationsSchemaUpgradeTests {

    @Autowired
    DataSource dataSource;

    @Test
    void upgradesPreBd3SchemaAndReappliesCleanly() throws Exception {
        // Generated identifier; never derived from user input or an existing schema.
        String schema = "bd3_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try (var isolated = TestConnections.publicConnection(dataSource); var sql = isolated.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try {
                migrate(schema, "classpath:db/changelog/db.changelog-before-bd3.yaml");
                try (var result = sql.executeQuery("SELECT count(*) FROM " + schema + ".databasechangelog")) {
                    assertTrue(result.next());
                    assertEquals(6, result.getInt(1));
                }
                migrate(schema, "classpath:db/changelog/db.changelog-master.yaml");
                try (var result = sql.executeQuery("SELECT count(*) FROM " + schema + ".databasechangelog")) {
                    assertTrue(result.next());
                    assertEquals(15, result.getInt(1));
                }
                // Re-applying must be a no-op, including all pre-existing checksums.
                migrate(schema, "classpath:db/changelog/db.changelog-master.yaml");
                try (var result = sql.executeQuery("SELECT count(*) FROM " + schema + ".databasechangelog")) {
                    assertTrue(result.next());
                    assertEquals(15, result.getInt(1));
                }
                for (String table : new String[]{"guest_profiles", "reservations", "reservation_stays",
                        "reservation_guests", "folios", "folio_movements", "reservation_audit_events",
                        "hk_room_states", "maintenance_orders", "service_requests",
                        "service_messages", "hk_discrepancies", "business_days",
                        "night_audit_runs", "companies", "agencies"}) {
                    try (var result = sql.executeQuery(
                            "SELECT count(*) FROM " + schema + "." + table)) {
                        assertTrue(result.next());
                    }
                }
                var triggers = new java.util.HashSet<String>();
                try (var result = sql.executeQuery(
                        "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema='"
                                + schema + "'")) {
                    while (result.next()) {
                        triggers.add(result.getString(1));
                    }
                }
                assertEquals(java.util.Set.of("trg_folio_movements_append_only", "trg_audit_append_only"),
                        triggers);
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
        var issued = new java.util.ArrayList<Connection>();
        var liquibase = new SpringLiquibase();
        liquibase.setDataSource(new DelegatingDataSource(dataSource) {
            @Override
            public Connection getConnection() throws SQLException {
                var scoped = super.getConnection();
                scoped.setSchema(schema);
                issued.add(scoped);
                return scoped;
            }
        });
        liquibase.setDefaultSchema(schema);
        liquibase.setLiquibaseSchema(schema);
        liquibase.setChangeLog(changelog);
        try {
            liquibase.afterPropertiesSet();
        } finally {
            // setSchema mutates pooled connections; restore the default so
            // later tests never inherit this isolated schema.
            for (Connection connection : issued) {
                try {
                    if (!connection.isClosed()) {
                        connection.setSchema("public");
                    }
                } catch (SQLException ignored) {
                    // Best effort cleanup; the test outcome does not depend on it.
                }
            }
        }
    }
}
