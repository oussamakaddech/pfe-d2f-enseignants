package esprit.pfe.auth.entities;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ConfirmationKeyTest {

    @Test
    void testConfirmationKeyEntity() {
        ConfirmationKey key = new ConfirmationKey();
        key.setId(1L);
        key.setToken("test-token");
        key.setEmailAddress("test@example.com");

        assertEquals(1L, key.getId());
        assertEquals("test-token", key.getToken());
        assertEquals("test@example.com", key.getEmailAddress());

        ConfirmationKey fullKey = new ConfirmationKey(2L, "other-token", "other@example.com");
        assertEquals(2L, fullKey.getId());
        assertEquals("other-token", fullKey.getToken());
        
        // Test toString/hashCode/equals via Lombok @Data
        assertNotNull(key.toString());
        assertNotEquals(key, fullKey);
    }
}
