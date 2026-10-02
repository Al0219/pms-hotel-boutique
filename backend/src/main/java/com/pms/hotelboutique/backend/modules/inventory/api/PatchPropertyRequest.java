package com.pms.hotelboutique.backend.modules.inventory.api;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Objects;

/** Missing fields are optional; explicit null and unapproved fields are rejected. */
public class PatchPropertyRequest {
    @Size(max = 64) @Pattern(regexp = "(?s).*\\S.*")
    private String code;
    @Size(max = 160) @Pattern(regexp = "(?s).*\\S.*")
    private String name;

    public String getCode() { return code; }
    public String getName() { return name; }

    @JsonSetter
    public void setCode(String code) { this.code = Objects.requireNonNull(code, "code"); }
    @JsonSetter
    public void setName(String name) { this.name = Objects.requireNonNull(name, "name"); }
    @JsonAnySetter
    public void rejectUnknown(String field, Object value) { throw new IllegalArgumentException("Unknown property field"); }

}
