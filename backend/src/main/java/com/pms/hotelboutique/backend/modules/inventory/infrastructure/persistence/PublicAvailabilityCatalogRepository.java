package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Public facade's query-only catalog access, always constrained by the requested property. */
public interface PublicAvailabilityCatalogRepository extends Repository<RoomType, UUID> {
    @Query("select p from Property p where p.id = :propertyId")
    Optional<Property> findProperty(@Param("propertyId") UUID propertyId);

    @Query("select t from RoomType t where t.propertyId = :propertyId")
    List<RoomType> findRoomTypes(@Param("propertyId") UUID propertyId);
}
