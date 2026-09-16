package esprit.pfe.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class HashTest {
    @Test
    void printHash_shouldProduceMatchingBCryptHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("admin");
        assertNotNull(hash);
        assertTrue(encoder.matches("admin", hash), "Encoded hash should match the original password");
    }
}
