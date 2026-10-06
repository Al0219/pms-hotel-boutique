package com.pms.hotelboutique.backend.infrastructure.openapi;

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
                .description("Contratos Backend aprobados de integración Staff y BFF Guest/Staff. "
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
            .schemaRequirement("guestRefreshCookie", new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("pms_guest_refresh")
                .description("Refresh opaco Guest reenviado por BFF; independiente de Staff."));
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
    OperationCustomizer applicationAudience() {
        return (operation, handler) -> {
            String packageName = handler.getBeanType().getPackageName();
            if (packageName.contains(".modules.securityauth.") || packageName.contains(".modules.guestauth.")) {
                operation.addExtension("x-audience", "internal-bff");
            } else if (packageName.contains(".modules.inventory.")) {
                operation.addExtension("x-audience", "staff");
            }
            return operation;
        };
    }
}
