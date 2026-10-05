package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.FolioException;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioService;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffFolioService;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.util.Currency;
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
class StaffFolioServiceIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired StaffFolioService staffFolios;
    @Autowired FolioService folios;
    @Autowired JdbcTemplate jdbc;

    private UUID otherProperty;
    private UUID ownFolio;
    private UUID otherFolio;
    private StaffPrincipal reception;

    @BeforeEach
    void fixtures() {
        otherProperty = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,'Other finance',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, ORGANIZATION, otherProperty.toString());
        ownFolio = folios.openFolio(new FolioService.OpenFolioCommand(
                PROPERTY, Folio.Type.GUEST, "GTQ", null, null, null)).id();
        otherFolio = folios.openFolio(new FolioService.OpenFolioCommand(
                otherProperty, Folio.Type.GUEST, "GTQ", null, null, null)).id();
        reception = staff("RECEPCION", PROPERTY);
    }

    @Test
    void receptionReadsAndPostsWithSessionActor() {
        var charge = staffFolios.postCharge(reception, PROPERTY, ownFolio, amount(10000));
        var payment = staffFolios.postPayment(reception, PROPERTY, ownFolio, amount(3000));

        assertEquals(reception.staffUserId(), charge.createdBy());
        assertEquals(reception.staffUserId(), payment.createdBy());
        assertEquals(PROPERTY, staffFolios.get(reception, PROPERTY, ownFolio).propertyId());
        assertEquals(7000, staffFolios.balanceOf(reception, PROPERTY, ownFolio).minorUnits().value());
        assertEquals(2, staffFolios.movementsOf(reception, PROPERTY, ownFolio).size());
    }

    @Test
    void receptionCanReverseChargeButNotPaymentAndManagementCanReversePayment() {
        var charge = staffFolios.postCharge(reception, PROPERTY, ownFolio, amount(10000));
        var payment = staffFolios.postPayment(reception, PROPERTY, ownFolio, amount(3000));
        assertEquals(charge.id(), staffFolios.postReversal(reception, PROPERTY, ownFolio,
                charge.id(), reason()).reversesId());
        assertThrows(AccessDeniedException.class, () -> staffFolios.postReversal(reception, PROPERTY,
                ownFolio, payment.id(), reason()));

        var manager = staff("GERENCIA", PROPERTY);
        var reversal = staffFolios.postReversal(manager, PROPERTY, ownFolio, payment.id(), reason());
        assertEquals(manager.staffUserId(), reversal.createdBy());
        assertEquals(payment.id(), reversal.reversesId());
        assertEquals(0, staffFolios.balanceOf(manager, PROPERTY, ownFolio).minorUnits().value());
    }

    @Test
    void deniesMissingSessionPermissionAndPropertyBeforeReadingOrWriting() {
        var auditor = staff("AUDITOR", PROPERTY);
        assertThrows(StaffAuthenticationException.class,
                () -> staffFolios.get(null, PROPERTY, ownFolio));
        assertThrows(AccessDeniedException.class,
                () -> staffFolios.get(auditor, PROPERTY, ownFolio));
        assertThrows(AccessDeniedException.class,
                () -> staffFolios.postCharge(reception, otherProperty, otherFolio, amount(100)));
        assertThrows(AccessDeniedException.class,
                () -> staffFolios.movementsOf(reception, otherProperty, otherFolio));
        var revoked = staff("GERENCIA", PROPERTY);
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", revoked.sessionId());
        assertThrows(StaffAuthenticationException.class,
                () -> staffFolios.postPayment(revoked, PROPERTY, ownFolio, amount(100)));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM folio_movements WHERE folio_id=?",
                Long.class, ownFolio));
    }

    @Test
    void scopesFolioAndOriginalMovementAndAppliesLiveRoleChanges() {
        var foreign = folios.postCharge(otherFolio, amount(100), null);
        var own = staffFolios.postCharge(reception, PROPERTY, ownFolio, amount(100));
        var multi = staff("GERENCIA", PROPERTY, otherProperty);
        assertEquals("folio not found", assertThrows(FolioException.class,
                () -> staffFolios.get(multi, otherProperty, ownFolio)).getMessage());
        assertEquals("folio not found", assertThrows(FolioException.class,
                () -> staffFolios.get(multi, otherProperty, UUID.randomUUID())).getMessage());
        assertEquals("original movement not found", assertThrows(FolioException.class,
                () -> staffFolios.postReversal(multi, PROPERTY, ownFolio, foreign.id(), reason())).getMessage());
        assertEquals("original movement not found", assertThrows(FolioException.class,
                () -> staffFolios.postReversal(multi, PROPERTY, ownFolio, UUID.randomUUID(), reason())).getMessage());
        assertTrue(staffFolios.movementsOf(reception, PROPERTY, ownFolio).stream()
                .allMatch(m -> m.id().equals(own.id())));

        jdbc.update("UPDATE organization_memberships SET role_code='AUDITOR' WHERE staff_user_id=?",
                reception.staffUserId());
        assertThrows(AccessDeniedException.class,
                () -> staffFolios.get(reception, PROPERTY, ownFolio));
    }

    private FolioService.MovementAmount amount(long minor) {
        return new FolioService.MovementAmount(
                new MonetaryAmount(new MinorUnits(minor), Currency.getInstance("GTQ")), "Test posting");
    }

    private FolioService.ReversalReason reason() {
        return new FolioService.ReversalReason("Correction");
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
