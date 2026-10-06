package com.pms.hotelboutique.backend.modules.guestauth.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
public record GuestSessionResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Cuenta Guest autenticada; distinta de GuestProfile.") UUID guestAccountId,@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Referencia interna de sesión Guest.") UUID sessionId,@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Correo verificado de esta cuenta; sin ejemplos de PII.") String email,@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, allowableValues = "GUEST", description = "GUEST; no concede rol ni permiso Staff.") String context) { }
