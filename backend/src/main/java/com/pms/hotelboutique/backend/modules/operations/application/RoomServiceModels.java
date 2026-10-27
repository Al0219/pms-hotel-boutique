package com.pms.hotelboutique.backend.modules.operations.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class RoomServiceModels {
    private RoomServiceModels() { }
    public enum Period { BREAKFAST, LUNCH, DINNER, BEVERAGES }
    @Schema(name="RoomServiceProduct")
    public record Product(UUID id, String code, String name, List<Period> periods, long unitPriceMinor, String currency, boolean available) { }
    @Schema(name="RoomServiceLineInput", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record LineInput(@NotNull UUID productId, @Min(1) @Max(5) @Schema(type="integer",minimum="1",maximum="5") int quantity, @NotNull Period mealPeriod) {
        @JsonCreator public static LineInput parse(@JsonProperty("productId") UUID productId,
                @JsonProperty("quantity") tools.jackson.databind.JsonNode quantity,
                @JsonProperty("mealPeriod") Period mealPeriod) {
            if(quantity==null||!quantity.isIntegralNumber()||!quantity.canConvertToInt())throw invalid();
            return new LineInput(productId,quantity.intValue(),mealPeriod);
        }
        @JsonAnySetter public void unknown(String key,Object value) { throw invalid(); }
    }
    @Schema(name="RoomServiceOrderInput", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record OrderInput(@NotNull LocalDate serviceDate, @NotNull @Pattern(regexp="(?:[01][0-9]|2[0-3]):[0-5][0-9]") String deliveryTime,
            @NotNull @Size(min=1,max=6) List<@NotNull @Valid LineInput> items,
            @Size(max=500) @Schema(nullable=true,maxLength=500) String notes) {
        @JsonAnySetter public void unknown(String key,Object value) { throw invalid(); }
    }
    @Schema(name="RoomServiceOrderEdit", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record EditInput(@NotNull Instant expectedUpdatedAt, @NotNull LocalDate serviceDate,
            @NotNull @Pattern(regexp="(?:[01][0-9]|2[0-3]):[0-5][0-9]") String deliveryTime,
            @NotNull @Size(min=1,max=6) List<@NotNull @Valid LineInput> items,
            @Size(max=500) @Schema(nullable=true,maxLength=500) String notes) {
        @JsonAnySetter public void unknown(String key,Object value) { throw invalid(); }
        public OrderInput order() { return new OrderInput(serviceDate,deliveryTime,items,notes); }
    }
    @Schema(name="RoomServiceVersion", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Version(@NotNull Instant expectedUpdatedAt) {
        @JsonAnySetter public void unknown(String key,Object value) { throw invalid(); }
    }
    @Schema(name="RoomServiceStaffTransition", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Transition(@NotNull Instant expectedUpdatedAt, @NotNull @Pattern(regexp="IN_PROGRESS|DONE")
            @Schema(allowableValues={"IN_PROGRESS","DONE"}) String targetStatus) {
        @JsonAnySetter public void unknown(String key,Object value) { throw invalid(); }
    }
    @Schema(name="RoomServiceOrderLine")
    public record Line(UUID productId,String productName,Period mealPeriod,int quantity,long unitPriceMinor,long lineTotalMinor) { }
    @Schema(name="RoomServiceOrder")
    public record Order(UUID id,UUID reservationId,UUID stayId,UUID propertyId,String confirmationCode,
            @Schema(nullable=true) String roomCode,LocalDate serviceDate,String deliveryTime,String currency,long totalMinor,
            @Schema(nullable=true,maxLength=500) String notes,Status status,Instant createdAt,Instant updatedAt,
            Instant modifiableUntil,List<Line> items) { }
    public record Creation(Order order, boolean replay) { }
    static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid room service order or schedule"); }
}
