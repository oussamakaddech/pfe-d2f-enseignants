package esprit.pfe.auth.config;

import org.junit.jupiter.api.Test;
import io.swagger.v3.oas.models.OpenAPI;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    @Test
    void testCustomOpenAPI() {
        // Create an instance of the class under test
        OpenApiConfig config = new OpenApiConfig();

        // Use reflection to invoke the method since it's package private
        try {
            java.lang.reflect.Method method = OpenApiConfig.class.getDeclaredMethod("customOpenAPI");
            method.setAccessible(true);
            Object openApiObj = method.invoke(config);

            assertNotNull(openApiObj);
            assertTrue(openApiObj instanceof io.swagger.v3.oas.models.OpenAPI);

            OpenAPI api = (OpenAPI) openApiObj;
            assertNotNull(api.getInfo());
            assertEquals("D2F — Service Authentification", api.getInfo().getTitle());
            assertEquals("API d'authentification et gestion des utilisateurs JWT.", api.getInfo().getDescription());
            assertEquals("1.0.0", api.getInfo().getVersion());
            assertEquals("D2F Team", api.getInfo().getContact().getName());
            assertEquals("seddik.bouzayani@esprit.tn", api.getInfo().getContact().getEmail());
        } catch (Exception e) {
            fail("Exception occurred: " + e.getMessage());
        }
    }
}