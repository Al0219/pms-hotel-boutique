package com.pms.hotelboutique.backend.infrastructure.security;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ExplicitAuthServletErrorIntegrationTests {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;

    @Test
    void loginAliasPreservesLegacyErrorsIncludingProtectedServletErrorDispatch() throws Exception {
        var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        for (String body : List.of("{}", "{", "{\"username\":\"\",\"password\":\"\"}")) {
            for (String path : List.of("/sessions", "/login")) {
                var response = login(client, path, body);
                // MockMvc sees MVC's 400; the real servlet redispatches to the protected /error.
                assertEquals(401, response.statusCode());
                assertEquals("", response.body());
                assertTrue(response.headers().firstValue("Set-Cookie").isEmpty());
            }
        }
        var legacy = login(client, "/sessions", "{\"username\":\"absent-servlet-fixture\",\"password\":\"invalid\"}");
        var current = login(client, "/login", "{\"username\":\"absent-servlet-fixture\",\"password\":\"invalid\"}");
        assertEquals(401, legacy.statusCode());
        assertEquals(legacy.statusCode(), current.statusCode());
        assertEquals(legacy.headers().firstValue("Content-Type"), current.headers().firstValue("Content-Type"));
        assertEquals(json.readTree(legacy.body()).path("title"), json.readTree(current.body()).path("title"));
    }

    private HttpResponse<String> login(HttpClient client, String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/staff-auth" + path))
                .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
