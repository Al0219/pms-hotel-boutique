package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestIdentity; import java.util.Optional; import java.util.UUID; import org.springframework.data.jpa.repository.JpaRepository;
public interface GuestIdentityRepository extends JpaRepository<GuestIdentity,UUID>{ Optional<GuestIdentity> findByProviderAndProviderSubject(String provider,String providerSubject); }
