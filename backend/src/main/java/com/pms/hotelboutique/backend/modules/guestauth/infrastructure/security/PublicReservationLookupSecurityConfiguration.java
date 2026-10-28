package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class PublicReservationLookupSecurityConfiguration {
    @Bean @Order(2)
    SecurityFilterChain publicReservationLookupChain(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/v1/public/reservation-lookup/**")
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(r -> r.anyRequest().permitAll())
            // Both lookup credentials are checked together in SQL; Guest/Staff JWTs do not bypass them.
            .addFilterBefore(new BoundedLookupBody(),UsernamePasswordAuthenticationFilter.class).build();
    }
    private static class BoundedLookupBody extends OncePerRequestFilter {
        @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
                throws ServletException,IOException {
            response.setHeader("Cache-Control","private, no-store");
            if(!request.getMethod().equals("POST")) { chain.doFilter(request,response); return; }
            byte[] bytes=request.getInputStream().readNBytes(2049);
            if(bytes.length>2048) { response.setStatus(400); return; }
            var input=new ByteArrayInputStream(bytes);
            chain.doFilter(new HttpServletRequestWrapper(request) {
                @Override public ServletInputStream getInputStream() {
                    return new ServletInputStream() {
                        @Override public int read() { return input.read(); }
                        @Override public boolean isFinished() { return input.available()==0; }
                        @Override public boolean isReady() { return true; }
                        @Override public void setReadListener(ReadListener listener) { throw new UnsupportedOperationException(); }
                    };
                }
            },response);
        }
    }
}
