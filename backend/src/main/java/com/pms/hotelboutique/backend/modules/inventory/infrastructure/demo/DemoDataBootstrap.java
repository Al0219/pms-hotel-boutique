package com.pms.hotelboutique.backend.modules.inventory.infrastructure.demo;

import com.pms.hotelboutique.backend.modules.inventory.application.DemoRatePolicy;
import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Local development fixtures, not schema migrations or business identifiers. */
@Component
@Profile("(demo | dev) & !prod & !production")
@ConditionalOnProperty(name = "pms.demo.data.enabled", havingValue = "true")
public class DemoDataBootstrap implements ApplicationRunner {
    public static final UUID PROPERTY_ID = id("property:HB-GT-DEMO");
    private static final Logger log = LoggerFactory.getLogger(DemoDataBootstrap.class);
    private record Type(String code, String name, int floor) { }
    private static final List<Type> TYPES = List.of(
            new Type("STD", "Habitación Estándar", 1), new Type("CLASSIC", "Habitación Classic", 2),
            new Type("TWIN", "Habitación Twin", 3), new Type("KING", "Habitación King", 4),
            new Type("DLX", "Habitación Deluxe", 5), new Type("SUITE", "Suite", 6));
    private final JdbcTemplate jdbc;
    private final DemoRatePolicy rates;

    public DemoDataBootstrap(JdbcTemplate jdbc, DemoRatePolicy rates) { this.jdbc = jdbc; this.rates = rates; }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Serialize only this demo dataset, including concurrent local startups.
        jdbc.execute("SELECT pg_advisory_xact_lock(720260106)");
        UUID organization = jdbc.queryForObject("SELECT id FROM organizations WHERE code='HOTEL_BOUTIQUE'", UUID.class);
        jdbc.update("""
                INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at)
                VALUES(?,?,'HB-GT-DEMO','Hotel Boutique Demo','America/Guatemala','GTQ','ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING
                """, PROPERTY_ID, organization);
        Integer matching = jdbc.queryForObject("""
                SELECT count(*) FROM properties WHERE id=? AND organization_id=? AND code='HB-GT-DEMO'
                  AND name='Hotel Boutique Demo' AND timezone='America/Guatemala' AND currency='GTQ' AND status='ACTIVE'
                """, Integer.class, PROPERTY_ID, organization);
        if (matching == null || matching != 1) throw new IllegalStateException("DEMO_DATA_PROPERTY_CONFLICT: existing demo Property does not match; no data overwritten");
        for (Type type : TYPES) {
            UUID typeId = id("type:" + type.code());
            // Verify all demo codes against the existing pricing authority; do not store rates.
            rates.rateFor(new RoomType(typeId, PROPERTY_ID, type.code(), type.name(), Instant.now()));
            jdbc.update("""
                    INSERT INTO room_types(id,property_id,code,name,created_at,updated_at)
                    VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING
                    """, typeId, PROPERTY_ID, type.code(), type.name());
            UUID existingType = jdbc.queryForObject("SELECT id FROM room_types WHERE property_id=? AND code=?", UUID.class, PROPERTY_ID, type.code());
            for (int unit = 1; unit <= 4; unit++) {
                String code = String.valueOf(type.floor() * 100 + unit);
                jdbc.update("""
                        INSERT INTO rooms(id,property_id,room_type_id,code,created_at,updated_at)
                        VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING
                        """, id("room:" + code), PROPERTY_ID, existingType, code);
                Integer correct = jdbc.queryForObject("SELECT count(*) FROM rooms WHERE property_id=? AND room_type_id=? AND code=?", Integer.class, PROPERTY_ID, existingType, code);
                if (correct == null || correct != 1) throw new IllegalStateException("DEMO_DATA_ROOM_CONFLICT: " + code + "; no data overwritten");
            }
        }
        log.info("Local demo dataset ready: Property HB-GT-DEMO, 6 RoomTypes, 24 Rooms; existing data preserved");
    }

    private static UUID id(String key) { return UUID.nameUUIDFromBytes(("pms:local-demo:" + key).getBytes(StandardCharsets.UTF_8)); }
}
