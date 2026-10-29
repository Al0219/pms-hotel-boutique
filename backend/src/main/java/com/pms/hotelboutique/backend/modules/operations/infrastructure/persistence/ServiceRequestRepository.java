package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ServiceRequest> findByIdAndPropertyIdAndReservationIdAndStayIdAndCategory(UUID id, UUID propertyId, UUID reservationId, UUID stayId, ServiceRequest.Category category);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ServiceRequest> findByIdAndPropertyIdAndCategory(UUID id, UUID propertyId, ServiceRequest.Category category);

    Optional<ServiceRequest> findByStayIdAndGuestRequestKey(UUID stayId, String guestRequestKey);

    List<ServiceRequest> findByPropertyIdAndStayIdAndCategoryOrderByCreatedAtDesc(UUID propertyId, UUID stayId, ServiceRequest.Category category);

    Optional<ServiceRequest> findByIdAndPropertyId(UUID id, UUID propertyId);

    List<ServiceRequest> findByPropertyIdIn(Set<UUID> propertyIds);
}
