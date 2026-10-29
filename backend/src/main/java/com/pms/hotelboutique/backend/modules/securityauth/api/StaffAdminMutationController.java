package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationModels.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.springframework.http.*;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(value="/api/v1/staff-admin/users",produces="application/json")
@Tag(name="Staff administration commands",description="Internal BFF-only; activation or reactivation requires verified M08 evidence.")
@SecurityRequirement(name="bearerAuth")
@ApiResponse(responseCode="400",description="INVALID_REQUEST: strict fields/version/scope.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
@ApiResponse(responseCode="401",description="STAFF_SESSION_REQUIRED",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
@ApiResponse(responseCode="403",description="STAFF_ACCESS_DENIED",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
@ApiResponse(responseCode="404",description="STAFF_USER_NOT_FOUND: absent and inaccessible indistinguishable.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
@ApiResponse(responseCode="409",description="STAFF_VERSION_CONFLICT, STAFF_EMAIL_CONFLICT or STAFF_STATE_CONFLICT; no partial changes.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
@ApiResponse(responseCode="405",description="Unsupported method; Allow is resource-specific.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content)
@ApiResponse(responseCode="413",description="INVALID_REQUEST: maximum 64KiB JSON body.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
@ApiResponse(responseCode="415",description="INVALID_REQUEST: application/json required.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
@ApiResponse(responseCode="503",description="STAFF_WRITE_UNAVAILABLE; sanitized persistence/lock/audit failure.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=StaffAdminMutationModels.Error.class)))
public class StaffAdminMutationController {
    private final StaffAdminMutationService writes;
    public StaffAdminMutationController(StaffAdminMutationService writes){this.writes=writes;}
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary="Create suspended Staff user",description="STAFF_MANAGE; organization from session, authorized properties only. No SUPER_ADMIN or credential delivery. No automatic retry after an uncertain outcome.")
    @Parameters({@Parameter(name="scope",in=ParameterIn.QUERY,required=true,schema=@Schema(allowableValues={"PROPERTY","ALL_PROPERTIES"})),
        @Parameter(name="propertyId",in=ParameterIn.QUERY,schema=@Schema(type="string",format="uuid"))})
    @ApiResponse(responseCode="201",description="Persisted SUSPENDED user, active membership, no credentials.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(schema=@Schema(implementation=StaffAdminReadModels.User.class)))
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required=true,content=@Content(mediaType="application/json",schema=@Schema(implementation=Create.class)))
    public StaffAdminReadModels.User create(@Parameter(hidden=true) @RequestParam MultiValueMap<String,String> query,HttpServletRequest request)throws IOException{
        return writes.create(query,body(request));
    }
    @ApiResponse(responseCode="200",description="Committed command acknowledgement; no StaffView. No-op preserves version.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(schema=@Schema(implementation=Result.class)))
    @PatchMapping("/{id}")
    @Parameters({@Parameter(name="scope",in=ParameterIn.QUERY,required=true,schema=@Schema(allowableValues={"PROPERTY","ALL_PROPERTIES"})),
    @Parameter(name="propertyId",in=ParameterIn.QUERY,description="Required for PROPERTY, forbidden for ALL_PROPERTIES.",schema=@Schema(type="string",format="uuid"))})
    @Operation(summary="Update Staff work email",description="STAFF_MANAGE, organization from session; same login email rules max50. No self-edit. Effective change revokes every Staff session/refresh and audits atomically. expectedVersion required.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required=true,content=@Content(mediaType="application/json",schema=@Schema(implementation=Contact.class)))
    public Result contact(@Parameter(schema=@Schema(type="string",format="uuid")) @PathVariable String id,@Parameter(hidden=true) @RequestParam MultiValueMap<String,String> query,HttpServletRequest request)throws IOException{return execute(id,query,request,Kind.CONTACT);}
    @ApiResponse(responseCode="200",description="Committed command acknowledgement; no StaffView. No-op preserves version.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(schema=@Schema(implementation=Result.class)))
    @PutMapping("/{id}/membership")
    @Parameters({@Parameter(name="scope",in=ParameterIn.QUERY,required=true,schema=@Schema(allowableValues={"PROPERTY","ALL_PROPERTIES"})),
    @Parameter(name="propertyId",in=ParameterIn.QUERY,description="Required for PROPERTY, forbidden for ALL_PROPERTIES.",schema=@Schema(type="string",format="uuid"))})
    @Operation(summary="Replace Staff role and property assignments",description="STAFF_MANAGE, complete-target SQL visibility against actor portfolio. Full replacement, inactive assignment history preserved; membership status and organization immutable. No SUPER_ADMIN promotion. Result may leave selected PROPERTY. expectedVersion required.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required=true,content=@Content(mediaType="application/json",schema=@Schema(implementation=Membership.class)))
    public Result membership(@Parameter(schema=@Schema(type="string",format="uuid")) @PathVariable String id,@Parameter(hidden=true) @RequestParam MultiValueMap<String,String> query,HttpServletRequest request)throws IOException{return execute(id,query,request,Kind.MEMBERSHIP);}
    @ApiResponse(responseCode="200",description="Committed command acknowledgement; no StaffView. No-op preserves version.",headers=@Header(name="Cache-Control",schema=@Schema(allowableValues="private, no-store")),content=@Content(schema=@Schema(implementation=Result.class)))
    @PatchMapping("/{id}/status")
    @Parameters({@Parameter(name="scope",in=ParameterIn.QUERY,required=true,schema=@Schema(allowableValues={"PROPERTY","ALL_PROPERTIES"})),
    @Parameter(name="propertyId",in=ParameterIn.QUERY,description="Required for PROPERTY, forbidden for ALL_PROPERTIES.",schema=@Schema(type="string",format="uuid"))})
    @Operation(summary="Suspend or logically disable Staff",description="STAFF_MANAGE; SUSPENDED or DISABLED; ACTIVE requires verified M08 evidence, active membership and valid properties. Suspension revokes pending invitations. DISABLED terminal; no self-edit or SUPER_ADMIN state change. Revocation/audit in same transaction. expectedVersion required.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(required=true,content=@Content(mediaType="application/json",schema=@Schema(implementation=Status.class)))
    public Result status(@Parameter(schema=@Schema(type="string",format="uuid")) @PathVariable String id,@Parameter(hidden=true) @RequestParam MultiValueMap<String,String> query,HttpServletRequest request)throws IOException{return execute(id,query,request,Kind.STATUS);}
    private Result execute(String id,MultiValueMap<String,String> query,HttpServletRequest request,Kind kind)throws IOException{
        return writes.mutate(id,query,body(request),kind);
    }
    private byte[] body(HttpServletRequest request)throws IOException{
        writes.checkAccess();
        MediaType type;
        try{type=MediaType.parseMediaType(request.getContentType()==null?"":request.getContentType());}
        catch(Exception invalid){throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE);}
        if(!"application".equals(type.getType())||!"json".equals(type.getSubtype()))throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        byte[] body=request.getInputStream().readNBytes(65537);
        if(body.length>65536)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        return body;
    }
}
