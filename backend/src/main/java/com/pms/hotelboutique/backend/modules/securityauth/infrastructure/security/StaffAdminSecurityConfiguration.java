package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import tools.jackson.databind.ObjectMapper;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadException.Failure.*;

@Configuration
public class StaffAdminSecurityConfiguration {
    public static void error(HttpServletResponse response, ObjectMapper json, StaffAdminReadException.Failure failure) throws IOException {
        response.setStatus(failure.status);
        response.setContentType("application/problem+json");
        response.setHeader("Cache-Control", "private, no-store");
        json.writeValue(response.getOutputStream(), StaffAdminReadModels.Error.of(failure));
    }

    @Bean
    @Order(0)
    SecurityFilterChain staffAdminSecurityFilterChain(HttpSecurity http, StaffJwtService jwt,
            StaffAuthService sessions, ObjectMapper json) throws Exception {
        // Same C1 parser, audience and session validation. Filter is not registered as a servlet bean.
        var filter = new StaffJwtAuthenticationFilter(jwt, sessions) {
            @Override protected boolean shouldNotFilter(HttpServletRequest request) { return false; }
            @Override protected void authenticationFailed(HttpServletResponse response) throws IOException {
                error(response, json, STAFF_SESSION_REQUIRED);
            }
            @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                    throws ServletException, IOException {
                if ("OPTIONS".equals(request.getMethod())) {
                    response.setStatus(405);response.setHeader("Cache-Control","private, no-store");
                    String uri=request.getRequestURI();
                    response.setHeader("Allow", uri.matches("/api/v1/staff-admin/users/[^/]+/invitation")?"GET, HEAD, POST":uri.matches("/api/v1/staff-admin/users/?")?"GET, HEAD, POST":uri.matches("/api/v1/staff-admin/users/[^/]+/membership")?"PUT":uri.matches("/api/v1/staff-admin/users/[^/]+/status")?"PATCH":uri.matches("/api/v1/staff-admin/users/[^/]+")?"GET, HEAD, PATCH":"GET, HEAD");
                    return;
                }
                try { super.doFilterInternal(request, response, chain); }
                catch (DataAccessException ex) {
                    if ("GET".equals(request.getMethod()) || "HEAD".equals(request.getMethod())) error(response, json, STAFF_READ_UNAVAILABLE);
                    else {
                        response.setStatus(503);response.setContentType("application/problem+json");response.setHeader("Cache-Control","private, no-store");
                        json.writeValue(response.getOutputStream(), new StaffAdminMutationModels.Error("about:blank","Staff write unavailable",503,"STAFF_WRITE_UNAVAILABLE"));
                    }
                }
            }
        };
        return http.securityMatcher("/api/v1/staff-admin", "/api/v1/staff-admin/**")
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h.cacheControl(cache -> cache.disable())
                        .addHeaderWriter(new StaticHeadersWriter("Cache-Control", "private, no-store")))
                .exceptionHandling(e -> e.authenticationEntryPoint((request, response, ex) -> error(response, json, STAFF_SESSION_REQUIRED))
                        .accessDeniedHandler((request, response, ex) -> error(response, json, STAFF_ACCESS_DENIED)))
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class).build();
    }
}
