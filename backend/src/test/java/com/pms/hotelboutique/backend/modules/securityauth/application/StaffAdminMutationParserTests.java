package com.pms.hotelboutique.backend.modules.securityauth.application;

import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import jakarta.validation.Validation;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationModels.Kind.*;

class StaffAdminMutationParserTests {
    static final jakarta.validation.ValidatorFactory factory=Validation.buildDefaultValidatorFactory();
    final StaffAdminMutationParser parser=new StaffAdminMutationParser(factory.getValidator());
    @AfterAll static void close(){factory.close();}
    @TestFactory Stream<DynamicTest> rejectsMalformedAndNoncontractedCommands(){
        return Stream.of("{}","null","[]","{\"workEmail\":\"a@b\",\"expectedVersion\":0,\"username\":\"change\"}",
                "{\"workEmail\":\"a@b\",\"workEmail\":\"c@d\",\"expectedVersion\":0}",
                "{\"workEmail\":\"a@b\",\"expectedVersion\":0} {}",
                "{\"workEmail\":\"a@b\",\"expectedVersion\":-1}","{\"workEmail\":\"a@b\",\"expectedVersion\":1.0}",
                "{\"workEmail\":\"a@b\",\"expectedVersion\":\"0\"}","{\"workEmail\":\"a@b\",\"expectedVersion\":9007199254740991}",
                "{\"workEmail\":null,\"expectedVersion\":0}")
            .map(body->DynamicTest.dynamicTest(body,()->assertThrows(StaffAdminMutationException.class,()->parser.parse(body.getBytes(StandardCharsets.UTF_8),CONTACT))));
    }
    @TestFactory Stream<DynamicTest> emailAcceptanceAndNormalizationExactlyMatchBackendLogin(){
        var login=new PasswordLoginValidator(factory.getValidator());
        return Stream.of(" User@HOTEL.example ","\r\nuser@hotel.example\n","a".repeat(45)+"@a.co","a".repeat(46)+"@a.co", "", "a..b@hotel.example", "u+tag@hotel.example", "\u00a0user@hotel.example\u00a0", "\u212A@hotel.example", "u\nv@hotel.example")
            .map(email->DynamicTest.dynamicTest("login parity "+email.hashCode(),()->{
                String expected;
                try {expected=login.normalizedEmail(email,"Known-password1!");}
                catch(PasswordLoginValidator.InvalidInputException ex){
                    byte[] body=JsonMapper.builder().build().writeValueAsBytes(Map.of("workEmail",email,"expectedVersion",0));
                    assertThrows(StaffAdminMutationException.class,()->parser.parse(body,CONTACT));return;
                }
                byte[] body=JsonMapper.builder().build().writeValueAsBytes(Map.of("workEmail",email,"expectedVersion",0));
                assertEquals(expected,parser.parse(body,CONTACT).email);
            }));
    }
    @Test void rejectsReactivationPromotionDuplicatePropertiesAndClientReadiness(){
        for(var entry:List.of(Map.entry(STATUS,"{\"status\":\"ACTIVE\",\"expectedVersion\":0}"),
                Map.entry(STATUS,"{\"status\":\"SUSPENDED\",\"expectedVersion\":0,\"credentialReady\":true}"),
                Map.entry(MEMBERSHIP,"{\"roleCode\":\"SUPER_ADMIN\",\"propertyIds\":[],\"expectedVersion\":0}"),
                Map.entry(MEMBERSHIP,"{\"roleCode\":\"GERENCIA\",\"propertyIds\":[\"11111111-1111-4111-8111-111111111111\",\"11111111-1111-4111-8111-111111111111\"],\"expectedVersion\":0}")))
            assertThrows(StaffAdminMutationException.class,()->parser.parse(entry.getValue().getBytes(StandardCharsets.UTF_8),entry.getKey()));
    }
}
