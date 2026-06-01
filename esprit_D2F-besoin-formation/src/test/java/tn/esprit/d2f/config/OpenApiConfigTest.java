package tn.esprit.d2f.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenApiConfigTest {

    private final OpenApiConfig config = new OpenApiConfig();

    @Test
    void customOpenAPI_returnsValidOpenAPIInstance() {
        OpenAPI openAPI = config.customOpenAPI();
        assertThat(openAPI).isNotNull();
    }

    @Test
    void customOpenAPI_hasCorrectTitle() {
        Info info = config.customOpenAPI().getInfo();
        assertThat(info).isNotNull();
        assertThat(info.getTitle()).isEqualTo("D2F - Service Besoin Formation");
    }

    @Test
    void customOpenAPI_hasCorrectDescription() {
        Info info = config.customOpenAPI().getInfo();
        assertThat(info.getDescription()).isEqualTo("API de gestion des besoins de formation");
    }

    @Test
    void customOpenAPI_hasCorrectVersion() {
        Info info = config.customOpenAPI().getInfo();
        assertThat(info.getVersion()).isEqualTo("1.0.0");
    }

    @Test
    void customOpenAPI_hasCorrectContact() {
        Contact contact = config.customOpenAPI().getInfo().getContact();
        assertThat(contact).isNotNull();
        assertThat(contact.getName()).isEqualTo("D2F Team");
        assertThat(contact.getEmail()).isEqualTo("seddik.bouzayani@esprit.tn");
    }
}
