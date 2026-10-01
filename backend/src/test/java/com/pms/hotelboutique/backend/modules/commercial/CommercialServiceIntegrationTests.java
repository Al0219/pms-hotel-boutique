package com.pms.hotelboutique.backend.modules.commercial;

import com.pms.hotelboutique.backend.modules.commercial.application.AgencyService;
import com.pms.hotelboutique.backend.modules.commercial.application.CommercialException;
import com.pms.hotelboutique.backend.modules.commercial.application.CompanyService;
import com.pms.hotelboutique.backend.modules.commercial.application.CreateAgencyCommand;
import com.pms.hotelboutique.backend.modules.commercial.application.CreateCompanyCommand;
import com.pms.hotelboutique.backend.modules.commercial.application.UpdateAgencyCommand;
import com.pms.hotelboutique.backend.modules.commercial.application.UpdateCompanyCommand;
import com.pms.hotelboutique.backend.modules.commercial.domain.Agency;
import com.pms.hotelboutique.backend.modules.commercial.domain.Company;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.AgencyRepository;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.CompanyRepository;
import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.ConstraintViolationException;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CommercialServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    CompanyService companies;

    @Autowired
    AgencyService agencies;

    @Autowired
    CompanyRepository companyRepository;

    @Autowired
    AgencyRepository agencyRepository;

    @Autowired
    com.pms.hotelboutique.backend.modules.reservations.application.AuditService auditService;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    DataSource dataSource;

    private static StaffAuthorizationSnapshot superAdmin(UUID... properties) {
        var access = java.util.Arrays.stream(properties)
                .map(id -> new StaffAuthorizationSnapshot.PropertyAccess(
                        id, id.toString(), "Hotel", "America/Guatemala", "GTQ"))
                .toList();
        return new StaffAuthorizationSnapshot(ORGANIZATION, "SUPER_ADMIN", Set.of(), access);
    }

    private static StaffAuthorizationSnapshot recepcion(UUID... properties) {
        var access = java.util.Arrays.stream(properties)
                .map(id -> new StaffAuthorizationSnapshot.PropertyAccess(
                        id, id.toString(), "Hotel", "America/Guatemala", "GTQ"))
                .toList();
        return new StaffAuthorizationSnapshot(ORGANIZATION, "RECEPCION",
                Set.of("RESERVATION_MANAGE"), access);
    }

    private static AuthorizedPropertyScope scope(UUID... properties) {
        return new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(properties));
    }

    @Test
    void createsListsUpdatesAndDeactivatesCompany() {
        var auth = superAdmin(SEED_PROPERTY);
        var created = companies.create(auth, new CreateCompanyCommand(
                SEED_PROPERTY, "ACME-" + UUID.randomUUID(), "Acme Corp", "NIT-1",
                "billing@acme.test", "+502 5555 0001"), null);

        assertNotNull(created.id());
        assertEquals(SEED_PROPERTY, created.propertyId());
        assertEquals(Company.Status.ACTIVE, created.status());

        var listed = companies.list(auth, scope(SEED_PROPERTY));
        assertTrue(listed.stream().anyMatch(view -> view.id().equals(created.id())));

        var updated = companies.update(auth, scope(SEED_PROPERTY), created.id(),
                new UpdateCompanyCommand("Acme Corp GT", "NIT-2", "ar@acme.test", null), null);
        assertEquals("Acme Corp GT", updated.name());

        var deactivated = companies.deactivate(auth, scope(SEED_PROPERTY), created.id(), null);
        assertEquals(Company.Status.INACTIVE, deactivated.status());

        var reactivated = companies.activate(auth, scope(SEED_PROPERTY), created.id(), null);
        assertEquals(Company.Status.ACTIVE, reactivated.status());
    }

    @Test
    void createsAgencyWithCommissionLabelOnly() {
        var auth = superAdmin(SEED_PROPERTY);
        var created = agencies.create(auth, new CreateAgencyCommand(
                SEED_PROPERTY, "OTA-" + UUID.randomUUID(), "Viajes Test",
                Agency.CommissionModel.PERCENT, "ops@viajes.test", null), null);

        assertEquals(Agency.CommissionModel.PERCENT, created.commissionModel());

        var updated = agencies.update(auth, scope(SEED_PROPERTY), created.id(),
                new UpdateAgencyCommand("Viajes Test GT", Agency.CommissionModel.FIXED,
                        null, "+502 5555 0002"), null);
        assertEquals(Agency.CommissionModel.FIXED, updated.commissionModel());
    }

    @Test
    void isolatesByScopeAndRejectsNonSuperAdmin() {
        UUID otherProperty = UUID.randomUUID();
        UUID otherOrganization = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at)"
                + " VALUES (?,'Other Org',?,'ACTIVE',now(),now())",
                otherOrganization, otherOrganization.toString());
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at)"
                + " VALUES (?,?,'Other',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, otherOrganization, otherProperty.toString());

        var auth = superAdmin(SEED_PROPERTY, otherProperty);
        var foreign = superAdmin(otherProperty);
        var reception = recepcion(SEED_PROPERTY);

        var company = companies.create(auth, new CreateCompanyCommand(
                SEED_PROPERTY, "ISO-" + UUID.randomUUID(), "Isolated", null, null, null), null);

        assertEquals(company.id(),
                companies.get(auth, scope(SEED_PROPERTY), company.id()).id());
        assertThrows(CommercialException.class,
                () -> companies.get(foreign, scope(otherProperty), company.id()));

        assertThrows(AccessDeniedException.class,
                () -> companies.list(reception, scope(SEED_PROPERTY)));
        assertThrows(AccessDeniedException.class, () -> companies.create(reception,
                new CreateCompanyCommand(SEED_PROPERTY, "X-" + UUID.randomUUID(), "Nope",
                        null, null, null), null));
        assertThrows(AccessDeniedException.class,
                () -> agencies.list(reception, scope(SEED_PROPERTY)));
    }

    @Test
    void rejectsUnknownPropertyThroughForeignKey() {
        var auth = superAdmin(UUID.randomUUID());
        companies.create(auth, new CreateCompanyCommand(
                auth.properties().get(0).propertyId(), "TMP-" + UUID.randomUUID(), "Tmp",
                null, null, null), null);

        assertThrows(DataIntegrityViolationException.class, companyRepository::flush);
    }

    @Test
    void rejectsDuplicateCodePerProperty() {
        var auth = superAdmin(SEED_PROPERTY);
        String code = "DUP-" + UUID.randomUUID();
        companies.create(auth, new CreateCompanyCommand(
                SEED_PROPERTY, code, "First", null, null, null), null);
        companyRepository.flush();
        companies.create(auth, new CreateCompanyCommand(
                SEED_PROPERTY, code, "Second", null, null, null), null);

        assertThrows(DataIntegrityViolationException.class, companyRepository::flush);
    }

    @Test
    void rejectsDuplicateAgencyCodePerProperty() {
        var auth = superAdmin(SEED_PROPERTY);
        String code = "AG-" + UUID.randomUUID();
        agencies.create(auth, new CreateAgencyCommand(
                SEED_PROPERTY, code, "First", null, null, null), null);
        agencyRepository.flush();
        agencies.create(auth, new CreateAgencyCommand(
                SEED_PROPERTY, code, "Second", null, null, null), null);

        assertThrows(DataIntegrityViolationException.class, agencyRepository::flush);
    }

    @Test
    void rejectsBlankFieldsWithBeanValidation() {
        var auth = superAdmin(SEED_PROPERTY);
        assertThrows(ConstraintViolationException.class, () -> companies.create(auth,
                new CreateCompanyCommand(SEED_PROPERTY, "  ", "Name", null, null, null), null));
        assertThrows(ConstraintViolationException.class, () -> agencies.create(auth,
                new CreateAgencyCommand(SEED_PROPERTY, "CODE", "  ", null, null, null), null));
    }

    @Test
    void requiresExplicitScope() {
        var auth = superAdmin(SEED_PROPERTY);
        assertThrows(CommercialException.class, () -> companies.list(auth, null));
        assertThrows(CommercialException.class,
                () -> companies.get(auth, scope(SEED_PROPERTY), UUID.randomUUID()));
        assertThrows(CommercialException.class,
                () -> agencies.get(auth, scope(SEED_PROPERTY), UUID.randomUUID()));
    }

    @Test
    void rejectsBlankCodeOnSchemaLevel() throws Exception {
        try (var connection = TestConnections.publicConnection(dataSource);
                var statement = connection.prepareStatement(
                        "INSERT INTO companies(id,property_id,code,name,status,created_at,updated_at)"
                                + " VALUES (?,?,?,?, 'ACTIVE',now(),now())")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, SEED_PROPERTY);
            statement.setString(3, "   ");
            statement.setString(4, "Schema");
            var error = assertThrows(java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23514", error.getSQLState());
        }
    }

    @Test
    void auditTrailKeepsCompanyAndAgencyEvents() {
        var auth = superAdmin(SEED_PROPERTY);
        var company = companies.create(auth, new CreateCompanyCommand(
                SEED_PROPERTY, "AUD-" + UUID.randomUUID(), "Audited", null, null, null), null);
        var agency = agencies.create(auth, new CreateAgencyCommand(
                SEED_PROPERTY, "AUDA-" + UUID.randomUUID(), "Audited Agency", null, null, null),
                null);

        var companyEvents = auditService.findByEntity("COMPANY", company.id());
        assertEquals(1, companyEvents.size());
        assertEquals("COMPANY_CREATED", companyEvents.get(0).action());

        var agencyEvents = auditService.findByEntity("AGENCY", agency.id());
        assertEquals(1, agencyEvents.size());
        assertEquals("AGENCY_CREATED", agencyEvents.get(0).action());
    }
}
