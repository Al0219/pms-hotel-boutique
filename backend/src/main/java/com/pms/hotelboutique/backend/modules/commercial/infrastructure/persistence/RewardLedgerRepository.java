package com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.commercial.domain.RewardLedgerEntry;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Internal append-only persistence. Reads filter by the exact guest profile
 * and the authorized property ids (C2 rule: ids in the predicate, no global
 * query). Entries are never updated nor deleted.
 */
public interface RewardLedgerRepository extends JpaRepository<RewardLedgerEntry, UUID> {

    @Query("""
            select e from RewardLedgerEntry e join Property p on e.propertyId = p.id
            where e.id = :id and p.organizationId = :#{#scope.organizationId}
              and p.id in :#{#scope.propertyIds}
            """)
    Optional<RewardLedgerEntry> findByIdInScope(@Param("scope") AuthorizedPropertyScope scope,
            @Param("id") UUID id);

    @Query("""
            select e from RewardLedgerEntry e
            where e.guestProfileId = :profileId and e.propertyId in :propertyIds
            order by e.createdAt
            """)
    List<RewardLedgerEntry> findByProfileInScope(@Param("profileId") UUID profileId,
            @Param("propertyIds") java.util.Set<UUID> propertyIds);

    @Query("""
            select coalesce(sum(e.points), 0) from RewardLedgerEntry e
            where e.guestProfileId = :profileId and e.propertyId in :propertyIds
            """)
    long balanceOf(@Param("profileId") UUID profileId,
            @Param("propertyIds") java.util.Set<UUID> propertyIds);

    List<RewardLedgerEntry> findByReversesId(UUID reversesId);

    List<RewardLedgerEntry> findByStayIdAndKind(UUID stayId,
            com.pms.hotelboutique.backend.modules.commercial.domain.RewardLedgerEntry.Kind kind);
}
