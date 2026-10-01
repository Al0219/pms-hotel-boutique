package com.pms.hotelboutique.backend.modules.operations.application;

/** Domain-facing failure for messaging operations. */
public class MessagingException extends RuntimeException {

    public MessagingException(String message) {
        super(message);
    }

    public MessagingException(String message, Throwable cause) {
        super(message, cause);
    }
}
