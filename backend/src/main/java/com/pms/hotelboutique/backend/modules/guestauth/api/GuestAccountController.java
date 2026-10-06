package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestAccountSummaryService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/guest-auth/account")
@Tag(name = "Guest account", description = "BFF-only; resumen propio desde sesión Guest, sin accountId del cliente.")
public class GuestAccountController {
    private final GuestAccountSummaryService summary;
    public GuestAccountController(GuestAccountSummaryService summary) { this.summary = summary; }

    @GetMapping("/summary")
    @SecurityRequirement(name = "guestBearerAuth")
    @Operation(summary = "Resumen de mi cuenta", description = "GuestPrincipal vigente como única autoridad. Perfiles asociados y reservas con vínculo OTP persistido. Sin datos comerciales/fiscales, tokens ni selección de cuenta/property por cliente.")
    @ApiResponse(responseCode = "200", description = "Resumen propio real; perfiles vacíos y próxima estancia null son válidos.",
            headers = @io.swagger.v3.oas.annotations.headers.Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"),
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = GuestAccountSummaryResponse.class)))
    @ApiResponse(responseCode = "401", description = "JWT/sesión/cuenta Guest inválidos, revocados o ausentes; JWT Staff no autorizado.", content = @Content)
    public ResponseEntity<GuestAccountSummaryResponse> summary(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                .body(GuestAccountSummaryResponse.from(summary.ownSummary(principal)));
    }
}
