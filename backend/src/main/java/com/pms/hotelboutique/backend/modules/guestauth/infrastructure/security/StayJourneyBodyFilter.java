package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Bound the new profile write for native clients as well as the Web BFF. */
@Component
public class StayJourneyBodyFilter extends OncePerRequestFilter {
    private final tools.jackson.databind.ObjectMapper json;
    public StayJourneyBodyFilter(tools.jackson.databind.ObjectMapper json){this.json=json;}
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String path=request.getRequestURI().substring(request.getContextPath().length());
        path=org.springframework.web.util.UriUtils.decode(path,java.nio.charset.StandardCharsets.UTF_8);
        return !(path.contains("/journey/") || path.contains("/stay-journey/"));
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        response.setHeader("Cache-Control","private, no-store");
        if(request.getQueryString()!=null&&!request.getQueryString().isBlank()){response.setStatus(400);return;}
        if(!request.getMethod().equals("POST")){chain.doFilter(request,response);return;}
        byte[] bytes=request.getInputStream().readNBytes(2049);
        if(bytes.length>2048) { response.setStatus(400); return; }
        try {
            if(request.getRequestURI().endsWith("/document-file")&&bytes.length>0){
                var node=json.reader().with(tools.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(bytes);
                if(!node.isObject()||node.size()!=0){response.setStatus(400);return;}
            }
            if(request.getRequestURI().endsWith("/payments")){
                var node=json.reader().with(tools.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(bytes);
                if(!node.isObject()||node.size()!=3||!node.path("amount").isString()||!node.path("currency").isString()||!node.path("instrumentToken").isString()) {response.setStatus(400);return;}
            }
        }catch(RuntimeException e){response.setStatus(400);return;}
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
