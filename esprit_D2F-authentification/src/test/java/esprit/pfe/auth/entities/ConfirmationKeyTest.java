package esprit.pfe.auth.entities;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class ConfirmationKeyTest {

    @Test
    void testConfirmationKeyEntity() {
        ConfirmationKey key = new ConfirmationKey();
        key.setId(1L);
        key.setToken("test-token");
        key.setEmailAddress("test@example.com");
        key.setExpiresAt(LocalDateTime.of(2026, 6, 1, 12, 0));

        assertEquals(1L, key.getId());
        assertEquals("test-token", key.getToken());
        assertEquals("test@example.com", key.getEmailAddress());
        assertEquals(LocalDateTime.of(2026, 6, 1, 12, 0), key.getExpiresAt());

        LocalDateTime expiry = LocalDateTime.of(2026, 7, 1, 0, 0);
        ConfirmationKey fullKey = new ConfirmationKey(2L, "other-token", "other@example.com", expiry);
        assertEquals(2L, fullKey.getId());
        assertEquals("other-token", fullKey.getToken());
        assertEquals(expiry, fullKey.getExpiresAt());

        // Test toString/hashCode/equals via Lombok @Data
        assertNotNull(key.toString());
        assertNotEquals(key, fullKey);
    }

    @Test
    void testExpiresAtDefaultNotSet() {
        ConfirmationKey key = new ConfirmationKey();
        assertNull(key.getExpiresAt());
    }
}
