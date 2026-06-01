package esprit.pfe.serviceformation.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("D2F — Service Formation")
                        .description("API du microservice Formation : cycle de vie, inscriptions, séances, documents.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("DSI ESPRIT")
                                .email("dsi@esprit.tn")))
                // DSI §4.5 — schéma de sécurité bearer JWT
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT HS512 fourni par POST /api/auth/login")));
    }
}
