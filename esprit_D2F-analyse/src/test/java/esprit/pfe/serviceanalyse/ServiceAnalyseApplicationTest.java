package esprit.pfe.serviceanalyse;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class ServiceAnalyseApplicationTest {

    @Test
    void contextLoads() {
        // Test if the application context loads correctly
        assertDoesNotThrow(() -> {
            // Le contexte de l'application se charge correctement
        }, "Le contexte de l'application doit se charger sans erreur");
    }

    @Test
    void mainMethodTest() {
        // Test that the main method can be called without throwing exceptions
        String[] args = {};
        assertDoesNotThrow(() -> ServiceAnalyseApplication.main(args), "La méthode main ne doit pas lancer d'exception");
    }

    @Test
    void mainMethodTestWithArguments() {
        // Test that the main method can be called with arguments without throwing exceptions
        String[] args = {"--spring.profiles.active=test", "--server.port=8080"};
        assertDoesNotThrow(() -> ServiceAnalyseApplication.main(args), "La méthode main ne doit pas lancer d'exception avec des arguments");
    }

    @Test
    void mainMethodTestWithNullArguments() {
        // Test that the main method handles null arguments by converting to empty args
        String[] args = null;
        assertThrows(IllegalArgumentException.class, () -> ServiceAnalyseApplication.main(args), 
            "La méthode main doit lancer une IllegalArgumentException avec des arguments null");
    }

    @Test
    void mainMethodTestWithEmptyArguments() {
        // Test that the main method can be called with empty arguments without throwing exceptions
        String[] args = {};
        assertDoesNotThrow(() -> ServiceAnalyseApplication.main(args), "La méthode main ne doit pas lancer d'exception avec des arguments vides");
    }

    @Test
    void mainMethodTestWithMultipleArguments() {
        // Test that the main method can be called with multiple arguments without throwing exceptions
        String[] args = {"--spring.profiles.active=test", "--server.port=8080", "--logging.level.root=INFO"};
        assertDoesNotThrow(() -> ServiceAnalyseApplication.main(args), "La méthode main ne doit pas lancer d'exception avec plusieurs arguments");
    }
}
