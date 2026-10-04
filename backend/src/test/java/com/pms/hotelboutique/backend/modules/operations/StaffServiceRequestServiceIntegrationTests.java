package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.ServiceRequestException;
import com.pms.hotelboutique.backend.modules.operations.application.ServiceRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.StaffServiceRequestService;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.operations.support.OperationsFixtures;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class StaffServiceRequestServiceIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired StaffServiceRequestService intake;
    @Autowired JdbcTemplate jdbc;

    private UUID otherProperty;
    private UUID room;
    private UUID otherRoom;
    private StaffPrincipal reception;

    @BeforeEach
    void fixtures() {
        otherProperty = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,'Other',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, ORGANIZATION, otherProperty.toString());
        room = OperationsFixtures.room(jdbc, PROPERTY, "INTAKE-" + UUID.randomUUID());
        otherRoom = OperationsFixtures.room(jdbc, otherProperty, "OTHER-" + UUID.randomUUID());
        reception = staff("RECEPCION", PROPERTY);
    }

    @Test
    void receptionOpensAndReadsAllApprovedCategoriesWithTrustedActor() {
        for (var category : ServiceRequest.Category.values()) {
            var opened = intake.open(reception, command(PROPERTY, category, room, UUID.randomUUID()));
            assertEquals(reception.staffUserId(), opened.createdBy());
            assertEquals(category, intake.get(reception, PROPERTY, opened.id()).category());
        }
        assertEquals(ServiceRequest.Category.values().length, intake.list(reception, PROPERTY).size());
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM role_permissions WHERE role_code='RECEPCION' "
                + "AND permission_code='SERVICE_REQUEST_INTAKE'", Long.class));
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM role_permissions WHERE role_code='SUPER_ADMIN' "
                + "AND permission_code='SERVICE_REQUEST_INTAKE'", Long.class));
    }

    @Test
    void deniesMissingPermissionSessionAndPropertyBeforeWriting() {
        var auditor = staff("AUDITOR", PROPERTY);
        assertThrows(AccessDeniedException.class,
                () -> intake.open(auditor, command(PROPERTY, ServiceRequest.Category.VALET, room, null)));
        assertThrows(StaffAuthenticationException.class,
                () -> intake.open(null, command(PROPERTY, ServiceRequest.Category.VALET, room, null)));
        assertThrows(AccessDeniedException.class,
                () -> intake.open(reception, command(otherProperty, ServiceRequest.Category.VALET, otherRoom, null)));
        var revoked = staff("RECEPCION", PROPERTY);
        jdbc.update("UPDATE auth_sessions SET status='REVOKED', revoked_at=now() WHERE id=?", revoked.sessionId());
        assertThrows(StaffAuthenticationException.class, () -> intake.list(revoked, PROPERTY));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM service_requests WHERE property_id=?",
                Long.class, PROPERTY));
    }

    @Test
    void scopesDetailsAndRejectsCrossPropertyLinks() {
        var opened = intake.open(reception, command(PROPERTY, ServiceRequest.Category.CONCIERGE, room, null));
        assertThrows(AccessDeniedException.class, () -> intake.get(reception, otherProperty, opened.id()));
        var multiPropertyReception = staff("RECEPCION", PROPERTY, otherProperty);
        assertThrows(ServiceRequestException.class,
                () -> intake.get(multiPropertyReception, otherProperty, opened.id()));
        assertTrue(intake.list(multiPropertyReception, otherProperty).isEmpty());
        assertThrows(ServiceRequestException.class,
                () -> intake.open(reception, command(PROPERTY, ServiceRequest.Category.VALET, otherRoom, null)));
        assertEquals(1, intake.list(reception, PROPERTY).size());
        assertTrue(intake.list(staff("OPERACIONES", otherProperty), otherProperty).isEmpty());
    }

    @Test
    void permissionChangesTakeEffectOnNextRequest() {
        var opened = intake.open(reception, command(PROPERTY, ServiceRequest.Category.OTHER, room, null));
        jdbc.update("UPDATE organization_memberships SET role_code='AUDITOR' WHERE staff_user_id=?",
                reception.staffUserId());
        assertThrows(AccessDeniedException.class, () -> intake.get(reception, PROPERTY, opened.id()));
    }

    private ServiceRequestService.OpenRequestCommand command(UUID propertyId,
            ServiceRequest.Category category, UUID roomId, UUID reportedBy) {
        return new ServiceRequestService.OpenRequestCommand(propertyId, category, "Help requested",
                "Operational detail", ServiceRequest.Priority.MEDIUM, null, null, roomId,
                null, reportedBy, null);
    }

    private StaffPrincipal staff(String role, UUID... propertyIds) {
        UUID id = UUID.randomUUID();
        UUID session = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())",
                id, id.toString(), id + "@example.test", role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, role);
        for (UUID propertyId : propertyIds) {
            jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) "
                    + "VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, propertyId);
        }
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) "
                + "VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, id);
        return new StaffPrincipal(id, session, id.toString(), role);
    }
}
