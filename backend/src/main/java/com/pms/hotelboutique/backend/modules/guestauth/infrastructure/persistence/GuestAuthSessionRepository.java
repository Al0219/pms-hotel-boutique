package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAuthSession; import java.util.UUID; import org.springframework.data.jpa.repository.JpaRepository;
public interface GuestAuthSessionRepository extends JpaRepository<GuestAuthSession,UUID>{}
