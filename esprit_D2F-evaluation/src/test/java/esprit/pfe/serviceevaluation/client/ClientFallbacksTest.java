package esprit.pfe.serviceevaluation.client;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("Client Fallbacks - Tests unitaires")
class ClientFallbacksTest {

    @Test
    @DisplayName("AuthClientFallback - should return false")
    void testAuthClientFallback() {
        AuthClientFallback fallback = new AuthClientFallback();
        assertEquals(false, fallback.getEnseignant("123"));
    }

    @Test
    @DisplayName("FormationClientFallback - should return false")
    void testFormationClientFallback() {
        FormationClientFallback fallback = new FormationClientFallback();
        assertEquals(false, fallback.getFormation(123L));
    }
}
