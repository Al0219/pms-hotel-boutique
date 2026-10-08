package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.FolioService;
import com.pms.hotelboutique.backend.modules.reservations.application.FolioView;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationQueryException;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationQueryService;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.persistence.EntityManager;
import java.util.Set;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** A denied read must not materialize the foreign financial account first. */
@SpringBootTest
@Transactional
class FolioScopeIntegrationTests {

    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired ReservationQueryService queries;
    @Autowired FolioService folios;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entityManager;

    private UUID otherProperty;
    private FolioView ownFolio;
    private FolioView otherFolio;

    @BeforeEach
    void fixtures() {
        otherProperty = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at)"
                + " VALUES (?,?,'Financial scope',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, ORGANIZATION, otherProperty.toString());
        ownFolio = open(PROPERTY);
        otherFolio = open(otherProperty);
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void rejectsForeignFolioWithoutLoadingIt() {
        Folio reference = entityManager.getReference(Folio.class, otherFolio.id());
        assertFalse(entityManager.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(reference));

        assertThrows(ReservationQueryException.class,
                () -> queries.getFolio(scope(PROPERTY), otherFolio.id()));

        assertFalse(entityManager.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(reference),
                "Denied financial data must not be loaded before checking property scope");
    }

    @Test
    void rejectsMissingScopeBeforeLoadingFolio() {
        Folio reference = entityManager.getReference(Folio.class, ownFolio.id());

        assertThrows(ReservationQueryException.class, () -> queries.getFolio(null, ownFolio.id()));

        assertFalse(entityManager.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(reference),
                "A missing scope must fail before loading any financial account");
    }

    @Test
    void doesNotDistinguishUnknownAndForeignFolio() {
        var unknown = assertThrows(ReservationQueryException.class,
                () -> queries.getFolio(scope(PROPERTY), UUID.randomUUID()));
        var foreign = assertThrows(ReservationQueryException.class,
                () -> queries.getFolio(scope(PROPERTY), otherFolio.id()));

        assertEquals(unknown.getMessage(), foreign.getMessage());
    }

    @Test
    void readsOnlyFromTheExplicitAuthorizedSet() {
        var own = queries.getFolio(scope(PROPERTY), ownFolio.id());
        assertEquals(ownFolio.id(), own.id());
        assertEquals(PROPERTY, own.propertyId());
        var other = queries.getFolio(scope(otherProperty), otherFolio.id());
        assertEquals(otherFolio.id(), other.id());
        assertEquals(otherProperty, other.propertyId());
        var both = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.ALL_PROPERTIES, Set.of(PROPERTY, otherProperty));
        assertEquals(otherFolio.id(), queries.getFolio(both, otherFolio.id()).id());
    }

    @Test
    void rejectsMissingFolioId() {
        assertThrows(ReservationQueryException.class, () -> queries.getFolio(scope(PROPERTY), null));
    }

    private FolioView open(UUID propertyId) {
        return folios.openFolio(new FolioService.OpenFolioCommand(
                propertyId, Folio.Type.GUEST, "GTQ", null, null, null));
    }

    private static AuthorizedPropertyScope scope(UUID propertyId) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(propertyId));
    }
}
