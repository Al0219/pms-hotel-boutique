package com.pms.hotelboutique.backend.modules.securityauth.api;

import java.util.UUID;

public record StaffSessionResponse(UUID staffUserId, UUID sessionId, String username, String roleCode) { }
