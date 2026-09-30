package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAccount;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence.GuestAccountRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileException;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.UpdateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.GuestProfileRepository;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class GuestProfileServiceIntegrationTests {

    @Autowired
    GuestProfileService service;

    @Autowired
    GuestProfileRepository profiles;

    @Autowired
    GuestAccountRepository accounts;

    @Autowired
    DataSource dataSource;

    @Test
    void createsStandaloneProfileWithoutAccount() {
        var view = service.create(new CreateGuestProfileCommand(
                null, null, "Walk", "In", null, "+502 5555 0101", null, null, "es"));

        assertNotNull(view.id());
        assertNull(view.guestAccountId());
        assertEquals("Walk", view.firstName());
        assertTrue(profiles.findById(view.id()).isPresent());
    }

    @Test
    void createsProfileLinkedToActiveAccountKeepingIdentitiesSeparate() {
        GuestAccount account = accounts.save(new GuestAccount(UUID.randomUUID(), "guest-"
                + UUID.randomUUID() + "@example.test", Instant.now()));

        var view = service.create(new CreateGuestProfileCommand(
                account.getId(), null, "Ana", "Lopez", "ana.contact@example.test",
                null, "DPI", "1234567890101", "es"));

        assertEquals(account.getId(), view.guestAccountId());
        // Contact email on the profile is independent from the auth account email.
        assertEquals("ana.contact@example.test", view.email());
        assertEquals(1, service.findByAccount(account.getId()).size());
    }

    @Test
    void rejectsUnknownAccount() {
        var command = new CreateGuestProfileCommand(
                UUID.randomUUID(), null, "Ana", "Lopez", null, "+502 5555 0102", null, null, null);

        assertThrows(GuestProfileException.class, () -> service.create(command));
    }

    @Test
    void rejectsDisabledAccount() throws Exception {
        UUID accountId = UUID.randomUUID();
        try (var connection = dataSource.getConnection();
                var statement = connection.prepareStatement(
                        "INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at)"
                                + " VALUES (?,?,'2026-09-30T12:00:00Z','DISABLED',now(),now())")) {
            statement.setObject(1, accountId);
            statement.setString(2, "disabled-" + UUID.randomUUID() + "@example.test");
            statement.executeUpdate();
        }
        var command = new CreateGuestProfileCommand(
                accountId, null, "Ana", "Lopez", null, "+502 5555 0103", null, null, null);

        try {
            assertThrows(GuestProfileException.class, () -> service.create(command));
        } finally {
            try (var connection = dataSource.getConnection();
                    var statement = connection.prepareStatement("DELETE FROM guest_accounts WHERE id=?")) {
                statement.setObject(1, accountId);
                statement.executeUpdate();
            }
        }
    }

    @Test
    void rejectsUnknownPropertyThroughForeignKey() {
        var view = service.create(new CreateGuestProfileCommand(
                null, UUID.randomUUID(), "Ana", "Lopez", "ana@example.test", null, null, null, null));

        assertThrows(DataIntegrityViolationException.class, profiles::flush);
        assertNotNull(view.id());
    }

    @Test
    void rejectsBlankNamesAndInvalidEmail() {
        assertThrows(ConstraintViolationException.class, () -> service.create(new CreateGuestProfileCommand(
                null, null, "  ", "Lopez", null, "+502 5555 0104", null, null, null)));
        assertThrows(ConstraintViolationException.class, () -> service.create(new CreateGuestProfileCommand(
                null, null, "Ana", "Lopez", "not-an-email", null, null, null, null)));
    }

    @Test
    void rejectsBlankNameOnSchemaLevel() throws Exception {
        try (var connection = dataSource.getConnection();
                var statement = connection.prepareStatement(
                        "INSERT INTO guest_profiles(id,first_name,last_name,status,created_at,updated_at)"
                                + " VALUES (?,'   ','Lopez','ACTIVE',now(),now())")) {
            statement.setObject(1, UUID.randomUUID());
            var error = assertThrows(java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23514", error.getSQLState());
            // Autocommit connection: the rejected insert is already rolled back.
        }
    }

    @Test
    void updatesDeactivatesAndReactivates() {
        var created = service.create(new CreateGuestProfileCommand(
                null, null, "Ana", "Lopez", null, "+502 5555 0105", null, null, "es"));

        var updated = service.updateContact(created.id(), new UpdateGuestProfileCommand(
                "Ana Maria", "Lopez", "ana.m@example.test", "+502 5555 0106", null, null, "en"));
        assertEquals("Ana Maria", updated.firstName());
        assertEquals("en", updated.preferredLanguage());

        var deactivated = service.deactivate(created.id());
        assertEquals(com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile.Status.INACTIVE,
                deactivated.status());

        var reactivated = service.activate(created.id());
        assertEquals(com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile.Status.ACTIVE,
                reactivated.status());

        assertEquals("Ana Maria", service.get(created.id()).firstName());
    }

    @Test
    void reportsMissingProfile() {
        assertThrows(GuestProfileException.class, () -> service.get(UUID.randomUUID()));
    }
}
