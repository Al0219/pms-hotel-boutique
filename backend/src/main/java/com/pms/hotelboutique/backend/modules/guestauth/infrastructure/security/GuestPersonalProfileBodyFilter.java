package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Bound the new profile write for native clients as well as the Web BFF. */
@Component
public class GuestPersonalProfileBodyFilter extends OncePerRequestFilter {
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        if(!request.getMethod().equals("PUT")) return true;
        String path=request.getRequestURI().substring(request.getContextPath().length());
        path=org.springframework.web.util.UriUtils.decode(path,java.nio.charset.StandardCharsets.UTF_8);
        return !path.equals("/api/v1/guest-auth/account/profile");
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        response.setHeader("Cache-Control","private, no-store");
        byte[] bytes=request.getInputStream().readNBytes(4097);
        if(bytes.length>4096) { response.setStatus(400); return; }
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
