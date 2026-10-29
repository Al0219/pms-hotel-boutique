package com.pms.hotelboutique.backend.modules.operations.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtAuthenticationFilter;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/** Namespace adapter for the existing active-Staff JWT verifier; Guest credentials never authenticate Staff. */
@Configuration
public class AmenitiesSecurityConfiguration {
    @Bean
    @Order(1)
    SecurityFilterChain amenitiesChain(HttpSecurity http, StaffJwtService jwt, StaffAuthService sessions) throws Exception {
        var filter = new StaffJwtAuthenticationFilter(jwt, sessions) {
            @Override protected boolean shouldNotFilter(HttpServletRequest request) { return false; }
        };
        return http.securityMatcher("/api/v1/properties/*/service-requests/amenities", "/api/v1/properties/*/service-requests/amenities/*/status")
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, error) -> response.setStatus(401))
                        .accessDeniedHandler((request, response, error) -> response.setStatus(403)))
                .authorizeHttpRequests(request -> request.anyRequest().authenticated())
                .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class).build();
    }
}
