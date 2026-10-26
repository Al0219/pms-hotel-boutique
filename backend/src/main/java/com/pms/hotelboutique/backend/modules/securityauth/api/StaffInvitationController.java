package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.springframework.http.*;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/staff-admin/users/{id}/invitation")
@SecurityRequirement(name="bearerAuth")

@ApiResponse(responseCode="400",description="INVALID_REQUEST")
@ApiResponse(responseCode="401",description="STAFF_SESSION_REQUIRED")
@ApiResponse(responseCode="403",description="STAFF_ACCESS_DENIED")
@ApiResponse(responseCode="404",description="STAFF_USER_NOT_FOUND (also inaccessible)")
@ApiResponse(responseCode="409",description="STAFF_VERSION_CONFLICT or STAFF_STATE_CONFLICT")
@ApiResponse(responseCode="503",description="STAFF_WRITE_UNAVAILABLE; delivery/write may be uncertain, no automatic retry")
public class StaffInvitationController {
    private final StaffInvitationService invitations;
    private final StaffAdminMutationService admin;
    public StaffInvitationController(StaffInvitationService invitations,StaffAdminMutationService admin){this.invitations=invitations;this.admin=admin;}
    @Schema(name="StaffInvitationCommand",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Invite(@Schema(requiredMode=Schema.RequiredMode.REQUIRED,minimum="0",maximum="9007199254740990") long expectedVersion) { }
    @Parameters({@Parameter(name="scope",in=ParameterIn.QUERY,required=true,schema=@Schema(allowableValues={"PROPERTY","ALL_PROPERTIES"})),
    @Parameter(name="propertyId",in=ParameterIn.QUERY,schema=@Schema(type="string",format="uuid"))})
    @GetMapping
    @Operation(summary="Read Staff activation and recovery eligibility",description="STAFF_MANAGE and full SQL-scoped visibility. Only derived eligibility, no token/credential metadata.")
    public ResponseEntity<StaffInvitationService.Info> info(@Parameter(schema=@Schema(type="string",format="uuid")) @PathVariable String id,@Parameter(hidden=true) @RequestParam MultiValueMap<String,String> query){
        return ResponseEntity.ok().header("Cache-Control","private, no-store").body(invitations.info(id,query));
    }
    @Parameters({@Parameter(name="scope",in=ParameterIn.QUERY,required=true,schema=@Schema(allowableValues={"PROPERTY","ALL_PROPERTIES"})),
    @Parameter(name="propertyId",in=ParameterIn.QUERY,schema=@Schema(type="string",format="uuid"))})
    @PostMapping
    @Operation(summary="Send Staff invitation or recovery by existing SMTP",description="STAFF_MANAGE; SUSPENDED account without valid M08 evidence; explicit administrator request; 60s cooldown for pending invitations. Returns no token/link. expectedVersion required.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required=true,content=@Content(mediaType="application/json",schema=@Schema(implementation=Invite.class)))
    public ResponseEntity<StaffAdminMutationModels.Result> send(@Parameter(schema=@Schema(type="string",format="uuid")) @PathVariable String id,@Parameter(hidden=true) @RequestParam MultiValueMap<String,String> query,HttpServletRequest request)throws IOException{
        admin.checkAccess();var body=StaffInvitationInput.read(request);
        if(body.size()!=1||!body.has("expectedVersion"))StaffInvitationInput.invalid();var v=body.get("expectedVersion");
        if(!v.isIntegralNumber()||!v.canConvertToLong()||v.longValue()<0||v.longValue()>9007199254740990L)StaffInvitationInput.invalid();
        return ResponseEntity.ok().header("Cache-Control","private, no-store").body(invitations.invite(id,query,v.longValue()));
    }
}
