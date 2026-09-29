package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.securityauth.domain.RefreshToken;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    List<RefreshToken> findAllBySession_Id(UUID sessionId);
}
