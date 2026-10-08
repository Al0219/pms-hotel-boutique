package com.pms.hotelboutique.backend.modules.reservations.support;

import java.sql.Connection;
import javax.sql.DataSource;

/**
 * BD3 test helper. Borrows a pool connection pinned to the default schema.
 *
 * Some suites migrate into isolated schemas via {@code setSchema} on pooled
 * connections; without a reset, a later borrower can inherit a dropped
 * schema and fail with "relation does not exist". Pinning here keeps BD3
 * tests deterministic without touching other suites.
 */
public final class TestConnections {

    private TestConnections() {
    }

    public static Connection publicConnection(DataSource dataSource) throws java.sql.SQLException {
        Connection connection = dataSource.getConnection();
        connection.setSchema("public");
        return connection;
    }
}
