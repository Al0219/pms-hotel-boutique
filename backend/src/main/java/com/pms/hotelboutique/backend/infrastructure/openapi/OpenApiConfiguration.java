package com.pms.hotelboutique.backend.infrastructure.openapi;

import com.pms.hotelboutique.backend.modules.inventory.api.PublicAvailabilityController;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springdoc.core.customizers.OpenApiCustomizer;
import io.swagger.v3.oas.models.media.Schema;
import java.util.List;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI pmsHotelOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("PMS Hotel Boutique API")
                .version("v1")
                .description("Contratos Backend aprobados de integración Staff, BFF Guest/Staff y disponibilidad pública. "
                    + "Las operaciones x-audience=internal-bff son para transporte privado BFF→Backend; "
                    + "no exponen tokens a JavaScript. Actuator es infraestructura y queda fuera de esta API."))
            .schemaRequirement("bearerAuth", new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Access JWT Staff; sesión activa y permisos/property scope C2 recalculados."))
            .schemaRequirement("guestBearerAuth", new SecurityScheme()
                .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                .description("Access JWT Guest de C3; no habilita APIs Staff."))
            .schemaRequirement("staffRefreshCookie", new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("pms_staff_refresh")
                .description("Refresh opaco Staff reenviado por BFF; no JSON. El BFF reemplaza sus cookies HttpOnly."))
            .schemaRequirement("guestRegistrationBinding",new SecurityScheme().type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-Guest-Registration-Binding").description("BFF-only continuation; independent of JWT/refresh. Never exposed to Browser."))
            .schemaRequirement("guestNativeRefresh", new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-Guest-Refresh-Token")
                .description("Refresh nativo Android desde SecureStore; sin Cookie ni Origin; rota con la misma sesión Guest."))
            .schemaRequirement("guestRefreshCookie", new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("pms_guest_refresh")
                .description("Refresh opaco Guest reenviado por BFF; independiente de Staff."));
    }
    @Bean
    OpenApiCustomizer personalProfileNullability() {
        return api -> {
            var schema=api.getComponents().getSchemas().get("GuestPersonalProfile");
            if(schema!=null) schema.getProperties().put("profile",new Schema<>().anyOf(List.of(
                new Schema<>().$ref("#/components/schemas/GuestPersonalProfileDetails"),new Schema<>().types(Set.of("null")))));
        };
    }
    @Bean
    OpenApiCustomizer guestAccountSummaryNullability() {
        return api -> {
            Schema<?> summary = api.getComponents().getSchemas().get("GuestAccountSummaryResponse");
            if (summary == null) return;
            var properties = summary.getProperties();
            // OpenAPI 3.1: object reference OR null, not a reference intersected with type:null.
            String description = properties.get("upcomingStay").getDescription();
            properties.put("upcomingStay", new Schema<>().description(description).anyOf(List.of(
                    new Schema<>().$ref("#/components/schemas/UpcomingStay"),
                    new Schema<>().types(Set.of("null")))));
        };
    }

    @Bean
    OpenApiCustomizer nativeGuestReadSchemas() {
        return api -> {
            var schemas = api.getComponents().getSchemas();
            for (String name : List.of("GuestLinkedStay", "GuestStay", "GuestStayRoomType", "GuestStayRoom")) {
                var schema = schemas.get(name);
                if (schema != null) schema.setRequired(new java.util.ArrayList<>(schema.getProperties().keySet()));
            }
            var stay = schemas.get("GuestStay");
            if (stay != null) stay.getProperties().put("room", new Schema<>().anyOf(List.of(
                    new Schema<>().$ref("#/components/schemas/GuestStayRoom"), new Schema<>().types(Set.of("null")))));
        };
    }

    @Bean
    OpenApiCustomizer staffReservationNullability() {
        return api -> {
            var schemas = api.getComponents().getSchemas();
            for (String name : List.of("StaffReservation", "StaffStay", "StaffRoomType", "StaffRoom", "ResponsibleGuestView", "StaffRoomAssignmentPreview", "StaffRoomAssignmentCandidate", "StaffRoomAssignmentResult", "StaffStayLifecycleResult",
                    "StaffReservationCreationOption", "StaffReservationCreationQuote", "StaffReservationCreationReceipt")) {
                var schema = schemas.get(name);
                if (schema != null) schema.setRequired(new java.util.ArrayList<>(schema.getProperties().keySet()));
            }
            for (var field : java.util.Map.of("StaffReservation", "responsibleGuest", "StaffStay", "room").entrySet()) {
                var schema = schemas.get(field.getKey());
                if (schema == null) continue;
                Schema<?> previous = (Schema<?>) schema.getProperties().get(field.getValue());
                String reference = field.getValue().equals("room") ? "StaffRoom" : "ResponsibleGuestView";
                schema.getProperties().put(field.getValue(), new Schema<>().description(previous.getDescription()).anyOf(List.of(
                        new Schema<>().$ref("#/components/schemas/" + reference), new Schema<>().types(Set.of("null")))));
            }
        };
    }

    @Bean
    OperationCustomizer applicationAudience() {
        return (operation, handler) -> {
            String packageName = handler.getBeanType().getPackageName();
            if (packageName.contains(".modules.securityauth.") || packageName.contains(".modules.guestauth.")) {
                operation.addExtension("x-audience", "internal-bff");
                if (packageName.contains(".modules.guestauth.") && (
                        handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestReservationController.class)
                        || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestAccountController.class)
                        || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestPersonalProfileController.class)
                        || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestHousekeepingController.class)
                        || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestRoomServiceController.class)
                        || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestSavedValetController.class)
                        || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestValetController.class)
                        || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestAmenitiesController.class)
                        || (handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.guestauth.api.GuestAuthController.class)
                            && !Set.of("start", "exchange").contains(handler.getMethod().getName())))) {
                    operation.addExtension("x-audience", "guest-bff-or-native");
                }
                String method = handler.getMethod().getName();
                if (method.equals("login") || method.equals("loginExplicit") || method.equals("start") || method.equals("exchange")) operation.setSecurity(List.of());
            } else if (handler.getBeanType().equals(PublicAvailabilityController.class)) {
                operation.addExtension("x-audience", "public");
                operation.setSecurity(List.of());
            } else if (packageName.contains(".modules.inventory.")
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.reservations.api.DailyArrivalsDeparturesController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.CurrentHousekeepingReportController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.CurrentMaintenanceReportController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.reservations.api.StaffFolioController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.reservations.api.StaffReservationController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.reservations.api.StaffReservationCreationController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.StaffHousekeepingController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.StaffHousekeepingRequestsController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.StaffRoomServiceController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.StaffValetController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.StaffValetVehicleController.class)
                    || handler.getBeanType().equals(com.pms.hotelboutique.backend.modules.operations.api.StaffAmenitiesController.class)) {
                operation.addExtension("x-audience", "staff");
            }
            return operation;
        };
    }

    @Bean
    OpenApiCustomizer staffFolioSchemas() {
        return api -> {
            for (String name : List.of("StaffFolioMoney", "StaffFolioHeader", "StaffFolioPage", "StaffFolioDetail",
                    "StaffFolioMovement", "StaffFolioMovementPage", "StaffFolioPaymentReceipt")) {
                var schema = api.getComponents().getSchemas().get(name);
                if (schema != null) schema.setRequired(new java.util.ArrayList<>(schema.getProperties().keySet()));
            }
        };
    }

    @Bean
    OpenApiCustomizer staffHousekeepingNullability() {
        return api -> {
            var room = api.getComponents().getSchemas().get("StaffHousekeepingRoom");
            if (room == null) return;
            // A nullable type alone is insufficient: enum must also permit JSON null.
            Schema<Object> status = new Schema<>();
            status.setTypes(Set.of("string", "null"));
            status.setEnum(java.util.Arrays.asList("DIRTY", "CLEAN", "INSPECTED", null));
            status.setDescription("Cleaning state; null for an untracked physical room.");
            room.getProperties().put("status", status);
            var candidate = api.getComponents().getSchemas().get("StaffRoomAssignmentCandidate");
            if (candidate != null) {
                Schema<Object> cleaning = new Schema<>();
                cleaning.setTypes(Set.of("string", "null"));
                cleaning.setEnum(java.util.Arrays.asList("DIRTY", "CLEAN", "INSPECTED", null));
                cleaning.setDescription("Current cleaning, not arrival forecast; null means no tracking.");
                candidate.getProperties().put("housekeeping_status", cleaning);
            }
        };
    }
}
