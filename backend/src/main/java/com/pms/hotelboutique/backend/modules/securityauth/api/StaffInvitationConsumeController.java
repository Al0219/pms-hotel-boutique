package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff-auth/invitations/consume")
public class StaffInvitationConsumeController {
    private final StaffInvitationService invitations;
    public StaffInvitationConsumeController(StaffInvitationService invitations){this.invitations=invitations;}
    @Schema(name="StaffInvitationConsumeCommand",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Consume(@Schema(requiredMode=Schema.RequiredMode.REQUIRED,minLength=43,maxLength=43,accessMode=Schema.AccessMode.WRITE_ONLY) String token,
            @Schema(requiredMode=Schema.RequiredMode.REQUIRED,minLength=8,maxLength=50,format="password",accessMode=Schema.AccessMode.WRITE_ONLY) String password){
        @Override public String toString(){return "StaffInvitationConsume[redacted]";}
    }
    public record Prepared(boolean credentialPrepared) { }
    @PostMapping
    @Operation(summary="Activate or recover Staff account with a one-use invitation",description="Public recipient proof via token; password, M08 evidence and activation are atomic; no cookies/session creation. Token only in JSON body; never URL query.",security={})
    @ApiResponse(responseCode="200",description="Password, M08 evidence and ACTIVE state committed atomically")
    @ApiResponse(responseCode="400",description="INVALID_REQUEST: password 8–50 characters, max72 UTF8 bytes")
    @ApiResponse(responseCode="409",description="STAFF_INVITATION_INVALID: absent, expired, reused, revoked or ineligible indistinguishable")
    @ApiResponse(responseCode="503",description="STAFF_WRITE_UNAVAILABLE; no automatic replay")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required=true,content=@Content(mediaType="application/json",schema=@Schema(implementation=Consume.class)))
    public ResponseEntity<Prepared> consume(HttpServletRequest request)throws IOException{
        var body=StaffInvitationInput.read(request);
        if(body.size()!=2||!body.has("token")||!body.has("password")||!body.path("token").isString()||!body.path("password").isString())StaffInvitationInput.invalid();
        invitations.consume(body.path("token").asText(),body.path("password").asText());
        return ResponseEntity.ok().header("Cache-Control","private, no-store").header("Referrer-Policy","no-referrer").body(new Prepared(true));
    }
}
