package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/guest-auth") @Tag(name="Guest authentication",description="Guest sessions for Web BFF and native Android. Google/registration remain BFF-only. Never expose tokens to browser JavaScript.") public class GuestAuthController {
 private static final String REFRESH_COOKIE="pms_guest_refresh"; private final GuestAuthService auth; public GuestAuthController(GuestAuthService auth){this.auth=auth;}
 private String resolveDynamicRedirectUri(HttpServletRequest request) {
   if (request == null) return null;
   String host = request.getHeader("X-Forwarded-Host");
   if (host == null || host.isBlank()) {
     host = request.getHeader("Host");
   }
   if (host == null || host.isBlank()) return null;
   String proto = request.getHeader("X-Forwarded-Proto");
   if (proto == null || proto.isBlank()) {
     proto = request.isSecure() ? "https" : "http";
   }
   return proto + "://" + host.trim() + "/api/auth/guest/google/callback";
 }
 @PostMapping("/google/start")
    @ApiResponse(responseCode = "200", description = "URL Google con state/nonce/PKCE de servidor; transacción de un uso, 10 minutos.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = GoogleStartResponse.class))) @Operation(summary="Iniciar sesión con Google: iniciar autorización",description="BFF-only; no sesión previa. Requiere configuración OIDC. No autentica todavía al Guest.") public GoogleStartResponse start(HttpServletRequest request){return new GoogleStartResponse(auth.startGoogleAuthorization(resolveDynamicRedirectUri(request)));}
 @PostMapping("/google/exchange")
    @ApiResponse(responseCode = "201", description = "Sesión Guest tras validar Google; tokens solo para BFF.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = GuestAuthResponse.class)))
    @ApiResponse(responseCode = "400", description = "JSON o code/state de entrada inválidos.", content = @Content)
    @ApiResponse(responseCode = "401", description = "Intercambio, identidad Google o state inválidos.", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))) @Operation(summary="Iniciar sesión con Google: completar intercambio",description="BFF-only, sin Bearer previo. Valida code/state, PKCE, nonce, firma, audiencia y correo Google verificado.") public ResponseEntity<GuestAuthResponse> exchange(HttpServletRequest request, @Valid @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true, content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = GoogleExchangeRequest.class))) @RequestBody GoogleExchangeRequest body){return ResponseEntity.status(HttpStatus.CREATED).body(response(auth.exchangeGoogleAuthorization(body.code(),body.state(),resolveDynamicRedirectUri(request))));}
 @PostMapping("/refresh")
    @SecurityRequirement(name = "guestRefreshCookie")
    @SecurityRequirement(name = "guestNativeRefresh")
    @ApiResponse(responseCode = "200", description = "Tokens Guest rotados; Web BFF reemplaza cookies HttpOnly; Android reemplaza refresh en SecureStore.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = GuestAuthResponse.class)))
    @ApiResponse(responseCode = "401", description = "Cookie ausente o refresh/sesión Guest inválidos.", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))) @Operation(summary="Renovar sesión") public ResponseEntity<GuestAuthResponse> refresh(
        @CookieValue(name=REFRESH_COOKIE,required=false) @Schema(hidden=true) String refresh,
        @RequestHeader(name="X-Guest-Refresh-Token",required=false) @Parameter(hidden=true) String nativeRefresh,
        @RequestHeader(name="Origin",required=false) @Parameter(hidden=true) String origin) {
    // Native credentials are not browser cookies. Ambiguous/browser-native requests fail closed.
    if (nativeRefresh != null && (refresh != null || origin != null)) throw new GuestAuthenticationException();
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response(auth.refresh(nativeRefresh != null ? nativeRefresh : refresh)));
 }
 @GetMapping("/session")
    @SecurityRequirement(name = "guestBearerAuth")
    @ApiResponse(responseCode = "200", description = "Cuenta Guest actual; sin permiso Staff ni property scope administrativo.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = GuestSessionResponse.class)))
    @ApiResponse(responseCode = "401", description = "JWT/sesión Guest inválidos; filtro puede responder sin cuerpo de aplicación.", content = @Content) @Operation(summary="Usuario actual",deprecated=true,description="Alias compatible; preferir GET /api/v1/guest-auth/me. BFF Web o Android nativo; cuenta Guest actual, sin tokens.") public GuestSessionResponse session(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal){GuestPrincipal active=auth.getActivePrincipal(principal);return new GuestSessionResponse(active.guestAccountId(),active.sessionId(),active.email(),"GUEST");}
 @GetMapping("/me")
    @SecurityRequirement(name = "guestBearerAuth")
    @ApiResponse(responseCode = "200", description = "Cuenta Guest actual; sin permiso Staff ni property scope administrativo.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = GuestSessionResponse.class)))
    @ApiResponse(responseCode = "401", description = "JWT/sesión Guest inválidos; filtro puede responder sin cuerpo de aplicación.", content = @Content) @Operation(summary="Usuario actual",description="BFF Web o Android nativo; cuenta Guest actual, sin tokens.") public GuestSessionResponse me(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal){return session(principal);}

 @DeleteMapping("/session")
    @SecurityRequirement(name = "guestBearerAuth")
    @ApiResponse(responseCode = "204", description = "Sesión y refresh Guest revocados; no altera Staff.", content = @Content)
    @ApiResponse(responseCode = "401", description = "JWT/sesión Guest inválidos.", content = @Content) @Operation(summary="Cerrar sesión",deprecated=true,description="Alias compatible; preferir POST /api/v1/guest-auth/logout. BFF Web o Android nativo; revoca solo la sesión Guest actual.") public ResponseEntity<Void> logout(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal){auth.logout(principal);return ResponseEntity.noContent().build();}
 @PostMapping("/logout")
    @SecurityRequirement(name = "guestBearerAuth")
    @ApiResponse(responseCode = "204", description = "Sesión y refresh Guest revocados; no altera Staff.", content = @Content)
    @ApiResponse(responseCode = "401", description = "JWT/sesión Guest inválidos.", content = @Content) @Operation(summary="Cerrar sesión",description="BFF Web o Android nativo; revoca solo la sesión Guest actual.") public ResponseEntity<Void> logoutExplicit(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal){return logout(principal);}

 @PostMapping("/sessions")
 @Operation(operationId="guestPasswordLogin", summary="Iniciar sesión con correo y contraseña", description="BFF Web o cliente Android nativo seguro; GuestAccount con credential existente, sin registro ni vínculo automático a Google.", security={})
 @ApiResponse(responseCode="201",description="Sesión Guest; tokens para BFF o Android nativo, nunca browser JS.",content=@Content(mediaType="application/json",schema=@Schema(implementation=GuestAuthResponse.class)))
 @ApiResponse(responseCode="400",description="JSON/email/password inválidos; error sanitizado sin valores rechazados.",content=@Content)
 @ApiResponse(responseCode="401",description="Credenciales inválidas; incluye cuenta inexistente, inactiva o sin password.",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
 public ResponseEntity<GuestAuthResponse> login(@Valid @RequestBody GuestLoginRequest request) {
   return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(response(auth.login(request.email(),request.password())));
 }
 private GuestAuthResponse response(GuestTokenPair p){return new GuestAuthResponse(p.accessToken(),p.refreshToken(),p.accessTokenExpiresInSeconds());}
}
