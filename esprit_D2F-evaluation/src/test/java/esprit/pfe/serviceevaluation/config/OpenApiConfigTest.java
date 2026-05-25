package esprit.pfe.serviceevaluation.config;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.lang.reflect.Method;

class OpenApiConfigTest {

    @Test
    void testOpenApiConfigCreation() {
        // Test that we can create an instance of OpenApiConfig
        OpenApiConfig openApiConfig = new OpenApiConfig();
        assertNotNull(openApiConfig, "OpenApiConfig should be instantiable");
    }

    @Test
    void testCustomOpenAPI() throws Exception {
        // Create an instance of the class under test
        OpenApiConfig config = new OpenApiConfig();

        // Use reflection to invoke the method since it's package private
        Method method = OpenApiConfig.class.getDeclaredMethod("customOpenAPI");
        method.setAccessible(true);
        Object openApiObj = method.invoke(config);

        assertNotNull(openApiObj);
        assertTrue(openApiObj instanceof io.swagger.v3.oas.models.OpenAPI);

        OpenAPI api = (OpenAPI) openApiObj;
        assertNotNull(api.getInfo());
        assertEquals("D2F — Service Évaluation", api.getInfo().getTitle());
        assertEquals("API de gestion des évaluations formateur et globales.", api.getInfo().getDescription());
        assertEquals("1.0.0", api.getInfo().getVersion());
    }
}