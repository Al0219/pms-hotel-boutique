package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Currency;
/** Exact decimal strings: reject JSON numbers instead of silently accepting binary floats. */
@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE, description = "JSON de catálogo; campos desconocidos rechazados.", minProperties = 1)
public class CatalogPriceRequest {
    @Schema(type = "string", example = "125.50", description = "Decimal exacto no negativo; cero válido. Sin exponentes/números JSON. Rechaza exceso de precisión/overflow; unidades menores ISO sin redondeo.")
    @NotBlank @Size(max = 64) @Pattern(regexp = "-?\\d+(\\.\\d+)?") private String amount;
    @Schema(type = "string", example = "GTQ", description = "Código ISO de 3 caracteres con unidades menores definidas. Moneda explícita; no conversión ni obligación de igualar la Property.")
    @NotBlank @Size(min = 3, max = 3) private String currency;
    public String getAmount() { return amount; }
    public String getCurrency() { return currency; }
    @JsonSetter public void setAmount(Object value) { amount = text(value); }
    @JsonSetter public void setCurrency(Object value) { currency = text(value); }
    @JsonAnySetter public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown price field"); }
    public MonetaryAmount toAmount() { return MonetaryAmount.of(new BigDecimal(amount), Currency.getInstance(currency)); }
    private static String text(Object value) {
        if (!(value instanceof String text)) { throw new IllegalArgumentException("Price fields must be strings"); }
        return text;
    }
}
