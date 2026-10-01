package com.pms.hotelboutique.backend.modules.operations.support;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * BD3-only operations fixtures. Rows join the caller's transaction and roll
 * back with the test.
 */
public final class OperationsFixtures {

    private OperationsFixtures() {
    }

    public static UUID room(JdbcTemplate jdbc, UUID propertyId, String code) {
        UUID type = UUID.randomUUID();
        UUID room = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,?)",
                type, propertyId, code, code);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",
                room, propertyId, type, "R-" + code);
        return room;
    }

    public static UUID staff(JdbcTemplate jdbc) {
        UUID actor = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,"
                + "created_at,updated_at) VALUES (?,?,?,'test-only-unused-hash','OPERACIONES','ACTIVE',"
                + "now(),now())", actor, actor.toString(), actor + "@example.test");
        return actor;
    }
}
