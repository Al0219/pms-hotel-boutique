package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.reservations.application.FolioView;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.UUID;

/**
 * BD3 room block operations (F13 base).
 *
 * <p>Blocks are commercial holds: they never consume ATS and never move
 * physical rooms. Pickup counts consuming stays ({@code RESERVED},
 * {@code IN_HOUSE}) of linked non-cancelled reservations and is always
 * derived. Master folios consolidate exactly one group. Temporary
 * authorization: SUPER_ADMIN only
 * ({@code TODO(BD1): alta B2B_MANAGE}). No REST contract is implied.</p>
 */
public interface RoomBlockService {

    RoomBlockView hold(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            @Valid CreateRoomBlockCommand command, UUID actorId);

    RoomBlockView release(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID blockId, UUID actorId);

    RoomBlockView reactivate(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID blockId, UUID actorId);

    RoomBlockView get(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID blockId);

    List<RoomBlockView> listByGroup(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId);

    void linkReservation(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID reservationId, UUID blockId, UUID actorId);

    void unlinkReservation(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID reservationId, UUID actorId);

    FolioView openMasterFolio(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId,
            @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency, UUID actorId);
}
