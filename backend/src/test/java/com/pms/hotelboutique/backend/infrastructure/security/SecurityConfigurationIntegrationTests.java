package com.pms.hotelboutique.backend.infrastructure.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigurationIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void exposesOnlyFoundationEndpoints() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/not-configured"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void explicitLoginNeedsCredentialsAndMeLogoutRequireTheirOwnBearer() throws Exception {
        mockMvc.perform(post("/api/v1/staff-auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"\",\"password\":\"\"}")).andExpect(status().isBadRequest());
        for (String prefix : java.util.List.of("/api/v1/staff-auth", "/api/v1/guest-auth")) {
            mockMvc.perform(get(prefix + "/me")).andExpect(status().isUnauthorized());
            mockMvc.perform(post(prefix + "/logout")).andExpect(status().isUnauthorized());
        }
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs/swagger-config")).andExpect(status().isOk());
    }
}
