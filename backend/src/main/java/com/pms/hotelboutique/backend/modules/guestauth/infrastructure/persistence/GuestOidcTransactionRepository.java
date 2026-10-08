package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence;
import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestOidcTransaction; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface GuestOidcTransactionRepository extends JpaRepository<GuestOidcTransaction,UUID>{ Optional<GuestOidcTransaction> findByStateHash(String hash); }
