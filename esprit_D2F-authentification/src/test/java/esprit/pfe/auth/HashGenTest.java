package esprit.pfe.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class HashGenTest {
    @Test
    void generateHash_shouldProduceValidBCryptHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("admin");
        assertNotNull(hash, "Hash should not be null");
        assertTrue(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "Hash should be a valid BCrypt hash");
        assertTrue(encoder.matches("admin", hash), "Hash should match the original password");
    }
}
