package com.pms.hotelboutique.backend.modules.commercial;

import com.pms.hotelboutique.backend.modules.commercial.application.CommercialException;
import com.pms.hotelboutique.backend.modules.commercial.application.CreatePromotionCommand;
import com.pms.hotelboutique.backend.modules.commercial.application.PromotionService;
import com.pms.hotelboutique.backend.modules.commercial.application.PromotionView;
import com.pms.hotelboutique.backend.modules.commercial.application.RewardCommands;
import com.pms.hotelboutique.backend.modules.commercial.application.RewardService;
import com.pms.hotelboutique.backend.modules.commercial.application.UpdatePromotionCommand;
import com.pms.hotelboutique.backend.modules.commercial.domain.Promotion;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateStayCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayService;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PromotionRewardIntegrationTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");

    @Autowired
    PromotionService promotions;

    @Autowired
    RewardService rewards;

    @Autowired
    ReservationService reservations;

    @Autowired
    ReservationStayService stays;

    @Autowired
    GuestProfileService profiles;

    @Autowired
    JdbcTemplate jdbc;

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

    private PromotionView activePromo(StaffAuthorizationSnapshot auth, String code,
            int priority, boolean stackable) {
        var created = promotions.create(auth, new CreatePromotionCommand(
                SEED_PROPERTY, code, code, priority, stackable,
                Promotion.BenefitType.PERCENT_OFF, 1000, null, null), null);
        return promotions.activate(auth, scope(SEED_PROPERTY), created.id(), null);
    }

    private UUID checkedOutStay() {
        UUID roomType = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','Std')",
                roomType, SEED_PROPERTY);
        var reservation = reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null));
        var stay = stays.addStay(new CreateStayCommand(reservation.id(), roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-03")));
        stays.checkIn(stay.id());
        return stays.checkOut(stay.id()).id();
    }

    private UUID profileFixture() {
        return profiles.create(new CreateGuestProfileCommand(
                null, SEED_PROPERTY, "Loyal", "Guest", null, null, null, null, null)).id();
    }

    @Test
    void runsPromotionLifecycle() {
        var auth = superAdmin(SEED_PROPERTY);
        var created = promotions.create(auth, new CreatePromotionCommand(
                SEED_PROPERTY, "PR-" + UUID.randomUUID(), "Early",
                10, true, Promotion.BenefitType.AMOUNT_OFF, 5000, null, null), null);
        assertEquals(Promotion.Status.DRAFT, created.status());

        assertEquals(Promotion.Status.ACTIVE,
                promotions.activate(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertEquals(Promotion.Status.PAUSED,
                promotions.pause(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertEquals(Promotion.Status.ACTIVE,
                promotions.activate(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertEquals(Promotion.Status.EXPIRED,
                promotions.expire(auth, scope(SEED_PROPERTY), created.id(), null).status());
        assertThrows(CommercialException.class, () -> promotions.activate(
                auth, scope(SEED_PROPERTY), created.id(), null));
    }

    @Test
    void resolvesStackDeterministically() {
        var auth = superAdmin(SEED_PROPERTY);
        LocalDate date = LocalDate.parse("2026-11-15");
        var exclusive = activePromo(auth, "EX-" + UUID.randomUUID(), 200, false);
        var stackable = activePromo(auth, "ST-" + UUID.randomUUID(), 100, true);
        var paused = promotions.create(auth, new CreatePromotionCommand(
                SEED_PROPERTY, "PA-" + UUID.randomUUID(), "Paused",
                300, true, Promotion.BenefitType.PERCENT_OFF, 500, null, null), null);

        var stack = promotions.resolveStack(auth, scope(SEED_PROPERTY), date,
                List.of(stackable.id(), paused.id(), exclusive.id()));

        assertEquals(List.of(exclusive.id()),
                stack.winners().stream().map(PromotionView::id).toList());
        assertEquals(2, stack.rejected().size());
        var byCode = new java.util.HashMap<String, PromotionService.RejectedPromotion>();
        stack.rejected().forEach(rejected -> byCode.put(rejected.code(), rejected));
        assertEquals("not active on date", byCode.get(paused.code()).reason());
        assertEquals("conflicts with exclusive winner",
                byCode.get(stackable.code()).reason());
        assertEquals(exclusive.code(), byCode.get(stackable.code()).conflict());
    }

    @Test
    void accumulatesStackablePromotions() {
        var auth = superAdmin(SEED_PROPERTY);
        LocalDate date = LocalDate.parse("2026-11-15");
        var first = activePromo(auth, "S1-" + UUID.randomUUID(), 100, true);
        var second = activePromo(auth, "S2-" + UUID.randomUUID(), 50, true);

        var stack = promotions.resolveStack(auth, scope(SEED_PROPERTY), date,
                List.of(second.id(), first.id()));

        assertEquals(List.of(first.id(), second.id()),
                stack.winners().stream().map(PromotionView::id).toList());
        assertTrue(stack.rejected().isEmpty());
    }

    @Test
    void earnsRedeemsExpiresAndReverses() {
        var auth = superAdmin(SEED_PROPERTY);
        UUID profile = profileFixture();
        UUID stay = checkedOutStay();

        var earned = rewards.earn(auth, new RewardCommands.EarnRewardCommand(
                profile, SEED_PROPERTY, 100, stay, "stay completed"), null);
        assertEquals(100, earned.points());
        assertEquals(100, rewards.balanceOf(auth, scope(SEED_PROPERTY), profile));

        assertThrows(CommercialException.class, () -> rewards.earn(auth,
                new RewardCommands.EarnRewardCommand(profile, SEED_PROPERTY, 100, stay, "again"),
                null));

        var redeemed = rewards.redeem(auth, new RewardCommands.SpendRewardCommand(
                profile, SEED_PROPERTY, 40, "late checkout"), null);
        assertEquals(-40, redeemed.points());
        assertEquals(60, rewards.balanceOf(auth, scope(SEED_PROPERTY), profile));

        assertThrows(CommercialException.class, () -> rewards.redeem(auth,
                new RewardCommands.SpendRewardCommand(profile, SEED_PROPERTY, 61, "too much"),
                null));

        rewards.expire(auth, new RewardCommands.SpendRewardCommand(
                profile, SEED_PROPERTY, 10, "year end"), null);
        assertEquals(50, rewards.balanceOf(auth, scope(SEED_PROPERTY), profile));

        var reversed = rewards.reverse(auth, scope(SEED_PROPERTY),
                new RewardCommands.ReverseRewardCommand(profile, redeemed.id(), "void"), null);
        assertEquals(40, reversed.points());
        assertEquals(90, rewards.balanceOf(auth, scope(SEED_PROPERTY), profile));

        assertThrows(CommercialException.class, () -> rewards.reverse(auth,
                scope(SEED_PROPERTY),
                new RewardCommands.ReverseRewardCommand(profile, redeemed.id(), "again"), null));
    }

    @Test
    void rejectsEarnOnNonCheckedOutStay() {
        var auth = superAdmin(SEED_PROPERTY);
        UUID profile = profileFixture();
        UUID roomType = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','Std')",
                roomType, SEED_PROPERTY);
        var reservation = reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null));
        var stay = stays.addStay(new CreateStayCommand(reservation.id(), roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-03")));

        assertThrows(CommercialException.class, () -> rewards.earn(auth,
                new RewardCommands.EarnRewardCommand(profile, SEED_PROPERTY, 10, stay.id(), "early"),
                null));

        stays.cancelStay(stay.id());
        assertThrows(CommercialException.class, () -> rewards.earn(auth,
                new RewardCommands.EarnRewardCommand(profile, SEED_PROPERTY, 10, stay.id(), "late"),
                null));
    }

    @Test
    void rejectsRewardLedgerMutationAtDatabaseLevel() {
        var auth = superAdmin(SEED_PROPERTY);
        UUID profile = profileFixture();
        UUID stay = checkedOutStay();
        var earned = rewards.earn(auth, new RewardCommands.EarnRewardCommand(
                profile, SEED_PROPERTY, 5, stay, "seed"), null);

        // Same-transaction JdbcTemplate: sees the uncommitted row, so the
        // append-only trigger fires (an autocommit connection would see 0 rows).
        // RAISE without ERRCODE surfaces as P0001 -> UncategorizedSQLException.
        assertThrows(org.springframework.jdbc.UncategorizedSQLException.class,
                () -> jdbc.update("UPDATE reward_ledger SET reason='Edited' WHERE id=?",
                        earned.id()));
        assertThrows(org.springframework.jdbc.UncategorizedSQLException.class,
                () -> jdbc.update("DELETE FROM reward_ledger WHERE id=?", earned.id()));
    }

    @Test
    void enforcesScopeAndSuperAdmin() {
        var auth = superAdmin(SEED_PROPERTY);
        var reception = recepcion(SEED_PROPERTY);
        assertThrows(AccessDeniedException.class, () -> promotions.list(
                reception, scope(SEED_PROPERTY)));
        assertThrows(AccessDeniedException.class, () -> rewards.balanceOf(
                reception, scope(SEED_PROPERTY), UUID.randomUUID()));
        assertThrows(CommercialException.class, () -> promotions.list(auth, null));

        UUID otherProperty = UUID.randomUUID();
        UUID otherOrganization = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at)"
                + " VALUES (?,'Other Org',?,'ACTIVE',now(),now())",
                otherOrganization, otherOrganization.toString());
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at)"
                + " VALUES (?,?,'Other',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, otherOrganization, otherProperty.toString());
        assertTrue(promotions.list(superAdmin(otherProperty), scope(otherProperty)).isEmpty());
    }

    @Test
    void rejectsInvalidPromotionBenefit() {
        var auth = superAdmin(SEED_PROPERTY);
        assertThrows(CommercialException.class, () -> promotions.create(auth,
                new CreatePromotionCommand(SEED_PROPERTY, "B-" + UUID.randomUUID(), "Bad",
                        1, false, Promotion.BenefitType.PERCENT_OFF, 20000, null, null), null));
    }

    @Test
    void updatesPromotionRule() {
        var auth = superAdmin(SEED_PROPERTY);
        var created = promotions.create(auth, new CreatePromotionCommand(
                SEED_PROPERTY, "UP-" + UUID.randomUUID(), "Name",
                5, false, Promotion.BenefitType.AMOUNT_OFF, 100, null, null), null);
        var updated = promotions.update(auth, scope(SEED_PROPERTY), created.id(),
                new UpdatePromotionCommand("Renamed", 9, true, null, null), null);
        assertEquals("Renamed", updated.name());
        assertEquals(9, updated.priority());
    }
}
