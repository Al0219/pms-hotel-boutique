package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthSession;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> { }
