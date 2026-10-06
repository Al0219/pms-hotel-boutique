package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Objects;
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE, description = "Editar solo campos presentes; al menos uno. Omisión conserva valor; null explícito y campos desconocidos rechazados.", minProperties = 1)
public class PatchRatePlanRequest {
    @Size(max = 64) @Pattern(regexp = "(?s).*\\S.*") private String code;
    @Size(max = 160) @Pattern(regexp = "(?s).*\\S.*") private String name;
    @Valid private CatalogPriceRequest basePrice;
    public String getCode() { return code; }
    public String getName() { return name; }
    public CatalogPriceRequest getBasePrice() { return basePrice; }
    @JsonSetter public void setCode(String value) { code = Objects.requireNonNull(value, "code"); }
    @JsonSetter public void setName(String value) { name = Objects.requireNonNull(value, "name"); }
    @JsonSetter public void setBasePrice(CatalogPriceRequest value) { basePrice = Objects.requireNonNull(value, "basePrice"); }
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown field"); }
}
