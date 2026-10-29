package com.pms.hotelboutique.backend.modules.operations.application;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class ValetModels {
    private ValetModels() {}
    @Schema(name="ValetVehicleInput",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record VehicleInput(@NotBlank @Size(max=40) String make,@NotBlank @Size(max=40) String model,
        @NotBlank @Pattern(regexp="P|A|C|TE|U|TRC|M|MT|TC|O|CD|CC|MI|DIS") String platePrefix,
        @NotBlank @Size(max=6) String plateBody,@Size(max=30) @Schema(nullable=true) String color,
        @NotNull @Pattern(regexp="PARKED|WITH_GUEST") String location) {
        @JsonAnySetter public void unknown(String k,Object v){throw invalid();}
    }
    @Schema(name="ValetVehicleEdit",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record VehicleEdit(@NotNull Instant expectedUpdatedAt,@NotBlank @Size(max=40) String make,
        @NotBlank @Size(max=40) String model,@NotBlank @Pattern(regexp="P|A|C|TE|U|TRC|M|MT|TC|O|CD|CC|MI|DIS") String platePrefix,
        @NotBlank @Size(max=6) String plateBody,@Size(max=30) @Schema(nullable=true) String color) {
        @JsonAnySetter public void unknown(String k,Object v){throw invalid();}
    }
    @Schema(name="ValetVehicleSnapshot")
    public record Snapshot(String make,String model,String platePrefix,String plateBody,@Schema(nullable=true) String color) {}
    @Schema(name="ValetVehicle")
    public record Vehicle(UUID id,UUID propertyId,UUID stayId,String make,String model,String platePrefix,String plateBody,
        @Schema(nullable=true) String color,String location,Instant createdAt,Instant updatedAt,boolean hasActiveRequest,
        UUID reservationId,String confirmationCode,@Schema(nullable=true) String roomCode,
        @Schema(allowableValues={"RESERVED","IN_HOUSE","CHECKED_OUT","CANCELLED","NO_SHOW"}) String stayStatus,
        @Schema(allowableValues={"PENDING","CONFIRMED","CANCELLED"}) String reservationStatus,
        @Schema(description="Persisted reservation CONFIRMED and stay RESERVED/IN_HOUSE") boolean stayActive,
        @Schema(description="Active stay, PARKED custody or OPEN/IN_PROGRESS request; computed from persisted records") boolean operationallyVisible,UUID savedVehicleId,boolean canRelease) {}
    @Schema(name="ValetSavedVehicle")
    public record SavedVehicle(UUID id,String make,String model,String platePrefix,String plateBody,
        @Schema(nullable=true) String color,Instant createdAt,Instant updatedAt,boolean canAssociate) {}
    @Schema(name="ValetAssociationInput",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record AssociationInput(@NotNull UUID savedVehicleId,@NotNull Instant expectedVehicleUpdatedAt,
        @NotNull @Pattern(regexp="PARKED|WITH_GUEST") String location) {
        @JsonAnySetter public void unknown(String k,Object v){throw invalid();}
    }
    @Schema(name="ValetRequestInput",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record OrderInput(@NotNull UUID vehicleId,@NotNull LocalDate serviceDate,
        @NotNull @Pattern(regexp="(?:[01][0-9]|2[0-3]):[0-5][0-9]") String deliveryTime) {
        @JsonAnySetter public void unknown(String k,Object v){throw invalid();}
    }
    @Schema(name="ValetRequestEdit",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record EditInput(@NotNull Instant expectedUpdatedAt,@NotNull LocalDate serviceDate,
        @NotNull @Pattern(regexp="(?:[01][0-9]|2[0-3]):[0-5][0-9]") String deliveryTime) {
        @JsonAnySetter public void unknown(String k,Object v){throw invalid();}
    }
    @Schema(name="ValetVersion",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Version(@NotNull Instant expectedUpdatedAt) {
        @JsonAnySetter public void unknown(String k,Object v){throw invalid();}
    }
    @Schema(name="ValetStaffTransition",additionalProperties=Schema.AdditionalPropertiesValue.FALSE)
    public record Transition(@NotNull Instant expectedUpdatedAt,@NotNull @Pattern(regexp="IN_PROGRESS|DONE") String targetStatus) {
        @JsonAnySetter public void unknown(String k,Object v){throw invalid();}
    }
    @Schema(name="ValetRequest")
    public record Order(UUID id,UUID propertyId,UUID reservationId,UUID stayId,String confirmationCode,
        @Schema(nullable=true) String roomCode,UUID vehicleId,Snapshot vehicle,LocalDate serviceDate,String deliveryTime,
        Status status,Instant createdAt,Instant updatedAt,Instant modifiableUntil) {}
    public record Creation(Order order,boolean replay) {}
    public record VehicleCreation(Vehicle vehicle,boolean replay) {}
    static ResponseStatusException invalid(){return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid valet body, plate or schedule");}
}
