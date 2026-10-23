package com.pms.hotelboutique.backend.modules.securityauth.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.handler.AbstractHandlerExceptionResolver;

/** A method mismatch has no controller yet: scoped @ControllerAdvice cannot handle it.
 * Resolve it without sendError, whose /error dispatch would enter a different auth chain. */
@Component
public class StaffAdminMethodExceptionResolver extends AbstractHandlerExceptionResolver {
    public StaffAdminMethodExceptionResolver() { setOrder(Ordered.HIGHEST_PRECEDENCE); }
    @Override
    protected ModelAndView doResolveException(HttpServletRequest request, HttpServletResponse response,
            Object handler, Exception exception) {
        if (!(exception instanceof HttpRequestMethodNotSupportedException)
                || !request.getRequestURI().startsWith("/api/v1/staff-admin/")) return null;
        response.setStatus(405);
        String uri=request.getRequestURI();
        String allow=uri.matches("/api/v1/staff-admin/users/[^/]+/membership")?"PUT":
                uri.matches("/api/v1/staff-admin/users/[^/]+/status")?"PATCH":
                uri.matches("/api/v1/staff-admin/users/[^/]+")?"GET, HEAD, PATCH":"GET, HEAD";
        response.setHeader("Allow", allow);
        response.setHeader("Cache-Control", "private, no-store");
        return new ModelAndView();
    }
}
