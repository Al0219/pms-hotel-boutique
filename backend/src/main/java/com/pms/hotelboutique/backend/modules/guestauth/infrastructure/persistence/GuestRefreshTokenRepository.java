package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestRefreshToken; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface GuestRefreshTokenRepository extends JpaRepository<GuestRefreshToken,UUID>{ Optional<GuestRefreshToken> findByTokenHash(String hash); List<GuestRefreshToken> findAllBySession_Id(UUID sessionId); }
