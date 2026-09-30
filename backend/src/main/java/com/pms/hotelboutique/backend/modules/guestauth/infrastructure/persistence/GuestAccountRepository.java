package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAccount; import java.util.UUID; import org.springframework.data.jpa.repository.JpaRepository;
public interface GuestAccountRepository extends JpaRepository<GuestAccount,UUID>{}
