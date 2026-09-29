package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.domain.StaffUser;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.AuthAuditEventRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffUserRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffAuthorizationRepository;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Configuration
public class StaffBootstrapConfiguration {
    private static final Logger log = LoggerFactory.getLogger(StaffBootstrapConfiguration.class);

    @Bean
    ApplicationRunner bootstrapSuperAdmin(StaffUserRepository staffUsers, AuthAuditEventRepository auditEvents, StaffAuthorizationRepository authorizationRepository,
            PasswordEncoder passwordEncoder,
            @Value("${pms.security.bootstrap-admin-username:}") String username,
            @Value("${pms.security.bootstrap-admin-email:}") String email,
            @Value("${pms.security.bootstrap-admin-password:}") String password) {
        return ignored -> bootstrap(staffUsers, auditEvents, authorizationRepository, passwordEncoder, username, email, password);
    }

    @Transactional
    void bootstrap(StaffUserRepository staffUsers, AuthAuditEventRepository auditEvents, StaffAuthorizationRepository authorizationRepository, PasswordEncoder passwordEncoder,
            String username, String email, String password) {
        if (blank(username) && blank(email) && blank(password)) {
            return;
        }
        if (blank(username) || blank(email) || blank(password)) {
            throw new IllegalStateException("All PMS_BOOTSTRAP_ADMIN_* values are required together");
        }
        if (staffUsers.existsByUsername(username.trim())) {
            log.info("Bootstrap SUPER_ADMIN already exists; supplied credentials were not applied");
            return;
        }
        Instant now = Instant.now();
        StaffUser user = staffUsers.save(new StaffUser(UUID.randomUUID(), username.trim(), email.trim(),
                passwordEncoder.encode(password), "SUPER_ADMIN", now));
        authorizationRepository.ensureSuperAdminMembership(user.getId(), UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1"));
        auditEvents.save(new AuthAuditEvent("STAFF_BOOTSTRAP_CREATED", user.getId(), null, "deployment_secret", now));
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }
}
