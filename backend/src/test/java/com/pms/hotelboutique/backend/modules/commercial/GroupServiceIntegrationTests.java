package com.pms.hotelboutique.backend.modules.commercial;

import com.pms.hotelboutique.backend.modules.commercial.application.CommercialException;
import com.pms.hotelboutique.backend.modules.commercial.application.CreateEventGroupCommand;
import com.pms.hotelboutique.backend.modules.commercial.application.CreateRoomBlockCommand;
import com.pms.hotelboutique.backend.modules.commercial.application.EventGroupService;
import com.pms.hotelboutique.backend.modules.commercial.application.RoomBlockService;
import com.pms.hotelboutique.backend.modules.commercial.application.UpdateEventGroupCommand;
import com.pms.hotelboutique.backend.modules.commercial.domain.EventGroup;
import com.pms.hotelboutique.backend.modules.commercial.domain.RoomBlock;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateStayCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayService;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class GroupServiceIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    EventGroupService groups;

    @Autowired
    RoomBlockService blocks;

    @Autowired
    ReservationService reservations;

    @Autowired
    ReservationStayService stays;

    @Autowired
    com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository
            reservationRepository;

    @Autowired
    com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository
            stayRepository;

    @Autowired
    com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.EventGroupRepository
            eventGroupRepository;

    @Autowired
    JdbcTemplate jdbc;

    private static StaffAuthorizationSnapshot superAdmin(UUID... properties) {
        return commercialStaff("SUPER_ADMIN", properties);
    }

    private static StaffAuthorizationSnapshot commercialStaff(String role, UUID... properties) {
        var access = java.util.Arrays.stream(properties)
                .map(id -> new StaffAuthorizationSnapshot.PropertyAccess(
                        id, id.toString(), "Hotel", "America/Guatemala", "GTQ"))
                .toList();
        return new StaffAuthorizationSnapshot(ORGANIZATION, role, Set.of("COMMERCIAL_MANAGE"), access);
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

    private UUID roomTypeFixture() {
        UUID roomType = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'DLX','Deluxe')",
                roomType, SEED_PROPERTY);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')",
                UUID.randomUUID(), SEED_PROPERTY, roomType);
        return roomType;
    }

    private UUID groupFixture(StaffAuthorizationSnapshot auth) {
        return groups.create(auth, new CreateEventGroupCommand(
                SEED_PROPERTY, "GRP-" + UUID.randomUUID(), "Congreso",
                null, null, LocalDate.parse("2026-11-10"), LocalDate.parse("2026-11-13"),
                LocalDate.parse("2026-11-01")), null).id();
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPER_ADMIN", "GERENCIA"})
    void advancesLifecycleOneStepAtATime(String role) {
        var auth = commercialStaff(role, SEED_PROPERTY);
        var created = groups.create(auth, new CreateEventGroupCommand(
                SEED_PROPERTY, "LC-" + UUID.randomUUID(), "Boda",
                null, null, LocalDate.parse("2026-12-01"), LocalDate.parse("2026-12-03"), null),
                null);
        assertEquals(EventGroup.Status.INQUIRY, created.status());

        assertEquals(EventGroup.Status.TENTATIVE,
                groups.advance(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertEquals(EventGroup.Status.DEFINITE,
                groups.advance(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertEquals(EventGroup.Status.IN_HOUSE,
                groups.advance(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertEquals(EventGroup.Status.CLOSED,
                groups.advance(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertThrows(CommercialException.class,
                () -> groups.advance(auth, scope(SEED_PROPERTY), created.id(), null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPER_ADMIN", "GERENCIA"})
    void holdsLinksAndCountsPickup(String role) {
        var auth = commercialStaff(role, SEED_PROPERTY);
        UUID groupId = groupFixture(auth);
        UUID roomType = roomTypeFixture();

        var block = blocks.hold(auth, scope(SEED_PROPERTY), new CreateRoomBlockCommand(
                groupId, SEED_PROPERTY, roomType,
                LocalDate.parse("2026-11-10"), LocalDate.parse("2026-11-13"), 5), null);
        assertEquals(5, block.unitsHeld());
        assertEquals(0, block.pickupUnits());

        var reservation = reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "GROUP", null, null));
        var stay = stays.addStay(new CreateStayCommand(reservation.id(), roomType, null,
                LocalDate.parse("2026-11-10"), LocalDate.parse("2026-11-12")));

        var otherScope = scope(UUID.randomUUID());
        assertTrue(reservationRepository.findByIdInScope(otherScope, reservation.id()).isEmpty());
        assertTrue(stayRepository.findByIdInScope(otherScope, stay.id()).isEmpty());

        blocks.linkReservation(auth, scope(SEED_PROPERTY), reservation.id(), block.id(), null);

        var picked = blocks.get(auth, scope(SEED_PROPERTY), block.id());
        assertEquals(1, picked.pickupUnits());
        assertEquals(4, picked.remainingUnits());

        stays.cancelStay(stay.id());
        assertEquals(0, blocks.get(auth, scope(SEED_PROPERTY), block.id()).pickupUnits());
    }

    @Test
    void releasedBlockAcceptsNoNewLinks() {
        var auth = superAdmin(SEED_PROPERTY);
        UUID groupId = groupFixture(auth);
        UUID roomType = roomTypeFixture();

        var block = blocks.hold(auth, scope(SEED_PROPERTY), new CreateRoomBlockCommand(
                groupId, SEED_PROPERTY, roomType,
                LocalDate.parse("2026-11-10"), LocalDate.parse("2026-11-13"), 2), null);
        assertEquals(RoomBlock.Status.RELEASED,
                blocks.release(auth, scope(SEED_PROPERTY), block.id(), null).status());

        var reservation = reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "GROUP", null, null));
        assertThrows(CommercialException.class, () -> blocks.linkReservation(
                auth, scope(SEED_PROPERTY), reservation.id(), block.id(), null));
    }

    @Test
    void opensSingleMasterFolioForDefiniteGroup() {
        var auth = superAdmin(SEED_PROPERTY);
        UUID groupId = groupFixture(auth);
        groups.advance(auth, scope(SEED_PROPERTY), groupId, null);
        groups.advance(auth, scope(SEED_PROPERTY), groupId, null);

        var folio = blocks.openMasterFolio(auth, scope(SEED_PROPERTY), groupId, "GTQ", null);
        assertEquals(Folio.Type.MASTER, folio.type());
        assertEquals(groupId, folio.groupId());

        assertThrows(CommercialException.class, () -> blocks.openMasterFolio(
                auth, scope(SEED_PROPERTY), groupId, "GTQ", null));
    }

    @Test
    void rejectsMasterFolioBeforeDefinite() {
        var auth = superAdmin(SEED_PROPERTY);
        UUID groupId = groupFixture(auth);
        assertThrows(CommercialException.class, () -> blocks.openMasterFolio(
                auth, scope(SEED_PROPERTY), groupId, "GTQ", null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPER_ADMIN", "GERENCIA"})
    void rejectsCrossPropertyCompanyAndScopeLeaks(String role) {
        UUID otherProperty = UUID.randomUUID();
        UUID otherOrganization = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at)"
                + " VALUES (?,'Other Org',?,'ACTIVE',now(),now())",
                otherOrganization, otherOrganization.toString());
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at)"
                + " VALUES (?,?,'Other',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, otherOrganization, otherProperty.toString());
        UUID foreignCompany = UUID.randomUUID();
        jdbc.update("INSERT INTO companies(id,property_id,code,name,status,created_at,updated_at)"
                + " VALUES (?,?,?,'Foreign','ACTIVE',now(),now())",
                foreignCompany, otherProperty, "F-" + UUID.randomUUID());

        var auth = commercialStaff(role, SEED_PROPERTY, otherProperty);
        assertThrows(CommercialException.class, () -> groups.create(auth,
                new CreateEventGroupCommand(SEED_PROPERTY, "X-" + UUID.randomUUID(), "X",
                        foreignCompany, null, LocalDate.parse("2026-11-10"),
                        LocalDate.parse("2026-11-12"), null), null));

        var reception = recepcion(SEED_PROPERTY);
        assertThrows(AccessDeniedException.class,
                () -> groups.list(reception, scope(SEED_PROPERTY)));
        assertThrows(AccessDeniedException.class, () -> blocks.openMasterFolio(
                reception, scope(SEED_PROPERTY), UUID.randomUUID(), "GTQ", null));

        UUID groupId = groupFixture(commercialStaff(role, SEED_PROPERTY));
        assertThrows(CommercialException.class, () -> groups.get(
                commercialStaff(role, otherProperty), scope(otherProperty), groupId));
    }

    @Test
    void rejectsInvalidGroupInput() {
        var auth = superAdmin(SEED_PROPERTY);
        assertThrows(ConstraintViolationException.class, () -> groups.create(auth,
                new CreateEventGroupCommand(SEED_PROPERTY, "  ", "Blank", null, null,
                        LocalDate.parse("2026-11-10"), LocalDate.parse("2026-11-12"), null),
                null));
        assertThrows(CommercialException.class, () -> groups.create(auth,
                new CreateEventGroupCommand(SEED_PROPERTY, "P-" + UUID.randomUUID(), "Bad",
                        null, null, LocalDate.parse("2026-11-12"), LocalDate.parse("2026-11-10"),
                        null),
                null));
        assertThrows(CommercialException.class, () -> groups.create(auth,
                new CreateEventGroupCommand(SEED_PROPERTY, "C-" + UUID.randomUUID(), "BadCut",
                        null, null, LocalDate.parse("2026-11-10"), LocalDate.parse("2026-11-12"),
                        LocalDate.parse("2026-11-15")),
                null));
    }

    @Test
    void rejectsUnknownPropertyThroughForeignKey() {
        var auth = superAdmin(UUID.randomUUID());
        groups.create(auth, new CreateEventGroupCommand(
                auth.properties().get(0).propertyId(), "TMPG-" + UUID.randomUUID(), "Tmp",
                null, null, LocalDate.parse("2026-11-10"), LocalDate.parse("2026-11-12"), null),
                null);

        assertThrows(DataIntegrityViolationException.class, eventGroupRepository::flush);
    }

    @Test
    void updateKeepsCodeAndDatesImmutable() {
        var auth = superAdmin(SEED_PROPERTY);
        UUID groupId = groupFixture(auth);
        var updated = groups.update(auth, scope(SEED_PROPERTY), groupId,
                new UpdateEventGroupCommand("Congreso GT", null, null,
                        LocalDate.parse("2026-11-02")), null);
        assertEquals("Congreso GT", updated.name());
        assertEquals(LocalDate.parse("2026-11-02"), updated.cutoffDate());
        assertEquals(LocalDate.parse("2026-11-10"), updated.arrival());
    }

    @Test
    void requiresExplicitScope() {
        var auth = superAdmin(SEED_PROPERTY);
        assertThrows(CommercialException.class, () -> groups.list(auth, null));
        assertThrows(CommercialException.class,
                () -> blocks.get(auth, scope(SEED_PROPERTY), UUID.randomUUID()));
        assertThrows(DataIntegrityViolationException.class, () -> {
            jdbc.update("INSERT INTO event_groups(id,property_id,code,name,status,arrival,departure,created_at,updated_at)"
                    + " VALUES (?,?,?,?, 'INQUIRY',now(),now(),now(),now())",
                    UUID.randomUUID(), SEED_PROPERTY, "   ", "Schema");
        });
    }
}
