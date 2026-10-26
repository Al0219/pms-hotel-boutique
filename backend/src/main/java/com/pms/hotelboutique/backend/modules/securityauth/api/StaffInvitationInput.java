package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.*;
import tools.jackson.databind.json.JsonMapper;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException.Failure.INVALID_REQUEST;

final class StaffInvitationInput {
    private static final ObjectMapper JSON=JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    static JsonNode read(HttpServletRequest request)throws IOException{
        if(request.getQueryString()!=null&&request.getRequestURI().endsWith("/consume"))invalid();
        if(request.getContentType()==null||!request.getContentType().split(";")[0].trim().equalsIgnoreCase("application/json"))throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        byte[] bytes=request.getInputStream().readNBytes(65537);if(bytes.length>65536)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        try{var value=JSON.readTree(bytes);if(value==null||!value.isObject())invalid();return value;}catch(Exception error){invalid();return null;}
    }
    static void invalid(){throw new StaffAdminMutationException(INVALID_REQUEST);}
}
