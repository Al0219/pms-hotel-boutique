package com.pms.hotelboutique.backend.infrastructure.security;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PublicBookingPreJ6SecurityHttpIntegrationTests {
    @LocalServerPort int port;

    @Test
    void anonymousPostRetainsMvc404OnRealServletErrorDispatchWithoutAJ6Controller() throws Exception {
        var response = send("POST", "/api/v1/public/bookings");
        assertEquals(404, response.statusCode());
        assertTrue(response.headers().firstValue("Set-Cookie").isEmpty());
    }

    @Test
    void realServerStillProtectsOtherMethodsStaffAndDirectErrorRequests() throws Exception {
        for (String path : List.of("/api/v1/public/bookings", "/api/v1/properties", "/api/v1/public/other", "/error")) {
            assertEquals(401, send("GET", path).statusCode(), path);
        }
        assertEquals(401, send("POST", "/error").statusCode());
        assertEquals(401, send("POST", "/api/v1/properties").statusCode());
    }

    private HttpResponse<Void> send(String method, String path) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json")
                .method(method, method.equals("POST") ? HttpRequest.BodyPublishers.ofString("{}") : HttpRequest.BodyPublishers.noBody())
                .build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.discarding());
    }
}
