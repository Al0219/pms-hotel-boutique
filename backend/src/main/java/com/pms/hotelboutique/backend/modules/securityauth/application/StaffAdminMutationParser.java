package com.pms.hotelboutique.backend.modules.securityauth.application;

import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import jakarta.validation.Validator;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.*;
import tools.jackson.databind.json.JsonMapper;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationModels.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException.Failure.INVALID_REQUEST;

/** Dedicated strict reader: no changes to global Jackson/auth configuration. */
@Component
public class StaffAdminMutationParser {
    private final Validator validator;
    private final ObjectMapper json=JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    public StaffAdminMutationParser(Validator validator){this.validator=validator;}
    private record EmailInput(@NotBlank @Email(regexp=PasswordLoginValidator.EMAIL_PATTERN) @Size(max=50) String value) {
        @Override public String toString(){return "StaffEmail[redacted]";}
    }
    public Create parseCreate(byte[] body) {
        try {
            var value=json.readTree(body);
            var allowed=Set.of("username","workEmail","roleCode","propertyIds");
            if(value==null||!value.isObject()||value.size()!=4)invalid();
            for(var name:value.propertyNames())if(!allowed.contains(name))invalid();
            if(!value.path("username").isString())invalid();
            String username=value.path("username").asText().trim();
            if(username.isBlank()||username.length()>80||username.codePoints().anyMatch(Character::isISOControl))invalid();
            // Reuse the exact contact/login email, role and UUID validation.
            var input=json.createObjectNode();
            input.set("workEmail",value.get("workEmail"));input.put("expectedVersion",0);
            var contact=parse(json.writeValueAsBytes(input),Kind.CONTACT);
            input=json.createObjectNode();input.set("roleCode",value.get("roleCode"));
            input.set("propertyIds",value.get("propertyIds"));input.put("expectedVersion",0);
            var membership=parse(json.writeValueAsBytes(input),Kind.MEMBERSHIP);
            return new Create(username,contact.email,AssignedRole.valueOf(membership.role),membership.properties.stream().sorted().toList());
        }catch(Exception ex){throw new StaffAdminMutationException(INVALID_REQUEST);}
    }
    public Command parse(byte[] body,Kind kind) {
        try {
            var value=json.readTree(body);
            var allowed=kind==Kind.CONTACT?Set.of("workEmail","expectedVersion"):kind==Kind.STATUS?Set.of("status","expectedVersion"):Set.of("roleCode","propertyIds","expectedVersion");
            if(value==null||!value.isObject()||value.size()!=allowed.size())invalid();
            for(var name:value.propertyNames())if(!allowed.contains(name))invalid();
            var version=value.get("expectedVersion");
            if(version==null||!version.isIntegralNumber()||!version.canConvertToLong()||version.longValue()<0||version.longValue()>9007199254740990L)invalid();
            String email=null,role=null,status=null;Set<UUID> properties=new HashSet<>();
            if(kind==Kind.CONTACT){
                var raw=value.get("workEmail");if(raw==null||!raw.isString())invalid();
                email=raw.asText().trim().toLowerCase(Locale.ROOT);
                if(!validator.validate(new EmailInput(email)).isEmpty())invalid();
            } else if(kind==Kind.STATUS){
                var raw=value.get("status");if(raw==null||!raw.isString())invalid();
                status=RequestedStatus.valueOf(raw.asText()).name();
            } else {
                var raw=value.get("roleCode");if(raw==null||!raw.isString())invalid();
                role=AssignedRole.valueOf(raw.asText()).name();
                var ids=value.get("propertyIds");if(ids==null||!ids.isArray())invalid();
                for(var id:ids){if(!id.isString()||!properties.add(StaffAdminReadQuery.uuid(id.asText())))invalid();}
            }
            return new Command(version.longValue(),email,role,status,properties);
        } catch(Exception ex){throw new StaffAdminMutationException(INVALID_REQUEST);}
    }
    private static void invalid(){throw new StaffAdminMutationException(INVALID_REQUEST);}
}
