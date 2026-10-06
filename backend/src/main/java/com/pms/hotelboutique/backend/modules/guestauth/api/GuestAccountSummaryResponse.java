package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestAccountSummaryView;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record GuestAccountSummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Cuenta obtenida exclusivamente de GuestPrincipal.") UUID guestAccountId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Correo verificado persistido de la cuenta.") String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Estado de la cuenta persistida; una cuenta deshabilitada no accede.") boolean active,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Perfiles asociados por guest_account_id; vacío es válido, no se elige un perfil principal.") List<Profile> profiles,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", description = "Vínculos OTP persistidos propios; cero significa ninguna reserva vinculada.") long linkedReservationsCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, description = "Próxima estancia RESERVED de reserva CONFIRMED y vínculo OTP propio; llegada desde hoy en timezone de property. Null si ninguna elegible.") UpcomingStay upcomingStay) {

    public record Profile(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID profileId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String firstName,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String lastName,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, description = "Valor persistido, sin idioma por defecto.") String preferredLanguage,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"ACTIVE", "INACTIVE"}) String status) { }
    public record UpcomingStay(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID reservationId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID stayId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String confirmationCode,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate arrival,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate departure) { }

    public static GuestAccountSummaryResponse from(GuestAccountSummaryView view) {
        var next = view.upcomingStay();
        return new GuestAccountSummaryResponse(view.guestAccountId(), view.email(), view.active(),
                view.profiles().stream().map(p -> new Profile(p.profileId(), p.firstName(), p.lastName(), p.preferredLanguage(), p.status())).toList(),
                view.linkedReservationsCount(), next == null ? null : new UpcomingStay(next.reservationId(), next.stayId(),
                        next.confirmationCode(), next.arrival(), next.departure()));
    }
}
