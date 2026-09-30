package com.pms.hotelboutique.backend.modules.guestauth.api;
import jakarta.validation.constraints.NotBlank;
public record GoogleExchangeRequest(@NotBlank String code,@NotBlank String state) { }
