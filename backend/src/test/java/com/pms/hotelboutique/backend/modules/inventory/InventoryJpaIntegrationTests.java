package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.inventory.domain.OutOfOrderRecord;
import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.domain.RatePlan;
import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.OutOfOrderRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PropertyRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RatePlanRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomTypeRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.domain.StaffUser;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffUserRepository;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Currency;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class InventoryJpaIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired PropertyRepository properties;
    @Autowired RoomTypeRepository roomTypes;
    @Autowired RoomRepository rooms;
    @Autowired RatePlanRepository ratePlans;
    @Autowired OutOfOrderRepository outOfOrder;
    @Autowired StaffUserRepository staffUsers;

    @Test
    void persistsEntitiesMoneyAndLocalDatesAndScopesEveryRepositoryRead() {
        var now = Instant.parse("2026-09-30T20:00:00Z");
        var scope = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(PROPERTY));
        var property = properties.findByIdInScope(scope, PROPERTY).orElseThrow();
        assertEquals(Currency.getInstance("GTQ"), property.getCurrency());
        assertEquals("America/Guatemala", property.getTimezone());
        assertTrue(properties.findAllInScope(scope).stream().anyMatch(p -> p.getId().equals(PROPERTY)));
        var otherProperty = properties.saveAndFlush(new Property(UUID.randomUUID(), ORGANIZATION,
                "OTHER-" + UUID.randomUUID(), "Other property", "America/Guatemala",
                Currency.getInstance("GTQ"), Property.Status.ACTIVE, now));
        var otherType = roomTypes.saveAndFlush(new RoomType(UUID.randomUUID(), otherProperty.getId(),
                "OTHER", "Other room", now));
        assertTrue(roomTypes.findByIdInScope(scope, otherType.getId()).isEmpty());
        assertTrue(roomTypes.findAllInScope(scope).stream().noneMatch(t -> t.getId().equals(otherType.getId())));

        var type = roomTypes.saveAndFlush(new RoomType(UUID.randomUUID(), PROPERTY, "JPA-ROOM", "JPA Room", now));
        var room = rooms.saveAndFlush(new Room(UUID.randomUUID(), PROPERTY, type.getId(), "JPA-101", now));
        var price = MonetaryAmount.of(new BigDecimal("987.65"), Currency.getInstance("GTQ"));
        var rate = ratePlans.saveAndFlush(new RatePlan(UUID.randomUUID(), PROPERTY, type.getId(), "JPA-BAR", "Base", price, now));
        assertEquals(price, ratePlans.findByIdInScope(scope, rate.getId()).orElseThrow().getBasePrice());
        assertEquals(1, rooms.countPhysicalRooms(scope, PROPERTY, type.getId()));
        assertEquals(1, rooms.findByIdInScope(scope, room.getId()).stream().count());

        var actor = staffUsers.saveAndFlush(new StaffUser(UUID.randomUUID(), "bd2-test-" + UUID.randomUUID(),
                "bd2-" + UUID.randomUUID() + "@example.test", "unused-test-hash", "SUPER_ADMIN", now));
        var arrival = LocalDate.of(2026, 10, 1);
        var departure = LocalDate.of(2026, 10, 4);
        var expected = new StayDateRange(arrival, departure);
        var ooo1 = outOfOrder.saveAndFlush(new OutOfOrderRecord(UUID.randomUUID(), PROPERTY, room.getId(),
                OutOfOrderRecord.Kind.OOO, arrival, arrival.plusDays(3), "First overlap", actor.getId(), now));
        outOfOrder.saveAndFlush(new OutOfOrderRecord(UUID.randomUUID(), PROPERTY, room.getId(),
                OutOfOrderRecord.Kind.OOO, arrival.plusDays(1), departure, "Second overlap", actor.getId(), now));
        var room2 = rooms.saveAndFlush(new Room(UUID.randomUUID(), PROPERTY, type.getId(), "JPA-102", now));
        outOfOrder.saveAndFlush(new OutOfOrderRecord(UUID.randomUUID(), PROPERTY, room2.getId(),
                OutOfOrderRecord.Kind.OOO, arrival.plusDays(1), arrival.plusDays(2), "Other room", actor.getId(), now));
        var room3 = rooms.saveAndFlush(new Room(UUID.randomUUID(), PROPERTY, type.getId(), "JPA-103", now));
        outOfOrder.saveAndFlush(new OutOfOrderRecord(UUID.randomUUID(), PROPERTY, room3.getId(),
                OutOfOrderRecord.Kind.OOS, arrival, departure, "OOS does not reduce ATS", actor.getId(), now));
        entityManagerClear();
        // Lifecycle service lands in a later phase; use SQL here only to
        // prepare released history and verify this repository query omits it.
        entityManager.createNativeQuery("UPDATE out_of_order_records SET released_at = ?1, released_by = ?2, release_reason = ?3 WHERE id = ?4")
                .setParameter(1, now.plusSeconds(30)).setParameter(2, actor.getId())
                .setParameter(3, "Test release").setParameter(4, ooo1.getId()).executeUpdate();
        entityManagerClear();

        var counts = outOfOrder.countOutOfOrderByNight(scope, PROPERTY, type.getId(), expected);
        assertEquals(List.of(arrival, arrival.plusDays(1), arrival.plusDays(2)),
                counts.stream().map(row -> row.getNight()).toList());
        assertEquals(List.of(0L, 2L, 1L), counts.stream().map(row -> row.getRoomCount()).toList());
        var storedOutage = outOfOrder.findByIdInScope(scope, ooo1.getId()).orElseThrow();
        assertEquals(arrival, storedOutage.getStartDate());
        assertEquals(arrival.plusDays(3), storedOutage.getEndDate());
        assertEquals(actor.getId(), storedOutage.getCreatedBy());
    }

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private void entityManagerClear() {
        entityManager.flush();
        entityManager.clear();
    }
}
