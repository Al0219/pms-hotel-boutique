package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestAuthenticationException;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestReservationHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(value = "/api/v1/guest-auth/account/reservations", produces = "application/json")
@Tag(name = "Guest reservations", description = "BFF-only; linked reservations owned by the active Guest session.")
@SecurityRequirement(name = "guestBearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid pagination, UUID or extra query parameters.", content = @Content)
@ApiResponse(responseCode = "401", description = "Active Guest session required; Staff JWT does not authorize this read.", content = @Content)
public class GuestReservationHistoryController {
    private final GuestReservationHistoryService history;
    public GuestReservationHistoryController(GuestReservationHistoryService history) { this.history = history; }

    @GetMapping
    @Operation(summary = "My linked reservations", description = "Only persisted Guest links authorize reads. No client account/property selector; no writes, financial or internal notes. Inactive hotels remain in history. Stable createdAt/id descending order.")
    @Parameters({@Parameter(name = "page", in = ParameterIn.QUERY, schema = @Schema(type = "integer", minimum = "0", defaultValue = "0")),
            @Parameter(name = "size", in = ParameterIn.QUERY, schema = @Schema(type = "integer", minimum = "1", maximum = "50", defaultValue = "20"))})
    @ApiResponse(responseCode = "200", description = "Own page, including a genuine empty history.", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(schema = @Schema(implementation = GuestReservationHistoryResponse.Page.class)))
    public ResponseEntity<GuestReservationHistoryResponse.Page> page(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String,String> query) {
        requireGuest(principal);
        validateKeys(query, List.of("page","size"));
        return own(GuestReservationHistoryResponse.Page.from(history.page(principal, integer(query,"page",0),integer(query,"size",20))));
    }

    @GetMapping("/{reservationId}")
    @Operation(summary = "My linked reservation detail", description = "Identical404 for unknown or unlinked reservations. N stays remain distinct; no physical room assignment, payment or policy is fabricated.")
    @ApiResponse(responseCode = "200", description = "Own linked reservation.", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(schema = @Schema(implementation = GuestReservationHistoryResponse.Detail.class)))
    @ApiResponse(responseCode = "404", description = "Reservation unavailable to this Guest.", content = @Content)
    public ResponseEntity<GuestReservationHistoryResponse.Detail> detail(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @Parameter(schema = @Schema(type = "string", format = "uuid")) @PathVariable String reservationId,
            @Parameter(hidden = true) @RequestParam MultiValueMap<String,String> query) {
        requireGuest(principal);
        validateKeys(query, List.of());
        if (!reservationId.matches("[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return own(GuestReservationHistoryResponse.Detail.from(history.detail(principal, UUID.fromString(reservationId))));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ProblemDetail> failure(ResponseStatusException failure) {
        return ResponseEntity.status(failure.getStatusCode()).cacheControl(CacheControl.noStore().cachePrivate())
                .body(ProblemDetail.forStatus(failure.getStatusCode()));
    }
    @ExceptionHandler(GuestAuthenticationException.class)
    ResponseEntity<ProblemDetail> unauthenticated() {
        return ResponseEntity.status(401).cacheControl(CacheControl.noStore().cachePrivate()).body(ProblemDetail.forStatus(401));
    }
    private static <T> ResponseEntity<T> own(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(value); }
    private static void requireGuest(GuestPrincipal principal) { if (principal == null) throw new GuestAuthenticationException(); }
    private static void validateKeys(MultiValueMap<String,String> query, List<String> allowed) {
        if (query.entrySet().stream().anyMatch(e -> !allowed.contains(e.getKey()) || e.getValue().size() != 1)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    }
    private static int integer(MultiValueMap<String,String> query, String key, int fallback) {
        if (!query.containsKey(key)) return fallback;
        try { String text = query.getFirst(key); if (text == null || !text.matches("[0-9]+")) throw new NumberFormatException(); return Integer.parseInt(text); }
        catch (NumberFormatException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST); }
    }
}
