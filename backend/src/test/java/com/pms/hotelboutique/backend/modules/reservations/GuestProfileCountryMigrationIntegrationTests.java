package com.pms.hotelboutique.backend.modules.reservations;

import java.sql.Connection;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import javax.sql.DataSource;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class GuestProfileCountryMigrationIntegrationTests {
    @Autowired DataSource db;

    @Test
    void upgradePreservesLegacyGuestDataAndChecksumsAndIsIdempotent() throws Exception {
        try (var connection = db.getConnection()) {
            String schema = "profile_country_" + UUID.randomUUID().toString().replace("-", "");
            execute(connection, "CREATE SCHEMA " + schema);
            try {
                migrate(connection, schema, "classpath:db/changelog/db.changelog-before-guest-registration.yaml");
                var before = manifest(connection);
                UUID profile = UUID.randomUUID();
                execute(connection, "INSERT INTO guest_profiles(id,first_name,last_name,email,phone,status,created_at,updated_at) "
                        + "VALUES ('" + profile + "','Legacy','Guest','legacy@example.test','+50255551234','ACTIVE',now(),now())");
                migrate(connection, schema, "classpath:db/changelog/db.changelog-master.yaml");
                var after = manifest(connection);
                assertTrue(after.containsKey("004-011-guest-profile-country"));
                before.forEach((id, checksum) -> assertEquals(checksum, after.get(id)));
                try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                        "SELECT phone,country FROM guest_profiles WHERE id='" + profile + "'")) {
                    assertTrue(rows.next());
                    assertEquals("+50255551234", rows.getString("phone"));
                    assertNull(rows.getString("country"));
                    assertFalse(rows.next());
                }
                execute(connection, "UPDATE guest_profiles SET country='GT' WHERE id='" + profile + "'");
                migrate(connection, schema, "classpath:db/changelog/db.changelog-master.yaml");
                assertEquals(after, manifest(connection));
                try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                        "SELECT country FROM guest_profiles WHERE id='" + profile + "'")) {
                    assertTrue(rows.next());
                    assertEquals("GT", rows.getString(1));
                }
            } finally {
                connection.setSchema("public");
                execute(connection, "DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    private void migrate(Connection connection, String schema, String path) throws Exception {
        connection.setSchema(schema);
        var liquibase = new SpringLiquibase();
        liquibase.setDataSource(new SingleConnectionDataSource(connection, true));
        liquibase.setDefaultSchema(schema);
        liquibase.setLiquibaseSchema(schema);
        liquibase.setChangeLog(path);
        liquibase.afterPropertiesSet();
    }

    private Map<String, String> manifest(Connection connection) throws Exception {
        var checksums = new TreeMap<String, String>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("SELECT id,md5sum FROM databasechangelog")) {
            while (rows.next()) checksums.put(rows.getString(1), rows.getString(2));
        }
        return checksums;
    }

    private void execute(Connection connection, String sql) throws Exception {
        try (var statement = connection.createStatement()) { statement.execute(sql); }
    }
}
