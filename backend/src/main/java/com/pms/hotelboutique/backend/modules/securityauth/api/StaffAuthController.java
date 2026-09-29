package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffTokenPair;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff-auth")
@Tag(name = "Staff authentication", description = "Internal endpoints consumed only by the Next.js BFF.")
public class StaffAuthController {
    private static final String REFRESH_COOKIE = "pms_staff_refresh";
    private final StaffAuthService staffAuthService;

    public StaffAuthController(StaffAuthService staffAuthService) {
        this.staffAuthService = staffAuthService;
    }

    @PostMapping("/sessions")
    @Operation(summary = "Create a Staff session", description = "BFF-only. It must keep both returned tokens in HttpOnly cookies.")
    public ResponseEntity<StaffAuthResponse> login(@Valid @RequestBody StaffLoginRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(staffAuthService.login(request.username(), request.password())));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate a Staff refresh token", description = "BFF-only. The BFF forwards its HttpOnly refresh cookie and replaces it with the response value.")
    public StaffAuthResponse refresh(@CookieValue(name = REFRESH_COOKIE, required = false) @Schema(hidden = true) String refreshToken) {
        return toResponse(staffAuthService.refresh(refreshToken));
    }

    @GetMapping("/session")
    @Operation(summary = "Read the active Staff session")
    public StaffSessionResponse session(@AuthenticationPrincipal StaffPrincipal principal) {
        StaffPrincipal active = staffAuthService.getActivePrincipal(principal);
        return new StaffSessionResponse(active.staffUserId(), active.sessionId(), active.username(), active.roleCode());
    }

    @DeleteMapping("/session")
    @Operation(summary = "Revoke the active Staff session")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal StaffPrincipal principal) {
        staffAuthService.logout(principal);
        return ResponseEntity.noContent().build();
    }

    private StaffAuthResponse toResponse(StaffTokenPair tokens) {
        return new StaffAuthResponse(tokens.accessToken(), tokens.refreshToken(), tokens.accessTokenExpiresInSeconds());
    }
}
