package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/guest-auth/account/profile")
@Tag(name="Guest account")
@SecurityRequirement(name="guestBearerAuth")
@ApiResponse(responseCode="401",description="Active Guest session required; Staff is rejected.",content=@Content)
@ApiResponse(responseCode="409",description="Profile changed, inactive or used by a reservation. Reload without discarding the draft.",content=@Content)
@ApiResponse(responseCode="503",description="Profile temporarily unavailable.",content=@Content)
public class GuestPersonalProfileController {
    private final GuestPersonalProfileService profiles;
    public GuestPersonalProfileController(GuestPersonalProfileService profiles) { this.profiles=profiles; }
    @GetMapping
    @Operation(summary="My personal contact and preferences",description="Contract 63. Own Guest account only; profile null is valid. No automatic choice among historical profiles. No writes on GET.")
    @ApiResponse(responseCode="200",description="Own personal profile or null; private, no-store.",content=@Content(mediaType="application/json",schema=@Schema(implementation=GuestPersonalProfile.class)))
    public ResponseEntity<GuestPersonalProfile> get(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p) { return ok(profiles.get(p)); }
    @PutMapping
    @Operation(summary="Save my personal profile",description="Closed JSON, maximum 4 KiB. First save creates an isolated GuestProfile. Account/email/identity and reservation profiles are unchanged. Version 0 and expectedUpdatedAt null for creation; exact version/timestamp for updates. Identical retries do not duplicate audit or profiles. Preferences are requests, not availability guarantees.")
    @ApiResponse(responseCode="200",description="Personal profile saved, with current version.",content=@Content(mediaType="application/json",schema=@Schema(implementation=GuestPersonalProfile.class)))
    @ApiResponse(responseCode="400",description="Invalid or unknown fields.",content=@Content)
    public ResponseEntity<GuestPersonalProfile> save(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@Valid @RequestBody Input i) {
        return ok(profiles.save(p,new GuestPersonalProfileService.Input(i.firstName(),i.lastName(),i.phone(),i.country(),i.preferredLanguage(),i.bedType(),i.roomVibe(),i.floorPreference(),i.version(),i.expectedUpdatedAt())));
    }
    private ResponseEntity<GuestPersonalProfile> ok(GuestPersonalProfile p) { return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(p); }
    @Schema(name="GuestPersonalProfileInput",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Input(@NotBlank @Size(max=80) String firstName,@NotBlank @Size(max=80) String lastName,
        @Pattern(regexp="\\+[1-9][0-9]{7,14}") String phone,@Size(max=80) String country,
        @Pattern(regexp="es|en") String preferredLanguage,@Pattern(regexp="KING|QUEEN|TWIN") String bedType,
        @Pattern(regexp="QUIET|EXTERIOR_VIEW|NEAR_ELEVATOR") String roomVibe,@Pattern(regexp="HIGH|LOW") String floorPreference,
        @NotNull @Min(0) Long version,@Schema(types={"string","null"},format="date-time") Instant expectedUpdatedAt) {
        public Input { firstName=clean(firstName);lastName=clean(lastName);phone=clean(phone);country=clean(country);preferredLanguage=clean(preferredLanguage);bedType=clean(bedType);roomVibe=clean(roomVibe);floorPreference=clean(floorPreference); }
        private static String clean(String s) { return s==null || s.isBlank() ? null : s.trim(); }
        @JsonAnySetter public void reject(String key,Object value) { throw new IllegalArgumentException("Unknown profile field"); }
        @Override public String toString() { return "GuestPersonalProfileInput[redacted]"; }
    }
}
