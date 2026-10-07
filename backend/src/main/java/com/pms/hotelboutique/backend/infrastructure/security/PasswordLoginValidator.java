package com.pms.hotelboutique.backend.infrastructure.security;

import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import org.springframework.stereotype.Component;

/** Shared input rules, without sharing Guest/Staff identities or sessions. */
@Component
public class PasswordLoginValidator {
    public static final int MAX_LENGTH = 50;
    // The same unquoted email syntax as Web type=email and its shared validator.
    public static final String EMAIL_PATTERN = "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
            + "@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*";
    private final Validator validator;

    public PasswordLoginValidator(Validator validator) { this.validator = validator; }

    public String normalizedEmail(String email, String password) {
        var input = new Input(email == null ? null : email.trim().toLowerCase(Locale.ROOT), password);
        if (!validator.validate(input).isEmpty()) throw new InvalidInputException();
        return input.email();
    }

    private record Input(@NotBlank @Email(regexp = EMAIL_PATTERN) @Size(max = MAX_LENGTH) String email,
            @NotBlank @Size(max = MAX_LENGTH) String password) {
        @Override public String toString() { return "PasswordLoginInput[redacted]"; }
    }

    /** Do not retain ConstraintViolations, which contain rejected credentials. */
    public static class InvalidInputException extends RuntimeException {
        public InvalidInputException() { super("Invalid authentication input"); }
    }
}
