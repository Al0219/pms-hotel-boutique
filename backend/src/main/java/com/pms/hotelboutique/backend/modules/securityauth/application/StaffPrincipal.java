package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.util.UUID;

public record StaffPrincipal(UUID staffUserId, UUID sessionId, String username, String roleCode) { }
