package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.pms.hotelboutique.backend.modules.guestauth.application.PublicReservationLookupReadPort;
import com.pms.hotelboutique.backend.modules.guestauth.application.PublicReservationLookupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public/reservation-lookup")
@Tag(name="Public reservation lookup", description="Contract 62. One reservation using responsible contact email and reference; no account, OTP or history grant.")
public class PublicReservationLookupController {
    private final PublicReservationLookupService lookup;

    public PublicReservationLookupController(PublicReservationLookupService lookup) { this.lookup = lookup; }

    @PostMapping("/search")
    @Operation(summary="Consult one reservation using email and reference",
        description="Readonly. Both credentials must match the same persisted reservation. All its stays, type codes/timezones, creation date/source/currency and original confirmed total when an immutable public receipt exists. Never other reservations, personal documents, payment details, ledger, Staff notes or live repricing. Maximum 2 KiB closed JSON; 5 misses/30 minutes and 10 requests/hour per email or reference.")
    @ApiResponse(responseCode="200", description="Single matching reservation with its stays and public details.",
        content=@Content(mediaType="application/json", schema=@Schema(implementation=PublicReservationLookupReadPort.Result.class)))
    @ApiResponse(responseCode="400", description="Invalid closed JSON or credential format.", content=@Content)
    @ApiResponse(responseCode="404", description="Credentials do not match; no indication of which was incorrect.", content=@Content)
    @ApiResponse(responseCode="429", description="Lookup attempt budget exhausted.", content=@Content)
    @ApiResponse(responseCode="503", description="Lookup temporarily unavailable.", content=@Content)
    public PublicReservationLookupReadPort.Result search(@Valid @RequestBody SearchRequest request) {
        return lookup.search(request.email(), request.confirmationCode());
    }

    @Schema(name="PublicReservationLookupSearchRequest", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record SearchRequest(@NotBlank @Email @Size(max=320) String email,
            @NotBlank @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9-]{5,39}") @Schema(accessMode=Schema.AccessMode.WRITE_ONLY) String confirmationCode) {
        public SearchRequest {
            if (email != null) email = email.trim();
            if (confirmationCode != null) confirmationCode = confirmationCode.trim();
        }
        @JsonAnySetter public void reject(String key, Object value) { throw new IllegalArgumentException("Unknown lookup field"); }
        @Override public String toString() { return "SearchRequest[redacted]"; }
    }
}
