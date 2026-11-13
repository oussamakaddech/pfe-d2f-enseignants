package esprit.pfe.serviceevaluation.client;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("Client Fallbacks - Tests unitaires")
class ClientFallbacksTest {

    @Test
    @DisplayName("AuthClientFallback - should return false")
    void testAuthClientFallback() {
        AuthClientFallback fallback = new AuthClientFallback();
        assertEquals(false, fallback.enseignantExists("123"));
    }

    @Test
    @DisplayName("FormationClientFallback - should return false")
    void testFormationClientFallback() {
        FormationClientFallback fallback = new FormationClientFallback();
        assertEquals(false, fallback.getFormation(123L));
    }

    @Test
    @DisplayName("FormationClientFallback - getEnseignantById should return null")
    void testFormationClientFallbackEnseignant() {
        FormationClientFallback fallback = new FormationClientFallback();
        assertNull(fallback.getEnseignantById("E00007"));
    }
}
