package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioException;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioService;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioView;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.FolioMovementRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.math.BigDecimal;
import java.util.Currency;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class FolioServiceIntegrationTests {

    /** Seed property from 002-management-001; present in every migrated database. */
    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final Currency GTQ = Currency.getInstance("GTQ");

    @Autowired
    FolioService folios;

    @Autowired
    ReservationService reservations;

    @Autowired
    FolioMovementRepository movements;

    @Autowired
    DataSource dataSource;

    private FolioService.OpenFolioCommand openGuest() {
        return new FolioService.OpenFolioCommand(SEED_PROPERTY, Folio.Type.GUEST, "GTQ", null, null, null);
    }

    private static MonetaryAmount gtq(long minor) {
        return new MonetaryAmount(new MinorUnits(minor), GTQ);
    }

    private static FolioService.MovementAmount charge(long minor, String description) {
        return new FolioService.MovementAmount(gtq(minor), description);
    }

    @Test
    void postsChargesAndPaymentsWithDerivedBalance() {
        FolioView folio = folios.openFolio(openGuest());

        folios.postCharge(folio.id(), charge(116000, "Room night x2"), null);
        folios.postCharge(folio.id(), charge(13920, "Tax"), null);
        folios.postPayment(folio.id(), charge(50000, "Card payment"), null);

        MonetaryAmount balance = folios.balanceOf(folio.id());
        assertEquals(BigDecimal.valueOf(79920, 2), balance.amount());
        assertEquals(3, folios.movementsOf(folio.id()).size());
    }

    @Test
    void reversesChargeThroughCompensation() {
        FolioView folio = folios.openFolio(openGuest());
        FolioView.MovementView original = folios.postCharge(folio.id(), charge(10000, "Minibar"), null);

        FolioView.MovementView reversal = folios.postReversal(folio.id(), original.id(),
                new FolioService.ReversalReason("Minibar voided by reception"), null);

        assertEquals(original.id(), reversal.reversesId());
        assertEquals(-10000, reversal.amount().minorUnits().value());
        assertEquals(0, folios.balanceOf(folio.id()).minorUnits().value());
        assertEquals(2, folios.movementsOf(folio.id()).size());
        // History preserved: both rows still exist.
        assertTrue(movements.findById(original.id()).isPresent());
        // A reversal cannot be reversed again.
        assertThrows(FolioException.class, () -> folios.postReversal(folio.id(), reversal.id(),
                new FolioService.ReversalReason("Double reversal"), null));
    }

    @Test
    void rejectsPostingsOnSettledFolioUntilReopened() {
        FolioView folio = folios.openFolio(openGuest());
        folios.postCharge(folio.id(), charge(10000, "Room"), null);
        folios.settle(folio.id());

        assertThrows(FolioException.class,
                () -> folios.postCharge(folio.id(), charge(1000, "Late"), null));
        folios.reopen(folio.id());
        folios.postCharge(folio.id(), charge(1000, "Late minibar"), null);
        assertEquals(11000, folios.balanceOf(folio.id()).minorUnits().value());
    }

    @Test
    void settlesAndClosesWithGuards() {
        FolioView folio = folios.openFolio(openGuest());
        assertThrows(FolioException.class, () -> folios.close(folio.id()));

        folios.settle(folio.id());
        assertEquals(Folio.Status.SETTLED, folios.get(folio.id()).status());
        folios.close(folio.id());
        assertEquals(Folio.Status.CLOSED, folios.get(folio.id()).status());
        assertThrows(FolioException.class, () -> folios.reopen(folio.id()));
    }

    @Test
    void rejectsInvalidAmountsAndCurrency() {
        FolioView folio = folios.openFolio(openGuest());
        assertThrows(FolioException.class,
                () -> folios.postCharge(folio.id(), charge(-5000, "Negative"), null));
        assertThrows(FolioException.class,
                () -> folios.postCharge(folio.id(), charge(0, "Zero"), null));
        assertThrows(FolioException.class, () -> folios.postCharge(folio.id(),
                new FolioService.MovementAmount(
                        new MonetaryAmount(new MinorUnits(5000), Currency.getInstance("USD")), "USD"),
                null));
    }

    @Test
    void linksReservationFolioAndRejectsMismatch() {
        var reservation = reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null));
        FolioView folio = folios.openFolio(new FolioService.OpenFolioCommand(
                SEED_PROPERTY, Folio.Type.GUEST, "GTQ", reservation.id(), null, "Ana Lopez"));

        assertEquals(reservation.id(), folio.reservationId());
        assertThrows(FolioException.class, () -> folios.openFolio(new FolioService.OpenFolioCommand(
                SEED_PROPERTY, Folio.Type.GUEST, "GTQ", UUID.randomUUID(), null, null)));
    }

    @Test
    void reportsMissingFolio() {
        assertThrows(FolioException.class, () -> folios.get(UUID.randomUUID()));
    }

    @Test
    void databaseRejectsMovementMutation() throws Exception {
        // Self-contained on one manual transaction (service rows would be
        // invisible here until commit): fixtures roll back with the test.
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID folioId = UUID.randomUUID();
                UUID movementId = UUID.randomUUID();
                try (var folio = connection.prepareStatement(
                        "INSERT INTO folios(id,property_id,type,status,currency,created_at,updated_at)"
                                + " VALUES (?,'" + SEED_PROPERTY + "','GUEST','OPEN','GTQ',now(),now())")) {
                    folio.setObject(1, folioId);
                    assertEquals(1, folio.executeUpdate());
                }
                try (var movement = connection.prepareStatement(
                        "INSERT INTO folio_movements(id,folio_id,kind,amount_minor,currency,description,created_at)"
                                + " VALUES (?,'" + folioId + "','CHARGE',10000,'GTQ','Room',now())")) {
                    movement.setObject(1, movementId);
                    assertEquals(1, movement.executeUpdate());
                }
                rejected(connection, "UPDATE folio_movements SET description='Edited' WHERE id=?",
                        movementId);
                rejected(connection, "DELETE FROM folio_movements WHERE id=?", movementId);
                // Folio headers are NOT append-only: lifecycle transitions stay legal.
                try (var allowed = connection.prepareStatement(
                        "UPDATE folios SET status='SETTLED' WHERE id=?")) {
                    allowed.setObject(1, folioId);
                    assertEquals(1, allowed.executeUpdate());
                }
            } finally {
                connection.rollback();
            }
        }
    }

    private void rejected(java.sql.Connection connection, String sql, Object... values)
            throws java.sql.SQLException {
        var savepoint = connection.setSavepoint();
        try {
            try (var statement = connection.prepareStatement(sql)) {
                for (int i = 0; i < values.length; i++) {
                    statement.setObject(i + 1, values[i]);
                }
                var error = org.junit.jupiter.api.Assertions.assertThrows(
                        java.sql.SQLException.class, statement::executeUpdate);
                org.junit.jupiter.api.Assertions.assertEquals("P0001", error.getSQLState());
            }
        } finally {
            connection.rollback(savepoint);
            connection.releaseSavepoint(savepoint);
        }
    }
}
