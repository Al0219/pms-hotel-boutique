package com.pms.hotelboutique.backend.modules.reservations.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtAuthenticationFilter;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

/** Narrow adapter to the existing Staff JWT/session contract, without widening other namespaces. */
@Configuration
public class StayJourneySecurityConfiguration {
    @Bean @Order(0)
    SecurityFilterChain stayJourneySecurityFilterChain(HttpSecurity http, StaffJwtService jwt, StaffAuthService sessions) throws Exception {
        var filter = new StaffJwtAuthenticationFilter(jwt, sessions) {
            @Override protected boolean shouldNotFilter(HttpServletRequest request) { return false; }
            @Override protected void authenticationFailed(HttpServletResponse response) throws IOException {
                response.setStatus(401); response.setHeader("Cache-Control", "private, no-store");
            }
        };
        return http.securityMatcher("/api/v1/properties/*/stay-journey/**")
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h.cacheControl(c -> c.disable()).addHeaderWriter(new StaticHeadersWriter("Cache-Control", "private, no-store")))
                .exceptionHandling(e -> e.authenticationEntryPoint((request, response, error) -> response.setStatus(401))
                        .accessDeniedHandler((request, response, error) -> response.setStatus(403)))
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class).build();
    }
}
