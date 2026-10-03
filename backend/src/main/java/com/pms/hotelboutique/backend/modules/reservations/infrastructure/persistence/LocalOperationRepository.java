package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationRequest;
import com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationService.OperationDefinition;
import com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationService.OperationReceipt;
import java.sql.Connection;
import java.sql.Timestamp;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.stereotype.Repository;

/** Append-only receipts and transaction-scoped locks in the application's PostgreSQL. */
@Repository
public class LocalOperationRepository {
    private final JdbcTemplate jdbc;

    public LocalOperationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean isReadCommitted() {
        return Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) connection ->
                connection.getTransactionIsolation() == Connection.TRANSACTION_READ_COMMITTED));
    }

    public void lock(UUID actorId, UUID propertyId, String name, LocalOperationRequest request) {
        jdbc.query("SELECT pg_advisory_xact_lock(?)", result -> { },
                request.lockId(actorId, propertyId, name));
    }

    public Optional<StoredOperation> find(UUID actorId, UUID propertyId, String name, String key) {
        return jdbc.query("SELECT id,property_id,staff_user_id,operation_name,result_id,completed_at,request_hash "
                        + "FROM local_operation_receipts WHERE staff_user_id=? AND property_id=? "
                        + "AND operation_name=? AND request_key=?",
                (row, index) -> new StoredOperation(row.getString("request_hash"),
                        new OperationReceipt(row.getObject("id", UUID.class),
                                row.getObject("property_id", UUID.class), row.getObject("staff_user_id", UUID.class),
                                row.getString("operation_name"), row.getObject("result_id", UUID.class),
                                row.getTimestamp("completed_at").toInstant())),
                actorId, propertyId, name, key).stream().findFirst();
    }

    public void insert(OperationReceipt receipt, OperationDefinition definition,
            LocalOperationRequest request, String fingerprint) {
        jdbc.update("INSERT INTO local_operation_receipts "
                        + "(id,property_id,staff_user_id,operation_name,request_key,payload_version,request_hash,"
                        + "required_permission,result_id,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                receipt.operationId(), receipt.propertyId(), receipt.staffUserId(), receipt.operationName(),
                request.key(), request.payloadVersion(), fingerprint, definition.requiredPermission(),
                receipt.resultId(), Timestamp.from(receipt.completedAt()));
    }

    public record StoredOperation(String fingerprint, OperationReceipt receipt) { }
}
