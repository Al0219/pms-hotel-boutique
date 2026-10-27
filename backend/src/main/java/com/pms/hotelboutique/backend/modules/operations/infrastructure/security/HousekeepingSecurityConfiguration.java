package com.pms.hotelboutique.backend.modules.operations.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtAuthenticationFilter;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class HousekeepingSecurityConfiguration {
    @Bean
    @Order(1)
    SecurityFilterChain housekeepingChain(HttpSecurity http, StaffJwtService jwt, StaffAuthService sessions) throws Exception {
        return http.securityMatcher("/api/v1/properties/*/service-requests/room-service", "/api/v1/properties/*/service-requests/room-service/*/status", "/api/v1/properties/*/service-requests/housekeeping/*/status", "/api/v1/properties/*/service-requests/housekeeping", "/api/v1/properties/*/housekeeping/rooms", "/api/v1/properties/*/housekeeping/rooms/*",
                        "/api/v1/properties/*/housekeeping/rooms/*/tracking", "/api/v1/properties/*/housekeeping/rooms/*/status",
                        "/api/v1/properties/*/housekeeping/rooms/*/dnd")
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, error) -> response.setStatus(401))
                        .accessDeniedHandler((request, response, error) -> response.setStatus(403)))
                .authorizeHttpRequests(request -> request.anyRequest().authenticated())
                .addFilterBefore(new HousekeepingStaffFilter(jwt, sessions), UsernamePasswordAuthenticationFilter.class).build();
    }
    private static class HousekeepingStaffFilter extends StaffJwtAuthenticationFilter {
        HousekeepingStaffFilter(StaffJwtService jwt, StaffAuthService sessions) { super(jwt, sessions); }
        @Override protected boolean shouldNotFilter(HttpServletRequest request) { return false; }
        @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            response.setHeader("Cache-Control", "private, no-store");
            super.doFilterInternal(request, response, chain);
        }
    }
}
