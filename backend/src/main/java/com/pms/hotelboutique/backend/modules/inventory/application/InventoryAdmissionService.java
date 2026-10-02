package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.AvailabilityQueryRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.InventoryAdmissionLockRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Serializes participating admissions per property and room type across JVMs. */
@Service
public class InventoryAdmissionService implements InventoryAdmissionPort {
    private final InventoryAdmissionLockRepository locks;
    private final AvailabilityQueryRepository availability;
    private final EntityManager entities;

    public InventoryAdmissionService(InventoryAdmissionLockRepository locks,
            AvailabilityQueryRepository availability, EntityManager entities) {
        this.locks = locks;
        this.availability = availability;
        this.entities = entities;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public <T> T admit(UUID propertyId, List<InventoryDemand> demand, Supplier<T> persistence) {
        Objects.requireNonNull(propertyId, "propertyId");
        Objects.requireNonNull(persistence, "persistence");
        var requests = List.copyOf(demand);
        if (requests.isEmpty()) {
            throw new IllegalArgumentException("inventory demand must not be empty");
        }
        Integer isolation = TransactionSynchronizationManager.getCurrentTransactionIsolationLevel();
        if (TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                || (isolation != null && isolation != Isolation.READ_COMMITTED.value())) {
            throw new IllegalStateException("inventory admission requires a writable READ_COMMITTED transaction");
        }

        Map<UUID, TreeMap<LocalDate, Integer>> nightlyDemand = new TreeMap<>();
        for (var request : requests) {
            var nights = nightlyDemand.computeIfAbsent(request.roomTypeId(), ignored -> new TreeMap<>());
            request.dates().arrival().datesUntil(request.dates().departure())
                    .forEach(night -> nights.merge(night, request.units(), Math::addExact));
        }
        // Stable ordering avoids opposite lock order for multi-room bookings.
        for (UUID type : nightlyDemand.keySet()) {
            if (!locks.lock(propertyId, type)) {
                throw new IllegalArgumentException("room type does not exist in the property");
            }
        }
        // JDBC must observe pending JPA writes from any earlier admission in this transaction.
        entities.flush();
        for (var entry : nightlyDemand.entrySet()) {
            var nights = entry.getValue();
            var range = new StayDateRange(nights.firstKey(), nights.lastKey().plusDays(1));
            var stock = availability.calculate(propertyId, entry.getKey(), range);
            for (var night : stock) {
                int requested = nights.getOrDefault(night.night(), 0);
                long available = night.physicalRooms() - night.outOfOrderRooms() - night.reservedStays();
                if (requested > 0 && available < requested) {
                    throw new InventoryExhaustedException();
                }
            }
        }
        return persistence.get();
    }
}
