package esprit.pfe.servicecertificat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ServiceCertificatApplication - Tests")
class ServiceCertificatApplicationTest {

    @Test
    @DisplayName("Application class should exist and be instantiable")
    void applicationExists() {
        ServiceCertificatApplication app = new ServiceCertificatApplication();
        assertNotNull(app);
    }

    @Test
    @DisplayName("Main method should exist")
    void mainMethodExists() {
        assertDoesNotThrow(() -> {
            ServiceCertificatApplication.class.getMethod("main", String[].class);
        });
    }

    @Test
    @DisplayName("Main method should be callable without exception in test context")
    void mainMethodCallable() {
        assertDoesNotThrow(() -> {
            ServiceCertificatApplication.main(new String[]{});
        });
    }
}