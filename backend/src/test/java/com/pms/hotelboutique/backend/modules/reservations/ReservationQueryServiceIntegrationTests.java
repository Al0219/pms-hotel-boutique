package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioService;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioView;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationQueryException;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationQueryService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationView;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ReservationQueryServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    ReservationQueryService queries;

    @Autowired
    ReservationService reservations;

    @Autowired
    FolioService folios;

    @Autowired
    JdbcTemplate jdbc;

    private UUID otherProperty;
    private ReservationView seedReservation;
    private ReservationView otherReservation;

    private static AuthorizedPropertyScope scope(UUID... properties) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(properties));
    }

    private static AuthorizedPropertyScope allProperties(UUID... properties) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.ALL_PROPERTIES, Set.of(properties));
    }

    @BeforeEach
    void fixtures() {
        otherProperty = UUID.randomUUID();
        UUID organization = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at)"
                + " VALUES (?,'Other Org',?,'ACTIVE',now(),now())", organization, organization.toString());
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at)"
                + " VALUES (?,?,'Other',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, organization, otherProperty.toString());
        seedReservation = reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null));
        otherReservation = reservations.create(new CreateReservationCommand(
                otherProperty, null, "GTQ", "WEB_DIRECTA", null, null));
        folios.openFolio(new FolioService.OpenFolioCommand(
                otherProperty, com.pms.hotelboutique.backend.modules.reservations.domain.Folio.Type.GUEST,
                "GTQ", otherReservation.id(), null, null));
    }

    @Test
    void listsOnlyScopedProperties() {
        List<ReservationView> seed = queries.listReservations(scope(SEED_PROPERTY));
        assertEquals(1, seed.size());
        assertEquals(seedReservation.id(), seed.get(0).id());

        List<ReservationView> both = queries.listReservations(allProperties(SEED_PROPERTY, otherProperty));
        assertEquals(2, both.size());

        assertTrue(queries.listFolios(scope(SEED_PROPERTY)).isEmpty());
        assertEquals(1, queries.listFolios(scope(otherProperty)).size());
    }

    @Test
    void deniesCrossPropertyReads() {
        assertThrows(ReservationQueryException.class,
                () -> queries.getReservation(scope(SEED_PROPERTY), otherReservation.id()));
        assertEquals(otherReservation.id(),
                queries.getReservation(scope(otherProperty), otherReservation.id()).id());
        assertThrows(ReservationQueryException.class,
                () -> queries.listStays(scope(SEED_PROPERTY), otherReservation.id()));
    }

    @Test
    void requiresExplicitScope() {
        assertThrows(ReservationQueryException.class,
                () -> queries.listReservations(null));
        assertThrows(ReservationQueryException.class,
                () -> queries.getReservation(scope(SEED_PROPERTY), UUID.randomUUID()));
        assertThrows(ReservationQueryException.class,
                () -> queries.getFolio(scope(SEED_PROPERTY), UUID.randomUUID()));
    }
}
