package esprit.pfe.serviceformation.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("D2F - Service Formation")
                        .description("API de gestion des formations, inscriptions, séances et documents")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("D2F Team")
                                .email("seddik.bouzayani@esprit.tn")));
    }
}
