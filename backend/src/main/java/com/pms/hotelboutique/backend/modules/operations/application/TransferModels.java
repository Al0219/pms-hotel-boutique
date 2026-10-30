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

public final class TransferModels {
    private TransferModels() { }
    @Schema(name="TransferPlace")
    public record Product(String key,String displayText,double latitude,double longitude,String type) {}
    @Schema(name="TransferOrderInput", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record OrderInput(@NotNull LocalDate serviceDate,@NotNull @Pattern(regexp="(?:[01][0-9]|2[0-3]):[0-5][0-9]") String deliveryTime,
        @NotNull String originKey,@NotNull String destinationKey,@Min(1) @Max(3) int passengers,@Size(max=500) String notes) {
        @JsonCreator public static OrderInput parse(@JsonProperty("serviceDate") LocalDate date,@JsonProperty("deliveryTime") String time,@JsonProperty("originKey") String origin,@JsonProperty("destinationKey") String destination,@JsonProperty("passengers") tools.jackson.databind.JsonNode count,@JsonProperty("notes") String notes){return new OrderInput(date,time,origin,destination,passengerCount(count),notes);}
        @JsonAnySetter public void unknown(String key,Object value){throw invalid();}
    }
    @Schema(name="TransferOrderEdit", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record EditInput(@NotNull Instant expectedUpdatedAt,@NotNull LocalDate serviceDate,@NotNull String deliveryTime,
        @NotNull String originKey,@NotNull String destinationKey,@Min(1) @Max(3) int passengers,@Size(max=500) String notes) {
        @JsonCreator public static EditInput parse(@JsonProperty("expectedUpdatedAt") Instant expected,@JsonProperty("serviceDate") LocalDate date,@JsonProperty("deliveryTime") String time,@JsonProperty("originKey") String origin,@JsonProperty("destinationKey") String destination,@JsonProperty("passengers") tools.jackson.databind.JsonNode count,@JsonProperty("notes") String notes){return new EditInput(expected,date,time,origin,destination,passengerCount(count),notes);}
        @JsonAnySetter public void unknown(String key,Object value){throw invalid();}
        public OrderInput order(){return new OrderInput(serviceDate,deliveryTime,originKey,destinationKey,passengers,notes);}
    }
    @Schema(name="TransferVersion", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Version(@NotNull Instant expectedUpdatedAt) {
        @JsonAnySetter public void unknown(String key,Object value) { throw invalid(); }
    }
    @Schema(name="TransferStaffTransition", additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Transition(@NotNull Instant expectedUpdatedAt, @NotNull @Pattern(regexp="IN_PROGRESS|DONE")
            @Schema(allowableValues={"IN_PROGRESS","DONE"}) String targetStatus) {
        @JsonAnySetter public void unknown(String key,Object value) { throw invalid(); }
    }
    @Schema(name="TransferOrderLine")
    public record Line(Product origin,Product destination,int passengers,Long totalMinor) { }
    @Schema(name="TransferOrder")
    public record Order(UUID id,UUID reservationId,UUID stayId,UUID propertyId,String confirmationCode,
            @Schema(nullable=true) String roomCode,LocalDate serviceDate,String deliveryTime,
            @Schema(nullable=true,maxLength=500) String notes,Status status,Instant createdAt,Instant updatedAt,
            Instant modifiableUntil,boolean canModify,List<Line> items) { }
    @Schema(name="TransferRoutePrice") public record RoutePrice(String originKey,String destinationKey,long totalMinor,String currency){}
    public record Creation(Order order, boolean replay) { }
    private static int passengerCount(tools.jackson.databind.JsonNode count){if(count==null||!count.isIntegralNumber()||!count.canConvertToInt())throw invalid();return count.intValue();}
    static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid transfer request or schedule"); }
}
